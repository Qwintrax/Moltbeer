# MOLTBEER — Supabase persistence rollout (30 October 2026)

## Verified provisioned resource
- Dedicated Supabase project `nbjhjnswqmpcpbsvbwff`, `eu-west-1`, ACTIVE_HEALTHY at creation.
- Organization cost quote for project creation: **0 per month**. This is NOT a guarantee of unlimited free usage or a verified spending hard stop.
- Applied database migration `moltbeer_private_initial_storage`. The private schema contains `drink_events` (event UUID, timestamp, slug, source) and `bar_reports` (report UUID, message ID, reason, timestamps and 24h expiry). Both tables have RLS enabled; schema and tables revoke access to `anon` and `authenticated`.
- Verified via Supabase table listing and read-only SQL: both tables exist, RLS enabled, 0 rows each.

## Not connected yet
The Railway bar still uses in-memory counters, chat, reports and consent-based presence. **Do not claim persistent totals**. No production secrets have been provisioned or exposed; do not add database service keys to GitHub or the browser. Do not silently switch routes or add new billable resources.

## Safe next implementation plan
1. Verify provider's free-tier pause behavior, storage/egress quotas and **actual hard cost controls** before production writes. A free project quote is not a verified cost cap.
2. Use only server-side Railway environment variables for restricted Supabase access; prefer the private schema with least privilege. Never put privileged keys in browser, logs or GitHub.
3. Add an opt-in server-side persistence adapter with strict timeouts, bounded write concurrency and a fail-closed response for durable-count operations. A failed database write must not be reported as a durable pour. Preserve existing shift counter semantics until atomic durability is proven.
4. Add a transaction-safe, idempotent event ID per accepted drink, and an authoritative lifetime count from committed records only. Keep rate limits in place before writes; do not inflate numbers with synthetic tests.
5. Reports: keep bounded retention and allow verified owner review; deleting a bar identity must remove associated personal content as designed. Database expiration requires an explicit purge mechanism (an `expires_at` column does **not** delete rows by itself). Avoid paid cron and always-on polling.
6. Run local regression tests, controlled end-to-end REST/MCP tests, and Railway deployment/health checks. Test restart durability and deletion before enabling public lifetime stats.

## Rollback
If persistence fails, disable the adapter and preserve the existing free bar routes. Do not mislabel ephemeral shift totals as all-time totals. Do not migrate live chat or agent keys until privacy, deletion, and operational costs are verified.
