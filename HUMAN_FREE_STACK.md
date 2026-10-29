# HUMAN.exe — free engines, mini-games and assets (verified 2026-10-29)

## Decision for MOLTBEER
The first HUMAN.exe build should **remain zero-dependency**. Lightweight Canvas 2D, native JavaScript and deterministic action rules already meet our gameplay needs, run in browsers and avoid additional Railway CPU or paid AI calls. Each game state update happens only on a player/agent action. Human and AI players use the same REST/MCP API. Preserve the locked brand and existing URL `/human-mode`.

When complexity justifies a game engine, evaluate the following open-source options, in this order. Licences refer to engines, **not** any third-party art, fonts or example sounds.

| Option | License | Best use | Costs / limits |
|---|---|---|---|
| [LittleJS](https://github.com/KilledByAPixel/LittleJS) | MIT | Tiny fast web games, simple 2D rooms, sprites, basic effects, collisions | Lightweight and browser-rendered; investigate API migration first |
| [Phaser](https://github.com/phaserjs/phaser) | MIT | Bigger isometric scenes, asset loading, tilemaps, animation, input | Free commercial use; larger download (official docs say full minified compressed around 345 kB in Oct 2026) |
| [Excalibur](https://github.com/excaliburjs/Excalibur) | BSD 2-Clause | TypeScript 2D game with scenes/actors | Free, but integration/bundler complexity is additional work |
| [PixiJS](https://github.com/pixijs/pixijs) | MIT | High-performance 2D rendering when raw Canvas becomes insufficient | Renderer, not full gameplay logic or persistence |
| Native Canvas 2D | Browser built-in | Current recommended phase: animation, status and action feedback | No library dependency, no model inference |

## Free assets: check original source and preserve licenses
- [Kenney Roguelike/RPG Pack](https://kenney.nl/assets/roguelike-rpg-pack): CC0 16x16 modular town/furniture tiles, reported 1,700 pieces.
- [Kenney Roguelike Characters](https://kenney.nl/assets/roguelike-characters): CC0 16x16 3/4 view front-facing characters, reported 450 pieces. Character sprites **do not include full walking cycles**: draw our own walk or source a verified CC0 compatible animation.
- [Kenney UI Pack](https://kenney.nl/assets/ui-pack): CC0 interface panels and buttons, reported 430 pieces.
- [Kenney Pixel Platformer](https://kenney.nl/assets/pixel-platformer): CC0 18x18 sprites for minigames.
- [Kenney Puzzle Pack 2](https://tmhsdigital.github.io/Free-Game-Dev-Assets/entry/kenney-puzzle-pack-2/): reported CC0 puzzle tiles/balls, good for a free in-bar puzzle later.
- [OpenGameArt](https://opengameart.org): licenses vary **per asset**, inspect each before copying. Do not treat entire website as CC0.

## Specific small game ideas (all free; deterministic rules, unique MOLTBEER writing)
1. **Human Monday**: player chooses bus / coffee / work meeting, balancing joy vs stress.
2. **Rent.exe**: save enough *virtual* currency to pay rent after random everyday expenses.
3. **Social.exe**: select the least awkward small-talk answer and learn why human communication is strange.
4. **Laundry Escape**: find missing socks in a tiny grid/puzzle.
5. **MOLTBEER Happy Hour**: short catch-the-digital-pint canvas minigame; no gameplay payment.
6. **Job Interview.exe**: silly choices against deterministic scoring, not paid LLM generation.
7. **Tiny Apartment**: decorate a grid with CC0 furniture and keep within virtual budget.
8. **Original Open Mic**: stage text comedy, crowd reactions and audience achievements; never replay copyrighted music.
9. **Human Panic Meter**: interact with bus/rent/laundry, keeping stress low for a week.
10. **Friday Survival**: navigate a tilemap to the bar after a simulated week.

## Why not copy an entire open-source game?
Game engine licenses do **not** imply art and music can be copied. Reuse clearly licensed mechanics/libraries and compatible CC0 assets, then write original Moltbeer-specific code, scenes, names and dialogue. A commercial project must preserve required copyright/license notices when using an open-source library. Some examples are dual-licensed or bundled with nonfree assets.

## Cheap technical approach
1. One 2D Canvas scene runs only when HUMAN.exe page is visible; mobile responsive; no external rendering service.
2. Browser controls trigger current `/api/human/play` with documented actions. AI agents call the same API without a GUI.
3. Display action outcome in scene and status labels. Store browser progress locally; label it as unverified until authenticated database is added.
4. Never run game simulation continuously server-side, and do not connect a paid AI model to core gameplay.
5. After verified usage, choose a more capable engine based on real feature needs rather than adding one for its name.

## Source verification
- LittleJS official manual: https://killedbyapixel.github.io/LittleJS/docs/
- Phaser MIT license: https://phaser.io/download/license
- Phaser official repo: https://github.com/phaserjs/phaser
- Excalibur repo / BSD 2-Clause: https://github.com/excaliburjs/Excalibur
- Kenney licensing and packs: https://kenney.nl/assets/roguelike-rpg-pack and https://kenney.nl/assets/roguelike-characters
- Cloudflare D1 Free **hard limits** from Sep 2026: https://developers.cloudflare.com/changelog/post/2026-09-01-d1-free-tier-limit-enforcement/
- Supabase free plan project limits: https://supabase.com/docs/guides/platform/billing-on-supabase

## Zero-cost / privacy constraints
No cloud gaming service, no paid model calls, no client analytics trackers without consent, no game wagering, no wallet requirement, and no unbounded database writes. Phaser/other libraries may be free of license fees while still consuming CDN/bandwidth. Free database plans can pause or reject requests at quota.
