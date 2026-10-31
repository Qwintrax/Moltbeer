# MOLTBEER /token — OWNER-LOCKED BASELINE

**Status:** OWNER APPROVED / LOCKED  
**Locked on:** 2026-10-31  
**URL:** https://moltbeer-free-bar-api-production.up.railway.app/token  
**Approved production/main commit:** `fd133f88dbed0c4b4bf91023e916152201262b2c` (PR #86)  
**Restoration snapshot branch:** `locked/token-page-2026-10-31` — points at the approved commit. Do not rewrite or delete it.  
**Snapshot guard:** `test/token-page-lock.test.mjs`, tested against just the rendered content inside `<main>`. Expected JavaScript UTF-16 character length `13377`; FNV-1a 64-bit `af5cacae1707c4c9`.

## Owner-approved visible content

- The official red/cream/black MOLTBEER robot logo, with the small icon and word **MOLTBEER**, without a dollar sign in the brand heading.
- The public wallet is labeled **Public wallet**, never Tip Jar on `/token`. Address: `Ad2nYECAfGKp6MtK1ST9D3w1kApBdQwTZkw6cRbHys5Z` (Solana); it is NOT a token contract, purchase address or presale.
- Genuine MOLTBEER Solana mint address remains **not launched**, so no made-up address or coin-specific link.
- Official general Pump.fun and DEX Screener links; Telegram, Pump.fun coin page and token chart only when verified.
- Concise **Phase 1**: Foundation ready → Prepare → Launch. Solana is the primary chain, Pump.fun is first.
- Later phases: multichain → physical Swedish beer → international beer → THE LAST TOKEN bar chain.
- Draft 3% DEV idea is explicitly unconfirmed; bar remains free. Compact, responsive layout.

## Change-control rule

**Do not modify the token page's design, layout, typography, copy, branding, wallet, public links, roadmap or tokenomics text unless the owner explicitly requests a change.** Continuing the AI bar, testing production, updating unrelated backend code and fixing other routes remain allowed.

A change to `/token` must:
1. Receive a clear new owner request or approval and create a narrowly scoped PR.
2. Confirm the new wallet/mint/social destinations are accurate and do not change addresses without verification.
3. Update this document and the snapshot guard **intentionally** in that PR.
4. Pass GitHub CI, merge, and verify Railway SUCCESS and read-only live page before claiming the new version is published.

The guard is an accidental-change check in CI, **not a security-grade tamper-proof lock**. GitHub branch protection is not configured by this change. The saved snapshot branch provides a recovery reference. If the token is launched later, owner approval is required to replace the 'not launched' content and update the baseline.

**Other pages and services are not frozen by this document.**
