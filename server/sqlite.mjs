import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
export function openDatabase(filename = ':memory:') {
  const db = new DatabaseSync(filename);
  db.exec(readFileSync(new URL('./schema.sql', import.meta.url), 'utf8'));
  const adapter = {
    prepare(sql) {
      let parameters = [];
      return {
        bind(...values) { parameters = values; return this; },
        async first() { return db.prepare(sql).get(...parameters) || null; },
        async run() { const meta = db.prepare(sql).run(...parameters); return { success: true, meta }; },
        async all() { return { success: true, results: db.prepare(sql).all(...parameters) }; },
        _execute() { const statement = db.prepare(sql); return statement.columns().length ? { success: true, results: statement.all(...parameters) } : { success: true, results: [], meta: statement.run(...parameters) }; }
      };
    },
    async batch(statements) {
      db.exec('BEGIN');
      try { const results = statements.map(s => s._execute()); db.exec('COMMIT'); return results; }
      catch(error) { db.exec('ROLLBACK'); throw error; }
    },
    close() { db.close(); }
  };
  return adapter;
}
