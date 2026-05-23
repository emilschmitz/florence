import sqlite3 from 'sqlite3';
import { open, Database } from 'sqlite';
import path from 'path';

let db: Database | null = null;

export async function getDb() {
  if (db) return db;

  db = await open({
    filename: path.join(__dirname, 'data', 'florence.db'),
    driver: sqlite3.Database
  });

  await db.exec(`
    CREATE TABLE IF NOT EXISTS grounding (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT,
      description TEXT,
      validity TEXT,
      use_case TEXT
    );

    CREATE TABLE IF NOT EXISTS patients (
      id TEXT PRIMARY KEY,
      name TEXT,
      condition TEXT,
      medications TEXT,
      history TEXT,
      next_provider_visit TEXT
    );

    CREATE TABLE IF NOT EXISTS config (
      key TEXT PRIMARY KEY,
      value TEXT
    );
  `);

  try {
    await db.exec('ALTER TABLE patients ADD COLUMN next_provider_visit TEXT');
  } catch (e) {
    // Ignore if column already exists
  }

  return db;
}
