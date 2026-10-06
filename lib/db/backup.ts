import fs from 'node:fs';
import path from 'node:path';
import type Database from 'better-sqlite3';
import { getDb, type HelixDb } from './client';

const PATTERN = /^helix-\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}\.db$/;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Usa a API de backup do SQLite: cópia consistente mesmo com WAL e o app no ar. */
export async function backupOnce(db: HelixDb, dir: string, now = new Date()): Promise<string> {
  fs.mkdirSync(dir, { recursive: true });
  const stamp = now.toISOString().slice(0, 19).replace(/:/g, '-');
  const file = path.join(dir, `helix-${stamp}.db`);
  // HelixDb também tipa transações, que não têm $client; em runtime o db é o drizzle raiz.
  await (db as unknown as { $client: Database.Database }).$client.backup(file);
  return file;
}

export function pruneBackups(dir: string, keep = 7): string[] {
  const files = fs.readdirSync(dir).filter((name) => PATTERN.test(name)).sort();
  const old = files.slice(0, Math.max(0, files.length - keep)).map((name) => path.join(dir, name));
  old.forEach((file) => fs.rmSync(file));
  return old;
}

/**
 * Backup no próprio processo: no Railway o volume só monta em um serviço,
 * então um cron separado não enxergaria o banco.
 */
export function startBackups(dir: string): void {
  const run = () => backupOnce(getDb(), dir)
    .then(() => pruneBackups(dir))
    .catch((error) => console.error('[backup] falhou:', error));
  void run();
  setInterval(run, DAY_MS).unref();
}
