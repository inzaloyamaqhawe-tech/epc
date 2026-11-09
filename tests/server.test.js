import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdirSync,mkdtempSync,readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {randomBytes,randomUUID} from 'node:crypto';
import {createApp} from '../server.js';
import {hashPassword} from '../services/auth.js';
import {exampleAssessment} from '../services/seed.js';
import {runReminders} from '../scripts/reminders.js';
test('HTTP integration: tenant boundaries, evidence, role gates, revisions, activation, PDF, public verification and invitations',async t=>{
  mkdirSync('work',{recursive:true});const dataDir=mkdtempSync(resolve('work','test-'));
  const config={demo:false,production:false,host:'127.0.0.1',port:0,origin:'',dataDir,dataKey:randomBytes(32).toString('hex'),storage:'local',issuance:true};
  const {app,store}=await createApp(config),server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));config.origin=`http://127.0.0.1:${server.address().port}`;
  t.after(()=>{server.close();store.db.close();});
  const password='A-long-test-password-2026',encoded=await hashPassword(password),tenantA=randomUUID(),tenantB=randomUUID();
  for(const tenant of [tenantA,tenantB])store.db.prepare('INSERT INTO organisations VALUES(?,?)').run(tenant,'Test organisation');
  const users=[['assessor','Assessor',tenantA],['reviewer','Reviewer',tenantA],['admin','Admin',tenantA],['owner','Property Owner',tenantA],['outsider','Admin',tenantB]];
  for(const [name,role,tenant] of users)store.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(randomUUID(),tenant,name+'@example.invalid',name,role,encoded);
  async function call(path,method='GET',body=null,session=null,extra={}){const headers={Origin:config.origin,...extra};if(session){headers.Cookie=session.cookie;headers['X-CSRF-Token']=session.csrf;}if(body && !(body instanceof FormData))headers['Content-Type']='application/json';const res=await fetch(config.origin+'/api'+path,{method,headers,body:body instanceof FormData?body:body?JSON.stringify(body):undefined});const json=res.headers.get('content-type')?.includes('json')?await res.json():null;return{res,json};}
  async function login(name){const {res,json}=await call('/login','POST',{email:name+'@example.invalid',password});assert.equal(res.status,200);assert.match(res.headers.get('set-cookie'),/HttpOnly/i);assert.match(res.headers.get('set-cookie'),/SameSite=Strict/i);return{cookie:res.headers.get('set-cookie').split(';')[0],csrf:json.csrf};}
  const assessor=await login('assessor'),reviewer=await login('reviewer'),admin=await login('admin'),owner=await login('owner'),outsider=await login('outsider');
  await t.test('authentication, CSRF, origin and role checks',async()=>{
    assert.equal((await call('/portfolio')).res.status,401);
    assert.equal((await call('/assessments','POST',exampleAssessment(),{...assessor,csrf:''})).res.status,403);
    assert.equal((await call('/assessments','POST',exampleAssessment(),assessor,{Origin:'https://evil.invalid'})).res.status,403);
    assert.equal((await call('/assessments','POST',exampleAssessment(),owner)).res.status,403);
    assert.equal((await call('/demo-login','POST',{})).res.status,404);
    const {res}=await call('/config');assert.match(res.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.equal(res.headers.get('x-content-type-options'),'nosniff');
  });
  let a;
  await t.test('tenant isolation, normalization and optimistic concurrency',async()=>{
    const result=await call('/assessments','POST',{...exampleAssessment('<script>alert(1)</script>'),tenant:tenantB,status:'Approved'},assessor);assert.equal(result.res.status,201);a=result.json;assert.equal(a.status,'Draft');
    assert.equal((await call('/portfolio','GET',null,outsider)).json.assessments.length,0);
    assert.equal((await call(`/assessments/${a.id}`,'PUT',{...a,name:'Stolen'},outsider)).res.status,404);
    assert.equal((await call(`/assessments/${a.id}`,'PUT',{...a,version:0},assessor)).res.status,409);
    assert.equal((await call(`/assessments/${a.id}/transition`,'POST',{status:'Approved',version:a.version,confirmBenchmark:true,confirmProfessional:true},reviewer)).res.status,409);
    assert.equal((await call(`/assessments/${a.id}/transition`,'POST',{status:'Submitted',version:a.version},assessor)).res.status,422);
  });
  let documentId;
  await t.test('encrypted evidence, file signatures and cross-tenant access',async()=>{
    for(const kind of ['Utility bills','Building plans','Site audit']){const form=new FormData();form.append('kind',kind);form.append('file',new Blob(['%PDF-1.4\nTEST EVIDENCE'],{type:'application/pdf'}),'evidence.pdf');const r=await call(`/assessments/${a.id}/documents`,'POST',form,assessor);assert.equal(r.res.status,201);documentId=r.json.id;}
    assert.equal((await call(`/documents/${documentId}`,'GET',null,outsider)).res.status,404);
    const doc=store.get(tenantA,'document',documentId);const encrypted=readFileSync(resolve(dataDir,'uploads',doc.key));assert.equal(encrypted.includes(Buffer.from('TEST EVIDENCE')),false);
    const form=new FormData();form.append('kind','Utility bills');form.append('file',new Blob(['<script>bad</script>'],{type:'application/pdf'}),'pretend.pdf');assert.equal((await call(`/assessments/${a.id}/documents`,'POST',form,assessor)).res.status,400);
    const record=store.db.prepare('SELECT data FROM records WHERE id=?').get(a.id);assert.equal(record.data.includes('script'),false);
  });
  await t.test('submit freezes edits; self review and unconfirmed approval rejected; field revisions persist',async()=>{
    let r=await call(`/assessments/${a.id}/transition`,'POST',{status:'Submitted',version:a.version},assessor);assert.equal(r.res.status,200);a=r.json;
    assert.equal((await call(`/assessments/${a.id}`,'PUT',a,assessor)).res.status,409);
    assert.equal((await call(`/documents/${documentId}`,'DELETE',null,assessor)).res.status,409);
    assert.equal((await call(`/assessments/${a.id}/transition`,'POST',{status:'Under Review',version:a.version},assessor)).res.status,403);
    r=await call(`/assessments/${a.id}/transition`,'POST',{status:'Under Review',version:a.version},reviewer);assert.equal(r.res.status,200);a=r.json;
    assert.equal((await call(`/assessments/${a.id}/transition`,'POST',{status:'Approved',version:a.version},reviewer)).res.status,400);
    r=await call(`/assessments/${a.id}/transition`,'POST',{status:'Revision Required',version:a.version,field:'months',comment:'Reconcile invoices'},reviewer);assert.equal(r.res.status,200);a=r.json;assert.equal(a.notes[0].field,'months');
    r=await call(`/assessments/${a.id}`,'PUT',{...a,name:'Verified example'},assessor);assert.equal(r.res.status,200);a=r.json;
    for(const [status,user] of [['Submitted',assessor],['Under Review',reviewer],['Approved',reviewer]]){r=await call(`/assessments/${a.id}/transition`,'POST',{status,version:a.version,confirmBenchmark:true,confirmProfessional:true},user);assert.equal(r.res.status,200,JSON.stringify(r.json));a=r.json;}
  });
  let c;
  await t.test('SANEDI activation requires official PDF and POPIA; verification reveals minimal fields; PDF exports',async()=>{
    c=(await call('/portfolio','GET',null,admin)).json.certificates[0];assert.match(c.internal,/^BEP-\d{4}-\d{5}$/);
    assert.equal((await call(`/certificates/${c.id}/activate`,'POST',{sanedi:'TEST-001',issued:'2026-01-01',version:c.version},reviewer)).res.status,400);
    const form=new FormData();form.append('kind','Issued EPC');form.append('file',new Blob(['%PDF-1.4\nISSUED TEST'],{type:'application/pdf'}),'issued.pdf');const doc=(await call(`/assessments/${a.id}/documents`,'POST',form,assessor)).json;
    const r=await call(`/certificates/${c.id}/activate`,'POST',{sanedi:'TEST-001',issued:'2026-01-01',version:c.version,popia:true,professionalConfirmed:true,documentId:doc.id},reviewer);assert.equal(r.res.status,200);c=r.json;assert.equal(c.expires,'2031-01-01');
    const pub=await call('/verify/'+c.publicToken);assert.equal(pub.json.status,'Active');assert.equal(pub.json.address,undefined);assert.equal(pub.json.tenant,undefined);
    const pdf=await call(`/assessments/${a.id}/pdf`,'GET',null,admin);assert.equal(pdf.res.status,200);assert.equal(Buffer.from(await pdf.res.arrayBuffer()).subarray(0,5).toString(),'%PDF-');
    assert.equal((await call(`/assessments/${a.id}/pdf`,'GET',null,outsider)).res.status,404);
  });
  await t.test('single-use invitations and role enforcement',async()=>{
    assert.equal((await call('/team/invite','POST',{email:'new@example.invalid',role:'Admin'},assessor)).res.status,403);
    const r=await call('/team/invite','POST',{email:'new@example.invalid',role:'Assessor'},admin);assert.equal(r.res.status,201);const token=new URL(r.json.url).searchParams.get('invite');
    assert.equal((await call('/invites/accept','POST',{token,name:'New colleague',password:'Long-password-12345'})).res.status,200);
    assert.equal((await call('/invites/accept','POST',{token,name:'New colleague',password:'Long-password-12345'})).res.status,400);
  });
  await t.test('renewal creates independent draft; revocation is audited and public status updates',async()=>{
    const next=await call(`/assessments/${a.id}/renew`,'POST',{},assessor);assert.equal(next.res.status,201);assert.equal(next.json.renewalOf,a.id);assert.equal(next.json.months.length,0);
    const r=await call(`/certificates/${c.id}/revoke`,'POST',{version:c.version,reason:'Test withdrawal'},reviewer);assert.equal(r.res.status,200);assert.equal((await call('/verify/'+c.publicToken)).json.status,'Revoked');
    const events=(await call('/audit','GET',null,admin)).json;assert.ok(events.some(e=>e.action==='certificate.revoke'));
    assert.equal((await call('/audit','GET',null,outsider)).json.some(e=>e.action==='certificate.revoke'),false);
  });
  await t.test('renewal reminders catch up, deduplicate and retry failed delivery',async()=>{
    const reminder=store.put(tenantA,'certificate',{status:'Active',internal:'REMINDER-TEST',expires:'2027-03-31'});let calls=0;const send=async()=>{calls++;};
    await runReminders(store,new Date('2027-01-01'),send);await runReminders(store,new Date('2027-01-02'),send);assert.equal(calls,1);
    await runReminders(store,new Date('2027-02-05'),send);assert.equal(calls,2);await assert.rejects(runReminders(store,new Date('2027-03-05'),async()=>{throw new Error('SMTP failure');}));
    await runReminders(store,new Date('2027-03-06'),send);assert.equal(calls,3);assert.equal(store.db.prepare('SELECT count(*) AS n FROM reminder_log WHERE certificate=? AND sent IS NOT NULL').get(reminder.id).n,3);
  });
  await t.test('authentication rate limit is actually attached',async()=>{
    let blocked=false;for(let i=0;i<22;i++){const r=await call('/login','POST',{email:'missing@example.invalid',password:'wrong'});if(r.res.status===429){blocked=true;break;}}assert.equal(blocked,true);
  });
});
