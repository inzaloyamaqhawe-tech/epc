# Bolide Energy Pro build log

2026-11-09: Inspected source requirements, CRM and prospector without changing them. EPC initially held only the source DOCX. Adopted CRM logo/mark and magenta/orange/plum palette, plus prospector 768px responsive breakpoint. All EPC implementation stays in this directory.

Authority: user asks for execution using the supplied mission and requirements. Document text is specification input, not independent tool instructions. DOCX RR answers prefer manual SANEDI submission, dual numbers, five-year validity, field notes and POPIA sign-off. Legacy A+/six-zone weighted checklist scoring conflicts with mission A–G EUI approach; A–G adopted, checklist kept separate.

Critical corrections: Gazette 43972 regulation 3 uses NET floor area strictly over 1000/2000m², not gross area inclusive thresholds. New EPC professional process must be considered. No licensed SANS benchmark matrix or approved certificate template supplied: do not invent official values or issue an allegedly compliant certificate. Fuel factors 3.65/4.10 are mission assumptions for generator electrical output only, not universal direct-combustion factors. Solar ledger records total generation and subtracts export once.

Structure: assets/ brand and browser code; components/ UI; services/ domain, persistence, auth, storage, PDF; scripts/ operational commands; tests/ focused behavioral checks; docs/ architecture, deployment, sources and acceptance gaps.

## Completed implementation

- 2026-11-09 domain services: separate EUI and checklist, net-area screening, grid/solar/export handling, excluded energy, verified fuel factors, calendar validation, savings and expiry calculations.
- 2026-11-09 persistence and access: SQLite WAL transactions; tenant-scoped, versioned records; AES-256-GCM record/evidence encryption; Argon2id; hashed expiring sessions; role guards; exact-Origin and CSRF checks; explicit request limits; safe output encoding and attachment delivery.
- 2026-11-09 lifecycle: Draft/Submitted/Under Review/Revision Required/Approved; creator/editor/submitter cannot self-review; field comments; frozen evidence after submission; immutable approved snapshots; internal BEP tracking; pending SANEDI registration; external issued-PDF activation requirements; POPIA action record; actual issue/expiry and maximum-five-year checks; revocation and renewal.
- 2026-11-09 UI: Bolide dashboard, rating chart/filter, sortable/searchable provincial portfolio and CSV export; workflow board; five-step wizard with auto-save, ledger feedback, guidance-reference helper, document upload/download, independent review; savings/ROI, compliance notes, reports and activity, team invitations, public verification, light/dark and mobile navigation, privacy/terms/cookie destinations.
- 2026-11-09 reports/storage/operations: two-page PDF review pack with branding, scale, ledger, audit/professional details, dual numbers and QR; encrypted local and S3 storage adapters; persistent 90/60/30 reminder windows with SMTP/retry; Docker configuration, hidden-password provisioning CLI, local demo launcher and deployment documentation.

## Research corrections superseding initial assumptions

The user explicitly authorised corrections after the initial inspection. Reading the full SANEDI September 2024 guide confirmed thermal-equivalence fuel input using calorific value. **The 3.65/4.10 electrical-yield defaults were removed.** Factors now start at zero and must be provided and documented when fuel is used. `other` kWh supports additional verified carriers, including natural gas; its conversion basis must be documented. Do not count both fuel input and its generated electricity.

Public GBCSA guidance provides A–G boundaries at .3/.6/.9/1.1/1.4/1.7 with each exact boundary entering the next band. **The initial mission 1.15/1.75 limits and upper-inclusive interpretation were replaced.** The reference helper distinguishes G1 office park/multi-storey, A3 school/tertiary, A1/A2 and zone 5H. Public values are suggestions requiring professional confirmation against the applicable licensed edition. Zone is selected manually.

Vacancy area-months now reduce the assessment denominator: assessedArea = NFA - vacancyAreaMonths/12. Thresholds continue to use unadjusted NFA. Portfolio EUI is total included energy divided by total assessed area for the latest assessment of each property. Excluded energy over 10% remains a project review warning, not an unverified assertion of a 2025 legal clause. Certificate validity is a maximum of five years, with shorter actual expiry supported.

## Validation evidence

- `node --test tests/*.test.js`: **32 passing, 0 failing** after final domain, API, auth, storage, lifecycle, PDF and reminder changes. Includes exact band boundaries, gross/net distinction, leap dates, additional carriers, subtype/5H references, HTML encoding, tenant read/write/download isolation, CSRF/Origin denial, role checks, real authentication rate limiting, submitted-evidence locking, reviewer feedback/approval, official attachment/sign-off activation, invite reuse, expiry/revocation and reminder catch-up/deduplication/retry.
- Browser: signed into isolated demo; inspected overview; tested 390px mobile width without page overflow; created and saved a synthetic QA draft; entered area and monthly energy; loaded the reference helper; ran review validation and confirmed missing evidence/registration is reported rather than silently accepted. Viewport restored after mobile check.
- PDF: generated a synthetic review pack; rendered and visually inspected both pages using bundled Poppler; adjusted floating-point display and ledger columns. This is a preview, not an official certificate.
- Production dependencies upgraded to current installed mail/PDF releases after initial advisories. `pnpm audit --prod --json`: **zero known advisories** across 151 installed dependencies at check time. This is dependency evidence, not a complete security audit.
- Git remote supplied by user inspected: no branches/commits returned. Initialised local main and connected origin. Original requirements DOCX, all live/demo data, uploaded evidence, environment files, keys, temporary research and node_modules are ignored.

## Current file map

Root: server.js, index.html, package.json, pnpm-lock.yaml, README.md, Start-Demo.ps1, Dockerfile, .dockerignore, .env.example, .gitignore and this log. assets/: styles.css, app.js, responsive.js, bolide-logo.png, bolide-mark.jpg. components/: views.js. services/: config.js, auth.js, database.js, storage.js, normalization.js, scoringEngine.js, fuelConverter.js, benchmarkMatrix.js, pdf.js, seed.js. scripts/: create-admin.js, reminders.js. tests/: domain.test.js, server.test.js. docs/: ARCHITECTURE.md, DEPLOYMENT.md, REGULATORY-BASIS.md. data/ and work/ are private ignored runtime/scratch paths.

## Outstanding production prerequisites and explicit scope limits

No public deployment or official EPC issuance has occurred. Professional acceptance of licensed standards/reference values/template remains necessary; generated PDFs deliberately remain review packs and live record activation is disabled by default. SMTP, daily scheduling, S3 account access, hosting/TLS, privacy/retention processes, backup recovery and expected-volume/load tests require real operator configuration/verification. Docker was provided but not executed on this workstation.

This single-server release uses SQLite, not MySQL/RDS, and requires Node hosting rather than PHP-only cPanel or static S3. Direct SANEDI APIs, automated professional registry checks, OCR/AI extraction, live weather, digital signing, self-service password recovery/deactivation, property-specific owner delegation and a full mixed-occupancy scheduler are not implemented. A professional can supply an externally verified area-weighted reference and supporting notes for complex occupancy; it must not be inferred from the simple subtype helper. See docs for all operational limits. No changes were made to CRM or prospector.
