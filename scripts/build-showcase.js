import {cp,mkdir,readFile,writeFile,readdir,stat} from 'node:fs/promises';
import {resolve,join} from 'node:path';
import {exampleAssessment} from '../services/seed.js';
import {calculate,savings} from '../services/scoringEngine.js';
import {projectedSavings} from '../services/advancedEngine.js';
const root=resolve('.'),out=resolve('public-demo'),base=process.env.SHOWCASE_BASE||'/epc/';
if(!/^\/[a-zA-Z0-9/_-]*\/$/.test(base))throw new Error('SHOWCASE_BASE must be an absolute directory path');
await mkdir(out,{recursive:true});
for(const directory of ['assets','components'])await cp(join(root,directory),join(out,directory),{recursive:true});
let html=await readFile('index.html','utf8');html=html.replace('</head>','<meta name="epc-showcase" content="sample-only"></head>');await writeFile(join(out,'index.html'),html);
const samples=[['Rosebank Office Park',108,'Approved','Gauteng'],['Umhlanga Business Centre',176,'Under Review','KwaZulu-Natal'],['Cape Town Learning Hub',54,'Approved','Western Cape'],['Sandton Civic Offices',248,'Draft','Gauteng'],['Bloemfontein Campus',310,'Revision Required','Free State'],['Gqeberha Assembly Hall',365,'Submitted','Eastern Cape'],['Mbombela Administration',72,'Draft','Mpumalanga']];
const assessments=samples.map(([name,eui,status,province],i)=>{const a={...exampleAssessment(name,eui,2800+i*650),id:`sample-${i+1}`,propertyId:`SAMPLE-${1001+i}`,province,status,zone:String(i+1),createdBy:'sample-assessor',notes:[]};return{...a,result:calculate(a)};});
const initiatives=assessments.slice(0,3).map((a,i)=>{const item={id:`sample-initiative-${i}`,assessmentId:a.id,title:['LED lighting upgrade','HVAC variable speed drives','Rooftop solar PV'][i],status:['Proposed','In progress','Approved'][i],kwh:[24000,46000,78000][i],tariff:2.85,cost:[180000,420000,860000][i],emission:.9};return{...item,result:savings(item),projection:projectedSavings(a,[item])};});
const certificates=assessments.filter(a=>a.status==='Approved').map((a,i)=>({id:`sample-certificate-${i}`,assessmentId:a.id,propertyId:a.propertyId,internal:`BEP-SAMPLE-${i+1}`,status:'Draft (Pending SANEDI)',sanedi:'',publicToken:'sample-only',snapshot:a}));
await writeFile(join(out,'showcase-data.json'),JSON.stringify({assessments,initiatives,certificates,documents:[],compliance:[]}));
async function rewrite(directory){for(const item of await readdir(directory)){const path=join(directory,item);if((await stat(path)).isDirectory())await rewrite(path);else if(/\.(html|js|css)$/.test(item)){let text=await readFile(path,'utf8');text=text.replaceAll('/assets/',base+'assets/').replaceAll('/components/',base+'components/');await writeFile(path,text);}}}
await rewrite(out);await writeFile(join(out,'.nojekyll'),'');
console.log(`Built sample-only public demo in public-demo using base ${base}. No runtime data or server files copied.`);
