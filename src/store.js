import { DatabaseSync } from 'node:sqlite';
import { mkdirSync } from 'node:fs';
import { dirname } from 'node:path';
import { randomUUID } from 'node:crypto';
import { initialState } from './fixture.js';

export function openStore(path) {
  if (path !== ':memory:') mkdirSync(dirname(path), { recursive: true });
  const db = new DatabaseSync(path);
  db.exec('PRAGMA journal_mode=WAL; PRAGMA synchronous=FULL; PRAGMA busy_timeout=5000; CREATE TABLE IF NOT EXISTS workspace (id INTEGER PRIMARY KEY CHECK(id=1), value TEXT NOT NULL);');
  if (!db.prepare('SELECT id FROM workspace WHERE id=1').get()) db.prepare('INSERT INTO workspace VALUES (1, ?)').run(JSON.stringify(initialState()));
  return {
    read() { return JSON.parse(String(db.prepare('SELECT value FROM workspace WHERE id=1').get().value)); },
    update(fn) {
      db.exec('BEGIN IMMEDIATE');
      try {
        const state = this.read();
        const result = fn(state);
        if (result && typeof result.then === 'function') throw new Error('Store transactions must be synchronous');
        state.revision++;
        db.prepare('UPDATE workspace SET value=? WHERE id=1').run(JSON.stringify(state));
        db.exec('COMMIT');
        return result;
      } catch (error) { db.exec('ROLLBACK'); throw error; }
    },
    close() { db.close(); },
  };
}

export function event(state, type, message, details = {}) {
  const item = { id: randomUUID(), type, message, at: new Date().toISOString(), ...details };
  state.events.push(item);
  return item;
}
