import express from 'express';
import helmet from 'helmet';
import { rateLimit } from 'express-rate-limit';
import multer from 'multer';
import { randomBytes, randomUUID, createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { configFromEnv } from './services/config.js';
import { openDatabase } from './services/database.js';
import { sessionMiddleware, requireUser, allow, csrf, hashPassword, verifyPassword, hashToken, ROLES } from './services/auth.js';
import { storageAdapter } from './services/storage.js';
import { normalizeAssessment } from './services/normalization.js';
import { calculate, validateAssessment, anniversary, certificateStatus, savings, validDate } from './services/scoringEngine.js';
import { assessmentPdf } from './services/pdf.js';
import { seedDemo } from './services/seed.js';
import { REFERENCES, REFERENCE_SOURCE, ZONES } from './services/benchmarkMatrix.js';
const EDIT=['Super Admin','Admin','Energy Manager','Assessor'];
const REVIEW=['Super Admin','Admin','Reviewer'];
const ADMIN=['Super Admin','Admin'];
function fail(message,status=400){const e=new Error(message);e.status=status;throw e;}
export async function createApp(config = configFromEnv()) {
  const store=openDatabase(config), app=express();
  let dataKey=config.dataKey;
  if(!dataKey && config.demo)dataKey=readFileSync(resolve(config.dataDir,'demo.key'),'utf8').trim();
  const storage=storageAdapter(config,Buffer.from(dataKey,'hex'));
  if(config.demo)await seedDemo(store);
  app.disable('x-powered-by');
  app.set('trust proxy',config.production?1:false);
  app.use(helmet({contentSecurityPolicy:{directives:{'default-src':["'self'"],'script-src':["'self'"],'style-src':["'self'"],'img-src':["'self'",'data:'],'connect-src':["'self'"],'frame-ancestors':["'none'"],'upgrade-insecure-requests':config.production?[]:null}},strictTransportSecurity:config.production?undefined:false}));
  app.use(express.json({limit:'250kb'}));
  app.use('/api',rateLimit({windowMs:60000,limit:180,standardHeaders:'draft-8',legacyHeaders:false}));
  app.use(sessionMiddleware(store));
  app.use('/api',(req,res,next)=>{res.set('Cache-Control','no-store');if(!['GET','HEAD','OPTIONS'].includes(req.method) && req.headers.origin!==config.origin)return res.status(403).json({error:'Request origin rejected'}); next();});
  app.use('/api',csrf);
  const authLimit=rateLimit({windowMs:15*60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false});
  const submissionLimit=rateLimit({windowMs:60000,limit:20,standardHeaders:'draft-8',legacyHeaders:false});
  app.get('/api/config',(req,res)=>res.json({demo:config.demo,issuance:config.issuance,references:REFERENCES,referenceSource:REFERENCE_SOURCE,zones:ZONES,privacyContact:process.env.PRIVACY_CONTACT||null,initialized:Boolean(store.db.prepare('SELECT 1 FROM users LIMIT 1').get())}));
  async function loginUser(user,res) {
    const token=randomBytes(32).toString('hex'),csrfToken=randomBytes(24).toString('hex');
    store.db.prepare('DELETE FROM sessions WHERE expires<?').run(Date.now());
    store.db.prepare('INSERT INTO sessions VALUES(?,?,?,?)').run(hashToken(token),user.id,csrfToken,Date.now()+8*3600000);
    res.cookie('epc_session',token,{httpOnly:true,secure:config.production,sameSite:'strict',path:'/',maxAge:8*3600000});
    store.log(user,'auth.login',user.id);res.json({user:{id:user.id,name:user.name,email:user.email,role:user.role,tenant:user.tenant},csrf:csrfToken});
  }
  const dummy=await hashPassword(randomBytes(24).toString('hex'));
  app.post('/api/login',authLimit,async(req,res)=>{
    const email=String(req.body.email||'').toLowerCase().trim(),password=String(req.body.password||'');
    if(password.length>200)fail('Invalid credentials',401);
    const user=store.db.prepare('SELECT * FROM users WHERE email=?').get(email);
    const valid=await verifyPassword(password,user?.password||dummy);
    if(!user||!valid)fail('Invalid email or password',401);
    await loginUser(user,res);
  });
  app.post('/api/demo-login',authLimit,async(req,res)=>{
    if(!config.demo)fail('Not found',404);
    const role=['Admin','Assessor','Reviewer'].includes(req.body.role)?req.body.role:'Admin';
    const user=store.db.prepare('SELECT * FROM users WHERE email=?').get(`demo.${role.toLowerCase()}@example.invalid`);await loginUser(user,res);
  });
  app.post('/api/logout',requireUser,(req,res)=>{store.db.prepare('DELETE FROM sessions WHERE token=?').run(req.sessionToken);res.clearCookie('epc_session',{path:'/',sameSite:'strict',secure:config.production,httpOnly:true});res.json({ok:true});});
  app.get('/api/me',requireUser,(req,res)=>res.json({user:{id:req.user.id,tenant:req.user.tenant,email:req.user.email,name:req.user.name,role:req.user.role},csrf:req.user.csrf}));
  app.get('/api/portfolio',requireUser,(req,res)=>{
    const assessments=store.list(req.user.tenant,'assessment').map(a=>{let result=null;try{result=calculate(a);}catch{}return{...a,result};});
    const certificates=store.list(req.user.tenant,'certificate').map(c=>({...c,status:certificateStatus(c)}));
    const initiatives=store.list(req.user.tenant,'initiative').map(i=>({...i,result:savings(i)}));
    res.json({assessments,certificates,initiatives,compliance:store.list(req.user.tenant,'compliance'),documents:store.list(req.user.tenant,'document').map(({key,sha256,...d})=>d)});
  });
  const assessment=(req)=>store.get(req.user.tenant,'assessment',req.params.id)||fail('Assessment not found',404);
  app.post('/api/assessments',requireUser,allow(...EDIT),(req,res)=>{
    const value=normalizeAssessment(req.body);const a=store.transaction(()=>{const a=store.put(req.user.tenant,'assessment',{...value,status:'Draft',propertyId:`PROP-${randomBytes(4).toString('hex').toUpperCase()}`,createdBy:req.user.id,updatedAt:new Date().toISOString(),notes:[]});store.log(req.user,'assessment.create',a.id);return a;});res.status(201).json(a);
  });
  app.put('/api/assessments/:id',requireUser,allow(...EDIT),(req,res)=>{
    const old=assessment(req);if(!['Draft','Revision Required'].includes(old.status))fail('Only drafts or requested revisions can be edited',409);
    const a=store.transaction(()=>{const a=store.put(req.user.tenant,'assessment',{...old,...normalizeAssessment(req.body),lastEditedBy:req.user.id,updatedAt:new Date().toISOString()},req.body.version);store.log(req.user,'assessment.update',a.id);return a;});res.json(a);
  });
  app.get('/api/assessments/:id/validation',requireUser,(req,res)=>{const a=assessment(req);res.json({errors:validateAssessment(a,store.list(req.user.tenant,'document').filter(d=>d.assessmentId===a.id))});});
  app.post('/api/assessments/:id/transition',requireUser,submissionLimit,(req,res)=>{
    const a=assessment(req), target=req.body.status;
    if(a.version!==req.body.version)fail('Record changed. Reload before continuing.',409);
    if(target==='Submitted') {
      if(!EDIT.includes(req.user.role))fail('Only an assessor or manager may submit',403);
      if(!['Draft','Revision Required'].includes(a.status))fail('Invalid status transition',409);
      const errors=validateAssessment(a,store.list(req.user.tenant,'document').filter(d=>d.assessmentId===a.id));
      if(errors.length)return res.status(422).json({error:'Resolve validation issues before submission',errors});
    } else {
      if(!REVIEW.includes(req.user.role))fail('Reviewer role required',403);
      if([a.createdBy,a.lastEditedBy,a.submittedBy].includes(req.user.id))fail('A different person must review this assessment',403);
      if(target==='Under Review' && a.status!=='Submitted')fail('Submit before starting review',409);
      if(['Approved','Revision Required'].includes(target)&&a.status!=='Under Review')fail('Start review first',409);
      if(!['Under Review','Approved','Revision Required'].includes(target))fail('Invalid status');
      if(target==='Revision Required' && !String(req.body.comment||'').trim())fail('A field-level revision comment is required');
      if(target==='Approved' && (!req.body.confirmBenchmark || !req.body.confirmProfessional))fail('Confirm benchmark methodology and professional registration independently');
    }
    const updated=store.transaction(()=>{
      const notes=[...a.notes];if(req.body.comment)notes.push({field:String(req.body.field||'general').slice(0,80),comment:String(req.body.comment).slice(0,2000),by:req.user.name,at:new Date().toISOString()});
      const saved=store.put(req.user.tenant,'assessment',{...a,status:target,notes,submittedBy:target==='Submitted'?req.user.id:a.submittedBy,reviewedBy:target==='Approved'?req.user.id:a.reviewedBy},a.version);
      if(target==='Approved')store.put(req.user.tenant,'certificate',{assessmentId:a.id,propertyId:a.propertyId,internal:store.tracking(),status:'Draft (Pending SANEDI)',sanedi:'',publicToken:randomBytes(24).toString('hex'),snapshot:saved,createdAt:new Date().toISOString()});
      store.log(req.user,`assessment.${target}`,a.id,{field:req.body.field||null});return saved;
    });res.json(updated);
  });
  app.post('/api/assessments/:id/renew',requireUser,allow(...EDIT),(req,res)=>{
    const old=assessment(req);if(old.status!=='Approved')fail('Only approved assessments can be renewed');
    const copy=store.transaction(()=>{const {id,version,reviewedBy,...data}=old;const next=store.put(req.user.tenant,'assessment',{...data,status:'Draft',createdBy:req.user.id,notes:[],renewalOf:id,months:[],updatedAt:new Date().toISOString()});store.log(req.user,'assessment.renew',next.id,{previous:id});return next;});res.status(201).json(copy);
  });
  const upload=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024,files:1,fields:2}});
  app.post('/api/assessments/:id/documents',requireUser,allow(...EDIT),submissionLimit,upload.single('file'),async(req,res)=>{
    const a=assessment(req),kind=String(req.body.kind||'');
    if(!['Draft','Revision Required'].includes(a.status) && kind!=='Issued EPC')fail('Evidence is locked after submission',409);
    if(kind==='Issued EPC' && a.status!=='Approved')fail('Approve the assessment before attaching the issued certificate');
    if(!['Utility bills','Building plans','Site audit','Meter calibration','Equipment specifications','Issued EPC'].includes(kind))fail('Unsupported document type');
    const file=req.file;if(!file)fail('Choose a file');
    const b=file.buffer;let mime=null;
    if(b.subarray(0,5).toString()==='%PDF-')mime='application/pdf';
    if(b[0]===0xff&&b[1]===0xd8&&b[2]===0xff)mime='image/jpeg';
    if(b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10])))mime='image/png';
    if(!mime || (kind==='Issued EPC'&&mime!=='application/pdf'))fail('Upload a PDF, PNG or JPEG. Issued certificates must be PDF.');
    const id=randomUUID(),key=`${req.user.tenant}/${id}`;await storage.put(key,b);
    try{
      const d=store.transaction(()=>{const current=store.get(req.user.tenant,'assessment',a.id);if(current.status!==a.status)fail('Assessment changed during upload. Reload and retry.',409);const d=store.put(req.user.tenant,'document',{id,assessmentId:a.id,kind,key,mime,name:String(file.originalname).replace(/[^a-zA-Z0-9._ -]/g,'_').slice(0,120),size:b.length,sha256:createHash('sha256').update(b).digest('hex'),uploadedBy:req.user.id,at:new Date().toISOString()});store.log(req.user,'document.upload',id,{assessmentId:a.id,kind});return d;});const {key:_,...publicDoc}=d;res.status(201).json(publicDoc);
    }catch(e){await storage.remove(key);throw e;}
  });
  app.get('/api/documents/:id',requireUser,async(req,res)=>{
    const d=store.get(req.user.tenant,'document',req.params.id)||fail('Document not found',404);const b=await storage.get(d.key);store.log(req.user,'document.download',d.id);res.set({'Content-Type':d.mime,'Content-Disposition':`attachment; filename="${d.name}"`,'Cache-Control':'no-store'}).send(b);
  });
  app.delete('/api/documents/:id',requireUser,allow(...EDIT),async(req,res)=>{
    const d=store.get(req.user.tenant,'document',req.params.id)||fail('Document not found',404);const a=store.get(req.user.tenant,'assessment',d.assessmentId);
    if(!['Draft','Revision Required'].includes(a?.status))fail('Submitted evidence is immutable',409);
    await storage.remove(d.key);store.transaction(()=>{store.db.prepare('DELETE FROM records WHERE id=? AND tenant=? AND kind=?').run(d.id,req.user.tenant,'document');store.log(req.user,'document.delete',d.id);});res.json({ok:true});
  });
  app.post('/api/certificates/:id/activate',requireUser,allow(...REVIEW,'Compliance Officer'),submissionLimit,(req,res)=>{
    if(!config.issuance)fail(config.demo?'Demo certificates cannot be activated':'Activation is disabled until the operator approves the issuance process',409);
    const c=store.get(req.user.tenant,'certificate',req.params.id)||fail('Certificate not found',404);
    if(c.status!=='Draft (Pending SANEDI)')fail('Only pending certificates may be activated',409);
    const sanedi=String(req.body.sanedi||'').trim(),issued=String(req.body.issued||'');
    if(!/^[A-Za-z0-9/._-]{3,100}$/.test(sanedi))fail('Enter the official SANEDI number');
    if(!/^\d{4}-\d{2}-\d{2}$/.test(issued)||!Number.isFinite(Date.parse(issued))||issued>new Date().toISOString().slice(0,10)||anniversary(issued)<=new Date().toISOString().slice(0,10))fail('Enter a valid, unexpired issue date');
    const expires=String(req.body.expires||anniversary(issued));
    if(!validDate(expires)||expires<=issued||expires>anniversary(issued)||expires<=new Date().toISOString().slice(0,10))fail('Expiry must match the issued EPC, be in the future and no more than five years after issue');
    if(req.body.popia!==true || req.body.professionalConfirmed!==true)fail('POPIA sign-off and issuer verification are required');
    const issuedDocument=store.get(req.user.tenant,'document',req.body.documentId);
    if(issuedDocument?.assessmentId!==c.assessmentId||issuedDocument.kind!=='Issued EPC')fail('Attach the externally issued EPC PDF first');
    if(store.db.prepare("SELECT * FROM records WHERE kind='certificate'").all().some(r=>{const other=store.unpack(r);return other.id!==c.id&&other.sanedi===sanedi;}))fail('SANEDI number already recorded',409);
    const updated=store.transaction(()=>{
      const next=store.put(req.user.tenant,'certificate',{...c,sanedi,issued,expires,status:'Active',documentId:issuedDocument.id,popia:{by:req.user.id,at:new Date().toISOString()}},req.body.version);
      const a=store.get(req.user.tenant,'assessment',c.assessmentId);
      if(a.renewalOf)for(const previous of store.list(req.user.tenant,'certificate').filter(x=>x.assessmentId===a.renewalOf && ['Active','Expired'].includes(certificateStatus(x))))store.put(req.user.tenant,'certificate',{...previous,status:'Renewed',renewedBy:c.id},previous.version);
      store.log(req.user,'certificate.activate',c.id,{sanedi,documentId:issuedDocument.id});return next;
    });res.json(updated);
  });
  app.post('/api/certificates/:id/revoke',requireUser,allow(...REVIEW),submissionLimit,(req,res)=>{
    const c=store.get(req.user.tenant,'certificate',req.params.id)||fail('Certificate not found',404);
    if(!String(req.body.reason||'').trim())fail('A revocation reason is required');if(c.status==='Revoked')fail('Already revoked',409);
    res.json(store.transaction(()=>{const next=store.put(req.user.tenant,'certificate',{...c,status:'Revoked',reason:String(req.body.reason).slice(0,2000)},req.body.version);store.log(req.user,'certificate.revoke',c.id,{reason:next.reason});return next;}));
  });
  app.get('/api/assessments/:id/pdf',requireUser,async(req,res)=>{
    const a=assessment(req),c=store.list(req.user.tenant,'certificate').find(c=>c.assessmentId===a.id);const pdf=await assessmentPdf(c?.snapshot||a,c,config.origin);
    store.log(req.user,'report.export',a.id);res.type('application/pdf').attachment(`${c?.internal||'assessment'}-review.pdf`).send(pdf);
  });
  app.get('/api/verify/:token',(req,res)=>{
    res.set('Cache-Control','no-store');if(!/^[a-f0-9]{48}$/.test(req.params.token))fail('Record not found',404);
    const row=store.db.prepare("SELECT * FROM records WHERE kind='certificate'").all().find(r=>store.unpack(r).publicToken===req.params.token);
    if(!row)fail('Record not found',404);const c=store.unpack(row);
    res.json({propertyId:c.propertyId,internal:c.internal,sanedi:c.sanedi||null,status:certificateStatus(c),issued:c.issued||null,expires:c.expires||null,notice:'Platform record only. Confirm official certification with SANEDI.'});
  });
  app.post('/api/initiatives',requireUser,allow(...EDIT,'Compliance Officer'),(req,res)=>{
    const a=store.get(req.user.tenant,'assessment',req.body.assessmentId)||fail('Choose a property');
    const value={assessmentId:a.id,title:String(req.body.title||'').trim().slice(0,160),status:String(req.body.status||'Proposed'),kwh:Number(req.body.kwh),tariff:Number(req.body.tariff),cost:Number(req.body.cost),emission:Number(req.body.emission)};
    if(!value.title||!['Proposed','Approved','In progress','Completed'].includes(value.status))fail('Enter a title and valid status');savings(value);
    res.status(201).json(store.transaction(()=>{const i=store.put(req.user.tenant,'initiative',value);store.log(req.user,'initiative.create',i.id);return i;}));
  });
  app.put('/api/initiatives/:id',requireUser,allow(...EDIT,'Compliance Officer'),(req,res)=>{
    const old=store.get(req.user.tenant,'initiative',req.params.id)||fail('Initiative not found',404);if(!['Proposed','Approved','In progress','Completed'].includes(req.body.status))fail('Invalid status');
    res.json(store.transaction(()=>{const i=store.put(req.user.tenant,'initiative',{...old,status:req.body.status},req.body.version);store.log(req.user,'initiative.status',i.id);return i;}));
  });
  app.put('/api/compliance/:framework',requireUser,allow(...ADMIN,'Compliance Officer'),(req,res)=>{
    if(!['POPIA','ISO 50001','SANS 10400-XA','National Building Regulations'].includes(req.params.framework))fail('Unknown framework');
    if(!['Not reviewed','In progress','Evidence recorded'].includes(req.body.status) || !String(req.body.notes||'').trim())fail('Status and evidence notes required');
    const old=store.list(req.user.tenant,'compliance').find(x=>x.framework===req.params.framework);
    res.json(store.transaction(()=>{const c=store.put(req.user.tenant,'compliance',{id:old?.id,framework:req.params.framework,status:req.body.status,notes:String(req.body.notes).slice(0,2000),by:req.user.name,at:new Date().toISOString()},req.body.version);store.log(req.user,'compliance.update',c.id,{framework:c.framework});return c;}));
  });
  app.get('/api/audit',requireUser,allow(...ADMIN,'Reviewer','Compliance Officer'),(req,res)=>res.json(store.db.prepare('SELECT id,at,action,target,user_id FROM audit WHERE tenant=? ORDER BY id DESC LIMIT 200').all(req.user.tenant)));
  app.get('/api/team',requireUser,allow(...ADMIN),(req,res)=>res.json(store.db.prepare('SELECT id,name,email,role FROM users WHERE tenant=?').all(req.user.tenant)));
  app.post('/api/team/invite',requireUser,allow(...ADMIN),submissionLimit,(req,res)=>{
    const role=String(req.body.role),email=String(req.body.email||'').toLowerCase().trim();if(!ROLES.includes(role)||role==='Super Admin'||!/^\S+@\S+\.\S+$/.test(email)||email.length>200)fail('Valid email and role required');
    if(store.db.prepare('SELECT id FROM users WHERE email=?').get(email))fail('Account already exists',409);
    const token=randomBytes(32).toString('hex');store.transaction(()=>{store.put(req.user.tenant,'invite',{email,role,tokenHash:hashToken(token),expires:Date.now()+48*3600000,used:false});store.log(req.user,'team.invite',email,{role});});res.status(201).json({url:`${config.origin}/?invite=${token}`,expiresInHours:48});
  });
  app.post('/api/invites/accept',authLimit,async(req,res)=>{
    const token=String(req.body.token||'');if(!/^[a-f0-9]{64}$/.test(token))fail('Invalid invitation');
    const found=store.db.prepare("SELECT * FROM records WHERE kind='invite'").all().map(r=>({tenant:r.tenant,value:store.unpack(r)})).find(r=>r.value.tokenHash===hashToken(token));
    if(!found||found.value.used||found.value.expires<Date.now())fail('Invitation expired or unavailable');
    const password=String(req.body.password||''),name=String(req.body.name||'').trim().slice(0,100);if(password.length<12||password.length>200||!name)fail('Name and a password of 12–200 characters required');
    const encoded=await hashPassword(password);const user={id:randomUUID(),tenant:found.tenant,email:found.value.email,role:found.value.role,name};
    store.transaction(()=>{const current=store.get(found.tenant,'invite',found.value.id);if(current.used)fail('Invitation already accepted',409);store.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(user.id,user.tenant,user.email,user.name,user.role,encoded);store.put(found.tenant,'invite',{...current,used:true},current.version);store.log(user,'team.join',user.id);});await loginUser(user,res);
  });
  app.use('/assets',express.static(resolve('assets'),{dotfiles:'deny'}));
  app.use('/components',express.static(resolve('components'),{dotfiles:'deny'}));
  app.get(['/','/verify/:token'],(req,res)=>res.sendFile(resolve('index.html')));
  app.use((req,res)=>res.status(404).json({error:'Not found'}));
  app.use((err,req,res,next)=>{
    if(res.headersSent)return next(err);
    const known=err.status||err instanceof multer.MulterError||err instanceof SyntaxError;
    const status=err instanceof multer.MulterError?400:err.status||(err.code?500:400);
    if(!known && !['Invalid','Enter','Select','Maximum','Unsupported'].some(p=>err.message.startsWith(p)))console.error('Request failed',{name:err.name,code:err.code||'validation'});
    res.status(status>=500?500:status).json({error:status>=500?'Unable to complete this request':String(err.message).slice(0,250)});
  });
  return {app,store,config};
}
if(process.argv[1] && fileURLToPath(import.meta.url)===resolve(process.argv[1])) {
  const {app,store,config}=await createApp();
  const server=app.listen(config.port,config.host,()=>console.log(`Bolide Energy Pro: ${config.origin}${config.demo?' — isolated synthetic demo':''}`));
  process.on('SIGTERM',()=>server.close(()=>{store.db.close();process.exit(0);}));
}

