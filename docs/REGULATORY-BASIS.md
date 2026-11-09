# Regulatory and calculation decisions

Reviewed on 9 November 2026. This document records implementation evidence; the licensed applicable standards and issuing professional remain the final technical authority.

## Sources

1. [Gazette 43972, Notice 700, 8 December 2020](https://www.gov.za/sites/default/files/gcis_document/202012/43972gon700.pdf): regulation 3 sets applicability using net floor area strictly over 1,000/2,000 m², relevant occupancy, and two years of operation without major renovation; validity cannot exceed five years. This overrides the brief's GFA and inclusive-threshold assumptions. Equal-threshold cases are flagged as outside this literal screening rule; guidance sometimes rounds these to inclusive thresholds, so a professional should review borderline cases.
2. [SANEDI EPC Guideline V3, September 2024](https://epc.sanedi.org.za/EPC%20Guideline%20_%20V3_September%202024.pdf): supports registered professionals, occupied-area normalisation and thermal-equivalent non-electrical energy. Fuel input uses gross calorific value; do not multiply by an assumed generator efficiency. Its public reference table distinguishes office/school subtypes and zone 5H. The downloaded reference was read locally; it is not redistributed in Git.
3. [GBCSA EPC Tool presentation, Jo Anderson, August 2022](https://memsresources.org.za/wp-content/uploads/2022/08/EPC-Tool_Jo-Anderson.pdf), slides 7 and 11: A–G lower-inclusive band boundaries are 0, .3, .6, .9, 1.1, 1.4 and 1.7 times the reference. Public reference values are implemented as suggestions. Check against the licensed edition before approval.
4. [SANEDI professional registration criteria](https://epc.sanedi.org.za/Guidelines%20and%20Eligibility%20Criteria%20Final%20Document%20PDF%20final.pdf): professional registration is a separate process. An entered reference is not a verified registration.
5. [SABS standards notice, Gazette 52575, May 2025](https://www.gov.za/sites/default/files/gcis_document/202505/52575gen3170.pdf): mentions SANS 1544:2025 edition 1.1. The full licensed text was not supplied. No unverified 2025 clause is presented as implemented law.

## Implemented formulas

```
fuel kWh = quantity × verified gross-calorific kWh/unit
kWh/unit = MJ/unit / 3.6
annual total = grid imports + total on-site solar generation
               + diesel thermal-equivalent kWh + LPG thermal-equivalent kWh
               + verified other-carrier kWh
               - on-site solar exports
included energy = annual total - recorded excluded energy
assessed area = net floor area - total vacant area-months / 12
EUI = included energy / assessed area
rating multiple = EUI / verified reference
```

GFA is retained as building metadata, never the EUI denominator or threshold basis. Vacancy adjustment requires explanation and evidence, and applies only to qualifying non-consuming vacant area. Multiple vacancy intervals may be totalled as area-months; avoid overlap. Threshold screening uses the unadjusted NFA. The engine rejects a zero/negative adjusted denominator, negative data, excessive export, exclusions exceeding consumption and fuel use without positive factors. Electricity produced from recorded fuel must not be added again.

Month rows are 12 consecutive completed calendar months. No missing-month extrapolation is silently performed. Source-specific metering, occupancy apportionment and energy factors must be verified professionally. Additional carriers, including natural gas, may be entered as verified thermal-equivalent kWh in the Other column; document quantity, calorific source, units and conversion in the source evidence.

```
A: ratio < .30
B: .30 <= ratio < .60
C: .60 <= ratio < .90
D: .90 <= ratio < 1.10
E: 1.10 <= ratio < 1.40
F: 1.40 <= ratio < 1.70
G: 1.70 <= ratio
```

The code uses a very small machine-precision tolerance at exact boundaries, not a business rounding interval. Reports retain unrounded inputs in calculations and round display values only.

## Rules kept separate from statutory claims

- Nine XA-labelled sections are the brief's internal evidence checklist. Their labels are not asserted to be the standard's actual clause numbering. There is no weighted checklist EPC score.
- The 10% excluded-energy warning is a project review trigger; its asserted 2025 legal basis has not been independently verified.
- POPIA sign-off records an explicit reviewer action. It does not establish organisation-wide legal compliance. No blanket South-African-only data residency claim is made; operator transfer arrangements require review.
- ISO 50001 is tracked as a voluntary framework, not a universal EPC prerequisite.
- SANEDI submission is manual. The app records the external result; it does not fabricate a government API, SANAS seal, official template or digital signature.
- Use the external EPC's actual issue/expiry dates. The app defaults to a five-year maximum only when an API caller omits a shorter official expiry. Leap-day anniversaries clamp to 28 February.
- Notifications use 90/60/30-day windows and a scheduled job, not browser timers. Email is sent only when SMTP and the scheduler are configured.

## Acceptance prerequisites

The issuing professional must verify applicable editions, reference tables, classification/subtype, location/zone mapping, exclusions and factor sources, including any changes since these public guides. Zone is selected manually; province is not used as an unreliable zone proxy. The operator must approve the externally issued certificate workflow before enabling activation. The generated review PDF remains marked as a preview even after a record is activated.
