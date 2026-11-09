# Review of proposed advanced engine modules

The suggestions contain useful next-stage functionality, but their opening claims repeat two research errors: statutory screening uses NFA rather than GFA, and fuel input energy must not be discounted by assumed generator efficiency. The source decisions remain in REGULATORY-BASIS.md.

| Suggestion | Decision and implementation status |
|---|---|
| Vacancy timeline | Useful. Existing assessment area-months are supported. `vacancySchedule` additionally handles a validated space/duration schedule and rejects duplicate space IDs and invalid durations. A full floor-plan/timeline editor remains future work. |
| Mixed-use sub-meter manager | Useful, with care. `mixedOccupancy` calculates area/energy shares and an area-weighted reference, and flags small-area/material-energy uses for professional review. It does not automatically assert the proposed exemption or invent physical sub-meter readings. A persisted multi-zone meter manager is not included. |
| Bulk fuel inventory | Added to CSV/Excel monthly intake: opening + purchases − closing, rejecting negative balances and double inputs. Multiply consumed quantity by verified calorific kWh/unit, without the suggested efficiency reduction. |
| 90/60/30 reminders | Existing background command and persistent delivery tracking retained; recipient roles now include Property Owner and Compliance Officer alongside managers/admins. SMTP and a daily scheduler still require deployment configuration. Validity must use the actual external certificate dates within the five-year maximum. |
| Clone reassessment | Existing renewal action clones the property profile into a new draft with an empty energy ledger. New measurements, evidence and independent approval are required; no review bypass is added. |
| OCR for utility bills | Plausible later enhancement. File upload/mapping/manual verification comes first as instructed. OCR is not implemented or advertised as reliable. Future extraction must stage candidates with page/billing-period/source/confidence evidence; an auditor confirms before ledger use. Prevent duplicate and estimated/actual billing-period overlap. |
| Immutable audit ledger | Field-path change recording was added to normal assessment updates. Application routes append events with actor/time/target/field names, with encrypted detail. A database administrator can still modify SQLite. WORM/object-lock export or an independently secured append-only sink is needed before claiming immutable inspection evidence. |
| Carbon footprint | `emissions` provides a separately tested, explicit-factor analysis interface: purchased electricity in Scope 2 and fuel quantities in Scope 1. It requires factor sources/year/boundaries and returns no invented national factors. A full GHG inventory, approved factor register, data capture UI and reporting assurance remain future work. |
| Savings simulator | Integrated into initiative cards. The current measured EUI/grade is shown alongside an indicative post-saving EUI/grade. Scenarios reject savings greater than consumption and retain the original measured assessment. Interacting measures and measurement/verification still need professional assessment. |

## Primary guidance reviewed

[SANEDI EPC guideline V3, September 2024](https://epc.sanedi.org.za/EPC%20Guideline%20_%20V3_September%202024.pdf) provides public examples of vacancy, multiple occupancy and calorific energy. Its 9% office / 91% assembly example produces a weighted reference of 94.55 and a 1.12 multiple. The engine test reproduces that calculation. This is evidence for weighted analysis, not blanket permission to merge any small space or claim sub-metering has been installed.

The same guide explicitly discusses graphical reporting of total energy including material excluded energy. Review PDFs now show included and total intensities graphically whenever exclusions are recorded, so the earlier conservative project-only warning is no longer the only presentation. Exact certificate formatting still needs the licensed applicable standard and issuing professional.

No combination of these helper functions, a successful import or a checklist establishes that software alone issues a legally compliant EPC. Official certification remains an externally authorised professional process.
