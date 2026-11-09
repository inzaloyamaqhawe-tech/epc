import {positive} from './fuelConverter.js';
import {calculate,classify} from './scoringEngine.js';
// Engineering analysis only: no assumed emissions factors or deemed mixed-use
// compliance. A professional verifies applicability and measurement boundaries.
export function vacancySchedule(nfa,spaces){
  positive(nfa,'NFA',false);const seen=new Set();let deduction=0;
  for(const space of spaces){if(!space.id||seen.has(space.id))throw new Error('Use one unique space entry; consolidate its non-overlapping vacancy periods');seen.add(space.id);const area=positive(space.area,'Vacant space area'),months=positive(space.months,'Vacancy duration');if(months>12)throw new Error('Vacancy duration exceeds 12 months');deduction+=area*months/12;}
  if(deduction>=nfa)throw new Error('Vacancy adjustment leaves no assessment area');return{deduction,assessedArea:nfa-deduction,vacancyAreaMonths:deduction*12};
}
export function mixedOccupancy(parts){
  if(!parts.length)throw new Error('Provide occupancy parts');const area=parts.reduce((t,p)=>t+positive(p.area,'Occupancy area',false),0),energy=parts.reduce((t,p)=>t+positive(p.kwh,'Occupancy energy'),0);
  const rows=parts.map(p=>({...p,reference:positive(p.reference,'Occupancy reference',false),areaShare:p.area/area,energyShare:energy?p.kwh/energy:null}));const dominant=rows.reduce((a,b)=>a.area>b.area?a:b);
  return{area,energy,eui:energy/area,weightedReference:rows.reduce((t,p)=>t+p.reference*p.areaShare,0),parts:rows,reviewFlags:rows.filter(p=>p!==dominant&&p.areaShare<.1&&p.energyShare!==null&&p.energyShare>.1).map(p=>`${p.label||'Secondary occupancy'}: small area, material energy contribution. Verify apportionment and metering; do not roll in automatically.`),requiresProfessionalReview:rows.length>1};
}
export function projectedSavings(a,initiatives){
  if(a?.months?.length!==12)throw new Error('Annual scenarios require twelve months of baseline data');
  const baseline=calculate(a),saved=initiatives.reduce((t,i)=>t+positive(i.kwh,'Saved annual energy'),0);if(saved>baseline.net)throw new Error('Savings exceed included consumption; review overlap and boundaries');const energy=baseline.net-saved,eui=energy/baseline.assessedArea;
  return{baselineEui:baseline.eui,baselineGrade:baseline.grade,projectedEnergy:energy,projectedEui:eui,projectedGrade:baseline.grade?classify(eui,a.benchmark):null,annualSavedKwh:saved,notice:'Scenario estimate only; avoids no overlap automatically and is not a measured EPC result.'};
}
export function emissions(a,factors){
  if(a?.months?.length!==12)throw new Error('Annual emissions require twelve months of activity data');
  for(const name of ['grid','diesel','lpg'])if(!factors[name]?.source?.trim())throw new Error(`${name} factor needs a source, year and boundary`);
  const r=calculate(a),litres=(a.months||[]).reduce((t,m)=>t+Number(m.diesel||0),0),kg=(a.months||[]).reduce((t,m)=>t+Number(m.lpg||0),0);
  const scope1=litres*positive(factors.diesel.value,'Diesel kgCO2e/L')+kg*positive(factors.lpg.value,'LPG kgCO2e/kg');const scope2=r.grid*positive(factors.grid.value,'Purchased electricity kgCO2e/kWh');
  return{scope1KgCO2e:scope1,scope2LocationBasedKgCO2e:scope2,totalKgCO2e:scope1+scope2,factors,notice:'Activity-based estimate. Other fuels, refrigerants and market-based instruments require separate accounting; do not label this a complete GHG inventory.'};
}
