import nodemailer from 'nodemailer';
import { configFromEnv } from '../services/config.js';
import { openDatabase } from '../services/database.js';
import { certificateStatus } from '../services/scoringEngine.js';
export async function runReminders(store, now=new Date(), send=null) {
  const today=now.toISOString().slice(0,10),events=[];
  for(const row of store.db.prepare("SELECT * FROM records WHERE kind='certificate'").all()){
    const c=store.unpack(row);if(certificateStatus(c,today)!=='Active')continue;
    const days=Math.ceil((Date.parse(c.expires+'T00:00:00Z')-Date.parse(today+'T00:00:00Z'))/86400000);
    // Catch up within each window without sending all missed windows at once.
    const threshold=days<=30?30:days<=60?60:days<=90?90:null;if(!threshold)continue;
    store.db.prepare('INSERT OR IGNORE INTO reminder_log(certificate,days,created) VALUES(?,?,?)').run(c.id,threshold,now.toISOString());
    const log=store.db.prepare('SELECT * FROM reminder_log WHERE certificate=? AND days=?').get(c.id,threshold);
    if(log.sent)continue;
    const event={certificate:c.internal,days,threshold,expires:c.expires,tenant:row.tenant};events.push(event);
    if(send){const recipients=store.db.prepare("SELECT email FROM users WHERE tenant=? AND role IN ('Admin','Energy Manager','Compliance Officer','Property Owner')").all(row.tenant).map(u=>u.email);if(recipients.length){await send({...event,recipients});store.db.prepare('UPDATE reminder_log SET sent=? WHERE certificate=? AND days=?').run(now.toISOString(),c.id,threshold);}}
  }return events;
}
if(process.argv[1]?.endsWith('reminders.js')){
  const config=configFromEnv(),store=openDatabase(config);let send=null;
  if(process.env.SMTP_HOST){if(!process.env.MAIL_FROM)throw new Error('MAIL_FROM required');const transport=nodemailer.createTransport({host:process.env.SMTP_HOST,port:Number(process.env.SMTP_PORT||587),secure:Number(process.env.SMTP_PORT)===465,requireTLS:Number(process.env.SMTP_PORT)!==465,auth:process.env.SMTP_USER?{user:process.env.SMTP_USER,pass:process.env.SMTP_PASS}:undefined});send=e=>transport.sendMail({from:process.env.MAIL_FROM,to:e.recipients.join(','),subject:`EPC renewal: ${e.certificate} expires in ${e.days} days`,text:`Certificate ${e.certificate} expires on ${e.expires}. Open your Bolide Energy Pro portfolio to begin renewal.`});}
  try{const events=await runReminders(store,new Date(),send);console.log(`${events.length} renewal reminder(s) ${send?'processed':'queued; SMTP not configured'}.`);}finally{store.db.close();}
}
