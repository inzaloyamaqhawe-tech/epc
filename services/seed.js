import { randomUUID, randomBytes } from 'node:crypto';
import { hashPassword } from './auth.js';
import { SYSTEMS } from './normalization.js';
export function exampleAssessment(name='Example office',eui=125,nfa=3200) {
  const months=Array.from({length:12},(_,i)=>{const d=new Date();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-12+i);return {month:d.toISOString().slice(0,7),grid:Math.round(eui*nfa/12),solar:0,export:0,diesel:0,lpg:0,other:0,excluded:0};});
  return {name,address:'Synthetic demonstration address, South Africa',province:'Gauteng',municipality:'City of Johannesburg',erf:'DEMO-001',eskomAccount:'',occupancy:'G1',subtype:'officepark',vacancyAreaMonths:0,ownership:'Private',nfa,gfa:nfa*1.15,zone:1,operationalYears:5,majorRenovation:false,benchmark:200,benchmarkSource:'DEMO ONLY — illustrative reference, not a SANS table value',methodologyConfirmed:true,dieselFactor:0,lpgFactor:0,factorSource:'DEMO ONLY — no non-electrical fuels recorded; verified gross calorific factors required if used',professional:'Demonstration professional',professionalNumber:'DEMO-NOT-REGISTERED',auditBody:'Demonstration inspection body',auditDate:months.at(-1).month+'-15',auditReference:'DEMO-AUDIT',exclusionNotes:'No excluded consumption in synthetic example',months,systems:SYSTEMS.map((title,i)=>({code:`XA${i+1}`,title,status:'Verified',notes:'Synthetic example — replace with independently verified site evidence.'}))};
}
export async function seedDemo(store) {
  if(store.db.prepare('SELECT 1 FROM users LIMIT 1').get())return;
  const tenant=store.db.prepare('SELECT id FROM organisations LIMIT 1').get()?.id||randomUUID(),password=await hashPassword(randomBytes(32).toString('hex'));
  store.db.prepare('INSERT OR IGNORE INTO organisations VALUES(?,?)').run(tenant,'Bolide demonstration portfolio');
  const people={};
  for(const role of ['Admin','Assessor','Reviewer']){
    const u={id:randomUUID(),tenant,email:`demo.${role.toLowerCase()}@example.invalid`,name:`Demo ${role}`,role};people[role]=u;
    store.db.prepare('INSERT INTO users VALUES(?,?,?,?,?,?)').run(u.id,tenant,u.email,u.name,u.role,password);
  }
  const samples=[['Rosebank Office Park',108,'Approved','Gauteng'],['Umhlanga Business Centre',176,'Under Review','KwaZulu-Natal'],['Cape Town Learning Hub',54,'Approved','Western Cape'],['Sandton Civic Offices',248,'Draft','Gauteng'],['Bloemfontein Campus',310,'Revision Required','Free State'],['Gqeberha Assembly Hall',365,'Submitted','Eastern Cape'],['Mbombela Administration',72,'Draft','Mpumalanga']];
  for(let i=0;i<samples.length;i++){
    const [name,eui,status,province]=samples[i];const value=exampleAssessment(name,eui,2800+i*650);value.province=province;value.zone=i+1;
    const a=store.put(tenant,'assessment',{...value,status,propertyId:`PROP-DEMO-${1001+i}`,createdBy:people.Assessor.id,notes:status==='Revision Required'?[{field:'months',comment:'Please reconcile the monthly meter readings with the utility invoices.',by:'Demo Reviewer',at:new Date().toISOString()}]:[],updatedAt:new Date().toISOString()});
    if(status==='Approved')store.put(tenant,'certificate',{assessmentId:a.id,propertyId:a.propertyId,internal:store.tracking(),status:'Draft (Pending SANEDI)',sanedi:'',publicToken:randomBytes(24).toString('hex'),snapshot:a,createdAt:new Date().toISOString()});
    if(i<3)store.put(tenant,'initiative',{assessmentId:a.id,title:['LED lighting upgrade','HVAC variable speed drives','Rooftop solar PV'][i],status:['Proposed','In progress','Approved'][i],kwh:[24000,46000,78000][i],tariff:2.85,cost:[180000,420000,860000][i],emission:.9});
  }
}


