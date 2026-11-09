import { OCCUPANCIES, ZONES } from './benchmarkMatrix.js';
export const SYSTEMS=['Building orientation','Building fabric','Fenestration and shading','Lighting','Hot water','HVAC and ventilation','Renewable energy','Controls and metering','Energy monitoring'];
export const PROVINCES=['Eastern Cape','Free State','Gauteng','KwaZulu-Natal','Limpopo','Mpumalanga','North West','Northern Cape','Western Cape'];
export function normalizeAssessment(input) {
  const value={};
  const strings=['name','address','province','municipality','erf','eskomAccount','occupancy','subtype','ownership','benchmarkSource','factorSource','professional','professionalNumber','auditBody','auditReference','auditDate','exclusionNotes'];
  for(const k of strings){value[k]=String(input[k]??'').trim();if(value[k].length>2000)throw new Error(`${k} is too long`);}
  for(const k of ['nfa','gfa','vacancyAreaMonths','operationalYears','benchmark','dieselFactor','lpgFactor']){value[k]=Number(input[k]||0);if(!Number.isFinite(value[k]) || value[k]<0 || value[k]>1e12)throw new Error(`Invalid ${k}`);}
  value.zone=String(input.zone||'1');
  for(const k of ['majorRenovation','methodologyConfirmed'])value[k]=input[k]===true;
  if(!OCCUPANCIES[value.occupancy] || !ZONES.includes(value.zone) || !['Private','State'].includes(value.ownership) || !PROVINCES.includes(value.province))throw new Error('Select a valid occupancy, province, ownership and energy zone');
  if(!Array.isArray(input.months)||input.months.length>12)throw new Error('Maximum twelve energy months');
  value.months=input.months.map(m=>{const row={month:String(m.month||'').slice(0,7)}; for(const k of ['grid','solar','export','diesel','lpg','other','excluded']){row[k]=Number(m[k]||0);if(!Number.isFinite(row[k])||row[k]<0||row[k]>1e12)throw new Error(`Invalid ${k}`);}return row;});
  value.systems=SYSTEMS.map((title,i)=>({code:`XA${i+1}`,title,status:String(input.systems?.[i]?.status||'Not assessed').slice(0,30),notes:String(input.systems?.[i]?.notes||'').slice(0,2000)}));
  return value;
}
