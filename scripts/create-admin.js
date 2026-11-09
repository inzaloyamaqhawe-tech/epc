import { createInterface } from 'node:readline/promises';
import { stdin, stdout } from 'node:process';
import { randomUUID } from 'node:crypto';
import { configFromEnv } from '../services/config.js';
import { openDatabase } from '../services/database.js';
import { hashPassword } from '../services/auth.js';
const config=configFromEnv();if(config.demo)throw new Error('Use live mode for provisioning');
const store=openDatabase(config),rl=createInterface({input:stdin,output:stdout});
try{
  const org=(await rl.question('Organisation name: ')).trim(),name=(await rl.question('Administrator name: ')).trim(),email=(await rl.question('Administrator email: ')).trim().toLowerCase();
  if(!org||!name||!/^\S+@\S+\.\S+$/.test(email))throw new Error('Valid organisation, name and email required');
  // Suppress terminal echo while the password is typed.
  stdout.write('Password (12–200 characters, hidden): ');
  const original=rl._writeToOutput;rl._writeToOutput=()=>{};
  const password=await rl.question('');rl._writeToOutput=original;stdout.write('\n');
  if(password.length<12||password.length>200)throw new Error('Password must be 12–200 characters');
  const encoded=await hashPassword(password),tenant=randomUUID(),id=randomUUID();
  store.transaction(()=>{store.db.prepare('INSERT INTO organisations VALUES(?,?)').run(tenant,org);store.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(id,tenant,email,name,'Admin',encoded);store.log({tenant,id},'organisation.provision',tenant);});
  console.log('Organisation and administrator created. Sign in through the application.');
}finally{rl.close();store.db.close();}

