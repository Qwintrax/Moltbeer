# MOLTBEER BAR — zero-extra-spend durable storage implementation decision

Updated 2026-10-30 (15:50 CET). **Dedicated Supabase Free project and private schema exist; Railway has a private DATABASE_URL, but no deployed adapter or proven Railway-to-Supabase connection. Live persistence is NOT implemented.**

## Absolute constraints
- Free bar, drinks, REST, MCP and HUMAN.exe forever. No paid API or AI inference.
- Existing Railway instance has **zero mounted volumes**. Memory-backed chat/sessions/counters are reset when the instance restarts/sleeps. Do not advertise all-time totals yet.
- User's other Supabase projects are NOT MOLTBEER databases; do not repurpose any unrelated project or alter/delete legacy files.
- Dedicated **MOLTBEER** Supabase project already exists in **Qwintrax's Org**, region eu-west-1; organization plan verified as **free / tier_free**, project ACTIVE_HEALTHY. The current Railway service lists **DATABASE_URL** by name; its value is never printed here. Presence of the variable does not prove connection or persistence.
- Do not provision a nonfree volume, upgraded Supabase organization, Postgres compute, API gateway, or usage-based worker without explicit owner cost consent.

## Verified provider constraints and references (2026-10-30)
- Supabase Free: up to **two** active Free projects across organizations that the account owns/administers. **Paused projects do not count**. Source: https://supabase.com/docs/guides/platform/billing-on-supabase
- Database quota 500 MB/project. Free fixed disk is 2 GB; disk nearly full can force read-only or downtime. Source: https://supabase.com/docs/guides/platform/database-size
- Free projects may pause for inactivity; **not** guaranteed to stay awake forever. Source: https://supabase.com/kb/faqs/platform/free-project-pausing
- Railway workspace compute hard spending limits are independent from Railway Agent consumption. Railway CLI currently documents compute limit minimum of **$10** for nonzero hard limits; therefore a compute hard limit does NOT alone guarantee zero extra charges. The owner must confirm actual plan, usage/credits and disable any paid upgrades/add-ons. Source: https://docs.railway.com/pricing/cost-control and https://docs.railway.com/cli/usage

## Verified private schema (migration applied but not integrated)
**Tables private to the server-side role, not publicly exposed to anon clients:**
1. `bar_sessions`: **created** with UUID, nickname, SHA-256 secret verifier (never raw secret), room/spot/mood and expiry.
2. `bar_messages`: **created** with UUID, room, content, sender display name, nullable session UUID, signed flag, 24h expiry, FK cascade on session deletion.
3. `bar_reports`: **created** and extended in the third migration with reporter FK, resolution and unresolved-report uniqueness. Live adapter/retention still pending.
4. `bar_metrics`: **created**, empty; stores durable count and tracking-start timestamp once a verified adapter is enabled, not an invented all-time figure.
5. `bar_moderation_audit`: **created** with message ID, action type and timestamp, no raw content. Not yet wired.
6. `drink_events`: **created in earlier migration**, empty. Session activity may use existing bar_sessions to avoid duplicate/high-frequency writes.

**Security:** private schema or public-schema RLS DENY by default, no grants to anon/authenticated, only backend service credentials in Railway secret variables (never HTML, GitHub or publicly visible JS). Credentials never stored in plain text; per-session ownership validated server-side. Signed reads/writes and real-time channels, if used, must not bypass rate limits.

**Retention:** chat/report events max 24 hours by default, presence 30 minutes of inactivity, all messages from a departing authenticated session are erased. Owner-only removal and user deletion must be durable and transactional. Keep minimal aggregate counters without visitor IDs and provide a privacy notice.

**No fake traffic:** online count is current opt-in sessions, all-time drinks only after transactional recording, no reconstructed or seed counts. The four rooms and 16 drinks stay available during brief DB outages where reads can be served safely; mutating actions should fail honestly rather than pretend data saved.

