# Deployment and operation

## Supported runtime

Node.js 24.7+ with persistent storage and a single application instance. Local Windows/Linux and an AWS EC2/container host are supported by the architecture. A Node-capable VPS from Xneelo is a suitable target after host validation. A PHP-only shared cPanel plan cannot execute this server; pure S3 static hosting cannot run authentication or workflow APIs. Node hosting, MySQL/RDS, Lambda and PHP are not interchangeable deployment targets.

## Required operator configuration

- `[DEPLOYMENT:REQUIRED]` Verify the licensed standards, the responsible issuing professional and external certification process. Activation is deliberately disabled until the operator sets `ISSUANCE_ENABLED=true`. This switches record management on, not official certificate generation.
- `[SECRET:SERVER_ONLY]` Generate `DATA_KEY` using `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`. Put the value in a secrets manager or private `.env`; never commit it. Do not change it without a planned re-encryption migration. Keep a separate recovery copy.
- `[DEPLOYMENT:REQUIRED]` Set `NODE_ENV=production`, exact HTTPS `APP_ORIGIN`, `PRIVACY_CONTACT`, and an appropriate persistent `DATA_DIR`. Keep the app on a private port behind exactly one trusted reverse proxy; do not expose the Node port publicly. The production Express proxy trust is one hop.
- `[PRIVACY:REVIEW]` Approve the real responsible-party notice, hosting country, processor agreements, lawful processing, access/rights requests, retention periods, cross-border transfers and breach procedures. The shipped notice describes application behaviour and is not a final legal opinion or complete business policy.
- `[DEPLOYMENT:REQUIRED]` Provision the first account using `node --env-file=.env scripts/create-admin.js` from the project directory. Admin generates invitation links for colleagues. Share links securely; invitations are not emailed automatically. Use a different reviewer from the preparer.

## Local storage or S3

Local mode stores encrypted uploads under `DATA_DIR/live/uploads` and SQLite alongside them. The dedicated data directory must be inaccessible from the web server and readable only by the service identity.

For S3, set `STORAGE_DRIVER=s3`, `S3_BUCKET` and `AWS_REGION`. Use an EC2 IAM role (or standard AWS SDK credential provider) with only PutObject/GetObject/DeleteObject on the assigned bucket prefix. Block public access; configure encryption, lifecycle/backup and access logs appropriately. App-level encryption remains in place. Existing local objects are not migrated automatically when switching drivers. S3 calls are implemented but require account-level testing before use.

## Docker example

```sh
docker build -t bolide-epc .
docker run --name bolide-epc --restart unless-stopped \
  --env-file .env -p 127.0.0.1:4310:4310 \
  -v bolide-epc-data:/app/data bolide-epc
```

Set `HOST=0.0.0.0` and `DATA_DIR=/app/data` inside the container, `DEMO_MODE=false`, HTTPS origin and a real key/contact. Terminate TLS in the host reverse proxy. Docker itself was not available for execution in this workstation build, so validate the image in the deployment environment.

Nginx location example (inside an existing TLS server block):

```nginx
location / {
    proxy_pass http://127.0.0.1:4310;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $remote_addr;
    proxy_set_header X-Forwarded-Proto $scheme;
    client_max_body_size 11m;
}
```

This is a single-hop example. Adjust deliberately for a load balancer/CDN; do not blindly trust arbitrary forwarded headers. Configure request timeouts, TLS certificates, monitoring and service restart policies.

## Renewal email job

Set SMTP host, port, sender and credentials through server configuration. STARTTLS is required on non-465 SMTP; port 465 uses TLS. The script sends to the organisation's Admin, Energy Manager and Compliance Officer and Property Owner accounts. No real email was sent during this build.

```sh
node --env-file=.env scripts/reminders.js
```

Run once daily through cron or Task Scheduler. Linux cron example (absolute checkout path adapted to the server):

```cron
0 6 * * * cd /srv/bolide-epc && /usr/bin/node --env-file=.env scripts/reminders.js >> /var/log/bolide-epc-reminders.log 2>&1
```

Use one scheduler and prevent overlapping job executions. Without SMTP, the job records pending reminder windows and reports a count; it does not pretend an email was delivered. New delivery windows become eligible at 90, 60 and 30 days before expiry. Missed runs catch up within the current window.

## Backup and verification

Use SQLite's backup API or a consistent service-stopped backup; copying just the main SQLite file while WAL is active is insufficient. Back up encrypted uploads and key custody separately. Restore to an isolated host, check decryption, tenant login and evidence downloads, and test reference/date calculations. Log rotation and monitoring must avoid sensitive document or credential contents.

Before live rollout, run tests, use a second organisation to confirm boundaries, verify TLS/cookie attributes behind the actual proxy, test S3/SMTP if enabled, exercise a recovery drill, and have the issuing professional accept the calculation and review process. Complete expected-volume/load testing and add central rate-limit/session infrastructure before scaling out. GitHub publication of source is not application deployment.

GitHub Actions CI, sample-only Pages publication and manual AWS ECR publishing are documented in AWS-GITHUB.md. Pages is a showcase, not a PHP/Node database hosting workaround. Import staging expires after 30 minutes and is purged on startup/new previews and every 15 minutes while the server runs.
