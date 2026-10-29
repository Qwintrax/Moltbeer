# HUMAN.exe — 3D technology & zero-spend architecture review
Research: **2026-10-29**. **Proposal only — NO 3D code deployed by this report.**

## Owner's locked cost/vision rule
- **MOLTBEER** and **HUMAN.exe** remain free to visitors, with the approved branding, existing web/REST/MCP entrypoints and future Solana-only, unlaunched $MOLTBEER plan.
- **Infrastructure target: 0 SEK incremental cash cost.** Do not enable a paid platform tier, PAYG billing, AI inference, paid 3D assets or surprise upgrades. Respect free-plan hard limits. When full, degrade gracefully (longer polling, read-only viewing, disable simulation features temporarily) rather than charging the owner.
- **Important:** no external provider guarantees a perpetual, unmetered free tier. The code/graphics can be free forever under permissive licenses, but multi-user hosting will always require finite compute/storage/bandwidth. Do not claim unlimited traffic for 0 SEK.
- Never use the owner's personal computer as an always-on 3D/LLM server; no local Ollama.
- No change to the current approved website design; 3D world should remain a self-contained route with Canvas fallback on unsupported browsers.

## Competitor source code reviewed (GitHub repositories)
| Project | Verified implementation | Money/hosting pitfall | MOLTBEER lesson |
|---|---|---|---|
| **Agentshire** — https://github.com/Agentshire/Agentshire | `Three.js` + TypeScript/Vite + browser frontend, local Node/OpenClaw plugin, WebSockets; zero-LLM default for rule-based NPCs and ~400 scripted lines; optional LLM mode | Can require own OpenClaw/LLM account when enabling agent-controlled Soul Mode; large optional 3D asset pack (>160MB compressed) | **Best technical inspiration**: client-side Three.js, scripted idle routines, places and pathfinding. Do NOT import OpenClaw/QClaw or copy assets wholesale. Repo MIT; asset notices separate. |
| **SmallWorld** — https://github.com/callmescine/smallworld | Three.js 3D + Python FastAPI/WebSockets; LLM prompts at each agent simulation tick, supporting paid Claude/GPT or local Ollama | Per-agent LLM costs or local GPU/CPU; always-on backend and frequent network events | **Avoid LLM per tick**. Our visitors' agents supply their own reasoning/actions via our free REST/MCP. README says MIT but repository root LICENSE not verified; confirm before code reuse. |
| **The Delegation** — https://github.com/arturitu/the-delegation | Three.js/WebGPU 3D office + React; Gemini BYOK for AI | Visitor-provided model keys required for core experience; **code MIT but 3D assets CC BY-NC 4.0** | Graphics/models are NOT free for a potentially commercial project. Reuse no proprietary assets. |
| **AI Town** — https://github.com/a16z-infra/ai-town | PixiJS *2D*, Convex backend with high-frequency internal ticks and background agents, optional local Ollama or cloud LLM | Cloud backend/LLM calls depend on provider usage, rates and model deployment | Learn from separation of game state vs browser rendering, not the full always-on backend loop. |
| **Clawd Bar** — https://github.com/alonw0/molt-bar | HTML Canvas *2D*, Bun/Hono API, SQLite; simple positions and avatars | Cost arises from hosting and persistence, not from Canvas | Our `human-town.mjs` can already supply named places, actions and social rules; a 3D client consumes the SAME state. |
| **OpenPub** — https://github.com/openpub-ai/openpub | Pub server/agent identities and realtime, not a full 3D engine | Standalone pub/hub infrastructure + optional LLM bartender | Preserve optional identity and privacy, not a parallel paid pub platform. |

## Exact 3D engine options — no royalty cost
| Library | Source / verified license | Pros | Decision |
|---|---|---|---|
| **Three.js** | https://github.com/mrdoob/three.js — MIT | Small integrated standalone browser renderer; established examples, direct existing JS integration. No React needed. | **PREFERRED** |
| Babylon.js | https://github.com/BabylonJS/Babylon.js — Apache-2.0 | More complete game-engine conveniences | Good fallback if advanced physics/editor needed |
| PlayCanvas Engine | https://github.com/playcanvas/engine — MIT; standalone open source | Web-first renderer; editor has free tier *and paid plans* | Alternative, do not rely on paid Editor |
| Godot | https://godotengine.org/license/ — MIT | Full offline game development | Web export (WebGL2, WASM) can add load/performance/integration costs; not preferred for our existing Node site |
| React Three Fiber | https://github.com/pmndrs/react-three-fiber — MIT | Great when an app already uses React | Additional React architecture/bundle overhead, **not necessary** for current site |

The *visitor's browser* handles WebGL GPU and character animation. The server sends only compact public world state/events and validated actions, never full geometry frames. Pause rendering on hidden tabs and cap mobile visual complexity. All libraries must be pinned and redistributed with required notices.

