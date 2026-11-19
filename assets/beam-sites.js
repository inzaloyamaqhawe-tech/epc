// Static BEAM reports supplied by Langa, 19 November 2026. Period totals are
// deliberately separate from instantaneous screenshots and EPC annual ledgers.
export const beamSites = [
  {
    id:'beam-thembokwezi', name:'Thembokwezi', location:'Mandalay, Cape Town',
    manufacturer:'Huawei', capacityKwp:445.30,
    periodStart:'2026-09-01', periodEnd:'2026-11-19', days:80,
    generation:149946, solarUsed:149935, gridImport:309376, gridExport:11.29,
    consumption:459345, flowConsumption:459311, selfConsumptionPercent:99.99,
    selfSufficiencyPercent:32.6, battery:null,
    snapshot:{at:'2026-11-19 10:40',solarW:308082,gridW:85294,loadW:393376},
    source:'Energy Flow & Consumption Analysis • Thembokwezi • 01 Sep 2026 - 19 Nov 2026.pdf',
    notes:['The report summary records 459,345 kWh consumption; the flow diagram records 459,311 kWh. Both source values are retained (34 kWh difference).','Generation and solar used on site are rounded to whole kWh in the report. No monthly split or tariff was supplied.']
  },
  {
    id:'beam-kgalauwane', name:'Kgalauwane House',location:"Shaka’s Rock, KwaDukuza",
    manufacturer:'Victron Energy',capacityKwp:null,
    periodStart:'2026-09-01',periodEnd:'2026-11-19',days:80,
    generation:2053,solarUsed:1850,gridImport:7661,gridExport:202.38,
    consumption:9180,flowConsumption:9180,selfConsumptionPercent:90.14,
    selfSufficiencyPercent:17.3,
    battery:{charged:623.59,discharged:291.67,solarCharged:549.85,gridCharged:73.75,storedOrLosses:331.92,directSolar:1301},
    snapshot:{at:'2026-11-19 10:30',solarW:4164,gridW:-42,loadW:3721,batteryW:470.90,chargePercent:99},
    source:'Energy Flow & Consumption Analysis • Kgalauwane House • 01 Sep 2026 - 19 Nov 2026.pdf',
    notes:['Installed PV and battery capacities are not configured in the supplied screenshot.','The report’s solar-used figure includes solar sent to storage; direct solar to load is separately reported as 1,301 kWh. Stored/losses combines retained energy and losses; it is not a measured battery-loss figure.','Values are reproduced at source precision. No tariff or monthly split was supplied.']
  }
];