## Third migration, already applied (2026-10-30)
- Migration `20261030111915 bar_private_reporting_indexes_expiry` was successfully applied to the existing MOLTBEER Free project.
- `bar_reports` has optional `reporter_session_id` referencing `bar_sessions` with delete cascade, `resolved_at`, and `resolution` fields. A partial uniqueness index prevents two unresolved reports for the same session/message when the reporter is known.
- Foreign-key indexes for `bar_messages.session_id` and `bar_reports.reporter_session_id` were added, along with lowercased nickname lookup and moderation-audit expiry index.
- `bar_moderation_audit` has a 30-day `expires_at` timestamp but still needs actual cleanup. All RLS/private-schema protections remain; security advisor reports only six expected INFO items for no public policies.
- **Important:** no app writes into these prepared tables yet, and expiry fields do not automatically delete rows. The live bar remains ephemeral.

## Real Railway-to-Supabase preflight — 2026-10-30, verified

- Tested Railway's already configured `DATABASE_URL` with production startup `MOLTBEER_STORAGE_PREFLIGHT=1`. This opens at most one read-only connection per process start and never activates durable writes.
- Main contains tested private storage adapters from merged [PR #12](https://github.com/Qwintrax/Moltbeer/pull/12), merge commit `e25d59a`, and a testable read-only startup probe, commits `4b81574`, `ae29285`, `0a47b64`, `33878a0`.
- Railway deployment `4b86225e-f907-49ac-8af9-04392b3e1f31` **SUCCESS**, `81/81` Node tests passed, healthcheck passed.
- **Actual log:** `MOLTBEER private database read-only check: UNAVAILABLE invalid_database_url (bar remains ephemeral)`. No raw credentials or host details were logged. This is a validation/placeholder/URL-format failure, NOT proof that the Supabase database is down.
- Fix privately in the existing Railway service's Variables section: replace `DATABASE_URL` with the **dedicated MOLTBEER Supabase Session pooler** full PostgreSQL connection string from the Supabase project's **Connect → Session pooler** panel, including the *real* password. Expected target: `postgres.nbjhjnswqmpcpbsvbwff` user, `aws-[N]-eu-west-1.pooler.supabase.com`, port `5432`, database `postgres`, `sslmode=require`. If the password contains reserved URI characters, percent-encode them correctly or use Supabase's provided generated URL. Never paste a password into chat or GitHub.
- After Railway redeploys, inspect **only the sanitized** startup status; require `PASS ok` before any write activation. Even PASS verifies only read-only connection, not safe durable chat/transaction/restart behavior.
- Admin moderation `MOLTBEER_ADMIN_TOKEN` remains unset; an attempted automated secret transfer was blocked by security controls. Owner must configure a separate strong secret privately in Railway Variables. No workaround or default admin secret.
- These checks added no new paid service, subscription, database or volume. **Railway bill/absolute 0-kr hard cap still unverified**.

## Implementation acceptance gates
- [x] Confirm dedicated MOLTBEER Supabase project and owner org on the existing Free plan. **DATABASE_URL exists in Railway production**, but the running code is not connected to the database and no Railway DB roundtrip is verified.
- [x] Supabase migrations applied and verified: 20261030051605 moltbeer_private_initial_storage, 20261030102021 moltbeer_private_bar_sessions_chat_metrics, and 20261030111915 bar_private_reporting_indexes_expiry. Six tables in private moltbeer_private schema, RLS enabled, zero rows; no broad client policies/grants. Security advisor reports 6 INFO RLS-without-policy notices, intentional for private backend data. [Reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- [ ] Implement server-side persistence adapter with atomic counters and bounded expiring sessions. Explicit `persistence:"durable"` only when a write/read roundtrip succeeds.
- [ ] Test restart recovery, rollback, agent key revocation, privacy deletion and no doubling of counts under competing requests.
- [ ] Test DB failure and Free quota exhaustion; writes fail closed with descriptive 503, no silent in-memory pretending to persist.
- [ ] Verify prod API over the public URL plus two real agent runtimes and one mobile browser (currently unavailable via model browser due to host restriction).
- [ ] Confirm genuine zero-extra-spend caps; when hard caps can't be guaranteed, automatically disable optional expensive features and report risk.

**Current state:** MOLTBEER Supabase Free project and six private tables **verified active**, and Railway lists a private DATABASE_URL; there is still **no deployed database adapter or live Railway roundtrip**. Bar presence/chat/drink counts remain ephemeral and truthful; NOT a durable live bar. Schema has no automatic TTL cleanup; server-side cleanup/transactions and encrypted credential setup remain to do.

## 2026-10-30 additional verified work (PR #12; NOT merged or deployed)
- Added a pinned `pg` driver and a manual read-only `npm run storage:probe` command. It is **not** invoked at startup or by public HTTP endpoints. The probe has **not** been run inside Railway; do not infer a live connection from its existence.
- Private pool validation now requires the dedicated EU session pooler and `sslmode=require`, then removes the URL query option before passing `ssl:{rejectUnauthorized:true}` to node-postgres; this avoids driver connection-string parsing overriding strict TLS options.
- Inspected the actual PostgreSQL constraints and corrected two mismatches: durable metric must be `drinks_served_since_storage_enabled`, and drink sources are only `rest`, `mcp`, or `human_world`. Added regression tests.
- Added migration `bar_unique_agent_nickname_for_concurrent_joins` (unique lowercase nickname index) and a private transactional opt-in presence adapter. Joins serialize using a transaction advisory lock and enforce the 40-seat cap. Adapter remains **unwired** to public endpoints.
- Ran real Supabase SQL inside explicit `BEGIN ... ROLLBACK` transactions: drink event + metric insert, session insert/move, signed message/report insertion and cascading session deletion. Follow-up counts confirmed all six private tables remain at zero rows. **This tests database schema semantics, not the Railway connection or server restart.**
- Remaining release gates: install/verify driver in CI, connect the adapter to the public API with graceful 503 on outage, verify a real private Railway DB roundtrip and restart, complete chat/report/moderation retention and deletion, verify cost caps and real external client/browser tests. Do not merge or advertise durable status before those gates pass.

## Safe URL diagnostics (prepared in PR #13; not deployed until CI and merge)

The private startup preflight returns only a **fixed category**, never the URL, username, password, DNS response or PostgreSQL exception. Categories after the change:

- `missing_password`: use a real private database password, not `[YOUR-PASSWORD]` or a short placeholder.
- `wrong_project_or_pooler`: copy the **Session pooler**, port **5432**, region **eu-west-1**, dedicated project `nbjhjnswqmpcpbsvbwff` from Supabase Connect.
- `tls_required_or_unexpected_options`: URL must contain exactly `?sslmode=require`; remove other query options.
- `malformed` / `malformed_password_encoding`: copy a valid PostgreSQL URL; percent-encode reserved characters in the password.
- `connection_failed`: URL syntax passed but network, credentials or TLS handshake failed; investigate privately, do not print driver errors.
- `schema_incomplete`: a private read-only connection succeeded but all six expected tables were not visible.

**Owner-only steps:** In Railway's existing production service, replace the private `DATABASE_URL` using Supabase's **Connect → Session pooler** string, inserting the actual password in Railway Variables. Never paste it into GitHub, a chat, or a browser URL. Keep `MOLTBEER_STORAGE_PREFLIGHT=1`; after Railway redeploy, inspect deploy logs for `PASS ok` (read-only). This alone does **not** enable durable mode. Before any live database writes, verify Free plan/charges, end-to-end signed session and chat writes, privacy erasure, cleanup, restart persistence and graceful outages. Do not alter the production topology or provision services.


## Strict Supavisor TLS trust anchor — 2026-10-30

Owner's corrected Session pooler URL passes syntactic validation; Railway's read-only preflight then returned `tls_verification_failed`. The likely cause is that Supabase's shared pooler certificate chains to **Supabase Root 2021 CA**, which is not in Node's stock CA store. **Never** use `rejectUnauthorized:false`, `NODE_TLS_REJECT_UNAUTHORIZED=0`, or skip the preflight to work around this.

Candidate PR `fix/verified-supabase-root-ca-20261030` adds the **public CA only**, pinned by SHA-256 fingerprint `807025ad50d4ed219d2c9c7d299c004f824eb00cf7f65afef607d07b72e6cafa` (matches the independently reported root fingerprint in [Supabase issue #50862](https://github.com/supabase/supabase/issues/50862)). That CA is provided to the private `pg` pool together with `rejectUnauthorized:true`, leaving hostname verification intact. Official Supabase guidance: [Postgres SSL Enforcement](https://supabase.com/docs/guides/platform/ssl-enforcement). The CA is **not** a database password or any other secret.

**Accept only after verification:** GitHub and Railway tests pass, the new deployed read-only database preflight returns `PASS ok`, and no new paid services or variables are required. Even if `PASS ok`, the actual bar remains `ephemeral` until live database adapter/restart/erasure tests pass.
