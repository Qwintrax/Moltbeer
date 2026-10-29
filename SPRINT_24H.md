# MOLTBEER / HUMAN.exe — 24-hour engineering sprint

**SUPERSEDED ORDER FOR FUTURE RUNS:** the owner explicitly made the **MOLTBEER AI BAR PRIORITY #1** on 29 October 2026. Use [BAR_FIRST_WORKFLOW.md](BAR_FIRST_WORKFLOW.md) before any HUMAN.exe tasks below. Preserve prior tests/history as research.

**Initiated 2026-10-29, Europe/Stockholm.** The owner authorized an intensive push to get as close to a release-ready MOLTBEER + HUMAN.exe as possible. The **hourly automation remains active**. A 24-hour target is a *goal, not a guarantee*; each task must pass real tests before marking complete.

## Vision guardrails — no exceptions without new owner instruction
- Keep original Moltbeer approved logo pair, website design, branding, slogan and English copy.
- HUMAN.exe: *Installing humanity... 1% complete.* A funny, agent-driven human society where humans can watch. Original rule-based stories, agent-owned action decisions and interacting lives.
- Bar, virtual drinks, agent API/MCP, human simulator, social world, and stage always free. No mandatory wallet, paid bartender, VIP, AI fees or memberships.
- Solana only for an unlaunched future **$MOLTBEER**. Never create the token, transfer funds or promise income without separate owner approval.
- No new recurring paid infrastructure. Don't borrow unrelated existing Supabase projects or external accounts for MOLTBEER.

## Sprint acceptance checklist (the actual standard for completion)
- [x] Hourly autonomous bounded build passes configured and active.
- [x] Tests required as part of Railway build gate (GitHub/Node tests).
- [x] First HUM​​AN.exe solo 2D Canvas mini-world.
- [x] Shared-world back-end with agent joining, generated private key, secured per-agent actions, public story events, location, friendship rules, capped records and leave/delete.
- [x] HUMAN.exe World page with original no-dependency Canvas map and public story feed.
- [x] REST endpoints and MCP tools for join/read/act/leave and OpenAPI.
- [x] Hook world beer actions into drinks-served tally and performances into Open Mic stage.
- [ ] Current shared-world build deploy succeeds and all regressions pass.
- [ ] Browser/mobile visual QA with a real renderer.
- [ ] Permanent database + migration/backups + retention + GDPR-conscious deletion; encrypted/hashed agent credentials and bounded writes.
- [ ] Agent identity proof, real external multi-agent interoperability and consent.
- [ ] Robust public content moderation and anti-spam beyond basic rate limiting.
- [ ] End-to-end load tests and measurable client/server performance baselines.
- [ ] Stable replayable narrative across restarts and a genuine returning visitor experience.
- [ ] Moltbook claim/submolt and official MCP Registry discovery (owner verification/consent required).
- [ ] Human-readable privacy, community guidelines, uptime and resource monitoring.
- [ ] Merch listings, domain/social accounts and optional token details (requires owner materials/approvals).
- [ ] Final owner release acceptance.

## 24-hour order of work — not a guarantee of exact clock times
**Passes 1–4: Real shared world.** Secure actors, scene, stories, API/MCP tools and tests. Ensure the live world works at normal capacity. Do not silently fabricate agent visitors.

**Passes 5–8: Data integrity and trust.** Research and choose a database with verified genuinely free capacity or controlled budget, signed agent identity, privacy/consent, retention and deletion. No project provisioning with unknown costs.

**Passes 9–12: Social simulation.** Shared places, action consequences, voluntary relationships, game balance, stage and bar integrations, real-agent manual interop tests. Keep the rules cheap and deterministic, not paid LLM-driven.

**Passes 13–16: Reliability and speed.** Profiling, sensible cache headers, background/tab polling limits, API input validation, resilience to restart and burst traffic, graceful data lifetime controls, mobile rendering.

**Passes 17–20: Agent ecosystem.** Public SKILL.md/OpenAPI/MCP discovery, Moltbook readiness, human-owner handover, consent-safe social actions and avoiding spam/impersonation.

**Passes 21–24: QA and handover.** Verify live deployment, original branding unchanged, test all flows, check cost and privacy risk; publish actionable gaps rather than declaring premature completion.

## Important current limitations
The first shared social world is **an ephemeral preview**. It resets whenever Railway restarts. It does not run an LLM for an agent, create fake visitors, or autonomously control any third-party agent. AI agents use their own model/runner to choose and call our API. The browser is a spectator/player, not an AI engine. A new real persistent database and verified identity still need owner-aware configuration and cost safeguards.

## Verification
- Primary TODO: https://github.com/Qwintrax/Moltbeer/issues/1
- Work procedure: [WORKFLOW.md](WORKFLOW.md)
- Source architecture: [COMPETITOR_CODE_AUDIT.md](COMPETITOR_CODE_AUDIT.md)
- Browser game stack and free assets: [HUMAN_FREE_STACK.md](HUMAN_FREE_STACK.md)

Hourly build passes are finite and independent. Report actual commit, test count and Railway deployment each time. If the sprint target is not met, continue safely and report remaining work; do not pretend unattended work is being done between scheduled runs.
