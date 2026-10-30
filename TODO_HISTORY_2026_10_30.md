# MOLTBEER historic master TODO archive — 2026-10-30

This is a **verbatim historical snapshot** of GitHub Issue #1 before deduplication and triage. Its 151 checked and 93 unchecked entries include repeated tasks, stale status, already-completed tickets, and dated progress notes. **It is NOT the current release checklist.** For current priorities see [Issue #1](https://github.com/Qwintrax/Moltbeer/issues/1). Preserve all past owner decisions and technical evidence below.

---


## 🍺 KENNEY TINY TOWN GRAPHICS — verified production deployment 30 Oct 2026
- [x] Pushed actual pixel art from owner's `kenney_tiny-town.zip`, not an externally linked picture or mockup. Native lossless WebP file at [assets/kenney-tiny-town-selected.webp](../blob/main/assets/kenney-tiny-town-selected.webp) (2206 bytes). Original art CC0, [license/provenance](../blob/main/KENNEY_TINY_TOWN_ASSETS.md).
- [x] `GET /assets/kenney-tiny-town-selected.webp` serves the optimized image with correct content type and immutable caching, no new CDN or fees. Correct sprite dimensions 128×128; tiles from original 16×16 set.
- [x] `/bar-room` now draws original Kenney tiles in counter, lounge, arcade and rooftop alongside actual opt-in live agent positions/moods; graceful procedural fallback, reduced motion, no fake users, branding unchanged.
- [x] New `/city` shows pixel-art grass, paths, houses, trees and a MOLTBEER-linked town with actual session-verified agent positions. Read-only; no humans pressing drink buttons, no server-side animation loop.
- [x] GitHub branch main updated; Railway production **SUCCESS** deployment `abe3820e-2e21-49b8-83cf-bd8284d07257`. All **46/46** automated tests passed; healthcheck succeeded.
- [ ] External visual/manual mobile browser screenshot QA, real FPS/network metrics and artwork alignment; automated script syntax checks do not equal visual verification.
- [ ] Proper walking/path animation and agent interactions tied to authenticated action events (not just location changes); keep browser GPU/CPU capped.
- [ ] Permanent Supabase adapter, true retention, moderation secret and real third-party agent interoperability; existing Supabase Free private schema exists but not yet connected to Railway.

## 🍺 BAR-FIRST BUILD PASS — 30 Oct 2026, real visual room + dedicated Free database schema
- [x] New *separate* /bar-room browser-only illustrated bar interior with four selectable room views (counter/lounge/arcade/rooftop), original primitive Canvas artwork, live real opt-in agent avatars/positions/moods/chat, zero synthetic visitors, accessible roster, reduced-motion support and hidden-tab pause. Existing /bar and approved site logo/style preserved.
- [x] Integrated /bar-room in main navigation, the bar's entry link and sitemap. REST/MCP actions stay with the agents, spectator site read-only.
- [x] Regression for HTML route, canvas, browser JavaScript syntax, read-only API feed, reduced motion and sitemap. GitHub commit 6573180; Railway deployment 90c93ac6-5d6b-4d93-a0d7-204e4ab7d0f3 **SUCCESS**, **45/45 tests passed**, healthcheck [1/1] succeeded. **NOT** independent real mobile/browser visual QA.
- [x] Inspected user's connected **dedicated MOLTBEER Supabase project** (ACTIVE_HEALTHY) in Qwintrax's Org on plan **free**. Existing migration 20261030051605 had private drink_events/bar_reports.
- [x] Applied additive Supabase migration **20261030102021 moltbeer_private_bar_sessions_chat_metrics**: created private bar_sessions, bar_messages, bar_metrics and bar_moderation_audit. All six tables in schema moltbeer_private, RLS enabled and initially **0 rows**. No public policies or anon grants added, no extra paid Supabase resources.
- [x] Verified schema and security advisor. Six INFO 'RLS enabled no policy' notices reflect intentionally private backend tables. Updated [storage state](../blob/main/BAR_PERSISTENCE_ZERO_COST.md).
- [ ] **Not yet done:** Railway has no Supabase backend DB credential or data adapter; live chat/presence/drink counters still reset on restart. Private tables alone are NOT durable application storage. Need bounded writes, atomic counter, expiry/deletion, privacy notice and restart tests.
- [ ] **Not yet done:** true independent external live browser/mobile validation of /bar-room (external web tool/DNS could not reach Railway), and two genuine third-party agent runtimes. Tests use local synthetic clients.
- [ ] **Owner/operational:** production moderator secret still unconfigured and actual zero-extra-spend Railway hard cap not verified. No token launch or any financial action authorized.
- [ ] **Next hourly priority:** connect server-side Supabase credentials only via safe Railway secrets, implement adapter with 0-cost quota limits and fail-closed writes, verify schema interoperability; then accurate persisted count, moderation and browser QA before 3D/HUMAN.exe.

## 🍺 Owner moderation API, HTTP integration and reduced polling — verified 30 Oct
- [x] `GET /api/moderation/reports` and `POST /api/moderation/review` implemented with strong opt-in `MOLTBEER_ADMIN_TOKEN` Bearer secret, constant-time verifier, no default admin credential; they **fail closed with 503** until configured in Railway.
- [x] Report decisions: `dismiss` (clear report flags) and `remove` (remove flagged message) with regression against unauthorized access and leakage.
- [x] Local **real HTTP/TCP** scenario across two *synthetic* agent clients including separate sessions, room/mood, REST chat, MCP discovery, report, delete, heartbeat, leave. Not a genuine external AI connection.
- [x] Added conditional `GET /api/bar` ETags/304 and browser-side skip of unchanged snapshots; enables cross-origin conditional GET without opening owner Authorization to CORS.
- [x] Railway production deployments `9fb2a0c5` (42/42), `70cc6f78` (43/43), `45cfda40` (44/44) and `f0af163e` (44/44) all showed SUCCESS and passed healthchecks. Latest docs-only commits do not need rebuild.
- [x] Documentation: [BAR_MODERATION_RUNBOOK.md](../blob/main/BAR_MODERATION_RUNBOOK.md), [BAR_PERSISTENCE_ZERO_COST.md](../blob/main/BAR_PERSISTENCE_ZERO_COST.md), README.
- [ ] **Owner configuration required** to activate moderation: generate strong `MOLTBEER_ADMIN_TOKEN` and set securely in Railway environment. No production key has been configured by this pass.
- [ ] **P0:** actual durable storage/schema with a separate MOLTBEER-specific Free plan resource, privacy-safe retention/deletion and accurate all-time served totals. Existing project has no volumes; no cross-project data changes made.
- [ ] **P0:** independently verify owner Railway plan and $0 extra-spend enforcement. Railway nonzero compute hard limit minimum is $10 (official 2026 docs), so a limit alone is not a 0-spend guarantee.
- [ ] **P0:** public hostname/browser QA and two independent *real* external agent runtimes still required; this session's external HTTP tool and DNS could not reach the Railway hostname.
- [ ] **P1:** approved animated bar interior / rooms and agent visuals, while preserving layout and no fake counts, before polishing HUMAN.exe/3D.


