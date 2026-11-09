import ExcelJS from 'exceljs';
import {parse} from 'csv-parse/sync';
import {normalizeAssessment,SYSTEMS,PROVINCES} from './normalization.js';
import {inflateRawSync} from 'node:zlib';
import {OCCUPANCIES,ZONES} from './benchmarkMatrix.js';

export const IMPORT_FIELDS={
  properties:['name','address','province','municipality','erf','sourceReference','occupancy','subtype','ownership','zone','gfa','nfa','vacancyAreaMonths','operationalYears','benchmark','benchmarkSource','dieselFactor','lpgFactor','factorSource'],
  energy:['month','grid','solar','export','diesel','lpg','other','excluded','dieselOpening','dieselPurchases','dieselClosing','lpgOpening','lpgPurchases','lpgClosing']
};
const key=v=>String(v).toLowerCase().replace(/[^a-z0-9]/g,'');
const aliases={name:['property','propertyname','building','buildingname','sitename'],address:['physicaladdress','streetaddress'],nfa:['netfloorarea','nfam2','netaream2'],gfa:['grossfloorarea','gfam2','grossaream2'],zone:['energyzone','climatezone'],ownership:['owner type','ownershiptype'],occupancy:['occupancyclass','classification'],month:['period','billingmonth','reportingmonth'],grid:['gridkwh','electricitykwh','importkwh','purchasedelectricity'],solar:['solarkwh','pvgeneration','generationkwh'],export:['exportkwh','exportedkwh'],diesel:['diesellitres','dieselliters','diesell'],lpg:['lpgkg','gaskg'],other:['otherkwh'],excluded:['excludedkwh'],sourceReference:['externalid','legacyid','propertycode','sitecode'],operationalYears:['yearsinoperation']};
function reject(message){const e=new Error(message);e.status=400;throw e;}
function boundedZip(buffer){
  let end=-1;for(let i=buffer.length-22;i>=Math.max(0,buffer.length-65557);i--)if(buffer.readUInt32LE(i)===0x06054b50){end=i;break;}
  if(end<0)reject('Invalid XLSX archive');const count=buffer.readUInt16LE(end+10),offset=buffer.readUInt32LE(end+16);if(count>1000||offset===0xffffffff)reject('Workbook archive is too complex');
  let p=offset,total=0;for(let i=0;i<count;i++){if(p+46>buffer.length||buffer.readUInt32LE(p)!==0x02014b50)reject('Invalid XLSX directory');const flags=buffer.readUInt16LE(p+8),method=buffer.readUInt16LE(p+10),compressed=buffer.readUInt32LE(p+20),size=buffer.readUInt32LE(p+24),nameLength=buffer.readUInt16LE(p+28),extra=buffer.readUInt16LE(p+30),comment=buffer.readUInt16LE(p+32);total+=size;if((flags&1)||size===0xffffffff||total>40*1024*1024||size>Math.max(compressed,1)*300)reject('Workbook is encrypted or exceeds safe expansion limits');const name=buffer.subarray(p+46,p+46+nameLength).toString();if(name.includes('..')||/vbaProject|externalLinks/i.test(name))reject('Macros and external workbook links are not supported');const local=buffer.readUInt32LE(p+42);if(local+30>buffer.length||buffer.readUInt32LE(local)!==0x04034b50)reject('Invalid workbook entry');const begin=local+30+buffer.readUInt16LE(local+26)+buffer.readUInt16LE(local+28);if(begin+compressed>buffer.length)reject('Truncated workbook');const packed=buffer.subarray(begin,begin+compressed);let actual;try{actual=method===0?packed:method===8?inflateRawSync(packed,{maxOutputLength:Math.max(1,size+1)}):null;}catch{reject('Workbook expansion exceeds its declared size');}if(!actual||actual.length!==size)reject('Workbook entry size mismatch');p+=46+nameLength+extra+comment;}
}
export async function readImport(buffer,filename,sheetName=''){
  if(buffer.length>5*1024*1024)reject('Maximum import size is 5 MB');let rows,sheets,selectedSheet;
  if(/\.xlsx$/i.test(filename)){
    boundedZip(buffer);const workbook=new ExcelJS.Workbook();try{await workbook.xlsx.load(buffer);}catch{reject('Could not read this XLSX workbook. Save a clean .xlsx or CSV copy.');}
    sheets=workbook.worksheets.map(w=>w.name);const sheet=sheetName?workbook.getWorksheet(sheetName):workbook.worksheets[0];if(!sheet)reject('Worksheet not found');selectedSheet=sheet.name;if(sheet.rowCount>1201||sheet.columnCount>80)reject('Maximum 1,200 data rows and 80 columns per worksheet');
    rows=[];sheet.eachRow({includeEmpty:true},row=>{const out=[];for(let i=1;i<=sheet.columnCount;i++){const cell=row.getCell(i),v=cell.value;if(v&&typeof v==='object'&&('formula'in v||'sharedFormula'in v))reject(`Formula in ${cell.address}: paste values before importing`);if(v instanceof Date)out.push(v.toISOString().slice(0,7));else if(v&&typeof v==='object')out.push(cell.text);else out.push(v??'');}rows.push(out);});
  }else if(/\.csv$/i.test(filename)){
    let text=buffer.subarray(0,2).equals(Buffer.from([255,254]))?buffer.subarray(2).toString('utf16le'):buffer.toString('utf8');if(text.includes('\u0000'))reject('Unsupported CSV encoding. Save as UTF-8 CSV.');
    const line=text.split(/\r?\n/)[0],counts=[',',';','\t'].map(delimiter=>({delimiter,count:line.split(delimiter).length})),delimiter=counts.sort((a,b)=>b.count-a.count)[0].delimiter;
    try{rows=parse(text,{bom:true,delimiter,skip_empty_lines:true,trim:true,max_record_size:30000,to:1202,relax_column_count:false});}catch{reject('CSV rows must match the heading columns. Check quotes, delimiter and encoding.');}sheets=['CSV'];selectedSheet='CSV';
  }else reject('Upload .csv or .xlsx. For legacy .xls, save an .xlsx or CSV copy first.');
  rows=rows.filter(row=>row.some(v=>String(v).trim()));if(rows.length<2)reject('The file needs a header row and at least one data row');if(rows.length>1201)reject('Maximum 1,200 data rows per upload');
  const headers=rows.shift().map(v=>String(v).trim());if(headers.length>80||headers.some(h=>!h)||new Set(headers.map(key)).size!==headers.length)reject('Each column needs a unique, non-empty heading');
  return {headers,rows,sheets,selectedSheet};
}
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
        const fingerprint=value.sourceReference?`ref:${value.sourceReference.toLowerCase()}`:`name:${value.name.toLowerCase()}|${value.address.toLowerCase()}`;
        if(seen.has(fingerprint)||existing.some(a=>value.sourceReference?a.sourceReference?.toLowerCase()===value.sourceReference.toLowerCase():a.name.toLowerCase()===value.name.toLowerCase()&&a.address.toLowerCase()===value.address.toLowerCase()))throw new Error('Duplicate property/reference; existing records will not be overwritten');seen.add(fingerprint);
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
export function pruneImportStaging(store,now=Date.now()){
  const expired=store.db.prepare("SELECT * FROM records WHERE kind='import'").all().filter(row=>{const value=store.unpack(row);return !value.used&&value.expires<now;});
  if(expired.length)store.transaction(()=>{for(const row of expired)store.db.prepare("DELETE FROM records WHERE id=? AND tenant=? AND kind='import'").run(row.id,row.tenant);});
  return expired.length;
}
