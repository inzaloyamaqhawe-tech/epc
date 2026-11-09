import { positive, fuelEnergy } from './fuelConverter.js';
import { BANDS, OCCUPANCIES, benchmarkValid } from './benchmarkMatrix.js';
export function classify(eui, benchmark) {
  positive(eui, 'EUI'); positive(benchmark, 'Benchmark', false);
  const ratio = eui / benchmark;
  return BANDS.find(([, max]) => ratio < max - Number.EPSILON * 4)[0];
}
export function applicability(a) {
  const threshold = a.ownership === 'State' ? 1000 : 2000;
  return { mandatory: Boolean(OCCUPANCIES[a.occupancy] && Number(a.nfa) > threshold && Number(a.operationalYears) >= 2 && !a.majorRenovation), threshold, basis: 'Net floor area strictly greater than threshold; at least two years in operation without major renovation in that period.' };
}
export function calculate(a) {
  const nfa = positive(a.nfa, 'Net floor area', false);
  const vacancyAreaMonths = positive(a.vacancyAreaMonths || 0, 'Vacancy area-months');
  const assessedArea = nfa - vacancyAreaMonths / 12;
  positive(assessedArea, 'Vacancy-adjusted assessment area', false);
  let grid = 0, solar = 0, exported = 0, diesel = 0, lpg = 0, other = 0, excluded = 0;
  const dieselFactor = positive(a.dieselFactor || 0, 'Diesel factor');
  const lpgFactor = positive(a.lpgFactor || 0, 'LPG factor');
  for (const m of a.months || []) {
    const g = positive(m.grid, 'Grid'), s = positive(m.solar, 'Solar generation'), e = positive(m.export, 'Export');
    if (e > s) throw new Error('Solar export cannot exceed total on-site solar generation');
    grid += g; solar += s; exported += e;
    diesel += Number(m.diesel) ? fuelEnergy(m.diesel, dieselFactor) : 0;
    lpg += Number(m.lpg) ? fuelEnergy(m.lpg, lpgFactor) : 0;
    other += positive(m.other || 0, 'Other energy');
    excluded += positive(m.excluded || 0, 'Excluded energy');
  }
  const gross = grid + solar + diesel + lpg + other - exported;
  if (excluded > gross) throw new Error('Excluded energy exceeds total consumption');
  const net = gross - excluded, eui = net / assessedArea;
  return { grid, solar, exported, diesel, lpg, other, excluded, gross, net, assessedArea, eui, grade: benchmarkValid(a) ? classify(eui, Number(a.benchmark)) : null, excludedPercent: gross ? excluded / gross * 100 : 0, applicability: applicability(a), provisional: !benchmarkValid(a) };
}
export function validateAssessment(a, documents = [], today = new Date()) {
  const errors = [];
  for (const key of ['name', 'address', 'province', 'municipality', 'erf', 'professional', 'professionalNumber', 'auditDate', 'auditBody', 'auditReference']) if (!String(a[key] || '').trim()) errors.push({ field: key, message: `${key} is required` });
  if (!(Number(a.gfa) >= Number(a.nfa) && Number(a.nfa) > 0)) errors.push({ field: 'nfa', message: 'NFA must be positive and no greater than GFA' });
  if (!benchmarkValid(a)) errors.push({ field: 'benchmark', message: 'An occupancy/zone benchmark source and methodology confirmation are required' });
  if (Number(a.operationalYears) < 2 || a.majorRenovation) errors.push({ field: 'operationalYears', message: 'Two years of qualifying operation without major renovation are required' });
  if ((a.months||[]).some(m=>Number(m.diesel)||Number(m.lpg)||Number(m.other)) && !a.factorSource?.trim()) errors.push({ field: 'factorSource', message: 'Record energy conversion factors, other carriers and their source or measurement basis' });
  if (Number(a.vacancyAreaMonths)>0 && !a.exclusionNotes?.trim()) errors.push({ field: 'vacancyAreaMonths', message: 'Explain the vacancy area-month calculation and evidence source' });
  const months = a.months || [];
  const keys = months.map(m => m.month);
  const ord = keys.map(k => /^\d{4}-(0[1-9]|1[0-2])$/.test(k) ? Number(k.slice(0,4))*12+Number(k.slice(5)) : NaN);
  if (months.length !== 12 || new Set(keys).size !== 12 || ord.some((n,i) => !Number.isFinite(n) || (i && n !== ord[i-1]+1))) errors.push({ field: 'months', message: 'Enter 12 consecutive, unique calendar months in order' });
  if (keys.some(k => k >= today.toISOString().slice(0,7))) errors.push({ field: 'months', message: 'Use completed calendar months only' });
  if (a.auditDate && (!validDate(a.auditDate) || a.auditDate > today.toISOString().slice(0,10))) errors.push({ field: 'auditDate', message: 'Audit date must be a valid date on or before today' });
  if (!Array.isArray(a.systems) || a.systems.length !== 9 || a.systems.some(s => !['Verified','Action needed','Not applicable'].includes(s.status) || !s.notes?.trim())) errors.push({ field: 'systems', message: 'Record a status and evidence note for all nine technical sections' });
  for (const kind of ['Utility bills','Building plans','Site audit']) if (!documents.some(d => d.kind === kind)) errors.push({ field: 'documents', message: `${kind} evidence is required` });
  try { calculate(a); } catch (e) { errors.push({ field: 'energy', message: e.message }); }
  return errors;
}
export function validDate(date){return /^\d{4}-\d{2}-\d{2}$/.test(date) && Number.isFinite(Date.parse(date)) && new Date(date+'T00:00:00Z').toISOString().slice(0,10)===date;}
export function anniversary(date, years = 5) {
  if(!validDate(date))throw new Error('Invalid issue date');
  const d = new Date(date + 'T00:00:00Z');
  if (!Number.isFinite(d.getTime())) throw new Error('Invalid issue date');
  const month = d.getUTCMonth(); d.setUTCFullYear(d.getUTCFullYear() + years);
  if (d.getUTCMonth() !== month) d.setUTCDate(0);
  return d.toISOString().slice(0,10);
}
export function certificateStatus(c, today = new Date().toISOString().slice(0,10)) {
  if (c.status === 'Active' && c.expires <= today) return 'Expired';
  return c.status;
}
export function savings(i) {
  const kwh = positive(i.kwh, 'Annual saved kWh'), tariff = positive(i.tariff, 'Tariff'), cost = positive(i.cost, 'Investment'), emission = positive(i.emission, 'Emissions factor');
  const zar = kwh * tariff;
  return { zar, payback: zar > 0 ? cost / zar : null, tonnes: kwh * emission / 1000 };
}


