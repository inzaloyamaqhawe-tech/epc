# CSV and Excel intake

File-first intake is the primary operating workflow. Clients can export from old systems or complete a CSV template manually in Excel. No client API is required.

## Property portfolio

Open Properties → Import CSV / Excel. Download the template or upload a client `.csv` or `.xlsx`. Required values are property name, province, occupancy, state/private ownership and energy zone. Headings are matched using common legacy aliases; every column can be mapped manually. Province casing is normalised, but classification and zone are never guessed. Optional missing areas and other fields remain incomplete draft inputs.

Preview displays row counts, errors and warnings. Fix mapping or correct/re-upload the source file. A commit is all-or-nothing: every row must pass import validation, and the operator must explicitly confirm the preview. Existing property/reference matches are rejected rather than overwritten. New rows create Draft assessments; imported benchmarks are not marked professionally verified and no certificate is activated.

Imported records retain original filename, SHA-256 file hash, source row and optional legacy reference. The private audit records the importing account and timestamp. The raw workbook/CSV is parsed in memory; encrypted staging contains parsed rows during the preview session. Preview permission expires after 30 minutes and successful commit removes staged rows. Expired unused staging is purged by application maintenance; see operator retention procedures before production rollout.

## Monthly energy

Open an editable draft assessment → Energy ledger → Import CSV / Excel. The month must be a completed `YYYY-MM` calendar month. Map grid imports, total solar generation, solar exports, diesel litres, LPG kilograms, other carrier kWh and excluded kWh. Enter an explicit grid zero for a genuine zero; a missing required grid value is an error. Optional blank vectors are treated as zero and must be checked by the operator.

Fuel quantity can be supplied directly or calculated from opening stock + purchases − closing stock. Do not fill both direct consumption and stock columns. Stock-derived quantity is not yet energy: configure and verify the gross-calorific kWh/unit factor in the assessment. There is no assumed generator-efficiency multiplier.

Energy imports replace the draft ledger only after explicit replacement confirmation. A changed/locked draft rejects the commit. One to twelve monthly rows can be staged for incomplete drafts; annual EUI and PDF review reports require twelve completed months. Final submission also requires consecutive unique months, evidence and independent review. Importing data never bypasses those controls.

## Supported files and limits

- `.csv`: comma, semicolon or tab separator; quoted fields; UTF-8/BOM or UTF-16LE BOM. One heading row, unique non-empty column names, consistent row widths.
- `.xlsx`: choose the first sheet or specify its exact name. Formula cells, VBA/external workbook links and encrypted workbooks are rejected. Paste values into a clean workbook before uploading. Legacy `.xls` should be saved as `.xlsx` or CSV in Excel/LibreOffice first.
- Maximum 5 MB uploaded file, 1,200 data rows and 80 columns; monthly import maximum twelve rows. Workbook ZIP metadata and actual expanded entry sizes are checked before Excel parsing, with a 40 MB expansion ceiling. These are resource controls, not an antivirus guarantee.
- Prefer numeric Excel cells. Dot decimals without thousands separators are unambiguous; decimal comma with one/two decimal digits is accepted. Ambiguous strings such as `1,234` must be corrected instead of silently guessed.

Public GitHub Pages is a sample-only read-only showcase. It does not accept client imports or provide private authentication. Use the local/private AWS application for uploads.
