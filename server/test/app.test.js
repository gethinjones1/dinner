import assert from 'node:assert/strict';
import { mkdirSync, mkdtempSync, readdirSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { after, before, beforeEach, describe, it } from 'node:test';
import { createApp } from '../src/app.js';
import { openDb } from '../src/db.js';
import { dayInTimezone, streakLength } from '../src/day.js';

const JPEG = new Uint8Array([0xff, 0xd8, 0xff, 0xe0, 0, 0x10, 0x4a, 0x46, 0x49, 0x46, 0xff, 0xd9]);

let server, base, dir, uploadDir, clock;

before(async () => {
  dir = mkdtempSync(path.join(tmpdir(), 'dinner-test-'));
  uploadDir = path.join(dir, 'uploads');
  mkdirSync(uploadDir);
  const app = createApp({ db: openDb(path.join(dir, 'test.db')), uploadDir, now: () => clock });
  server = app.listen(0);
  await new Promise((r) => server.once('listening', r));
  base = `http://127.0.0.1:${server.address().port}`;
});

after(() => {
  server.close();
  rmSync(dir, { recursive: true, force: true });
});

beforeEach(() => {
  clock = new Date('2026-10-25T18:00:00Z');
});

let n = 0;
async function register(timezone = 'UTC') {
  const res = await fetch(`${base}/auth/register`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ username: `user_${++n}`, password: 'password123', timezone }),
  });
  assert.equal(res.status, 201);
  return (await res.json()).token;
}

function post(token, { caption = 'Pasta', type = 'image/jpeg' } = {}) {
  const form = new FormData();
  form.append('photo', new Blob([JPEG], { type }), 'dinner.jpg');
  form.append('caption', caption);
  return fetch(`${base}/posts`, { method: 'POST', headers: { authorization: `Bearer ${token}` }, body: form });
}

const get = (token, p) => fetch(base + p, { headers: { authorization: `Bearer ${token}` } }).then((r) => r.json());

describe('dayInTimezone', () => {
  it('uses the local calendar date', () => {
    const d = new Date('2026-10-25T23:30:00Z');
    assert.equal(dayInTimezone('UTC', d), '2026-10-25');
    assert.equal(dayInTimezone('Asia/Tokyo', d), '2026-10-26');
    assert.equal(dayInTimezone('America/Los_Angeles', d), '2026-10-25');
  });
});

describe('streakLength', () => {
  it('counts consecutive days ending today or yesterday', () => {
    assert.equal(streakLength([], '2026-10-25'), 0);
    assert.equal(streakLength(['2026-10-25', '2026-10-24', '2026-10-22'], '2026-10-25'), 2);
    assert.equal(streakLength(['2026-10-24', '2026-10-23'], '2026-10-25'), 2);
    assert.equal(streakLength(['2026-10-23'], '2026-10-25'), 0);
    assert.equal(streakLength(['2026-11-01', '2026-10-31'], '2026-11-01'), 2);
  });
});

describe('auth', () => {
  it('rejects bad credentials and unauthenticated requests', async () => {
    await register();
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: `user_${n}`, password: 'wrong-password' }),
    });
    assert.equal(res.status, 401);
    assert.equal((await fetch(`${base}/posts`)).status, 401);
  });

  it('logs in with the right password', async () => {
    await register();
    const res = await fetch(`${base}/auth/login`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ username: `USER_${n}`, password: 'password123' }),
    });
    assert.equal(res.status, 200);
    assert.equal((await res.json()).user.username, `user_${n}`);
  });
});

describe('posting', () => {
  it('allows one photo per day', async () => {
    const token = await register();
    const first = await post(token);
    assert.equal(first.status, 201);
    const { post: created } = await first.json();
    assert.equal(created.day, '2026-10-25');
    assert.equal(created.caption, 'Pasta');

    const second = await post(token, { caption: 'Dessert' });
    assert.equal(second.status, 409);

    const me = await get(token, '/me');
    assert.equal(me.todaysPost.id, created.id);

    const img = await fetch(base + created.imageUrl);
    assert.equal(img.status, 200);
  });

  it('opens a new slot the next day', async () => {
    const token = await register();
    assert.equal((await post(token)).status, 201);
    clock = new Date('2026-10-26T18:00:00Z');
    assert.equal((await get(token, '/me')).todaysPost, null);
    assert.equal((await get(token, '/me')).streak, 1);
    assert.equal((await post(token)).status, 201);
    assert.equal((await get(token, '/me')).streak, 2);
  });

  it("follows the user's timezone, not the server's", async () => {
    const token = await register('Asia/Tokyo');
    clock = new Date('2026-10-25T14:00:00Z'); // 23:00 in Tokyo
    assert.equal((await post(token)).status, 201);
    clock = new Date('2026-10-25T15:30:00Z'); // 00:30 the next day in Tokyo
    assert.equal((await post(token)).status, 201);
  });

  it('removes the uploaded file when the post is rejected', async () => {
    const token = await register();
    await post(token);
    const before = readdirSync(uploadDir).length;
    assert.equal((await post(token)).status, 409);
    assert.equal(readdirSync(uploadDir).length, before);
  });

  it('rejects non-images and missing photos', async () => {
    const token = await register();
    assert.equal((await post(token, { type: 'text/plain' })).status, 400);
    const res = await fetch(`${base}/posts`, {
      method: 'POST',
      headers: { authorization: `Bearer ${token}` },
      body: new FormData(),
    });
    assert.equal(res.status, 400);
  });

  it('lets you delete your own post and post again, but not others', async () => {
    const alice = await register();
    const bob = await register();
    const { post: p } = await (await post(alice)).json();

    const del = (token) => fetch(`${base}/posts/${p.id}`, { method: 'DELETE', headers: { authorization: `Bearer ${token}` } });
    assert.equal((await del(bob)).status, 403);
    assert.equal((await del(alice)).status, 204);
    assert.equal((await post(alice)).status, 201);
  });
});

describe('feed', () => {
  it("shows everyone's posts, newest first", async () => {
    const a = await register();
    const b = await register();
    await post(a, { caption: 'first' });
    await post(b, { caption: 'second' });
    const { posts } = await get(a, '/posts');
    assert.deepEqual(posts.slice(0, 2).map((p) => p.caption), ['second', 'first']);
  });
});
