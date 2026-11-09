export function positive(value, label, allowZero = true) {
  const n = Number(value);
  if (!Number.isFinite(n) || n < 0 || (!allowZero && n === 0)) throw new Error(`${label} must be ${allowZero ? 'non-negative' : 'positive'}`);
  return n;
}
// SANEDI 2024 guideline: non-electrical energy on thermal-equivalence basis.
// Supply verified gross calorific kWh per unit (MJ/unit divided by 3.6).
// Never apply an assumed generator efficiency to reduce fuel input energy.
export function fuelEnergy(quantity, factor) {
  return positive(quantity, 'Fuel quantity') * positive(factor, 'Approved fuel factor', false);
}
