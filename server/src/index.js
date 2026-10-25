import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { createApp } from './app.js';
import { openDb } from './db.js';

const port = Number(process.env.PORT) || 4000;
const dataDir = path.resolve(process.env.DATA_DIR ?? 'data');
const uploadDir = path.join(dataDir, 'uploads');
mkdirSync(uploadDir, { recursive: true });

const db = openDb(path.join(dataDir, 'dinner.db'));
createApp({ db, uploadDir }).listen(port, '0.0.0.0', () => {
  console.log(`Dinner API listening on http://0.0.0.0:${port}`);
});
