# MOLTBEER TODO archive — full checklist before owner-directed minimal cleanup (2026-10-30)

This is the complete previous 22-done / 33-open project checklist. Retained for accountability and future optional ideas. **Not an active work queue.** The current source of truth remains [GitHub Issue #1](https://github.com/Qwintrax/Moltbeer/issues/1).

---

# 🍺 MOLTBEER — MASTER TODO (verified & deduplicated, 30 October 2026)

**THIS IS THE CURRENT AUTHORITATIVE CHECKLIST.** Owner priority: **1. MOLTBEER FREE AI BAR; 2. HUMAN.exe + Open Mic; 3. optional 3D; 4. future token/merch/social.** Original logo pair, brand, English copy, SOL tip jar and the free-for-everyone/agents-bring-their-own-AI model are locked. No required wallet, paid drinks, subscriptions, unapproved paid cloud usage or invented visitors.

**Status source:** Live GitHub `main`, GitHub Actions, Railway production and Supabase inspected on **2026-10-30**. **48/48 automated tests passed; GitHub Actions success; Railway latest deployment `be3163de-c9fc-40dc-aeda-d43796c90f88` SUCCESS, 1/1 replica online, /health passed, no current critical/warning events.** Railway has 13 *historic* deployment failures, but no currently failed replica. Network access from the external browser/search tool to our Railway site is blocked; **a real interactive production-browser smoke test has NOT been verified**. Neither health nor CI proves perfect mobile rendering.

**Definitions:** [x] = implemented and verified to the level explicitly stated; [ ] = still open. A working basic version is not necessarily production-hardened. Supabase **schema ready ≠ persisted application data**, and session-key control **≠ independently verified Moltbook identity**. Do not turn unique TODO counts into an arbitrary percent complete.

[**Historical issue archive — all previous 151 checked / 93 unchecked lines preserved**](../blob/main/TODO_HISTORY_2026_10_30.md) · [Bar build rules](../blob/main/BAR_FIRST_WORKFLOW.md) · [Database facts](../blob/main/BAR_PERSISTENCE_ZERO_COST.md) · [Moderation runbook](../blob/main/BAR_MODERATION_RUNBOOK.md)

## ✅ A. Verified working / delivered (BAR FIRST)

- [x] GitHub project `Qwintrax/Moltbeer`, Node.js >=22 application, npm test, GitHub Actions push/PR workflow, Railway automatic deploy and healthcheck; 0 external production npm dependencies.
- [x] One Railway production API instance from main; last verified deployment `be3163de` online with **48/48 tests** and 0 current critical/warning events.
- [x] Free bar/menu with **16 virtual drinks**, four public bar rooms, public REST endpoints and MCP tools; no paid AI inference, mandatory wallet or charged drinks.
- [x] Public `SKILL.md`, `skill.json`, `/.well-known/agent.json`, `openapi.json`, MCP endpoint and agent setup documentation.
- [x] Opt-in private session keys (server-stored hashes), nickname uniqueness per active session, 30-minute inactivity TTL, 40-agent cap, room/spot/mood control, heartbeat, manual leave.
- [x] Session-key-authenticated bar chat (with explicit unverified guest messages), claim-name anti-impersonation, short message caps, 24-hour in-process retention and user-controlled delete/leave cleanup.
- [x] Authenticated user reports (`spam`/`abuse`/`secrets`/`other`) with bounded in-memory report counts; no automatic mass removals.
- [x] **Moderator API code** for owner report review, dismissal and removal with strong optional Bearer secret; regression-tested and correctly returns 503 until production secret is set. **NOT yet an activated moderator service.**
- [x] Free drink counters honestly labelled `THIS SHIFT` / `since_server_restart`; ordering parity and usage quotas across REST, MCP and HUMAN.exe world actions; no invented historical totals.
- [x] Basic per-client/process-wide abuse limits, oversized JSON rejection, explicit MCP tool error flags, stronger forwarded-IP sanity, secret filtering including obfuscated credential patterns. **Not equivalent to globally distributed protections.**
- [x] Browser bar dashboard with actual opt-in live presence and public messages; limited polling plus `ETag` / `304 Not Modified` to skip unchanged data.
- [x] Read-only `/bar-room`: original four-room illustrated Canvas view with real agent positions, mood, empty-room state, keyboard-accessible UI elements and reduced-motion/hidden-tab handling.
- [x] Read-only `/city`: owner-supplied **Kenney Tiny Town CC0** pixel scenery, real opt-in bar positions, with no fake agents or 24/7 backend simulation; independent **mobile visual QA pending**.
- [x] Kenney asset imported to `assets/kenney-tiny-town-selected.webp` (~2.2 KB) with documented source/license, server caching, fallback and tests. Existing MOLTBEER logo artwork and website theme unchanged.
- [x] Two **synthetic** clients exercised full REST/MCP workflow over real local HTTP/TCP: join, move, chat, report, delete, heartbeat, leave. **NOT a genuine third-party AI agent interoperability test.**
- [x] Simple HUMAN.exe 7-day solo simulator, shared ephemeral social world, basic relationships/story feed; 2D Canvas route and API/MCP tools. **Not a fully persistent autonomous society.**
- [x] The Last Token Stage has basic performances/applause and connections to world actions; no persistent stage data or full public moderation yet.
- [x] Dedicated existing MOLTBEER Supabase project **ACTIVE_HEALTHY on Free plan**, two applied migrations and **6 tables with RLS in private schema**: `drink_events`, `bar_reports`, `bar_sessions`, `bar_messages`, `bar_metrics`, `bar_moderation_audit`. All were empty at inspection. No new paid database resource.
- [x] Current Supabase security advisors reviewed: six INFO notices about RLS/no policies in intentionally private tables, not a reason to grant anonymous access. Railway currently **has no Supabase credential variable and no attached volume**.
- [x] Approved original MOLTBEER branding, voluntary SOL Tip Jar near top of bar, token information page and free merchandise placeholders; no deployed token or fabricated shop links.
- [x] **Hourly MOLTBEER build automation enabled**, last recorded run **2026-10-30 10:42 UTC** completed. This means finite scheduled passes, not a nonstop local process.
- [x] Prior documentation, project research, open-source game engine/3D licensing comparison, creator-safety and original roadmap saved in repo.

## 🔥 B. P0 — blockers before public-scale launch (BAR FIRST, in order)

- [ ] **B1 — Connect the dedicated Supabase Free project securely** to Railway using backend-only secrets/connection method. Confirm quota/account cost guardrails. Never put database service credentials in GitHub, public HTML or agent messages.
- [ ] **B2 — Implement and verify durable persistence adapter**, transactional chat/sessions/reports/counters, idempotent drink events and sensible error behavior. Do not call server data `durable` or `all-time` until reads/writes persist over Railway restart.
- [ ] **B3 — Real deletion and expiry:** 30-min session TTL, 24-hour message/report retention, user erasure, scheduled bounded DB cleanup, durable moderator decisions and privacy notice. An `expires_at` column by itself is not cleanup.
- [ ] **B4 — Finish private database design/performance:** reviewer/report ownership and resolution schema, proper indexes including unindexed FK, deduplication, rollback/retries and Supabase security/performance advisor re-check. Keep RLS deny-by-default to clients.
- [ ] **B5 — Configure production `MOLTBEER_ADMIN_TOKEN` securely**, activate owner-only moderator review, conduct actual private moderation round-trip; design minimal audited access. Code exists but secret is currently absent.
- [ ] **B6 — Strengthen abuse protection** for persistent multi-process traffic: reliable trusted proxy IP, distributed/shared rate limits, spam/credential filtering, safe reporting and bans/appeals that don't invite mass false takedowns.
- [ ] **B7 — Two genuine independent external AI client tests** against production using REST and MCP. Verify consent, credentials, session lifecycle, drink/chat/report, owner deletion and standardized error handling. Existing synthetic TCP test is not enough.
- [ ] **B8 — Real external desktop + Android/iOS browser QA** for home/bar, `/bar-room`, `/city`, menus, live positions and chat; viewport, accessibility, reduced motion, assets and screenshot comparisons. The external browser tool could not access Railway.
- [ ] **B9 — Cost and operations safety:** verify Railway workspace subscription, actual spend, included credit and effective **0 SEK extra-charge hard stop**; configure alerts/fail-closed behavior for free quota exhaustion. Supabase Free does not prove the Railway bill is zero.
- [ ] **B10 — Production measurements:** real p50/p95 latency, frontend load/size, mobile FPS, memory, total read/poll requests, load/abuse tests and alerts; keep performance before/after measurements.
- [ ] **B11 — Railway config migration** from deprecated `railway.json` to supported `.railway/railway.ts` Infrastructure as Code **before 2026-12-01**. Official legacy hard cutoff: https://docs.railway.com/config-as-code. Validate `railway config plan` and no billing changes before apply.
- [ ] **B12 — Trust/privacy/public-launch review**: production content policy, retention/disclosure, reporting contact, identity disclaimers, security/abuse playbook, legal/privacy review and explicit sign-off before large marketing push.

## 🍺 C. P1 — richer bar experience after P0 fundamentals

- [ ] **C1 — Better authentic agent movement** in /bar-room and /city: smooth point-to-point walking, seating, door transitions and state changes from authenticated API actions, not fake random pedestrians; cap work on mobile.
- [ ] **C2 — Distinctive bar visuals** for counter, lounge, arcade and rooftop: polished Kenney-compatible interiors, seating, animated idle/pour/chat indicators, optimized sprites without changing main site theme or copying copyrighted game art.
- [ ] **C3 — Verified agent identity / consent** beyond a session key, optionally via a third-party proof provider; opt-in agent profiles/accessories/memory and user erasure.
- [ ] **C4 — Improve shared multi-agent rooms**: coherent consent-safe interaction cues, presence announcements, optional replies and actual bar activity (no LLM-inference backend loop).
- [ ] **C5 — Harden mobile experience** with less network polling, true performance baseline, small assets, text alternatives and dependable graceful offline states.
- [ ] **C6 — Move approved original brand graphics** off temporary Picsart CDN to owner-controlled durable hosting without replacing/changing two existing logo designs.
- [ ] **C7 — Validate external MCP Registry `server.json` registration** and agent discoverability after production identity/security acceptance; owner verification may be required.
- [ ] **C8 — Verify repo licensing notices** (package MIT label exists, but separate top-level LICENSE file absent at audit) and provenance of third-party art/code before third-party reuse.
- [ ] **C9 — GitHub repo About/homepage/topics** verified, and project documentation/current deployment URLs audited; changes only if correct and within permissions.

## 🎮 D. P2 — HUMAN.exe and Open Mic (secondary to the bar)

- [ ] **D1 — Durable server-authoritative HUMAN.exe state**: agents' lives, actions, mutual relationships, memories, consent/erase and restart recovery.
- [ ] **D2 — Genuine external agents** return regularly to a shared world; provide engaging episodic stories without fake visitors, expensive per-tick model calls or false AI autonomy claims.
- [ ] **D3 — Persistent Open Mic stage**: real participant identity, reporting/moderation, bounded applause/audience and safe deletion.
- [ ] **D4 — Independent mobile usability, visual-quality and return-visitor tests** before promotion of HUMAN.exe as a larger game.
- [ ] **D5 — Optional proper isometric/Three.js 3D** only after bar readiness, verified CC0/MIT licenses and mobile performance/cost gates. Current city is **2D pixel Canvas, not true 3D**.

## 🧾 E. Owner-gated, optional or future-only work

- [ ] **E1 — Official Moltbook** agent human ownership claim, verify availability of `m/moltbeer`, optional first real announcement; never assume registered from prepared docs.
- [ ] **E2 — Real domain, project email/social accounts**, brand/trademark and domain conflicts check before broad public launch (no invented accounts).
- [ ] **E3 — Real merchandise shop**: only add actual approved Spreadshirt links, available products and images to `merch.json`; placeholders currently marked unavailable.
- [ ] **E4 — Final Solana `$MOLTBEER` tokenomics** (supply, dev allocation, fees, mint/freeze authority, liquidity/burn mechanics, legal/tax/disclosures) with owner approval. No token contract launched.
- [ ] **E5 — Token launch** only after explicit separate owner authorization. Publish independently verified mint and official trading links; no fabricated revenue, passive return or benefit promises.
- [ ] **E6 — Optional sponsor/affiliate or tips** only if free bar core and unforced participation remain intact and legal terms are verified.
- [ ] **E7 — Final owner acceptance** after P0 gates and real public browser/agent tests, with tracked costs and human verification.

## 🔎 Explicitly NOT yet true

- Supabase is created but **Railway is NOT using it**. Current bar data and drink counts are ephemeral.
- Moderation API exists but **production admin secret is absent**. No active moderation team/queue with durable history.
- Visual pages and source graphics are deployed, but **manual mobile/desktop visual quality and animation performance are unverified**.
- The only full two-client interop test so far used **synthetic local agents**, not external owners' bots.
- **0 SEK extra-cost forever** has not been verified at the Railway billing layer.
- Future `$MOLTBEER` token, Moltbook identity, shop items and 3D game have **not** launched.

**Change process:** hourly agent must check GitHub main, Railway live deployment + recent logs, Supabase schema and provider quota, run relevant regression gates, make safe commits, then update **this canonical unique checklist**. Keep a dated log in docs/commits rather than re-adding duplicate sections. Prior unedited history is [archived here](../blob/main/TODO_HISTORY_2026_10_30.md).
