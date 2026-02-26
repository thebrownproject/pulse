import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const DB_PATH = path.join(process.cwd(), "data", "gsc.db");

function createDb(): Database.Database {
  fs.mkdirSync(path.dirname(DB_PATH), { recursive: true });

  const db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");

  db.exec(`
    CREATE TABLE IF NOT EXISTS gsc (
      analytics_date TEXT NOT NULL,
      keyword TEXT NOT NULL,
      page_url TEXT NOT NULL,
      clicks INTEGER NOT NULL DEFAULT 0,
      impressions INTEGER NOT NULL DEFAULT 0,
      ctr REAL NOT NULL DEFAULT 0,
      position REAL NOT NULL DEFAULT 0
    );
    CREATE INDEX IF NOT EXISTS idx_gsc_date ON gsc(analytics_date);
  `);

  return db;
}

// Singleton: survives Next.js HMR in development
const globalForDb = globalThis as unknown as { __db?: Database.Database };
export const db = globalForDb.__db ?? (globalForDb.__db = createDb());
