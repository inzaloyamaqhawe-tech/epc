import {normalizeAssessment,SYSTEMS,PROVINCES} from './normalization.js';
export const IMPORT_FIELDS={
  properties:['name','address','province','municipality','erf','sourceReference','occupancy','subtype','ownership','zone','gfa','nfa','vacancyAreaMonths','operationalYears','benchmark','benchmarkSource','dieselFactor','lpgFactor','factorSource'],
  energy:['month','grid','solar','export','diesel','lpg','other','excluded','dieselOpening','dieselPurchases','dieselClosing','lpgOpening','lpgPurchases','lpgClosing']
};
const key=v=>String(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={name:['property','propertyname','building','buildingname','sitename'],address:['physicaladdress','streetaddress'],nfa:['netfloorarea','nfam2','netaream2'],gfa:['grossfloorarea','gfam2','grossaream2'],zone:['energyzone','climatezone'],ownership:['owner type','ownershiptype'],occupancy:['occupancyclass','classification'],month:['period','billingmonth','reportingmonth'],grid:['gridkwh','electricitykwh','importkwh','purchasedelectricity'],solar:['solarkwh','pvgeneration','generationkwh'],export:['exportkwh','exportedkwh'],diesel:['diesellitres','dieselliters','diesell'],lpg:['lpgkg','gaskg'],other:['otherkwh'],excluded:['excludedkwh'],sourceReference:['externalid','legacyid','propertycode','sitecode'],operationalYears:['yearsinoperation']};
function reject(message){const e=new Error(message);e.status=400;throw e;}
export function inferMapping(headers,type){return Object.fromEntries(IMPORT_FIELDS[type].map(field=>[field,headers.find(h=>[key(field),...(aliases[field]||[]).map(key)].includes(key(h)))||'']));}
export function importNumber(value,label,optional=false){
  if(value===''||value===undefined||value===null){if(optional)return 0;throw new Error(`${label} is blank; enter a value or explicit zero`);}
  let text=String(value).trim().replace(/[\s\u00a0]/g,'');if(/^\d+,\d{1,2}$/.test(text))text=text.replace(',','.');if(!/^\d+(\.\d+)?$/.test(text))throw new Error(`${label}: use positive numeric cells or dot decimals, without thousands separators`);const n=Number(text);if(!Number.isFinite(n)||n>1e12)throw new Error(`${label} is out of range`);return n;
}
export function stockQuantity(opening,purchases,closing){const quantity=importNumber(opening,'Opening stock')+importNumber(purchases,'Purchases')-importNumber(closing,'Closing stock');if(quantity<0)throw new Error('Closing stock exceeds opening stock plus purchases');return quantity;}
export function buildImportPreview(raw,type,mapping,existing=[]){
  if(!IMPORT_FIELDS[type])reject('Unknown import type');const map={...inferMapping(raw.headers,type),...mapping};for(const [field,header]of Object.entries(map))if(!IMPORT_FIELDS[type].includes(field)||(header&&!raw.headers.includes(header)))reject('Invalid column mapping');
  const assigned=Object.values(map).filter(Boolean);if(new Set(assigned).size!==assigned.length)reject('Map each source column to only one field');const seen=new Set(),rows=[];
  const source=(row,field)=>map[field]?row[raw.headers.indexOf(map[field])]??'':'';
  raw.rows.forEach((row,index)=>{
    const errors=[],warnings=[];let value=null;try{
      if(type==='properties'){
        const input={months:[],systems:SYSTEMS.map(title=>({title,status:'Not assessed',notes:''})),methodologyConfirmed:false,majorRenovation:false};
        for(const f of IMPORT_FIELDS.properties)input[f]=source(row,f);
        for(const f of ['name','province','occupancy','ownership','zone'])if(!String(input[f]).trim())throw new Error(`Map and fill ${f}`);
        const province=String(input.province).trim();input.province=PROVINCES.find(p=>p.toLowerCase()===province.toLowerCase())||province;
        input.occupancy=String(input.occupancy).trim().toUpperCase();input.ownership=/^(state|government|public)$/i.test(String(input.ownership).trim())?'State':/^private$/i.test(String(input.ownership).trim())?'Private':input.ownership;input.zone=String(input.zone).trim().toUpperCase();
        for(const f of ['gfa','nfa','vacancyAreaMonths','operationalYears','benchmark','dieselFactor','lpgFactor'])input[f]=importNumber(input[f],f,true);
        value=normalizeAssessment(input);if(!value.name)throw new Error('Property name is required');if(value.nfa>value.gfa&&value.gfa>0)throw new Error('NFA is greater than GFA');
        const identity=`name:${value.name.toLowerCase()}|${value.address.toLowerCase()}`,reference=value.sourceReference?`ref:${value.sourceReference.toLowerCase()}`:null;
        if(seen.has(identity)||(reference&&seen.has(reference))||existing.some(a=>(value.sourceReference&&a.sourceReference?.toLowerCase()===value.sourceReference.toLowerCase())||(a.name.toLowerCase()===value.name.toLowerCase()&&a.address.toLowerCase()===value.address.toLowerCase())))throw new Error('Duplicate property/reference; existing records will not be overwritten');seen.add(identity);if(reference)seen.add(reference);
        if(!value.address||!value.nfa||!value.gfa)warnings.push('Address or floor area is incomplete. Complete the draft before submission.');warnings.push('Imported as Draft; professional verification and evidence still required.');
      }else{
        value={month:String(source(row,'month')).trim()};if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(value.month)||value.month>=new Date().toISOString().slice(0,7))throw new Error('Month must be a completed YYYY-MM calendar month');if(seen.has(value.month))throw new Error('Duplicate calendar month');seen.add(value.month);
        value.grid=importNumber(source(row,'grid'),'Grid kWh');for(const f of ['solar','export','diesel','lpg','other','excluded'])value[f]=importNumber(source(row,f),f,true);
        for(const fuel of ['diesel','lpg']){const fields=['Opening','Purchases','Closing'].map(s=>fuel+s);if(fields.some(f=>String(source(row,f)).trim())){if(String(source(row,fuel)).trim())throw new Error(`Use either ${fuel} consumption or stock inputs, not both`);value[fuel]=stockQuantity(...fields.map(f=>source(row,f)));warnings.push(`${fuel} quantity derived from stock; calorific factor is still required in assessment.`);}}
        if(value.export>value.solar)throw new Error('Export exceeds total solar generation');
      }
    }catch(e){errors.push(e.message);}
    rows.push({row:index+2,label:type==='properties'?String(source(row,'name')):String(source(row,'month')),errors,warnings,value});
  });
  if(type==='energy'&&rows.length>12)reject('An assessment accepts at most 12 monthly rows');
  return {mapping:map,headers:raw.headers,rows,total:rows.length,valid:rows.filter(r=>!r.errors.length).length,errors:rows.filter(r=>r.errors.length).length};
}
export function importTemplate(type){
  if(!IMPORT_FIELDS[type])reject('Unknown template');const headers=type==='properties'?IMPORT_FIELDS.properties:IMPORT_FIELDS.energy.slice(0,8);let text=headers.join(',')+'\r\n';
  if(type==='energy')for(let i=0;i<12;i++){const d=new Date();d.setUTCDate(1);d.setUTCMonth(d.getUTCMonth()-12+i);text+=d.toISOString().slice(0,7)+',,,,,,,\r\n';}return '\ufeff'+text;
}
