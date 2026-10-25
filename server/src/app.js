import { randomBytes } from 'node:crypto';
import { unlink } from 'node:fs/promises';
import path from 'node:path';
import express from 'express';
import multer from 'multer';
import { hashPassword, newToken, verifyPassword } from './auth.js';
import { dayInTimezone, isValidTimezone } from './day.js';

const IMAGE_TYPES = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'image/heic': '.heic',
};
const MAX_IMAGE_BYTES = 10 * 1024 * 1024;
const MAX_CAPTION_LENGTH = 280;
const PAGE_SIZE = 20;
const USERNAME_RE = /^[a-zA-Z0-9_]{3,20}$/;

class HttpError extends Error {
  constructor(status, message) {
    super(message);
    this.status = status;
  }
}

export function createApp({ db, uploadDir, now = () => new Date() }) {
  const app = express();
  app.use(express.json());

  // Auth is a bearer token rather than cookies, so allowing any origin is safe
  // and lets the web build of the app talk to the API.
  app.use((req, res, next) => {
    res.set({
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Authorization, Content-Type',
      'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
    });
    if (req.method === 'OPTIONS') return res.status(204).end();
    next();
  });

  const upload = multer({
    storage: multer.diskStorage({
      destination: uploadDir,
      filename: (req, file, cb) => cb(null, randomBytes(16).toString('hex') + IMAGE_TYPES[file.mimetype]),
    }),
    limits: { fileSize: MAX_IMAGE_BYTES, files: 1 },
    fileFilter: (req, file, cb) => {
      if (IMAGE_TYPES[file.mimetype]) cb(null, true);
      else cb(new HttpError(400, 'Photo must be a JPEG, PNG, WebP or HEIC image'));
    },
  });

  const stmts = {
    insertUser: db.prepare('INSERT INTO users (username, password_hash, timezone) VALUES (?, ?, ?)'),
    userByName: db.prepare('SELECT * FROM users WHERE username = ?'),
    insertSession: db.prepare('INSERT INTO sessions (token, user_id) VALUES (?, ?)'),
    deleteSession: db.prepare('DELETE FROM sessions WHERE token = ?'),
    userByToken: db.prepare(
      'SELECT users.* FROM sessions JOIN users ON users.id = sessions.user_id WHERE sessions.token = ?',
    ),
    insertPost: db.prepare('INSERT INTO posts (user_id, day, image, caption) VALUES (?, ?, ?, ?) RETURNING id'),
    postById: db.prepare(`
      SELECT posts.*, users.username FROM posts JOIN users ON users.id = posts.user_id WHERE posts.id = ?`),
    postForDay: db.prepare(`
      SELECT posts.*, users.username FROM posts JOIN users ON users.id = posts.user_id
      WHERE posts.user_id = ? AND posts.day = ?`),
    feed: db.prepare(`
      SELECT posts.*, users.username FROM posts JOIN users ON users.id = posts.user_id
      WHERE posts.id < ? ORDER BY posts.id DESC LIMIT ?`),
    deletePost: db.prepare('DELETE FROM posts WHERE id = ?'),
  };

  const publicUser = (u) => ({ id: u.id, username: u.username, timezone: u.timezone });
  const publicPost = (p) => ({
    id: p.id,
    username: p.username,
    userId: p.user_id,
    day: p.day,
    caption: p.caption,
    imageUrl: `/uploads/${p.image}`,
    createdAt: p.created_at,
  });

  function startSession(user) {
    const token = newToken();
    stmts.insertSession.run(token, user.id);
    return { token, user: publicUser(user) };
  }

  function requireUser(req, res, next) {
    const match = /^Bearer (\w+)$/.exec(req.get('authorization') ?? '');
    const user = match && stmts.userByToken.get(match[1]);
    if (!user) return next(new HttpError(401, 'Not signed in'));
    req.user = user;
    req.token = match[1];
    next();
  }

  app.use('/uploads', express.static(uploadDir, { fallthrough: false, maxAge: '7d' }));

  app.get('/health', (req, res) => res.json({ ok: true }));

  app.post('/auth/register', async (req, res) => {
    const { username, password, timezone } = req.body ?? {};
    if (typeof username !== 'string' || !USERNAME_RE.test(username)) {
      throw new HttpError(400, 'Username must be 3-20 letters, numbers or underscores');
    }
    if (typeof password !== 'string' || password.length < 8) {
      throw new HttpError(400, 'Password must be at least 8 characters');
    }
    if (stmts.userByName.get(username)) throw new HttpError(409, 'That username is taken');
    const tz = isValidTimezone(timezone) ? timezone : 'UTC';
    const { lastInsertRowid } = stmts.insertUser.run(username, await hashPassword(password), tz);
    res.status(201).json(startSession({ id: Number(lastInsertRowid), username, timezone: tz }));
  });

  app.post('/auth/login', async (req, res) => {
    const { username, password } = req.body ?? {};
    const user = typeof username === 'string' && stmts.userByName.get(username);
    if (!user || typeof password !== 'string' || !(await verifyPassword(password, user.password_hash))) {
      throw new HttpError(401, 'Wrong username or password');
    }
    res.json(startSession(user));
  });

  app.post('/auth/logout', requireUser, (req, res) => {
    stmts.deleteSession.run(req.token);
    res.status(204).end();
  });

  // Who am I, what day is it for me, and have I posted yet?
  app.get('/me', requireUser, (req, res) => {
    const today = dayInTimezone(req.user.timezone, now());
    const post = stmts.postForDay.get(req.user.id, today);
    res.json({ user: publicUser(req.user), today, todaysPost: post ? publicPost(post) : null });
  });

  app.get('/posts', requireUser, (req, res) => {
    const before = Number(req.query.before) || Number.MAX_SAFE_INTEGER;
    const rows = stmts.feed.all(before, PAGE_SIZE);
    res.json({
      posts: rows.map(publicPost),
      nextCursor: rows.length === PAGE_SIZE ? rows.at(-1).id : null,
    });
  });

  app.post('/posts', requireUser, upload.single('photo'), async (req, res) => {
    if (!req.file) throw new HttpError(400, 'Attach a photo of your dinner');
    const caption = typeof req.body.caption === 'string' ? req.body.caption.trim() : '';
    if (caption.length > MAX_CAPTION_LENGTH) {
      await unlink(req.file.path);
      throw new HttpError(400, `Caption must be ${MAX_CAPTION_LENGTH} characters or fewer`);
    }
    const day = dayInTimezone(req.user.timezone, now());
    let row;
    try {
      row = stmts.insertPost.get(req.user.id, day, req.file.filename, caption);
    } catch (err) {
      await unlink(req.file.path);
      if (err.code === 'ERR_SQLITE_ERROR' && /UNIQUE/.test(err.message)) {
        throw new HttpError(409, "You've already shared today's dinner. Come back tomorrow!");
      }
      throw err;
    }
    res.status(201).json({ post: publicPost(stmts.postById.get(row.id)) });
  });

  // Deleting today's post frees the slot, so someone can swap a bad photo.
  app.delete('/posts/:id', requireUser, async (req, res) => {
    const post = stmts.postById.get(Number(req.params.id));
    if (!post) throw new HttpError(404, 'Post not found');
    if (post.user_id !== req.user.id) throw new HttpError(403, "You can only delete your own posts");
    stmts.deletePost.run(post.id);
    await unlink(path.join(uploadDir, post.image)).catch(() => {});
    res.status(204).end();
  });

  app.use((req, res) => res.status(404).json({ error: 'Not found' }));

  app.use((err, req, res, next) => {
    if (err instanceof multer.MulterError) {
      const message = err.code === 'LIMIT_FILE_SIZE' ? 'Photo must be 10 MB or smaller' : err.message;
      return res.status(400).json({ error: message });
    }
    const status = err.status ?? err.statusCode ?? 500;
    if (status >= 500) console.error(err);
    res.status(status).json({ error: status >= 500 ? 'Something went wrong' : err.message });
  });

  return app;
}
