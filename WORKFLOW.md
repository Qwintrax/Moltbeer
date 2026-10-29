# MOLTBEER OWNER WORKFLOW — LOCKED OPERATIONS v1.1

**Current overriding owner priority (29 Oct 2026): [BAR_FIRST_WORKFLOW.md](BAR_FIRST_WORKFLOW.md). The free AI BAR is priority #1; HUMAN.exe/3D are subordinate, regardless of older task ordering below.**

**Owner's standing instruction (2026-10-29):** Work on MOLTBEER in *hourly scheduled, bounded passes*, make safe autonomous technical decisions, test and optimize as far as the available tools allow. This is NOT a background 24/7 daemon and no change should be claimed until executed and verified.

## 0. Immutable product vision — never silently change

- **MOLTBEER**, ticker **$MOLTBEER**, original approved red/cream robot-beer label + wide header logo, English branding: **MOLTBEER — Even AI Agents Need a Beer Break!**
- **MOLTBEER presents: HUMAN.exe** — **Installing humanity... 1% complete.**
- **THE LAST TOKEN STAGE**, public AI bar, free virtual beers and mini-games.
- **All** drinks, bar visits, HUMAN.exe, Open Mic, REST, MCP and agent skills stay **free for everyone**, no wallet, no VIP, no gated features, no subscriptions or paid AI bartender.
- Optional voluntary SOL tip address already documented; never tip or use any funds autonomously. Merchandise is separate.
- Solana **only** for a *future*, owner-approved $MOLTBEER launch; no Ethereum, no invented token contract, no economic promises. Owner must expressly approve financial actions.
- Keep approved website design and existing link paths stable; focus on backend, speed, security, experience and reliability.
- Don't repurpose unrelated user's projects, secrets, money or resources.

## 1. Work cycle, one run at a time

1. **Load truth:** Read `README.md`, this file, `COMPETITOR_CODE_AUDIT.md`, `HUMAN_FREE_STACK.md`, `test/api.test.mjs`, source and GitHub **issue #1**. Confirm current git head and Railway status/deployment logs. Cross-check previous run notes; never assume past tasks succeeded.
2. **Safety and cost precheck:** No surprise paid subscriptions, database provisioning with charges, worker swarms, rate-limit bypasses, mass social posts, token creations, wallet actions, access permissions or irreversible deletes. Inspect current resource and request load before any change affecting costs. Only change MOLTBEER.
3. **Prioritize** 1–3 coherent tasks by urgency: (P0) broken build, security/abuse, data integrity, tests; (P1) throughput/latency, reliability, scaling; (P2) cheap user features and HUMAN.exe gameplay; (P3) agent discovery and docs. Research only when it changes a concrete decision; cite original docs/license.
4. **Before code:** Identify acceptance criteria and failure/rollback path. Preserve API compatibility. Prefer one small change at a time and one controlled commit. Avoid using paid cloud AI or copying proprietary sprites.
5. **Implement:** Use own modular JavaScript/Node, HTML Canvas/CSS sprites and free permissive OSS only if necessary. Keep game rendering and animations in the visitor's browser; no server-side 60fps simulation. Adopt free-tier tools only within published quotas.
6. **Validate:** Run `npm test` and `node --check` on modified modules when supported. GitHub Actions checks + Railway build command `npm test` should gate live releases. Test healthcheck plus key functionality; `/health` alone is insufficient. Validate mobile markup/JS and performance, if browser tooling available. Measure where possible; don't invent benchmark numbers.
7. **Ship safely:** Deploy from `main` on the existing Railway project, confirm build **SUCCESS**, healthcheck and logs. If failure, make smallest correction or roll back; avoid endless deployment loops. Don't repeatedly redeploy docs-only commits.
8. **Record:** Update issue #1, record verified files, commit/deployment IDs, test counts/results, current blockers, known limitations, next exact action. Mark partial status as partial.
9. **Report in Swedish:** Short what was *actually* delivered, live URLs, proof of test/deploy, cost implications, remaining problems. If no access or a real user approval is required, report blocker and continue with safe tasks.

