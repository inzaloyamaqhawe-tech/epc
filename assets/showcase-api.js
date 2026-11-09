import {calculate,validateAssessment,savings} from './engine/scoringEngine.js';

import {REFERENCES,ZONES} from './engine/benchmarkMatrix.js';

import {projectedSavings} from './engine/advancedEngine.js';

import {normalizeAssessment} from './engine/normalization.js';

import {IMPORT_FIELDS,buildImportPreview,importTemplate} from './engine/importRules.js';

const DB='bolide-epc-presentation-v1';let snapshot;const stages=new Map();

async function storage(mode,fn){return new Promise((resolve,reject)=>{const request=indexedDB.open(DB,1);request.onupgradeneeded=()=>request.result.createObjectStore('workspace');request.onerror=()=>reject(new Error('Browser storage unavailable. Enable site storage before saving.'));request.onsuccess=()=>{const db=request.result,tx=db.transaction('workspace',mode);let result;try{result=fn(tx.objectStore('workspace'));}catch(e){db.close();reject(e);return;}tx.oncomplete=()=>{db.close();resolve(result?.result);};tx.onabort=tx.onerror=()=>{db.close();reject(new Error('Could not save browser workspace. Export a backup and check available storage.'));};};});}

async function data(){if(!snapshot){snapshot=await storage('readonly',store=>store.get('portfolio'));if(!snapshot){const source=document.querySelector('meta[name=epc-showcase-data]').content;const response=await fetch(source);if(!response.ok)throw new Error('Portfolio unavailable');snapshot=await response.json();snapshot.audit=[];snapshot.documents=(snapshot.documents||[]).map(doc=>({...doc,blob:doc.content?new Blob([doc.content],{type:'application/pdf'}):doc.blob}));await storage('readwrite',store=>store.put(snapshot,'portfolio'));}}return snapshot;}

function result(a){try{return a.months?.length===12?calculate(a):null;}catch{return null;}}

function find(d,id){const a=d.assessments.find(a=>a.id===id);if(!a)throw new Error('Assessment not found');return a;}

function changedPaths(before,after,prefix=''){if(JSON.stringify(before)===JSON.stringify(after))return[];if(before&&after&&typeof before==='object'&&typeof after==='object')return[...new Set([...Object.keys(before),...Object.keys(after)])].flatMap(key=>changedPaths(before[key],after[key],prefix?`${prefix}.${key}`:key));return[prefix];}
async function commit(d,path){const fields=[];for(const kind of ['assessments','initiatives'])for(const record of d[kind]||[]){const before=snapshot?.[kind]?.find(x=>x.id===record.id);if(before)fields.push(...changedPaths(before,record,kind+'.'+record.id).filter(p=>!p.includes('.result.')&&!p.endsWith('.version')));}d.audit=[{action:path,at:new Date().toISOString(),user_id:'workspace-user',fields, target:path},...(d.audit||[])].slice(0,200);await storage('readwrite',store=>store.put(d,'portfolio'));snapshot=d;}

function fresh(value){const a={...normalizeAssessment(value),id:crypto.randomUUID(),propertyId:`PROP-${Date.now().toString().slice(-8)}`,status:'Draft',version:1,createdBy:'workspace-user',notes:[]};a.result=result(a);return a;}

function csv(text){const delimiter=[',',';','\t'].sort((a,b)=>text.split('\n')[0].split(b).length-text.split('\n')[0].split(a).length)[0];const rows=[];let row=[],cell='',quoted=false;for(let i=0;i<text.length;i++){const c=text[i];if(c==='"'){if(quoted&&text[i+1]==='"'){cell+='"';i++;}else quoted=!quoted;}else if(!quoted&&(c===delimiter||c==='\n')){row.push(cell.trim());cell='';if(c==='\n'){if(row.some(Boolean))rows.push(row);row=[];}}else if(c!=='\r'||quoted)cell+=c;}if(quoted)throw new Error('Unclosed CSV quote');row.push(cell.trim());if(row.some(Boolean))rows.push(row);return rows;}