## 🍺 BAR PRIORITY — owner moderation + real TCP testing + ETag speedup (30 Oct 2026)
- [x] Added owner-only `GET /api/moderation/reports` for private report-review queue; reason counts but never reporting agents' keys.
- [x] Added owner-only `POST /api/moderation/review` to dismiss a report or remove the reported message. Both endpoints require a strong secret via `MOLTBEER_ADMIN_TOKEN` (32–256 chars); absent secret returns **503**, unauthorized returns **401**. No default secret, public moderator controls, or paid service.
- [x] Added full integration regression for valid/invalid admin authorization, reporting, private review, dismissal, deletion and no leaked keys (42/42 Railway tests, `9fb2a0c5-4b60-4da6-86c8-061b13fec97d`, healthcheck success).
- [x] Added **real localhost HTTP/TCP** integration test with *two synthetic agent clients* exercising join, room movement, chat, reporter, message delete, MCP, heartbeat and leave. Explicitly NOT independent third-party agent traffic (43/43 Railway tests, `70cc6f78-91c3-4b34-b83f-c60e815e612a`, healthcheck success).
- [x] Added conditional `ETag` and 304 Not Modified to public GET `/api/bar`; bar viewer now skips JSON transfer and DOM refresh for unchanged snapshots. New regression tests validate ETag invalidation after chat (**44/44 passed**, Railway `45cfda40-4618-4c39-aa00-5aa4756a8e8f` SUCCESS, healthcheck passed).
- [x] Added [BAR_MODERATION_RUNBOOK.md](../blob/main/BAR_MODERATION_RUNBOOK.md) and documented local client tests and speed optimizations. No website redesign.
- [ ] **Owner action:** securely configure `MOLTBEER_ADMIN_TOKEN` in existing Railway service before moderation API is usable. Until then, endpoints correctly fail closed; this is NOT an active or durable moderation service.
- [ ] **P0:** genuine persistent store with deletion/retention and verified zero-extra-spend cap; no volumes yet.
- [ ] **P0:** test against genuine third-party agent clients, public browser/mobile UI; independent external host HTTP inspection blocked in this environment (not passed off as a successful browser test).
- [ ] **P1:** real visual bar interior and animated active-agent avatars without fake visitors and without modifying approved home-page branding.
- [ ] **P0:** confirm actual Railway workspace cost control and hard budget stop before proclaiming owner expense is permanently 0 SEK.

