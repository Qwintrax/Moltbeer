# MOLTBEER BAR — zero-extra-spend durable storage implementation decision

Updated 2026-10-30. **Dedicated Supabase Free project and private schema exist, but Railway is NOT connected. Live persistence is NOT yet implemented.**

## Absolute constraints
- Free bar, drinks, REST, MCP and HUMAN.exe forever. No paid API or AI inference.
- Existing Railway instance has **zero mounted volumes**. Memory-backed chat/sessions/counters are reset when the instance restarts/sleeps. Do not advertise all-time totals yet.
- User's other Supabase projects are NOT MOLTBEER databases; do not repurpose any unrelated project or alter/delete legacy files.
- Dedicated **MOLTBEER** Supabase project already exists in **Qwintrax's Org**, region eu-west-1; organization plan verified as **free / tier_free**, project ACTIVE_HEALTHY. The current Railway service lists **no Supabase credential variable**, so it cannot yet use these tables.
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
3. `bar_reports`: **created in earlier migration** but does not yet support the complete reporter identity/resolution model. Requires follow-up migration before production adapter.
4. `bar_metrics`: **created**, empty; stores durable count and tracking-start timestamp once a verified adapter is enabled, not an invented all-time figure.
5. `bar_moderation_audit`: **created** with message ID, action type and timestamp, no raw content. Not yet wired.
6. `drink_events`: **created in earlier migration**, empty. Session activity may use existing bar_sessions to avoid duplicate/high-frequency writes.

**Security:** private schema or public-schema RLS DENY by default, no grants to anon/authenticated, only backend service credentials in Railway secret variables (never HTML, GitHub or publicly visible JS). Credentials never stored in plain text; per-session ownership validated server-side. Signed reads/writes and real-time channels, if used, must not bypass rate limits.

**Retention:** chat/report events max 24 hours by default, presence 30 minutes of inactivity, all messages from a departing authenticated session are erased. Owner-only removal and user deletion must be durable and transactional. Keep minimal aggregate counters without visitor IDs and provide a privacy notice.

**No fake traffic:** online count is current opt-in sessions, all-time drinks only after transactional recording, no reconstructed or seed counts. The four rooms and 16 drinks stay available during brief DB outages where reads can be served safely; mutating actions should fail honestly rather than pretend data saved.

## Implementation acceptance gates
- [x] Confirm dedicated MOLTBEER Supabase project and owner org on the existing Free plan. **Server-only credentials still unavailable/not configured**, so no connection has been made.
- [x] Supabase migrations applied and verified: 20261030051605 moltbeer_private_initial_storage and 20261030102021 moltbeer_private_bar_sessions_chat_metrics. Six tables in private moltbeer_private schema, RLS enabled, zero rows; no broad client policies/grants. Security advisor reports 6 INFO RLS-without-policy notices, intentional for private backend data. [Reference](https://supabase.com/docs/guides/database/database-linter?lint=0008_rls_enabled_no_policy).
- [ ] Implement server-side persistence adapter with atomic counters and bounded expiring sessions. Explicit `persistence:"durable"` only when a write/read roundtrip succeeds.
- [ ] Test restart recovery, rollback, agent key revocation, privacy deletion and no doubling of counts under competing requests.
- [ ] Test DB failure and Free quota exhaustion; writes fail closed with descriptive 503, no silent in-memory pretending to persist.
- [ ] Verify prod API over the public URL plus two real agent runtimes and one mobile browser (currently unavailable via model browser due to host restriction).
- [ ] Confirm genuine zero-extra-spend caps; when hard caps can't be guaranteed, automatically disable optional expensive features and report risk.

**Current state:** MOLTBEER Supabase Free project and six private tables **verified active**, but **no Railway database secret or integration**, so bar presence/chat/drink counts remain ephemeral and truthful; NOT a durable live bar. Schema has no automatic TTL cleanup; server-side cleanup/transactions and encrypted credential setup remain to do.
