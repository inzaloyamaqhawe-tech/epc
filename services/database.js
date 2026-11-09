import { DatabaseSync } from 'node:sqlite';
import { mkdirSync, existsSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { createCipheriv, createDecipheriv, randomBytes, randomUUID } from 'node:crypto';
export function openDatabase(config) {
  mkdirSync(config.dataDir, { recursive: true, mode: 0o700 });
  let key = config.dataKey;
  if (!key && config.demo) {
    const p = resolve(config.dataDir, 'demo.key');
    if (!existsSync(p)) writeFileSync(p, randomBytes(32).toString('hex'), { mode: 0o600 });
    key = readFileSync(p, 'utf8').trim();
  }
  if (!/^[a-f0-9]{64}$/i.test(key || '')) throw new Error('DATA_KEY must be a 32-byte hexadecimal secret');
  const secret = Buffer.from(key, 'hex');
  const db = new DatabaseSync(resolve(config.dataDir, 'epc.sqlite'));
  db.exec(`PRAGMA journal_mode=WAL; PRAGMA foreign_keys=ON; PRAGMA busy_timeout=5000;
    CREATE TABLE IF NOT EXISTS organisations(id TEXT PRIMARY KEY, name TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS users(id TEXT PRIMARY KEY, tenant TEXT NOT NULL REFERENCES organisations(id), email TEXT UNIQUE NOT NULL, name TEXT NOT NULL, role TEXT NOT NULL, password TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS sessions(token TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), csrf TEXT NOT NULL, expires INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS records(id TEXT PRIMARY KEY, tenant TEXT NOT NULL REFERENCES organisations(id), kind TEXT NOT NULL, version INTEGER NOT NULL, data TEXT NOT NULL);
    CREATE INDEX IF NOT EXISTS records_scope ON records(tenant,kind);
    CREATE TABLE IF NOT EXISTS audit(id INTEGER PRIMARY KEY AUTOINCREMENT, tenant TEXT NOT NULL, user_id TEXT NOT NULL, at TEXT NOT NULL, action TEXT NOT NULL, target TEXT NOT NULL, detail TEXT NOT NULL);
    CREATE TABLE IF NOT EXISTS counters(year TEXT PRIMARY KEY, value INTEGER NOT NULL);
    CREATE TABLE IF NOT EXISTS reminder_log(certificate TEXT NOT NULL, days INTEGER NOT NULL, created TEXT NOT NULL, sent TEXT, PRIMARY KEY(certificate,days));
  `);
  function seal(value, context) {
    const iv = randomBytes(12), c = createCipheriv('aes-256-gcm', secret, iv);
    c.setAAD(Buffer.from(context));
    const data = Buffer.concat([c.update(JSON.stringify(value)), c.final()]);
    return Buffer.concat([iv, c.getAuthTag(), data]).toString('base64');
  }
  function unseal(value, context) {
    const b = Buffer.from(value, 'base64'), c = createDecipheriv('aes-256-gcm', secret, b.subarray(0,12));
    c.setAAD(Buffer.from(context)); c.setAuthTag(b.subarray(12,28));
    return JSON.parse(Buffer.concat([c.update(b.subarray(28)), c.final()]).toString());
  }
  const unpack = r => r ? { ...unseal(r.data, `${r.tenant}:${r.id}`), id: r.id, version: r.version } : null;
  function list(tenant, kind) { return db.prepare('SELECT * FROM records WHERE tenant=? AND kind=? ORDER BY rowid DESC').all(tenant, kind).map(unpack); }
  function get(tenant, kind, id) { if(typeof id!=='string')return null;return unpack(db.prepare('SELECT * FROM records WHERE tenant=? AND kind=? AND id=?').get(tenant,kind,id)); }
  function put(tenant, kind, value, expectedVersion) {
    const id = value.id || randomUUID(), old = get(tenant, kind, id);
    if (old && old.version !== expectedVersion) { const e = new Error('This record changed. Reload before saving.'); e.status = 409; throw e; }
    const version = (old?.version || 0) + 1;
    if (old) db.prepare('UPDATE records SET version=?,data=? WHERE id=? AND tenant=? AND kind=?').run(version,seal(value,`${tenant}:${id}`),id,tenant,kind);
    else db.prepare('INSERT INTO records(id,tenant,kind,version,data) VALUES(?,?,?,?,?)').run(id,tenant,kind,version,seal(value,`${tenant}:${id}`));
    return { ...value, id, version };
  }
  function log(user, action, target, detail = {}) { db.prepare('INSERT INTO audit(tenant,user_id,at,action,target,detail) VALUES(?,?,?,?,?,?)').run(user.tenant,user.id,new Date().toISOString(),action,target,seal(detail, user.tenant)); }
  function transaction(fn) { db.exec('BEGIN IMMEDIATE'); try { const result=fn(); db.exec('COMMIT'); return result; } catch(e) { db.exec('ROLLBACK'); throw e; } }
  function tracking() {
    const year = new Date().getUTCFullYear().toString();
    db.prepare('INSERT INTO counters(year,value) VALUES(?,1) ON CONFLICT(year) DO UPDATE SET value=value+1').run(year);
    return `BEP-${year}-${String(db.prepare('SELECT value FROM counters WHERE year=?').get(year).value).padStart(5,'0')}`;
  }
  return { db, get, list, put, log, transaction, tracking, seal, unseal, unpack };
}
