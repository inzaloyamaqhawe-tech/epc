# Application architecture

## Modules

`assets/` contains the copied Bolide logo and mark, original responsive styles, browser state and the adapted 768px matchMedia wrapper. `components/views.js` contains escaped HTML view renderers. No CDN scripts, trackers or remote fonts are used.

`services/scoringEngine.js`, `fuelConverter.js`, `benchmarkMatrix.js` and `normalization.js` own server-side calculations, references, validation and allowlisted input shapes. Browser calculations are feedback only; submission and lifecycle operations use server results.

`server.js` serves the UI and Express API. Static serving is restricted to assets/components and the index entry; database, source documents, environment files and uploaded files are never exposed by a root static server.

`services/database.js` stores organisations, accounts, sessions, versioned encrypted records, audit events, tracking counters and reminder-delivery state in SQLite WAL. Assessment, certificate, evidence metadata, initiative, compliance and invitation records use one typed tenant-scoped repository. SQL values are parameterised; dynamic SQL identifiers are not accepted from the client. Version checks and database transactions protect updates and tracking allocation.

`services/storage.js` encrypts evidence with AES-256-GCM and per-file random nonces and tenant/key-bound additional authenticated data. It stores ciphertext locally or in S3. `database.js` similarly binds encrypted record data to tenant and record ID. Uploads are generated UUID keys, independent of supplied filenames. Signature checks and attachment-only delivery reduce active-content exposure; content scanning is an operator extension, not implemented antivirus.

`services/pdf.js` generates engineering review PDFs using PDFKit and locally generated QR images. Certificate records snapshot approved assessments; later renewals cannot silently change an earlier record's inputs. The actual external EPC is an immutable uploaded attachment.

`scripts/reminders.js` is the unattended renewal job. Each certificate/window has a unique delivery record. Failed SMTP remains retryable; SMTP acceptance does not prove mailbox delivery. A crash after provider acceptance but before marking sent can duplicate email; strict exactly-once email is not claimed.

## Access model

Every private record operation derives tenant from the authenticated user. User-supplied tenant, status, author and ID fields are discarded during assessment normalisation. Super Admin is not a cross-tenant bypass. Public verification returns only property ID, tracking/SANEDI numbers, status and validity.

Assessors/managers/admins edit drafts and revisions. Reviewers/admins approve submissions but cannot review a record they created, last edited or submitted. Compliance Officers can maintain compliance evidence and activate external certificate records. Owner accounts read their organisation portfolio. Admins invite team members; invitations are hashed, expiring, single-use and never expose the token in an audit event.

Account passwords use asynchronous Argon2id with unique 16-byte salts, 19 MiB, two passes and one lane. Session tokens are random, hashed before persistence and expire after eight hours. Mutations require exact Origin; authenticated mutations additionally require the session CSRF token. Production cookies are HttpOnly, Secure and SameSite Strict. Login, invitation acceptance and sensitive submissions have explicit rate limits. No open CORS policy is enabled.

## Operational limits

SQLite supports this single-server release; do not share its file between multiple containers, processes on network storage, RDS or Lambda instances. S3 only replaces evidence storage, not the database. Rate limits are process-local. Public-token lookup currently scans and decrypts certificate records; larger deployments need a dedicated indexed public-token repository and a transactional SQL adapter. There is no MySQL/RDS migration layer in this release.

Audit events are append-only through application routes but can be altered by a database administrator. They are not tamper-proof/WORM evidence. Operational log redaction, backup encryption, key custody, access revocation, password recovery, incident handling, retention/deletion, user deactivation and disaster recovery require operator procedures or future administration features before broad production rollout.
