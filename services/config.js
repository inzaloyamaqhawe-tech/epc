import { resolve } from 'node:path';
export function configFromEnv(env = process.env) {
  const demo=env.DEMO_MODE==='true', production=env.NODE_ENV==='production';
  const host=env.HOST||'127.0.0.1',port=Number(env.PORT||4310),origin=env.APP_ORIGIN||`http://127.0.0.1:${port}`;
  if(demo && (production || !['127.0.0.1','localhost','::1'].includes(host))) throw new Error('Demo mode is loopback-only and cannot run in production');
  if(production && (!origin.startsWith('https://') || !env.PRIVACY_CONTACT)) throw new Error('Production requires HTTPS APP_ORIGIN and PRIVACY_CONTACT');
  if(!['local','s3'].includes(env.STORAGE_DRIVER||'local'))throw new Error('Unsupported storage driver');
  return {demo,production,host,port,origin,dataDir:resolve(env.DATA_DIR||'data', demo?'demo':'live'),dataKey:env.DATA_KEY,storage:env.STORAGE_DRIVER||'local', issuance:env.ISSUANCE_ENABLED==='true' && !demo};
}
