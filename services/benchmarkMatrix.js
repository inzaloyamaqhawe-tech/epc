export const OCCUPANCIES = { A1: 'Entertainment and public assembly', A2: 'Theatrical and indoor sport', A3: 'Places of instruction', G1: 'Offices' };
export const ZONES = ['1','2','3','4','5','5H','6','7'];
// Public GBCSA EPC Tool presentation, Jo Anderson, August 2022, slide 11.
// A suggested reference only: the professional must check the licensed edition.
export const REFERENCES = {
  'A1-general': [75,75,95,70,95,95,80,80],
  'A2-general': [95,95,110,90,110,110,105,105],
  'A3-tertiary': [110,155,110,125,140,140,120,120],
  'A3-school': [60,65,55,60,55,60,65,65],
  'G1-multistorey': [90,105,110,95,110,95,100,100],
  'G1-officepark': [70,150,190,145,180,165,75,75]
};
export const REFERENCE_SOURCE='GBCSA EPC Tool, Jo Anderson, August 2022, slide 11; verify against applicable licensed SANS 10400-XA table';
export function suggestedBenchmark(occupancy,subtype,zone){return REFERENCES[`${occupancy}-${subtype}`]?.[ZONES.indexOf(String(zone))]??null;}
// No fabricated SANS values. Each assessment captures a traceable reference
// for its occupancy and energy zone, confirmed independently by its reviewer.
export function benchmarkValid(a) {
  return Boolean(OCCUPANCIES[a.occupancy] && ZONES.includes(String(a.zone)) && Number(a.benchmark) > 0 && a.benchmarkSource?.trim() && a.methodologyConfirmed);
}
export const BANDS = [ ['A', .3, '#16835b'], ['B', .6, '#49a66e'], ['C', .9, '#a1b53f'], ['D', 1.1, '#e8b72e'], ['E', 1.4, '#e89037'], ['F', 1.7, '#df603e'], ['G', Infinity, '#bd354e'] ];
