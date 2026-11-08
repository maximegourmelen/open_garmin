# Security and deployment

This repository is an independent application, not a Garmin product. No Garmin
key, token, original file, production database or private measurement belongs in
an issue, pull request or test fixture.

- Runtime data lives in `.runtime/` (or `OPEN_GARMIN_DATA_DIR`) and is ignored by
  Git and Docker build contexts. Keep its directory owner-readable only.
- Garmin keys are encrypted with Fernet. The encryption key is stored separately
  from the database with mode 0600. This protects against an isolated database
  disclosure, not compromise of the entire application host. Back up the key and
  database together privately; losing the key makes saved credentials unreadable.
- Health records and original files are not application-encrypted at rest. Use an
  encrypted volume, private backups, restricted filesystem access and HTTPS.
- Authentication uses scrypt passwords, opaque HttpOnly sessions, CSRF tokens and
  origin checks. No Garmin secret is sent back to the browser. Rate limiting in
  this release is in-process; a public installation needs a trusted edge limiter.
- All data queries and original downloads are scoped to the signed-in app user.
  Public registrations are disabled by default after the first workspace.
- Disconnect deletes the locally stored Garmin key, cancels pending work and
  preserves imported history. It does not revoke a key at Garmin. Revoke it in
  Garmin Connect when appropriate.
- Data deletion removes this installation's rows and originals, disconnects the
  account and invalidates in-progress imports. Backups require a separate retention
  policy. Account deletion also removes credentials and sessions.
- The background worker is designed for one server process. Run one Uvicorn worker.
  Durable jobs resume on restart; distributed workers and horizontal scaling need
  a coordinated claim/lease mechanism before use.
- API base hosts are fixed to Garmin's documented global/China Personal API hosts.
  Archive parsing occurs in memory with size limits; paths are never extracted.
  Original uploads from arbitrary third parties are not accepted by this release.

Before public hosting, confirm the Garmin access/terms model, set secure cookies,
configure allowed origins, deploy behind HTTPS, prepare account recovery/email
verification, move encryption keys to a managed secret service, review persistence
and backups, and perform an independent security review. The local pilot's
password login is not a substitute for those launch preparations.

Report vulnerabilities privately to the repository maintainer using GitHub private
vulnerability reporting once enabled. Until a maintainer contact is configured,
do not post sensitive reproduction material publicly.
