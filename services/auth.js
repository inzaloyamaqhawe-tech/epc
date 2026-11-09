import { argon2, randomBytes, timingSafeEqual, createHash } from 'node:crypto';
import { promisify } from 'node:util';
const derive = promisify(argon2);
export const ROLES = ['Super Admin','Admin','Energy Manager','Reviewer','Assessor','Property Owner','Compliance Officer'];
export const hashToken = v => createHash('sha256').update(v).digest('hex');
export async function hashPassword(password, salt = randomBytes(16)) {
  const hash = await derive('argon2id', { message: password, nonce: salt, memory: 19456, passes: 2, parallelism: 1, tagLength: 32 });
  return `$argon2id$v=19$m=19456,t=2,p=1$${salt.toString('base64')}$${hash.toString('base64')}`;
}
export async function verifyPassword(password, encoded) {
  try {
    const parts = encoded.split('$'), generated = await hashPassword(password, Buffer.from(parts[4], 'base64'));
    return timingSafeEqual(Buffer.from(encoded), Buffer.from(generated));
  } catch { return false; }
}
export function sessionMiddleware(store) {
  return (req,res,next) => {
    const raw = req.headers.cookie?.split(';').map(v=>v.trim()).find(v=>v.startsWith('epc_session='))?.slice(12);
    if (raw && /^[a-f0-9]{64}$/.test(raw)) {
      const row = store.db.prepare('SELECT s.csrf,s.expires,u.id,u.tenant,u.email,u.name,u.role FROM sessions s JOIN users u ON s.user_id=u.id WHERE s.token=? AND s.expires>?').get(hashToken(raw), Date.now());
      if (row) { req.user = row; req.sessionToken = hashToken(raw); }
    }
    next();
  };
}
export function requireUser(req,res,next) { if (!req.user) return res.status(401).json({error:'Sign in to continue'}); next(); }
export const allow = (...roles) => (req,res,next) => { if (!roles.includes(req.user.role)) return res.status(403).json({error:'Your role cannot perform this action'}); next(); };
export function csrf(req,res,next) {
  if (!['GET','HEAD','OPTIONS'].includes(req.method) && req.user && req.headers['x-csrf-token'] !== req.user.csrf) return res.status(403).json({error:'Session verification failed. Refresh and retry.'});
  next();
}