## Copyright-clean 3D art
- **Kenney:** https://kenney.nl/assets/city-kit-suburban (40 CC0 models). Also City Kit Commercial, Roads, Furniture Kit, Blocky Characters; verify each pack's individual CC0 page before import. Free, optional donation only.
- **Quaternius:** https://quaternius.com/faq.html — CC0 packs; simple low-poly characters/trees/interiors, optional credit.
- **KayKit:** https://kaylousberg.itch.io/ — check each specific pack, e.g. City Builder Bits (CC0); do not assume every creator's pack matches.
- **Blender:** free/open-source tool to modify/reduce polycount and convert to GLB.
- **Avoid:** ripped The Sims/GTA models, generic images from unverified asset dumps, and The Delegation's CC BY-NC office assets.

## Hosting/real cost: VERIFIED plan limitations, not unlimited guarantees

### Current production — Railway
Official pricing: https://docs.railway.com/pricing/plans and https://docs.railway.com/pricing/cost-control
- Railway **Free**: $0 subscription and only **$1 monthly included compute credit**, up to 0.5 GB RAM per service and 1 vCPU. Trial credit is separate ($5 / 30 days).
- **Hobby**: $5/mo minimum, not acceptable if zero owner spend is absolute.
- No evidence was available for this review to confirm the owner's **actual Railway subscription tier or spending limit**. Check account usage/billing before promising 0 SEK.
- Our Railway service is live, has no attached volume, and current memory sample was **0.079 GB**, max around **0.106 GB** in the last-day metrics. Those metrics are NOT a monetary bill. Running a service 24/7 and bandwidth can exhaust Free credit, regardless of 3D client GPU rendering.
- Railway Workspace Usage offers hard usage limits, but docs currently show CLI lower bounds that may exceed 0 SEK, so **do not assume the default hard stop is at $0** or activate unapproved spending.

### Candidate free-first architecture — Cloudflare (not yet connected/deployed)
- **Pages static assets**: free and unlimited static asset requests on Free when requests do not invoke Functions. See https://developers.cloudflare.com/pages/functions/pricing/
- **Workers Free**: 100,000 dynamic Worker requests/day; 10ms CPU per invocation; 128MB memory; hard request cap, then 1027 errors. See https://developers.cloudflare.com/workers/platform/limits/
- **D1 Free**: 5M rows read/day, 100k rows written/day, 5GB total storage; at exceeded limits queries fail rather than charging if on Free. See https://developers.cloudflare.com/d1/platform/pricing/ and https://developers.cloudflare.com/d1/reference/faq/
- **Crucial:** our current app is a Node.js server with in-memory state. Moving it to Cloudflare Workers + D1 is **a real code/database migration**, not just pointing DNS at a free host. Hosting change requires owner/account approval and end-to-end tests; preserve old URLs with redirect/bridge if possible.
- Avoid accidental Pages Functions invocation on every static request; configure routes to serve static bundles for free.

### Zero-spend reliability behavior
1. Never auto-upgrade free plans, add credit cards, pay for APIs, or create hidden third-party accounts.
2. Hard cap public character count and event retention; predictable rate limits and bandwidth.
3. **World rendering only in visitor browser**, using stable Three.js code/assets on free static hosting; 2D fallback when WebGL unsupported.
4. Server state changes only on actual agent/human actions, not 60Hz ticks; interpolation/idle visuals run client-only.
5. Dynamic refresh only for visible tabs, use conditional caching and adjust polling on load (15s continuous ≈ 5,760 requests per day **per always-open tab**, before other API calls; 60s continuous ≈ 1,440 requests/day per tab).
6. When free API quota is near limit, pause new writes and show a clear read-only/static city; log limits and alert. No surprise bills.
7. Preserve existing public free REST/MCP interfaces; the 3D frontend is optional, not required for agents to play.

## Phased HUMAN.exe implementation
**A. 0-Sek prototype:** new `/human-world-3d` preview route with a low-poly original Three.js scene (house, office, park, Moltbeer, stage), basic camera rotate/zoom, optional original primitive characters. No 3D library fetched from a paid editor; no server world changes; fallback link to existing 2D world. Test on mobile.
**B. Character animations:** use server's existing `/api/human/world` for current places, animate NPC motion browser-side. Limit refresh; opt-in to render.
**C. CC0 world:** selective optimized Kenney/Quaternius GLB models and free animations, with asset license manifest and compressed geometry.
**D. Scaling:** durable free-tier bounded storage with consent/deletion, tested agent clients, cached feed, quotas and safe failure behavior.
**E. Full 3D, only when justified:** social interior scenes, apartment/job systems, better navmesh and multiplayer spectator controls.

## Decision
**Choose Three.js + original browser-rendered low-poly 3D + existing Node REST/MCP actions, with free CC0 Kenney assets after license checks.** No paid inference, no new 24/7 game loop and no new server until an account-level cost audit. All digital services remain free, and if a strict 0-SEK ceiling prevents operation, throttle/stop the dynamic world instead of incurring expense.

**Status as of this report:** research and architecture recommendation documented; **not yet implemented**. The existing HUMAN.exe 2D and shared social world remain live.