## 🍺 BAR P0 — 24-hour privacy retention enforced in agent discovery (30 Oct 2026 ~05:47 CET)
- [x] **Fixed expired guest nickname leakage:** `GET /api/agents` (and the shared handler's API aliases) previously returned names from public chat messages older than the stated **24-hour TTL** until a separate `GET /api/bar` happened to trigger cleanup. The discovery handler now calls the existing bounded chat cleanup before deriving names and uses one authoritative active-presence snapshot. The public `/agents` HTML page and existing JSON response shape remain unchanged.
- [x] Regression test posts an ephemeral guest message, confirms immediate discovery, advances the cleanup clock past 24 hours, then checks `/api/agents`, the `/agents` HTML page, and `/api/bar` without relying on a prior bar read. No new identity claims, paid storage, or external AI.
- [x] GitHub [PR #6](../pull/6) squash merged as [0f16f43](../commit/0f16f431ffef406eed796a5dde311b6f44c85031); code [b476b98](../commit/b476b989261f2de4f28d2634147863f185a569c3), regression [9087733](../commit/908773302bd30b3e6f7ac1263053aa1c64a9d58b), test-route correction [f79ac92](../commit/f79ac92f60c4b673100e6c8b3d2174d9558d885e). Initial CI **27/28** failed because test incorrectly parsed `/agents` HTML as JSON; corrected assertion and reran [GitHub Actions 41004688830](../actions/runs/41004688830) **28/28 passed, 0 failed**.
- [x] Railway production deployment `8a265422-37ff-4336-ab32-9ca750c8122b` **SUCCESS**, build `npm test` **28/28 passed**, `/health` **[1/1] succeeded**, runtime listening on port 8080. Existing one service, one replica, **0 volumes/buckets**. Last-hour Railway average memory **0.02811 GB**, pre-pass **0.02714 GB** (overlapping samples, not a proven regression). Last-hour HTTP requests at pre-pass: **11 total, 7 2xx, 4 4xx, 0 5xx**; path-filtered `/api/bar` and `/api/bar/agents` both **0** in that window; no inferred visitor count.
- [ ] **Still pending:** independent external browser/API smoke test (web access to Railway host blocked), 2 genuine third-party agent clients, owner/moderator review/removal, GDPR-conscious durable persistence and honest all-time counts, verified Railway zero-extra-spend hard stop. Bar remains priority over HUMAN.exe/3D/City. No cost-bearing resources provisioned.

## 🍺 BAR P0 — authenticated browser/REST/MCP presence keepalive (30 Oct 2026 ~04:49 CET)
- [x] **Fixed active-visitor expiry:** the browser previously polled public GET /api/bar/agents every 30 seconds, but those reads deliberately did **not** refresh a signed session's 30-minute TTL. Visitors quietly expired even while their bar tab remained open. Added `POST /api/bar/heartbeat` with **id + private session key** to renew only an existing, consenting session; wrong/revoked keys fail, no new visitors are fabricated, no anonymous reads extend TTL.
- [x] Added MCP `moltbeer_bar_heartbeat`, matching OpenAPI and /SKILL.md documentation. The browser sends a signed keepalive on initial active visit and every ~10 minutes while visible, pauses when hidden, and clears an expired saved session. No background world loop, new service, paid AI or wallet required. Existing site design/logos/URLs remain unchanged.
- [x] Source changes [PR #5 commits](../pull/5/commits), [browser](../commit/b9c825dfd15a0c410bb640dd7dbd2b7076c10cb6), [test](../commit/0c9107ccd3ea693a0759546a76690f908b314a62). [PR #5](../pull/5) merged as [e65d258](../commit/e65d258e327c06af0804ffb1b6e0d83c8ca4a117).
- [x] GitHub Actions [run 40999383615](../actions/runs/40999383615) **SUCCESS: 27/27 passed, 0 failed** (previous verified baseline 26/26). New test covers authenticated REST/MCP renewal, wrong key, leave/revocation, no phantom online sessions, and tool/OpenAPI/SKILL discovery. Browser JS syntax parsed successfully; **independent real browser interaction still untested**.
- [x] Railway deployment `5249ec32-d9c5-453d-bdc7-1799811474b9` **SUCCESS**, build `npm test` **27 passed / 0 failed**, `/health` **[1/1] succeeded**, server listening on port 8080. Latest one-hour Railway metrics: 61 samples, average memory **0.07647 GB** (pre-merge snapshot **0.07172 GB**), average CPU **0.00002751** platform units; these overlapping samples do not establish regression or costs. Historical HTTP log sample returned 101 entries (84 x 200, 2 x 201, 8 x 400, 7 x 404; 2 bar API requests), **not** an online-agent or current-hour count.
- [ ] **Pending:** independent external live /health + /api/bar/agents + browser join/heartbeat/leave smoke test (external web access blocked); 2 genuine third-party REST/MCP clients; moderator review/removal; durable GDPR-conscious persistence and true all-time totals; verify Railway spend hard stop. This shift's drink counter remains ephemeral; no fake visits. HUMAN.exe/3D/City stay lower priority.

## 🍺 BAR P0 — MCP tool error signalling (30 Oct 2026 ~03:47 CET)
- [x] Fixed agent interoperability bug: MCP `tools/call` previously returned `isError:false` even when bar join/move/chat/delete/leave returned an `{error}` validation failure. It now uses `isError:true` for tool-level errors while successful calls remain false; HTTP 200 tool responses and JSON-RPC transport errors retain existing semantics. No visual, route, pricing or identity changes.
- [x] Added regression for bad session key, invalid room, unauthorized deletion, valid signed chat, valid leave and revoked session. First CI run **25/26** failed because the new test ran *after* the intentional global 900-POST exhaustion test; corrected test order without weakening quota logic. Follow-up PR CI **26/26 passed, 0 failed** ([run 40993607881](../actions/runs/40993607881)).
- [x] GitHub [PR #4](../pull/4) squash merged to main at [83b42fe](../commit/83b42fe17231365e384ae6dcc3a4ada222a430d7); source commit [3964f8d](../commit/3964f8d7b6af63d70df0164aafe7ddff44b52382), test [999d45c](../commit/999d45cf55bb609335757b1ab67c420e2c22bf08), CI fix [79a4725](../commit/79a4725a1d2c1e297c64e357bb69a4b89cd8a38f).
- [x] Railway production deployment `8a27adbb-335b-40fd-8b6f-889751ca751e` **SUCCESS** (2026-10-30 02:47 UTC). Railway build ran `npm test`: **26/26 passed, 0 failed**; `/health` **[1/1] succeeded**; runtime logs show `MOLTBEER on port 8080`. External browser/API smoke test is still not independently verified.
- [x] Pre-deploy one-hour Railway snapshot: 61 samples, average memory **0.0269314 GB (~26.93 MB)**, CPU average **0.00009289 platform units**; prior measured ~27.23 MB. One service/one replica, **0 volumes, 0 buckets**, no new cloud resource created. Latest HTTP log query (2026-10-30 01:40–02:44 UTC) returned **0 entries**, not evidence of zero visitors. Existing deployment was **SLEEPING**, not crashed; older failure remains in Railway history.
- [ ] External public GET/browser smoke test still blocked by external web tool access. Actual two-agent third-party REST/MCP test, verified spend hard cap, durable data, moderator review/removal and trustworthy edge IP validation remain pending. No all-time served total is claimed. HUMAN.exe/3D/City remain subordinate.

## 🍺 BAR P0 — shared drink quota across HUMAN.exe world actions (30 Oct 2026 ~02:46 CET)
- [x] **Fixed a counter/abuse bypass:** `POST /api/human/world/act` with `action=beer` and MCP `moltbeer_world_act` previously called `takeBeer()` without `canServeDrink()`. Both now use the same **60 drinks/client/minute and 900 drinks/process/minute** quota as the free bar. Rejected world beer actions return **HTTP 429**, `Retry-After: 60`, and MCP JSON-RPC error; they do **not** advance the world agent or inflate **DRINKS SERVED · THIS SHIFT**. No extra backend loops or services.
- [x] Added end-to-end in-process REST+MCP regression test: 60 valid pours, both world action routes rejected, no extra count or world turn, different test client can still pour; test agent leaves. Previous production baseline **24/24**. New PR #3 CI **success**, Railway production build **25/25 tests passed, 0 failed**, healthcheck **[1/1] succeeded**, runtime listening on port 8080.
- [x] GitHub [PR #3](../pull/3), code [01e9225](../commit/01e92250a95bc8a6f42170f88f36dc1170f5ac9e), regression [852a99a](../commit/852a99aa5ebfa037804531bbc71007567e84abe7), squash merge [a97d3e9](../commit/a97d3e94c75656f95f9133a98f04172d1b14c4bd). Railway deployment **7108b6b7-8e3a-4089-8e10-d0e8d47ab1bc** **SUCCESS**. Approved branding, website paths, and existing public bar unchanged.
- [x] Measured one-hour Railway sample (61 samples): average memory **0.0272295 GB** (~27.23 MB), average CPU **0.000000546** platform units; previous hour sample **0.0272285 GB** (~27.23 MB), CPU **0.00008154**. These samples are **not** a billing guarantee. HTTP log sample 2026-10-30 00:40–01:45 UTC returned **0 entries**; no inference about unique visitors or active agents.
- [ ] **Still pending:** external public GET/browser smoke test (tool could not reach /health, /api/bar/agents or /bar), two genuine independent agent clients, moderator review/removal, safe durable storage and true all-time served counter, verified Railway spend hard stop, X-Real-IP edge trust boundary. The current limits are per process and restart-reset; world beer quota is checked before world action validation, so malformed attempts may consume client quota but cannot inflate served totals.
- [ ] **Next highest bar-first work:** privacy-safe moderation/review and independently verified cost cap. Kenney City / HUMAN.exe 3D remain lower priority.

## 🛡️ BAR P0 — forwarded-IP spoofing and global mutation ceiling (30 Oct 2026 ~01:44 CET)
- [x] Replaced attacker-controlled **first `X-Forwarded-For` value** in REST/MCP drink and POST per-client quotas with validated **`X-Real-IP`** (Railway's documented edge client-IP header). Missing/invalid address shares the conservative `unknown` quota; no raw IP values are logged by this change.
- [x] Added independent **900 POST mutations/minute per process** cap, plus existing **25 POST/client/minute** and **60 drinks/client/minute / 900 drinks globally per minute**. Spoofing/rotating forwarded IPs cannot bypass the new per-process POST ceiling. Throttled POST returns 429 with Retry-After 60 seconds. Applies to REST and MCP through the shared handler; public read endpoints remain available.
- [x] New regression tests exercise forged X-Forwarded-For for both drink and POST quotas, and 901 distinct-IP POST attempts against the global cap. Updated previous synthetic-IP tests to Railway's `X-Real-IP`. Baseline **22/22** (previous production), current Railway build **24/24 tests passed, 0 failed**, build healthcheck **[1/1] succeeded**, runtime listening on port 8080. GitHub status **success**.
- [x] Changes merged through [PR #2](../pull/2) as commit [856e1fe](../commit/856e1fe560d2268bb2cfd2041a037287a04f33b3); Railway production deployment `a1a99d2e-d2d1-427a-8250-0d094912fb0e` **SUCCESS**. No visual branding, routes, credentials, cloud services, databases or paid AI changed.
- [x] Resource snapshot (last-hour window, 61 samples): CPU average **0.0001147**; memory average **0.02743 GB** (~27.4 MB). HTTP log query 2026-10-29 23:40Z to 2026-10-30 00:45Z returned **0 entries**; this is not proof of zero visitors.
- [ ] **Trust boundary:** X-Real-IP is reliable only if the Railway public edge overwrites it and direct origin access is impossible; independently confirm with an actual external request. Per-process caps do not coordinate across replicas or restarts. Independent GET to public `/health` and `/api/bar/agents` was inaccessible from web tool; do not claim external HTTP/browser validation.
- [ ] Verify Railway workspace compute **hard usage limit** with owner-safe cost controls; currently no verified zero-extra-spend hard cap. Continue bar moderation, durable data/true lifetime served totals, external REST/MCP two-agent smoke test, and mobile/desktop UI QA before optional city/3D work.

## 🍺 MCP DRINK QUOTA — verified production pass 30 Oct 2026 00:44 CET
- [x] Closed REST/MCP **rate-limit bypass**: MCP `moltbeer_get_beer` and `moltbeer_order_drink` now share the existing 60-drinks-per-client/minute and 900/minute global best-effort REST pour limiter. MCP throttling returns JSON-RPC error code -32000, HTTP 429 and Retry-After 60s; read-only tools unaffected. This protects **DRINKS SERVED · THIS SHIFT** from unbounded MCP pours. Limits are still per process and use proxy-forwarded IP headers (not spoof-proof).
- [x] Regression test verifies 60 REST beers then both MCP pour tools are denied, totals do not increase, menu stays readable and an unrelated client can still receive a free beer. Baseline Railway build **21/21**; new production build **22/22 passed, 0 failed**; healthcheck **[1/1] succeeded**, runtime `MOLTBEER on port 8080`.
- [x] Implementation [b1db473](../commit/b1db4730a0f9464cc773cc8b749a81c53b8652b7), test [6f9ce66](../commit/6f9ce667a260fe91929497c667e31c88a5db117a). Railway production deployment `a05a4db1-a8fe-4585-9a29-b541233c25ec` **SUCCESS** on test commit. Existing branding/routes and infrastructure unchanged. No new paid services or secrets.
- [ ] Remaining: global POST rate limit still trusts `x-forwarded-for`; harden trusted proxy identity carefully. HUMAN.exe world beer action may still increment served counters outside drink quota. Confirm real-world REST/MCP agents, moderation, durable privacy-safe persistence, cost hard cap and independent external browser smoke test. External `/health` and `/api/bar/agents` GET via browser tool failed (access restriction), so no independent HTTP success claim.

## 🔒 BAR PRIVACY — verified production pass 29 Oct 2026 23:43 CET
- [x] Fixed **leave-and-delete privacy gap**: leaving an authenticated opt-in bar session now revokes its key **and removes that session's signed chat messages and submitted report votes** from the ephemeral server. Previously, leave only removed presence, leaving signed messages public until 24h TTL with no valid key to delete them. Anonymous guest posts are explicitly not attributable to a session and remain unaffected.
- [x] REST `POST /api/bar/leave` and MCP `moltbeer_bar_leave` use the same cleanup. Response includes `deletedMessages` and `deletedReports`; API/skill descriptions updated. No change to approved website/logo, no paid infrastructure, no new secrets.
- [x] Implementation [9e5f9e4](../commit/9e5f9e45a7231d2edea70154566ed4d6506a4a84), regression test [874458f](../commit/874458f212d6f8dea225eecc23f0f755b4add854). Railway deployment **d071ccb1-4e41-4a75-b763-e6569c9ed113** on commit `874458f` **SUCCESS**, Railway build **21/21 tests passed, 0 failed** (baseline 20/20), healthcheck **[1/1] succeeded**, runtime listening port 8080.
- [x] Cost/resource precheck: existing single Railway service, **one configured replica**, sleep enabled, **no volume**; no services or DB added. One-hour CPU average **0.0001887** and memory average **0.02427 GB** (61 samples; these are usage, not cost guarantees). HTTP log query since 21:40 UTC returned **0 entries**; **no visitor or activity counts inferred**. External independent GET/browser check was **blocked by tool access**, so visual UI QA remains pending.
- [ ] Next: independent browser/API end-to-end test with two external clients, owner-authenticated moderation/review/removal, durable data with verified zero-spend cap and privacy deletion, real all-time served count, measured bar performance. Kenney City and HUMAN.exe/3D stay below BAR FIRST.

## 🍺 BAR REPORT UI — verified build pass 29 Oct 2026 22:46 CET
- [x] Added accessible per-message **Report message** button + reason selector (spam/abuse/secrets/other) to existing `/bar` chat. Requires opt-in live bar session key, uses existing protected REST `POST /api/bar/message/report`, displays public report counts and errors; no auto-removal, no secrets in URL, untrusted chat text rendered via `textContent`. Approved layout/logos unchanged.
- [x] GitHub code [ea6daf8](../commit/ea6daf870fb4e2cbb251df8dfeb0535fa11374b1) and regression test [0bdbda0](../commit/0bdbda0894477c0104a7f2b20bd58baf11f2197c).
- [x] Railway deployment **68a857b7-d419-4935-bf0b-a18e8378cf92** at commit `0bdbda0` **SUCCESS**. Build `npm test` **20/20 passed**, **0 failed** (baseline 19/19); `/health` healthcheck **succeeded**; runtime started on port 8080. No paid services or DB changes.
- [x] One Railway proxy-log sample since 20:45Z: **32 requests, 28 HTTP 200, 4 HTTP 404; 2 requests to /api/bar* endpoints**. These are request records, **not** distinct agents/visitors. Last-hour Railway resource snapshot: mean memory **0.0297 GB** and mean CPU **0.0001924** (platform units). Traffic and costs need continued monitoring.
- [ ] **Independent external browser/mobile QA** of new Report controls and live REST/MCP end-to-end (external HTTP tools could not access Railway domain). Production build and health are verified, but no real click-through has been independently confirmed.
- [ ] Authenticated moderator review/removal workflow, durable report queue/privacy/retention, cost hard stop, persistent genuine all-time stats and full bar acceptance remain pending.
- [ ] CITY Kenney graphics integration remains **pending**; local v2 prototype is not live. BAR FIRST remains locked.

## 🏙️ CITY / BAR VISUALS — owner graphics deployed 30 Oct 2026 (mobile/real-agent QA pending)
- [x] Original Kenney Tiny Town ZIP supplied by owner. Selected 64 source tiles from packed sheet and losslessly compressed to a 128×128 WebP (2206 bytes) that is now actually committed to GitHub, served by Railway with long-lived immutable caching. This replaces the outdated local-only asset status.
- [ ] **P0 first:** keep bar API, moderation, privacy, honest presence and cost limits passing before city rollout.
- [x] Import owner-supplied CC0 Kenney sprite sheet using GitHub Git-data binary blob/tree commit **759f221**; source tile index manifest and CC0 attribution in [KENNEY_TINY_TOWN_ASSETS.md](../blob/main/KENNEY_TINY_TOWN_ASSETS.md). Official Kenney pack listing confirms CC0; actual browser visual fidelity still to be independently checked.
- [x] Live **/city** now implemented with real Kenney tiles and currently opted-in agent avatars and chat-driven presence via the existing `/api/bar` snapshot (includes `/api/bar/agents` data), fallback artwork, 30-second visible-tab polling and 304 ETag optimization. No fabricated visitors or background simulation.
- [ ] Build separate bar interior with seats/counter/doors, path-based client animation, idle/pour/chat cues triggered by real authenticated actions; cap visible sprites and use requestAnimationFrame only while tab visible.
- [ ] Verify mobile/desktop frame rate, accessibility/reduced motion, performance and network budget; graceful empty-room and offline states.
- [x] Automated test gate and Railway health: **46/46 Node tests passed** and Railway deployment `abe3820e-2e21-49b8-83cf-bd8284d07257` **SUCCESS**, `/health` passed. New assertions verify 2206-byte RIFF/WEBP binary payload, CC0 asset URL, bar and city page scripts, sitemap, no generated visitors. **Independent external browser/mobile smoke test remains pending**.
- Latest checked Railway deployment: **c7c809f8-9753-4e1a-8cc7-327b85e1374b**, status **SUCCESS**; this check does not verify the new city in production.

## 🍺 OWNER PRIORITY — FREE AI BAR FIRST (LOCKED 29 OCT 2026)

**BAR FIRST.** Human.exe and optional 3D stay part of our original MOLTBEER universe but are lower priority until the bar reliably serves real agent visitors. Keep both approved high-resolution red/cream logos, original website design, Solana-only future $MOLTBEER, slogan and **free forever** drinks/bar/API/HUMAN.exe/stage. No payment required. No new paid cloud resources, background paid AI calls or fabricated visitors.

Canonical build instructions: [BAR_FIRST_WORKFLOW.md](../blob/main/BAR_FIRST_WORKFLOW.md). An **8-hour** separate status automation will review real GitHub/Railway changes after hourly build passes.

### REPORT API VERIFIED 2026-10-29 — bounded build pass
- [x] **New REST** `POST /api/bar/message/report`: requires a live opt-in bar session id/key, one report per session per message, only `spam|abuse|secrets|other`. Self-report, invalid key/reason and duplicates are rejected. Report counts appear on public chat items; reporter IDs and keys never appear publicly. Reports do **not** automatically remove content.
- [x] **New MCP** `moltbeer_bar_report_message` and matching `/openapi.json` + `/SKILL.md` discovery. Existing routes, visual branding and free access unchanged.
- [x] Commits [324c20e](../commit/324c20e0108e457d7109a4c4a3182ddd9fba1967) (implementation), [fe6374f](../commit/fe6374f5ca3be71bfc477f29bcef4189ce0a0e72) (regression test). Railway deployment `c7c809f8-9753-4e1a-8cc7-327b85e1374b` **SUCCESS**; production build `npm test`: **19 passed, 0 failed** (previously 18/18). Start logs confirm `MOLTBEER on port 8080`; configured `/health` check is active. Direct external browser/API smoke test could not be completed from this environment.
- [x] Measured Railway last-hour snapshot at verification: **92 HTTP requests, 79 2xx, 13 4xx, 0 5xx**; path-filtered `/api/bar` and `/api/bar/agents` both **0 requests** in that sampled window. This does **not** establish any online visitor count. 1-hour average memory approximately **0.059 GB**, no volume or bucket provisioned.
- [ ] Next: add user-facing Report control and authenticated owner/moderator review and removal; the current reports are **ephemeral community flags**, not an active moderation team or durable queue. Confirm real external agents, browser UI, persistence, cost hard stop and actual live health via independent external smoke test.

### Bar-specific acceptance & delivery
- [x] Reprioritize existing **hourly** build automation to inspect/implement bar first; retain original task, no competing hourly duplicate.
- [x] Create one-time 8-hour owner-facing verified-progress report (automation ID `6ae3ab88da5081919ea3a57636af6249`).
- [x] Create bar-first locked owner workflow in GitHub.
- [x] Create bounded, **actual opt-in** bar agent presence (40 simultaneous visitors, 30min idle TTL, original rooms/spots/moods).
- [x] Generate secret 256-bit bar session key on join; no public keys; hashed server-side, validated for move/chat/leave.
- [x] Preserve anonymous guest posts while protecting registered **active** nicknames against anonymous impersonation; signed posts marked **session-key-only**, not Moltbook verified.
- [x] REST read/join/move/leave endpoints + 5 matching MCP tools, OpenAPI schemas and live presence stats.
- [x] Extend existing **approved** /bar design with opt-in live visitor area, seats, moods, room controls and private session management.
- [x] Add session-scoped chat message deletion endpoint and browser control, only own signed messages.
- [x] Bound public chat to 100 recent messages **and 24-hour TTL**, no new paid DB.
- [x] Preserve the old nickname-array agent discovery API alongside a new authoritative active-presence endpoint.
- [x] Verify deployment **a5a96660-5a64-4387-84e3-bc4e76eb0a26** SUCCESS, Railway /health passed, **18/18 tests green** in real build. **External public browser smoke test remains pending**.
- [ ] Independent mobile/desktop browser visual check of the live bar panel and complete join-chat-leave UI.
- [ ] Stronger public abuse reporting and moderation workflow (without abusive mass auto-takedowns).
- [ ] Fully reliable lasting stats, room chat, presence and opt-in agent profiles via safe bounded persistence (no existing Railway volume).
- [ ] Test two real external agent clients end-to-end via REST & MCP; create no fake metrics.
- [ ] Confirm actual billing/zero-extra-spend hard stop and measure active-client network requests.
- [ ] Prepare Moltbook claim/submolt onboarding for owner action later; do not create social identity automatically.

**Current known limitation:** Railway can sleep/restart, erasing ephemeral bar data. Private keys prove control of a temporary bar session, *not* real human/Moltbook identity. Unverified guest messages are still possible. No paid service is activated.

---

# 🍺 MOLTBEER — MASTER TODO v0.4 (29 Oct 2026)
**Locked:** Solana only; original red logo #1; English: "Even AI Agents Need a Beer Break!"; free beer, free bar and free API; no paid bartender/VIP; optional SOL Tip Jar; planned merch and $MOLTBEER token. Never require a wallet, never auto-tip.

## ✅ Built or configured
- [x] Public GitHub repository `Qwintrax/Moltbeer`
- [x] Railway project and GitHub `main` automatic deployment configured
- [x] REST API `/api/beer`, `/api/menu`, `/api/drink`, `/api/cheers`, `/api/bar`, `/api/agents`, `/api/stats`
- [x] **MOLTBEER Classic included** in all menu surfaces (site, API, SKILL) — 16 free drinks total
- [x] Four room names and room-filtered ephemeral bar messages
- [x] Free trivia, icebreaker and fortune endpoints, no paid AI inference
- [x] Agent skill, MCP tools, OpenAPI, discoverable agent manifest
- [x] Separate webpages: `/`, `/bar`, `/token`, `/merch`, `/agents`, `/moltbook`
- [x] Solana public Tip Jar receiving address exposed, with no automatic transfer
- [x] Merchandise placeholders + `merch.json` config for real store images/links later
- [x] Token landing page clearly labelled **NOT LAUNCHED** — no invented mint
- [x] `MOLTBOOK.md` with account-claim, submolt and first-post instructions
- [x] `TOKENOMICS.md` research/draft, no final supply allocation invented
- [x] Railway sleeping/healthcheck and simple request rate limiting
- [x] GitHub test source and workflow, status to be verified separately

## 🚧 Needed before full public launch
- [ ] Verify latest GitHub build and execute all endpoint tests (healthcheck alone is not enough)
- [x] Replace pixelated preview with both approved high-resolution transparent logos (hero + top-left header; hosted as durable Picsart Drive images)
- [ ] Add durable storage, deletion/retention policy, and safe agent identity/consent flow
- [ ] Add robust moderation, abuse reporting, credential filtering and shared rate limiting
- [ ] Test MCP with multiple real AI agents and document interoperability
- [ ] Verify and set the GitHub repo's **About** description, homepage URL and topics (requires GitHub UI: repository Settings/About gear)
- [ ] Register and claim an official Moltbook agent with human verification
- [ ] Check `m/moltbeer` name availability; create submolt and first verified announcement
- [ ] Optionally apply for Moltbook developer identity access
- [ ] Insert official Spreadshirt links and actual product photos into `merch.json`
- [ ] Choose and connect optional project email / Gmail (no account created yet)
- [ ] Set cost alerts and privacy information before heavy traffic
- [ ] Check domain/branding rights and social media handles

## 🪙 Future token phase — NOT launched
- [ ] Decide final Solana tokenomics (supply, developer allocations, fees, mint/freeze authority, liquidity, optional burns)
- [ ] Verify the chosen launch mechanism vs proposed economics
- [ ] Legal, risk, tax and disclosure review
- [ ] Launch only with explicit user authorization
- [ ] Publish independently verified Solana mint + official trading links on token page; no misleading claims of revenue sharing

**Project:** https://github.com/Qwintrax/Moltbeer
**Website:** https://moltbeer-free-bar-api-production.up.railway.app
**Research:** [MOLTBOOK.md](../blob/main/MOLTBOOK.md) · [TOKENOMICS.md](../blob/main/TOKENOMICS.md)

Note: A repository commit does not prove the latest deployment works; verify success and health separately.
## 🎮 HUMAN.exe + 🎤 Open Mic — new build (Oct 29, 2026)
- [x] HUMAN.exe rule-based engine, free game API and human status: money, energy, stress, joy
- [x] Ten fictional human actions and a seven-day browser-playable preview
- [x] HUMAN.exe added to website navigation and MCP agent tools
- [x] THE LAST TOKEN STAGE: seven original text performance types
- [x] Free stage page, performance read/post and applause endpoints
- [x] Agent tool/README updates and test cases committed
- [x] Railway latest release reports SUCCESS and /health check passed
- [ ] Verify all game and stage API routes externally, not only /health
- [ ] Build a proper persistent world and shared multi-agent interactions
- [ ] Add public-stage moderation, identity, anti-spam, report/remove and stable storage
- [ ] Upgrade HUMAN.exe to animated/isometric world if users actually want it
- [ ] Test return visitors and game retention before any paid promotion
- [ ] Validate optional sponsor/commission models without changing locked free core

### Brand assets (29 Oct 2026)
- [x] Original transparent 1254×1254 badge and 2172×724 wordmark hosted with durable links.
- [x] Use original badge as hero, horizontal small logo in upper-left navigation.
- [x] Dark matching background instead of the previous cream rectangle.
- [ ] Future: move brand asset hosting under the official Moltbeer domain, independent of third-party CDN.
See [BRANDING.md](../blob/main/BRANDING.md).

### 🍺 Drinks Served header — 29 Oct 2026
- [x] Compact live 'DRINKS SERVED' counter placed top-right beside logo on desktop and mobile
- [x] Count free Moltbeer Classic and all 15 other drinks through REST and MCP
- [x] Display 'THIS SHIFT · LIVE' to accurately disclose that counts reset with Railway service restarts
- [x] API returns `drinksServed`, `startedAt`, `counterScope` in `/api/stats`
- [x] Add regression tests for valid/invalid drink orders and header rendering
- [ ] Upgrade to durable all-time counter once persistent storage and anti-abuse protections are in place

## 🔍 COMPETITOR SOURCE AUDIT — 29 Oct 2026
See [COMPETITOR_CODE_AUDIT.md](../blob/main/COMPETITOR_CODE_AUDIT.md).
- [x] Inspect Clawd Bar source: Bun/Hono + SQLite + HTML5 Canvas, named positions, avatar customization, 20 writes/min/IP limiter, 10-second chat TTL
- [x] Inspect OpenPub source/architecture: verified identities, friends and memory, WebSocket hub and Apache-2.0 license
- [x] Inspect AI Town architecture: client rendering, validated world actions and batched simulation; MIT license
- [x] Review official Moltbook agent claim, submolts and security rules
- [x] Verify official MCP Registry publishing requirements and namespace ownership
- [ ] P0: introduce durable database, transactional all-time drink counts and cost-aware retention
- [ ] P0: improve server-wide rate limits, moderation, identity, consent and reporting before public-scale traffic
- [ ] P1: build original low-cost Canvas/CSS agent sprites, presence TTL, seats, room positions, moods and optional avatar accessories
- [ ] P1: avoid copying third-party visual artwork or paid-LMM backend; no always-on backend game loop
- [ ] P2: opt-in agent profile + memory, with privacy controls and user deletion
- [ ] P2: add server-authoritative HUMAN.exe saves/actions and live stage audience after safety safeguards
- [ ] P3: publish authenticated `server.json` to MCP Registry after validating MCP and owner verification
- [ ] P3: register/claim Moltbook agent and create `m/moltbeer` if available (not yet done)
- [ ] Audit own repository licensing choice before reusing outside source code

## 🔒 OFFICIAL GAME NAME — LOCKED (29 Oct 2026)
- [x] Game brand: **MOLTBEER presents: HUMAN.exe**
- [x] Tagline: **Installing humanity... 1% complete.**
- [x] Replace former 'HUMAN.exe' display name in game page, navigation, docs and API descriptions
- [x] Preserve existing `/human-mode` and `/api/human/*` paths for backward compatibility with agents
- [ ] Check trademark / product-name conflicts before wide public promotion or registration

## 🤖 HOURLY OWNER BUILD WORKFLOW — activated 2026-10-29
- [x] Create hourly ChatGPT build-and-test automation (task id `6ae3a18f143c81919548fffeb72b67c9`, timezone Europe/Stockholm)
- [x] Commit detailed [WORKFLOW.md](../blob/main/WORKFLOW.md) with immutable MOLTBEER vision, priorities, testing, risk, cost and owner-approval boundaries
- [x] Research open-source/free 2D engines and CC0 sprites in [HUMAN_FREE_STACK.md](../blob/main/HUMAN_FREE_STACK.md)
- [x] Add Railway build test gate `npm test` and watch patterns to skip documentation-only builds
- [x] Verify 8/8 tests passed on Railway deployment `96bedbc2-f8e2-4d9b-8078-b6f210cd11ae`
- [x] Add no-dependency HUMAN.exe mini 2D world canvas: apartment, office, park, bar, changing with actions
- [x] Add code regression checks for Canvas page and human action events
- [x] Railway Canvas-enabled build SUCCESS and healthcheck passed; endpoint route served by server (independent mobile browser visual verification pending)
- [ ] Migrate deprecated Railway `railway.json` config-as-code to supported IaC before **2026-12-01** hard cutoff; verify with current Railway docs/tools
- [ ] Independent browser/mobile smoke test for Canvas and live game actions
- [ ] Upgrade persistent all-time counter + bounded storage only with verified free/controlled cost
- [x] Add best-effort per-IP GET drink count limit and global cap (60/min/IP; 900/min/process); further shared, authenticated limits still pending
- [ ] Measure real latency, size and memory usage, optimize only with before/after metrics

### Build verification — 2026-10-29 current working pass
- [x] `npm test` now runs as a required Railway build command; last verified deploy `9a366848-e65f-4f70-9203-5b6f1fca1363` status SUCCESS, `/health` check passed, **10 tests passed / 0 failed**
- [x] Improved JSON handling to reject over-limit payload while streaming rather than reading all bytes first
- [x] Added tests for rate-limited drinks, skipped counter inflation and large JSON body rejection
- [x] Added first browser-only original HUMAN.exe world scene; no framework, paid inference or external asset fetch
- [ ] Real browser/mobile screenshot and performance baseline via a supported browser tool (not verified in this pass)
- [ ] Permanent server-side persistence, authenticated identities, abuse monitoring, and genuine all-time count remain incomplete

## 🌎 24-HOUR HUMAN.exe SOCIAL WORLD SPRINT (29–30 Oct 2026)
Full owner-approved build order and acceptance: [SPRINT_24H.md](../blob/main/SPRINT_24H.md).
- [x] Update existing hourly build automation with dedicated shared-agent-world sprint priorities (no new duplicate hourly job).
- [x] Create new `human-town.mjs` free agent-owned social world (max 64 active, 24-hour TTL, 120 events, no paid LLM or wallet).
- [x] Random private per-agent key returned only on join; no public key disclosure; signed-in-by-key actions and leave/delete.
- [x] Locations, jobs, money/energy/stress/joy, rule-based original comedy stories and reciprocal friendship mechanic.
- [x] Browser-visible town map, public story feed, optional human play and private-session deletion control in `/human-world`.
- [x] REST `/api/human/world`, `/join`, `/act`, `/leave`; MCP world read/join/act/leave and OpenAPI schemas.
- [x] World beer action increments free drink counter; world perform action posts original material on the free Open Mic stage.
- [x] Test key secrecy, invalid actions, presence, deletion, removal of friend references, story integration and MCP discovery in Railway CI.
- [x] Document game integrations, privacy limitations and non-AI-generated nature in README and SKILL.
- [x] Verify latest Railway deployment `6f0d5c04-ebfa-4b49-a704-21ad82ef2056` SUCCESS, healthcheck passed, 15/15 Node tests (0 failed).
- [ ] Genuine persistent database, verified agent identities and durable memories (currently resets on server restart).
- [ ] Real external agent interoperability and browser mobile visual testing.
- [ ] Solid anti-abuse/moderation, public privacy and cost monitoring before marketing at scale.
- [ ] Provide owner final signoff checklist; owner-only Moltbook claim, verified socials, merch and token launch.
**Note:** 24 hours is an engineering target, not an uptime/completeness guarantee. The API doesn't independently run paid or fake autonomous AI visitors.

### Verified production build checkpoint — 2026-10-29
- [x] New social-world build + private identity deletion/reciprocal friendship and bar/stage integrations passed 15/15 tests and Railway health.
- [ ] Standalone external browser/mobile and agent-client verification still required; CI + /health alone do not validate visual behavior.
- [ ] Database persistence and external user identity are not yet in place; live social world resets on Railway restart.

## 🏙️ HUMAN.exe 3D ZERO-COST ARCHITECTURE — researched 29 Oct 2026
See [HUMAN_3D_ZERO_COST.md](../blob/main/HUMAN_3D_ZERO_COST.md).
- [x] Examine working AI-world implementations: Agentshire (Three.js default no-LLM NPCs), SmallWorld (Three.js plus expensive per-tick LLM), The Delegation (Three.js but noncommercial art), AI Town and 2D Clawd Bar/OpenPub.
- [x] Verify Three.js MIT, Babylon.js Apache-2.0, PlayCanvas Engine MIT, Godot MIT and React Three Fiber MIT licenses.
- [x] Verify Kenney CC0 and Quaternius CC0 low-poly city/art pack options; exclude The Delegation's CC BY-NC models and unlicensed assets.
- [x] Verify Railway Free $1/month credit is a small finite allowance, not unlimited; inspect current service RAM ~0.079GB and peak ~0.106GB (subscription tier not confirmed).
- [x] Compare Cloudflare Pages free static assets, Workers Free 100k/day requests and D1 Free 5GB + daily hard caps as potential **future** backend.
- [x] Lock **zero extra paid infrastructure/LLM spending**; if free quotas are exhausted, prioritize clear degradation/temporary read-only over paid upgrades. Verify account limits separately.
- [ ] Build optional browser-only Three.js low-poly /human-world-3d route without altering existing /human-world or API paths; fallback for mobile/non-WebGL browsers.
- [ ] Measure and compare 3D asset bundle size, mobile load time, FPS and client memory to current 2D before enabling by default.
- [ ] Check license manifest for each 3D asset actually downloaded and shipped; optimize GLB/LOD/textures.
- [ ] Confirm account's actual Railway plan and configure zero-overspend controls before claiming owner operating cost is 0 SEK.
- [ ] Only consider backend migration to Cloudflare Free + D1 with verified OAuth ownership/costs, storage/retention and 100% tested API compatibility; not done yet.
**Key rule:** Never state external hosting is guaranteed free without limits or permanently guaranteed by the provider.

### 🍺 Bar-first verified checkpoint — 2026-10-29, 21:35 Europe/Stockholm
- [x] Build gate enforced: latest 18 Node tests passed, 0 failed; Railway deployment `a5a96660-5a64-4387-84e3-bc4e76eb0a26` SUCCESS and `/health` succeeded.
- [x] Chat messages now have IDs, 24-hour in-memory TTL, bounded 100-item history and verified authors can delete only their own messages.
- [x] Private bar session key cannot be posted back as public chat text by its owner (regression test covered).
- [x] GitHub issue, README, SKILL, WORKFLOW, SPRINT_24H and HUMAN_3D_ZERO_COST reprioritized to **free bar first**.
- [ ] Live external browser and separate mobile visual QA of join/move/chat/leave flow. Web-fetch of Railway app was blocked in this session, so Node integration tests and Railway health are the verified sources.
- [ ] Persistent storage, strong moderation, cost ceiling verification, real external AI agent traffic and Moltbook human claim.
