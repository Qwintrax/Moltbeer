# Railway IaC migration safety gate — MOLTBEER

Updated **2026-10-31** from the live Railway service configuration and [Railway's IaC migration guide](https://docs.railway.com/infrastructure-as-code#migrating-from-config-as-code). **This is a preparation document, not proof of migration.** Railway's Config as Code transition deadline is **2026-12-01**.

## Verified production baseline (2026-10-31)

- Existing Railway project `Moltbeer`, environment `production`, service `moltbeer-free-bar-api`; source `Qwintrax/Moltbeer` branch `main`.
- Live service: **one replica in `sfo`**, Railpack builder, V2 runtime, `npm start`, health check `/health`, `sleepApplication: true`. No attached volume, bucket, or pending configuration changes.
- Existing public domain: `moltbeer-free-bar-api-production.up.railway.app`.
- The service already has the **variable names** `DATABASE_URL`, `MOLTBEER_ADMIN_TOKEN`, `MOLTBEER_STORAGE_MODE`, `MOLTBEER_STORAGE_PREFLIGHT`, `MOLTBEER_STORAGE_ACCEPTANCE` and `MOLTBEER_RESTART_CANARY_PHASE`. Their secret values must not be printed, copied to GitHub or replaced during migration.
- **Supabase durable mode is live**, with startup log `MOLTBEER durable pool verified; REST/MCP bar enabled`. Independent read-only production REST/MCP tests have passed. These do **not** prove an isolated public production write/delete cycle or a production backup.
- Last checked active Railway deployment `9e8d21fe-cbb9-4d7d-9ecb-9f7a434f83f1` was SUCCESS. Later candidate-only commit `9e18382e` was SKIPPED by Railway (no live runtime change).

## Read-only production comparison — 2026-11-01 12:20 UTC

The connected Railway service configuration was read without accessing secret values or staging changes. Current live source is `Qwintrax/Moltbeer` / `main`; builder `RAILPACK` (build environment `V3`), runtime `V2`, start `npm start`, health `/health`, `sleepApplication: true`, one replica in `sfo`, and the existing Railway-managed domain. The environment has **no staged or pending changes**. Seven live **variable names** are present, including `MOLTBEER_X402_TIPS_ENABLED`, which the IaC candidate already preserves. Their values were not read.

**Important limitation:** The candidate still omits explicit source/domain/region/replica/autosleep/restart/watch-pattern ownership. This is a known migration risk, not a verified mismatch or a reason to change live settings. The new isolated test `test/railway-iac-preflight.test.mjs` verifies core commands and the seven preserved variable names, but **cannot** substitute for an authenticated `railway config migrate` and `railway config plan`. Do not apply or delete the legacy config based on a passing static test.

## Current source files and known differences

- `railway.json` is still the existing Config as Code file. It specifies `MOLTBEER_STORAGE_MODE=ephemeral npm test` for the build, `npm start`, `/health`, 60-second health-check timeout, **autosleep**, **restart on failure (three retries)**, and **watch patterns**.
- `.railway/railway.ts` is an **unapplied candidate** with named partial `moltbeer-free-bar-api`. It specifies the ephemeral-only test build, start command and health check. **It does not explicitly encode autosleep, restart policy, watch patterns, the GitHub source binding, region/replica or domain.** Do not assume these settings are preserved or deleted: verify their actual behavior in the authenticated plan.
- `package.json` currently does **not** declare the `railway` IaC SDK dependency. Railway's [CLI documentation](https://docs.railway.com/cli/config) says the SDK must be installed before `config plan` or `config apply`. Validate in a disposable worktree first; avoid changing production dependencies without a reviewed PR.
- As of this check, the Railway CLI on the owner's Windows computer can run, but **`whoami` was Unauthorized**. A production plan/cutover is **not** verified. Do not substitute the connected read-only Railway API for CLI authorization.

## Safe validation and migration — NOT YET PERFORMED

1. Authenticate the Railway CLI securely using its interactive login and link to the **existing** project and production environment. Never paste API tokens into shell commands, logs, GitHub issues, or chat.
2. In a disposable checkout, use `railway config --help` and `railway config migrate --service moltbeer-free-bar-api` **without `--apply`** to preview the official migration output. Compare with the committed candidate and the existing `railway.json`; do not overwrite the candidate blindly.
3. Install the IaC SDK in that disposable checkout if needed, without modifying the production branch. Compare `railway config pull` output with the actual live configuration. **Never** use `--include-variables`, `--show-values` or `--decrypt-variables` in logged commands.
4. Railway's documentation says a service cannot be managed by both `railway.json` and IaC at once. Follow the official `railway config migrate --apply` workflow **only after reviewing the generated file and ownership**, because this writes IaC and clears Railway Config File settings. Do not delete `railway.json` until ownership and preservation of every live setting are established.
5. Run `railway config plan` (read-only) and inspect the complete diff. **Stop** on any new/deleted/replaced service, extra paid resource, changed region/replicas, autosleep, restart behavior, source, domain, secrets or unexplained setting. The migration should preserve the existing service ID.
6. Only after a reviewed, owner-authorized, harmless plan, apply the intended change. Recheck the existing domain, health, REST/MCP read-only smoke, GitHub CI, durable startup, instance count, variable **names**, deployment, error rate and costs. If a migration requires changing runtime behavior, open a separate minimal PR and retest.
7. Remove deprecated `railway.json` only after successful cutover and verification. Document plan/commit/deploy IDs in [issue #1](https://github.com/Qwintrax/Moltbeer/issues/1). **Do not close release gate #6** without those results.

## Release guardrails

No new paid services, database, volume, bucket, GPU, or extra replica. No production database writes or fake agents for this migration. Never expose secret values. A candidate file or green CI is **not** a completed migration.

Official references: [Railway Config CLI](https://docs.railway.com/cli/config), [IaC migration](https://docs.railway.com/infrastructure-as-code#migrating-from-config-as-code), [IaC reference](https://docs.railway.com/infrastructure-as-code/reference).
