// @vitest-environment node
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import Database from 'better-sqlite3';
import { createTestDb, type HelixDb } from './client';
import { createTestUser } from './test-users';
import { backupOnce, pruneBackups } from './backup';

let dir: string;
let db: HelixDb;
let close: () => void;
beforeEach(() => { dir = fs.mkdtempSync(path.join(os.tmpdir(), 'helix-backup-')); ({ db, close } = createTestDb()); });
afterEach(() => { close(); fs.rmSync(dir, { recursive: true, force: true }); });

describe('backup', () => {
  it('gera um arquivo SQLite datado e legível', async () => {
    createTestUser(db);
    const file = await backupOnce(db, dir, new Date('2026-10-05T03:00:00Z'));
    expect(path.basename(file)).toBe('helix-2026-10-05T03-00-00.db');
    const copy = new Database(file, { readonly: true });
    expect(copy.prepare('select count(*) as n from stages').get()).toEqual({ n: 6 });
    copy.close();
  });

  it('mantém só os 7 mais recentes', () => {
    for (let d = 1; d <= 9; d++) fs.writeFileSync(path.join(dir, `helix-2026-10-0${d}T03-00-00.db`), '');
    fs.writeFileSync(path.join(dir, 'outro-arquivo.txt'), '');
    const removed = pruneBackups(dir, 7);
    expect(removed.map((f) => path.basename(f))).toEqual(['helix-2026-10-01T03-00-00.db', 'helix-2026-10-02T03-00-00.db']);
    expect(fs.readdirSync(dir)).toContain('outro-arquivo.txt');
  });
});