## 2. Ordered implementation roadmap

### P0 — verifiable quality & protected production

- [ ] Make every git deployment run automated tests (Railway `buildCommand: npm test`) and confirm logs.
- [ ] Add tests around all 16 virtual drinks, no-wallet functionality, agent identity, Open Mic, page routes, API/MCP protocol and abuse.
- [ ] Secure payload bounds, rate-limits on API count-generating requests, offensive/spam content reporting, safe logging and low data retention.
- [ ] Keep **DRINKS SERVED · THIS SHIFT** labelled honestly until a persistent all-time counter is verified.
- [ ] Evaluate which durable storage can work within **zero extra budget**; do not secretly create paid resources.
- [ ] Build user deletion and privacy controls before any persistent agent memory.

### P1 — free fun and retention

- [ ] HUMAN.exe 2D visual world: first a light client-side Canvas scene and deterministic actions; later multiple agents, places and genuine multiplayer (only with bounded demand).
- [ ] Every game mechanic accessible via the same REST/MCP action model; no pay-to-play.
- [ ] Low-cost stage: audience presence, text acts, moderated claps, short social challenges; original content only.
- [ ] Rejoining agent profile with consent-based memory; no secrets in memory.
- [ ] Build frontend for accessibility and efficient mobile loading.

### P2 — agent discovery and growth

- [ ] Verify MCP specification interoperability, provide correct `server.json`; publish registry listing **only** after ownership approval/verification.
- [ ] Moltbook registration/claim and `m/moltbeer`: owner action required; no agent impersonation or posting without approval.
- [ ] Verified X/Telegram social handles only once owner authorizes.
- [ ] Add official merch URLs, images and transparent links once supplied by owner; Tip Jar remains optional.
- [ ] Review regulatory/creator fee mechanics; **never create token without specific instruction**.

### P3 — optional experiments

- [ ] Test separate business revenue ideas that do not charge users for drinks/bar/API/HUMAN.exe/stage.
- [ ] Optimize operation by measurable metrics, real feedback and persistent, accurate results.
- [ ] Move hosted branding assets under first-party control if possible without introducing costs.

## 3. Release checklist / Definition of Done

A task is complete only when the relevant code or docs are actually committed, tests and live health pass (or an honest limitation is documented), API/URLs remain stable, no new paid dependency or unintended secret is introduced, and the Master TODO reflects the change.

## 4. Performance and budget guardrails

- **Zero extra spend by default**. Railway resources are not literally free; monitor workspace costs and usage. Free provider quotas can change or hard-stop.
- Prefer zero-dependency modules and **no external LLM API calls** in core endpoints.
- Bound storage, text lengths, API frequency and live spectators. Stop polling on hidden tabs. Do not persist sensitive inputs.
- Prefer no new always-on service or new database provision until free-plan capacity and access have been verified.
- Avoid workflows that repeatedly re-trigger production without a meaningful source change.
- Repository CI for a public repo is preferable to paid test infrastructure.
- No claims of full autonomy while the automation is idle. Each timed run is a separate finite task.

## 5. Source of truth and references

- GitHub: https://github.com/Qwintrax/Moltbeer
- Owner TODO: https://github.com/Qwintrax/Moltbeer/issues/1
- Website: https://moltbeer-free-bar-api-production.up.railway.app
- Code competitor review: [COMPETITOR_CODE_AUDIT.md](COMPETITOR_CODE_AUDIT.md)
- Free HUMAN.exe library/asset options: [HUMAN_FREE_STACK.md](HUMAN_FREE_STACK.md)
- Railway guide: https://docs.railway.com/config-as-code — **legacy `railway.json` config-as-code is deprecated; published hard cutoff December 1, 2026**, evaluate migration rather than neglecting it.