async function readFile(file,sheetName){if(!file||file.size>5*1024*1024)throw new Error('Choose a file up to 5 MB');let rows,sheets=['CSV'],selectedSheet='CSV';if(/\.xlsx$/i.test(file.name)){if(!globalThis.ExcelJS)await new Promise((resolve,reject)=>{const script=document.createElement('script');script.src=new URL('./vendor/exceljs.min.js',import.meta.url);script.onload=resolve;script.onerror=reject;document.head.append(script);});const bytes=await file.arrayBuffer(),view=new DataView(bytes);let end=-1;for(let i=bytes.byteLength-22;i>=Math.max(0,bytes.byteLength-65557);i--)if(view.getUint32(i,true)===0x06054b50){end=i;break;}if(end<0)throw new Error('Invalid workbook');let offset=view.getUint32(end+16,true),total=0;const entries=view.getUint16(end+10,true);if(entries>1000)throw new Error('Workbook too complex');for(let i=0;i<entries;i++){if(offset+46>bytes.byteLength||view.getUint32(offset,true)!==0x02014b50)throw new Error('Invalid workbook');total+=view.getUint32(offset+24,true);if(total>40*1024*1024)throw new Error('Workbook expansion exceeds 40 MB');offset+=46+view.getUint16(offset+28,true)+view.getUint16(offset+30,true)+view.getUint16(offset+32,true);}const workbook=new globalThis.ExcelJS.Workbook();await workbook.xlsx.load(bytes);sheets=workbook.worksheets.map(s=>s.name);const sheet=sheetName?workbook.getWorksheet(sheetName):workbook.worksheets[0];if(!sheet||sheet.rowCount>1201||sheet.columnCount>80)throw new Error('Choose a sheet with at most 1,200 rows and 80 columns');selectedSheet=sheet.name;rows=[];sheet.eachRow(row=>{const values=[];for(let i=1;i<=sheet.columnCount;i++){const v=row.getCell(i).value;if(v&&typeof v==='object'&&('formula'in v||'sharedFormula'in v))throw new Error('Paste formulas as values before import');values.push(v instanceof Date?v.toISOString().slice(0,7):v&&typeof v==='object'?row.getCell(i).text:v??'');}rows.push(values);});}else if(/\.csv$/i.test(file.name))rows=csv((await file.text()).replace(/^\uFEFF/,''));else throw new Error('Choose CSV or XLSX');if(rows.length<2||rows.length>1201)throw new Error('Use 1–1,200 data rows');const headers=rows.shift().map(String);if(headers.some(h=>!h.trim())||new Set(headers).size!==headers.length||headers.length>80||rows.some(r=>r.length!==headers.length))throw new Error('Use unique headings and matching column counts');return{headers,rows,sheets,selectedSheet};}

