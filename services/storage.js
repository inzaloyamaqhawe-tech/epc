import { mkdir, writeFile, readFile, unlink } from 'node:fs/promises';
import { resolve } from 'node:path';
import { randomBytes, createCipheriv, createDecipheriv } from 'node:crypto';
import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
export function storageAdapter(config, key) {
  const root = resolve(config.dataDir,'uploads'), s3 = config.storage === 's3' ? new S3Client({region: process.env.AWS_REGION || 'af-south-1'}) : null;
  if (s3 && !process.env.S3_BUCKET) throw new Error('S3_BUCKET required');
  const check = k => { if (!/^[a-f0-9-]+\/[a-f0-9-]+$/.test(k)) throw new Error('Invalid storage key'); return k; };
  return {
    async put(keyName, bytes) {
      const k=check(keyName), iv=randomBytes(12), cipher=createCipheriv('aes-256-gcm',key,iv); cipher.setAAD(Buffer.from(k));
      const data=Buffer.concat([cipher.update(bytes),cipher.final()]); const body=Buffer.concat([iv,cipher.getAuthTag(),data]);
      if (s3) await s3.send(new PutObjectCommand({Bucket:process.env.S3_BUCKET, Key:k, Body:body, ServerSideEncryption:'AES256', ContentType:'application/octet-stream'}));
      else { await mkdir(resolve(root,k.split('/')[0]),{recursive:true,mode:0o700}); await writeFile(resolve(root,k),body,{mode:0o600}); }
    },
    async get(keyName) {
      const k=check(keyName), bytes=s3 ? Buffer.from(await (await s3.send(new GetObjectCommand({Bucket:process.env.S3_BUCKET,Key:k}))).Body.transformToByteArray()) : await readFile(resolve(root,k));
      const c=createDecipheriv('aes-256-gcm',key,bytes.subarray(0,12)); c.setAAD(Buffer.from(k)); c.setAuthTag(bytes.subarray(12,28));
      return Buffer.concat([c.update(bytes.subarray(28)),c.final()]);
    },
    async remove(k) {check(k); if(s3) await s3.send(new DeleteObjectCommand({Bucket:process.env.S3_BUCKET,Key:k})); else await unlink(resolve(root,k)); }
  };
}
