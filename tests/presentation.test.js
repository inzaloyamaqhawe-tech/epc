import test from 'node:test';
import assert from 'node:assert/strict';
import 'fake-indexeddb/auto';
import ExcelJS from 'exceljs';
globalThis.ExcelJS=ExcelJS;
import {exampleAssessment} from '../services/seed.js';
import {readFile} from 'node:fs/promises';
const initial={assessments:[],documents:[],certificates:[],initiatives:[],compliance:[]};
globalThis.document={querySelector:()=>({content:'/sample.json'})};
globalThis.fetch=async()=>({ok:true,json:async()=>structuredClone(initial)});
const {showcaseApi:api,backupPortfolio,restorePortfolio}=await import('../assets/showcase-api.js');
test('browser workflow: persist, validate, review, evidence, imports and backup restore',async()=>{
 const source=exampleAssessment('Workflow office');
 const a=await api('/assessments',{method:'POST',body:source});
 assert.equal(a.status,'Draft');
 const edited=await api('/assessments/'+a.id,{method:'PUT',body:{...a,name:'Edited office'}});
 assert.equal(edited.version,2);
 await assert.rejects(api('/assessments/'+a.id,{method:'PUT',body:a}),/changed/);
 for(const kind of ['Utility bills','Building plans','Site audit']){const body=new FormData();body.set('kind',kind);body.set('file',new File(['%PDF-1.4\n%%EOF'],'evidence.pdf',{type:'application/pdf'}));await api(`/assessments/${a.id}/documents`,{method:'POST',body});}
 assert.deepEqual((await api(`/assessments/${a.id}/validation`)).errors,[]);
 for(const status of ['Submitted','Under Review','Approved'])await api(`/assessments/${a.id}/transition`,{method:'POST',body:{status,confirmBenchmark:true,confirmProfessional:true}});
 assert.equal((await api('/portfolio')).certificates.length,1);
 await assert.rejects(api('/assessments/'+a.id,{method:'PUT',body:edited}),/revision/);
 const fd=new FormData();fd.set('type','properties');fd.set('file',new File(['name,province,occupancy,ownership,zone,nfa,gfa\nImported building,Gauteng,G1,Private,1,2800,3200'],'properties.csv'));
 const preview=await api('/imports/preview',{method:'POST',body:fd});assert.equal(preview.errors,0);
 assert.equal((await api('/portfolio')).assessments.length,1);
 await assert.rejects(api(`/imports/${preview.id}/commit`,{method:'POST',body:{}}),/confirm/);
 await api(`/imports/${preview.id}/commit`,{method:'POST',body:{confirm:true}});
 assert.equal((await api('/portfolio')).assessments.length,2);
 const workbook=new ExcelJS.Workbook();const sheet=workbook.addWorksheet('Properties');sheet.addRow(['name','province','occupancy','ownership','zone']);sheet.addRow(['Excel office','Gauteng','G1','Private','1']);const xf=new FormData();xf.set('type','properties');xf.set('file',new File([await workbook.xlsx.writeBuffer()],'properties.xlsx'));const xp=await api('/imports/preview',{method:'POST',body:xf});assert.equal(xp.valid,1);sheet.getCell('A2').value={formula:'1+1',result:2};xf.set('file',new File([await workbook.xlsx.writeBuffer()],'formula.xlsx'));await assert.rejects(api('/imports/preview',{method:'POST',body:xf}),/formulas/);
 const backup=await backupPortfolio();assert.ok(backup.documents.every(d=>d.fileBase64));
 await restorePortfolio(new File([JSON.stringify(backup)],'backup.json'));
 const module=await import('../assets/showcase-api.js?reload');
 const restored=await module.showcaseApi('/portfolio');assert.equal(restored.assessments.length,2);assert.equal(await restored.documents[0].blob.text(),'%PDF-1.4\n%%EOF');
 await assert.rejects(restorePortfolio(new File(['{}'],'bad.json')),/Invalid/);
});
test('browser calculation and normalization modules match server source',async()=>{
 for(const file of ['scoringEngine.js','fuelConverter.js','benchmarkMatrix.js','normalization.js','advancedEngine.js'])assert.equal(await readFile('assets/engine/'+file,'utf8'),await readFile('services/'+file,'utf8'));
});