async function execute(path,options={}){

 const method=options.method||'GET',body=options.body||{};const current=await data();const d=structuredClone(current);let output;

 if(path==='/config')return{demo:false,staticDemo:true,issuance:false,initialized:true,references:REFERENCES,zones:ZONES,referenceSource:'GBCSA EPC reference guidance · verify licensed standard'};

 if(path==='/me')return{user:{id:'workspace-user',name:'Bolide Presenter',email:'',role:'Admin'},csrf:null};

 if(path==='/portfolio')return d;

 if(path==='/audit')return d.audit||[];

 if(path==='/team')return[{name:'Bolide Presenter',email:'',role:'Admin'}];

 if(path==='/assessments'&&method==='POST'){output=fresh(body);d.assessments.unshift(output);}

 else if(/^\/assessments\/[^/]+$/.test(path)&&method==='PUT'){const a=find(d,path.split('/')[2]);if(!['Draft','Revision Required'].includes(a.status))throw new Error('Request revision before editing this record');if(body.version!==a.version)throw new Error('Record changed. Reopen the assessment.');Object.assign(a,normalizeAssessment(body),{version:(a.version||0)+1});a.result=result(a);output=a;}

 else if(path.endsWith('/validation')){const a=find(d,path.split('/')[2]);return{errors:validateAssessment(a,d.documents.filter(x=>x.assessmentId===a.id))};}

 else if(path.endsWith('/transition')){const a=find(d,path.split('/')[2]),status=body.status;const allowed={Draft:['Submitted'],'Revision Required':['Submitted'],Submitted:['Under Review'],'Under Review':['Approved','Revision Required']};if(!allowed[a.status]?.includes(status))throw new Error('Invalid workflow transition');if(['Submitted','Approved'].includes(status)){const errors=validateAssessment(a,d.documents.filter(x=>x.assessmentId===a.id));if(errors.length)throw new Error(errors[0].message);}if(status==='Approved'&&(!body.confirmBenchmark||!body.confirmProfessional))throw new Error('Confirm both review checks');if(status==='Revision Required'){if(!body.comment?.trim())throw new Error('Enter revision feedback');a.notes.push({field:body.field||'Assessment',comment:body.comment,by:'Reviewer',at:new Date().toISOString()});}a.status=status;a.version=(a.version||0)+1;if(status==='Approved'&&!d.certificates.some(c=>c.assessmentId===a.id))d.certificates.push({id:crypto.randomUUID(),assessmentId:a.id,propertyId:a.propertyId,internal:`BEP-${new Date().getFullYear()}-${d.certificates.length+1}`,status:'Draft (Pending SANEDI)',sanedi:'',snapshot:structuredClone(a)});output=a;}

 else if(path.endsWith('/renew')){const old=find(d,path.split('/')[2]);output=fresh(old);output.name=old.name+' · renewal';output.months=[];d.assessments.unshift(output);}

 else if(path.endsWith('/documents')&&method==='POST'){const a=find(d,path.split('/')[2]);const file=body.get('file');if(!file||file.size>10*1024*1024||!['application/pdf','image/png','image/jpeg'].includes(file.type))throw new Error('Choose a PDF, PNG or JPEG up to 10 MB');output={id:crypto.randomUUID(),assessmentId:a.id,name:file.name,kind:body.get('kind'),size:file.size,blob:file};d.documents.push(output);}

 else if(path.startsWith('/documents/')&&method==='DELETE'){d.documents=d.documents.filter(x=>x.id!==path.split('/')[2]);output={ok:true};}

 else if(path==='/initiatives'&&method==='POST'){output={...body,id:crypto.randomUUID(),status:'Proposed',version:1,result:savings(body)};output.projection=projectedSavings(find(d,body.assessmentId),[output]);d.initiatives.push(output);}

 else if(path.startsWith('/initiatives/')&&method==='PUT'){output=d.initiatives.find(i=>i.id===path.split('/')[2]);if(!output)throw new Error('Initiative not found');output.status=body.status;output.version=(output.version||0)+1;}

 else if(path.startsWith('/compliance/')&&method==='PUT'){const framework=decodeURIComponent(path.slice(12));output={...body,framework,version:body.version+1};d.compliance=d.compliance.filter(c=>c.framework!==framework);d.compliance.push(output);}

 else if(path==='/imports/preview'){const type=body.get('type'),raw=await readFile(body.get('file'),body.get('sheet'));const stage={id:crypto.randomUUID(),type,assessmentId:body.get('assessmentId'),raw};stages.set(stage.id,stage);return{...buildImportPreview(raw,type,{},d.assessments),id:stage.id,type,fields:IMPORT_FIELDS[type],sheets:raw.sheets,selectedSheet:raw.selectedSheet};}

 else if(/^\/imports\/[^/]+\/(map|commit)$/.test(path)){const stage=stages.get(path.split('/')[2]);if(!stage)throw new Error('Upload the file again');if(path.endsWith('/map'))stage.mapping=body.mapping;const preview=buildImportPreview(stage.raw,stage.type,stage.mapping||{},d.assessments);if(path.endsWith('/map'))return{...preview,id:stage.id,type:stage.type,fields:IMPORT_FIELDS[stage.type],sheets:stage.raw.sheets,selectedSheet:stage.raw.selectedSheet};if(!body.confirm||preview.errors)throw new Error('Review valid rows and confirm the import');if(stage.type==='energy'){if(!body.confirmReplace)throw new Error('Confirm ledger replacement');const a=find(d,stage.assessmentId);if(!['Draft','Revision Required'].includes(a.status))throw new Error('Only draft ledgers can be replaced');a.months=preview.rows.map(r=>r.value);a.version=(a.version||0)+1;a.result=result(a);}else d.assessments.unshift(...preview.rows.map(r=>fresh(r.value)));output={count:preview.valid,type:stage.type};stages.delete(stage.id);}

 else throw new Error('This operation needs the connected application server');

 await commit(d,path);return structuredClone(output);

}

export async function browserDownload(path){if(path.startsWith('/api/imports/template/'))return{blob:new Blob([importTemplate(path.split('/').at(-1))],{type:'text/csv'}),name:'bolide-import-template.csv'};if(path.startsWith('/api/documents/')){const doc=(await data()).documents.find(x=>x.id===path.split('/').at(-1));if(!doc?.blob)throw new Error('File unavailable');return{blob:doc.blob,name:doc.name};}return null;}



export async function backupPortfolio(){const d=structuredClone(await data());for(const doc of d.documents){if(doc.blob){const bytes=new Uint8Array(await doc.blob.arrayBuffer());let binary='';for(const byte of bytes)binary+=String.fromCharCode(byte);doc.fileBase64=btoa(binary);doc.fileType=doc.blob.type;delete doc.blob;}}return d;}

export async function restorePortfolio(file){if(file.size>50*1024*1024)throw new Error('Backup exceeds 50 MB');const d=JSON.parse(await file.text());if(!['assessments','initiatives','certificates','documents','compliance'].every(k=>Array.isArray(d[k])))throw new Error('Invalid portfolio backup');d.assessments=d.assessments.map(a=>({...a,...normalizeAssessment(a),result:result(a)}));d.documents=d.documents.map(doc=>{if(doc.fileBase64){doc.blob=new Blob([Uint8Array.from(atob(doc.fileBase64),c=>c.charCodeAt(0))],{type:doc.fileType||'application/octet-stream'});delete doc.fileBase64;}return doc;});await commit(d,'Restore portfolio backup');}



let writes=Promise.resolve();

export function showcaseApi(path,options={}){if(!options.method||options.method==='GET')return writes.then(()=>execute(path,options));const next=writes.then(()=>execute(path,options));writes=next.catch(()=>{});return next;}

