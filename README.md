# Bolide Energy Pro

A file-first EPC assessment and portfolio application for South African buildings. Includes persistent organisation records, independent review, private evidence, engineering review PDFs, manual SANEDI tracking, savings estimates and compliance evidence. The original CRM and prospector are unchanged.

[Open the public sample demo](https://inzaloyamaqhawe-tech.github.io/epc/) · [GitHub checks](https://github.com/inzaloyamaqhawe-tech/epc/actions)

## Run the isolated demonstration

Requires Node.js 24.7 or later and pnpm 11.25.0 (or use npm to install the package manifest).

```powershell
cd "C:\Users\LangelihleNgidi\OneDrive - Bolide\Desktop\PROJECTS\epc"
pnpm install --frozen-lockfile
.\Start-Demo.ps1
```

Open http://127.0.0.1:4310 and choose Admin, Assessor or Reviewer. The demonstration contains synthetic data and illustrative benchmarks, uses `data/demo`, binds only to loopback, and cannot activate a certificate. It does not share credentials or records with live mode. Use a second role to review another person's assessment.

On Linux/macOS:

```sh
DEMO_MODE=true node server.js
```

## Set up real organisation records

1. Copy `.env.example` to `.env`. Set `DATA_KEY` to a securely generated 32-byte hex key. Store a recovery copy separately; losing this key loses access to encrypted records and evidence.
2. Set `DEMO_MODE=false`, `APP_ORIGIN` to the exact browser origin and `PRIVACY_CONTACT` to the responsible party's real contact. Use HTTPS with `NODE_ENV=production` outside loopback.
3. Run `node --env-file=.env scripts/create-admin.js`. It provisions an organisation and its first Admin. Password entry is hidden. Repeat to provision a separate organisation; existing organisations remain isolated.
4. Run `node --env-file=.env server.js`. Sign in; Admin can generate single-use colleague invitation links. The platform does not send invitations automatically.
5. Complete the operational prerequisites in `docs/DEPLOYMENT.md` before handling client records.

## CSV and Excel first

Use **Import CSV / Excel** from Properties to upload legacy client exports. Use the same action in an editable assessment's Energy ledger for monthly data. Download CSV templates, edit them in Excel, map source columns, review errors/duplicates and explicitly commit draft records. No client API is required. See `docs/FILE-IMPORT.md` for accepted files, stock ledgers and limits.

The GitHub Pages presentation workspace starts with generated sample records and supports browser-local edits, CSV/XLSX imports, evidence attachments and review workflow using IndexedDB. Changes persist on the same origin/browser/device; they never sync to a server. Use Download backup and Restore backup to preserve or transfer records and attachments. Clearing site data removes local records. This is separate from authenticated AWS storage and official certificate activation. `node scripts/build-showcase.js` produces `public-demo/`; `node scripts/preview-showcase.js` previews it locally at http://127.0.0.1:4311/epc/. The Pages workflow publishes that isolated directory only. Real accounts, imports and certificates run in the local/private AWS application.

## What is implemented

- Fixed-header Bolide workspace with locally bundled Public Sans/Archivo typography, compact navigation, workspace search, account profile/password controls, sticky table labels, pagination and online/offline notices.
- CSV/XLSX legacy-system intake with mapping, row validation, duplicate rejection, source traceability, transaction commit, stock-balance fuel quantity inputs and ledger replacement confirmation.
- Branded responsive dashboard, portfolio search/sorting/province/rating filters, CSV export, workflow board and property details.
- Five-step, automatically saved assessment; nine evidence checklist sections; twelve-month energy ledger; gross/net/vacancy area distinction; subtype and zone reference assistance.
- Server validation, version conflict protection, immutable submitted evidence, field-level revision notes, approval by a different person, renewal drafts and certificate revocation.
- Seven organisation roles: Super Admin, Admin, Energy Manager, Reviewer, Assessor, Property Owner and Compliance Officer. Super Admin remains tenant-scoped; Property Owner can read the organisation portfolio (there is no property-by-property delegation).
- Argon2id password hashes, hashed eight-hour sessions, secure production cookies, CSRF/origin checks, request limits, CSP, tenant-scoped database operations, AES-256-GCM record and evidence encryption.
- PDF review packs with logo, energy ledger, evidence observations, A–G scale, dual tracking numbers and a QR link to minimal public status verification.
- Local encrypted file storage or S3 adapter with IAM credential-provider support. The deployment store is SQLite on a persistent single-server volume.
- Savings estimates, initiative status updates, manual compliance evidence and audit history.
- 90/60/30-day renewal windows with persistent deduplication and SMTP delivery/retry support through a scheduled command.

## Engineering corrections to the supplied research

The implementation uses sourced net-area applicability, revised band boundaries, vacancy-prorated assessment area, and calorific fuel input instead of generator-efficiency discounts. Review `docs/REGULATORY-BASIS.md` for sources, formulas and unresolved edition-specific requirements. Reference suggestions are never treated as an independently verified licensed standard.

## Certificate handling

This app generates **review packs**, not an official SANS certificate. The authorised EPC professional issues the official EPC externally and submits it through SANEDI. After an assessment is approved, the app creates a pending internal number. Activation is disabled by default. A live operator may enable record activation only after verifying its process; activation then requires the actual issued PDF, official SANEDI number, issuer confirmation, issue/expiry dates and POPIA sign-off. Certificate expiry may be shorter than five years and cannot exceed the five-year anniversary.

There is no claim of automatic SANEDI integration or legal certification. The public QR checks the platform record, not the authenticity of a government record or a digital signature.

## Test

```sh
node --test tests/*.test.js
```

Tests exercise energy arithmetic and boundaries, applicability, vacancy, dates, input normalization, real HTTP authentication/CSRF, cross-tenant reads/writes/downloads, upload signatures, evidence encryption/locking, revisions/approval, certificate activation/revocation, PDF generation, invitation reuse and reminder delivery/retry.

## Scope remaining before live operation

Licensed standards and issuer approval; final privacy/retention and responsible-party processes; real hosting/TLS; backup and recovery drills; SMTP and cron configuration; operational monitoring and load testing. AWS S3 and SMTP adapters are implemented but not tested with real account credentials in this build.

No MySQL adapter, PHP backend, automated professional-register validation, OCR/AI extraction, live weather feed, digital signing, automatic SANEDI submission, password recovery, per-property owner delegation or full mixed-occupancy area scheduler is included. These are not represented by fake integrations. For mixed occupancy, a professional must supply and explain the verified area-weighted reference; the simple subtype helper applies to single/dominant occupancy only.

Node-capable VPS/container hosting is required. Do not upload this server to a PHP-only cPanel account or deploy it as an S3-only static site. See `docs/DEPLOYMENT.md` for supported options.

See `docs/WORKSPACE-STANDARD.md` for the CRM/prospector comparison, `docs/ENGINE-REVIEW.md` for the proposed advanced modules, and `docs/AWS-GITHUB.md` for GitHub sign-in versus OIDC deployment permissions. CI runs the tests, dependency check and Docker build, with a downloadable tracked-source artifact.
