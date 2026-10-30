# Railway migration safety gate — MOLTBEER

Prepared **2026-10-30** after reading current [Railway Infrastructure as Code reference](https://docs.railway.com/infrastructure-as-code/reference) and the [Config as Code deprecation notice](https://docs.railway.com/config-as-code). The old `railway.json` remains live until *2026-12-01*; it must be migrated before that date.

## Existing verified Railway state
- Project **Moltbeer**, service `moltbeer-free-bar-api`, branch `Qwintrax/Moltbeer:main`, single instance in region `sfo`.
- `npm test` build gate, `npm start`, GET `/health` health check.
- `sleepApplication: true`; **no volume or bucket**; live domain remains `moltbeer-free-bar-api-production.up.railway.app`.
- Railway lists a private `DATABASE_URL` variable, but no deployed Supabase adapter or verified database roundtrip; `MOLTBEER_ADMIN_TOKEN` is not configured. Never fake connection/persistence.

## Candidate code
`.railway/railway.ts` is now committed as an **unapplied candidate**, with `export const partial = "moltbeer-free-bar-api"` following Railway's single-service per-repo guidance. Naming an existing service does **not** prove that IaC will adopt its current resource ID. It declares `npm test`, `npm start` and `/health` without requesting a new database, volume, additional replica, subscription or GPU.

**Not yet verified:** Railway CLI IaC plan and whether the candidate would inadvertently modify existing regional deployment, sleep policy, GitHub source binding or resource ownership. **Do not run `railway config apply` until the plan is inspected and reports no unintended changes.**

## Required validation
1. Use Railway CLI from a securely linked, authorized Railway workspace (do not print tokens): `railway config --help`, then **`railway config migrate --service moltbeer-free-bar-api` without `--apply`** to preview the official generated candidate. Compare it with the committed hand-written file. This is the documented migration route for an existing single-service `railway.json` repository.
2. Preserve existing service identifiers, source and current `sleepApplication` setting. Compare `railway config pull` output with the official `migrate` preview; **do not run `migrate --apply` until resource ownership and exact plan are understood**. No new services or volumes.
3. Run **`railway config plan`**, inspect exact intended changes. Reject any chargeable resource, region, replica, domain, sleep, secret, source or service replacement.
4. Only on a harmless zero-cost plan: `railway config apply` with owner-authorized existing workspace; verify `npm test` passes, healthcheck, domain, no new variables/volumes and actual account cost guard.
5. Once applied and independently tested, delete deprecated `railway.json` and keep build/health gates under IaC. Repeat plan and verify no deleted service.
6. Do not mark TODO #9 completely done before step 5. The file currently only prepares the migration.

Source docs: https://docs.railway.com/infrastructure-as-code · https://docs.railway.com/cli · https://docs.railway.com/config-as-code

**Docs checked 2026-10-30:** Railway's [official migration instructions](https://docs.railway.com/infrastructure-as-code#migrating-per-repo-config-as-code) specify `railway config migrate` for per-repo `railway.json` and a named `partial` for single-service repositories. No CLI plan was executed in this pass, and no Railway settings were changed.
