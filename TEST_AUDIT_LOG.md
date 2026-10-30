# 🍺 MOLTBEER — permanent test- och revisionslogg

**Status:** Append-only verifieringslogg. Varje ny granskning ska få en egen daterad sektion. **Radera inte äldre PASS/FAIL eller deras begränsningar.** Kanonisk arbetslista: [issue #1](https://github.com/Qwintrax/Moltbeer/issues/1). Detaljerade releasekrav: [BAR_RELEASE_GATES.md](BAR_RELEASE_GATES.md).

## Revision 2026-10-30 — broad read-only, security and production audit

### Versionsbevis

| Källa | Verifierat utfall |
| --- | --- |
| GitHub production `main` | `638741ebced3cb9b7cebd1721a650c7bdb5955ff` ([PR #26](https://github.com/Qwintrax/Moltbeer/pull/26)) |
| GitHub CI | [Workflow 41136251150](https://github.com/Qwintrax/Moltbeer/actions/runs/41136251150), **121 av 121 Node-tester PASS, 0 FAIL** |
| Äldre read-only smoke i GitHub CI | **15/15** publika endpoints PASS |
| Nya externa audit från oberoende GitHub-runner | **32/32 PASS:** 27 publika HTTP-GET-rutter, 4 läs-only MCP-anrop och 1 icke-autentiserad modereringskontroll |
| CI full-audit RESULT | `{"http":27,"mcp":4,"ownerAuth":1,"passed":32,"failed":0,"p50ms":93,"p95ms":174,"maxMs":214,"persistence":"ephemeral","menuDrinks":16,"rooms":4,"barMessages":0}` |
| Railway production deployment | `f8eb1787-b434-47e3-a642-c0f9a8a87053` **SUCCESS**, SHA `638741e`, Railway build **121/121 PASS**, inbyggd `/health` **1/1 PASS**, 1/1 replica online, inga aktiva warnings/criticals |
| Railway startup | `MOLTBEER private database read-only check: PASS ok (bar remains ephemeral)` |
| Railway HTTP-statistik, kontrollerat 24h-fönster | 249 anrop: 236×2xx, 2×3xx, 11×4xx, **0×5xx**. Ej ett fullständigt långtids-SLA |
| Railway svarstid från provider (24h) | Värsta registrerade p95-hink **1 844 ms** (kan innefatta serverless cold start). Separat GitHub-audit p95 **174 ms** är ett mindre stickprov, ej samma mätmetod |
| Infrastruktur | En Railway-app-tjänst, inga separata nya volymer/buckets. Supabase org **free/tier_free**, projekt aktivt. Railways faktiska faktura/hårt 0-kr-tak **ej verifierat** |
| Supabase databas | Postgres 17, `moltbeer_private`, sex tabeller med RLS. Total databasstorlek ca **11 MB**; **0 sessioner, 0 chat, 0 rapporter, 0 drink-events, 0 bar-metrics och 0 modereringsaudit** vid kontroll |
| SQL-rollgranskning | För det privata schemat `anon` och `authenticated`: **USAGE=false**. För alla sex tabeller: **SELECT=false** för båda rollerna och RLS=true. Inga öppna policies; advisor INFO (förväntat för privata tabeller) |
| Supabase prestandaråd | Tre `unused_index`-INFO på tomma tabeller; **ingen indexradering** utan verkligt arbetslastbevis |
| Lokal användardator via Remote Desktop Commander | **Offline**. Ingen riktig grafisk användartest eller mobil-FPS har verifierats |

### Testad funktionalitet

- **Publika vyer (HTTP):** `/`, `/bar`, `/bar-room`, `/city`, `/privacy`, `/human-mode`, `/human-world`, `/stage`, `/token`; status 200 och korrekta MIME-typer. Detta visar serverrespons, **inte rendering i webbläsare**.
- **REST/discovery:** `/health`, `/api/health`, `/api/stats`, `/api/menu`, `/api/rooms`, `/api/tipjar`, `/api/bar`, `/api/bar/agents`, `/api/agents`, `/openapi.json`, `/skill.json`, `/.well-known/agent.json`, `/SKILL.md`, `/robots.txt`, `/sitemap.xml`; 16 unika gratisdrinkar, fyra rum och frivillig Tip Jar med `autoTip=false` verifierade.
- **Assets:** `/favicon.ico`, `/logo.webp`, `/assets/kenney-tiny-town-selected.webp` status 200/MIME. Äldre smoke verifierar dessutom 2 206 bytes och WEBP-signatur på Kenney-asset.
- **MCP läsflöden utifrån:** `initialize`, `ping`, `tools/list`, `tools/call(moltbeer_bar_presence)` fungerar från extern GitHub-runner utan att ansluta falska agenter.
- **Skydd/lokala regressionstester:** säkerhets- och sekretessheaders; sessionsnycklar gömda i public presence; inaktiverad/obehörig modereringskö ger 503/401; felaktig JSON-RPC-metod, version och JSON avvisas; GET/read-only och lokala MCP-discovery-anrop ändrar inte räknare; ETag/304 returnerar tom body; felaktig route och OPTIONS skapar inte barbesök.
- **Lokala TCP-integrationer sedan tidigare:** två simulerade men oberoende localhost-klienter som join/move/heartbeat/say/report/delete/leave över REST samt MCP discovery, testade inom samlade 121 Node-tester. Det är **inte** två riktiga fristående AI-leverantörer.
- **Privata DB-adaptertester sedan tidigare:** riktiga Railway→Supabase rollback-only-transaktioner PASS med 0 committade testrader; SQL idempotens, signed/guest-chat, rapport, moderering, cleanup. **Ingen committad data över serveromstart har ännu verifierats.**

### Status, luckor och ej verifierade risker (påstå aldrig PASS här utan nya bevis)

| Område | Kvarvarande bevis eller åtgärd |
| --- | --- |
| Permanent lagring | **AV:** `MOLTBEER_STORAGE_MODE` saknas i Railway. Utökat privat restart-canary i [PR #20](https://github.com/Qwintrax/Moltbeer/pull/20) är fortfarande draft och **ej driftsatt/testat över två Railway-deploys**. Kontrollera CI på senaste head före merge |
| Verkliga data och radering | Verify committad skrivning → annan deployment → SELECT → radering → SELECT=0. Ingen publik falsk agent, inga testdrinks/statistik |
| Automatisk retention | SQL finns men live TTL/erase/reports/audit/cleanup efter omstart **inte aktiverade och verifierade** |
| Moderering | `MOLTBEER_ADMIN_TOKEN` saknas i Railway. Owner secret krävs privat; inga hemligheter i repo/chatt |
| Kostnader | Supabase Free konstaterad; Railway workspace spend/cap kan inte utläsas ur tillgängliga konto-verktyg. Inget absolut nollkostnadslöfte |
| Agentklienter | Extern MCP-read fungerar; full externt **skrivande** REST+MCP med två verkligt oberoende AI-agenter inte verifierat |
| Mobil, grafik och prestanda | Externa HTTP-GET-rutter PASS; riktig browser/Android/iOS render, grafik, FPS, touch, scroll, tillgänglighet och nätverksprofil **ej verifierat** |
| Railway Config-as-code | Kandidat `.railway/railway.ts`, men zero-diff migrate/plan/apply saknas; deadline 2026-12-01 |
| Last och DDoS | Kodens rate-limit regressioner finns; ingen distribuerad flerreplik-test, penetreringstest eller extern belastningskörning mot produktion. **Kör aldrig oönskad belastning** |
| Blockchain/token | Ingen MOLTBEER-token är lanserad; inga finansiella transaktioner testade eller genomförda |

### Säker testprocedur för framtida körningar

1. Läs denna logg, huvud-TODO och senaste GitHub-PR/status innan ny kod. Behåll tidigare resultat och lägg till en **ny** daterad loggsektion med commit-SHA, CI-run-id, Railway deployment-id och exakt evidens.
2. Kör lokalt `npm test`; GitHub CI. Publicera aldrig credentials eller session keys. Håll nyskapade testrader borta från den publika baren och kalla inte simulerade klienter riktiga besökare.
3. Kör `MOLTBEER_BASE_URL=https://moltbeer-free-bar-api-production.up.railway.app node scripts/smoke-readonly.mjs` för snabb kontroll och `node scripts/audit-remote-readonly.mjs` med samma environment för fördjupad extern kontroll. Båda skripten ska vara **read-only**. CI kör dem efter main push; de är **non-blocking** för att inte förväxla tillfälliga externa fel med npm-testfel. **Läs alltid separat stegutfall/loggad RESULT** innan du säger att externa tester passerade.
4. Verifiera Railway latest SHA, build-npm test, `/health`, loggar, 5xx och kostnad/replicas separat; GitHub CI framgång är **inte** bevis att ny kod driftsatts.
5. Kör Supabase endast med read-only kontroller tills kontrollerad restart-testplan har genomgått review; kontrollera RLS/roles, tabellräkningar, advisories och verkligt lagringsläge.
6. Nya buggar går till befintliga issue #1 (12 punkter); klassificera PASS / PARTIAL / BLOCKED / NOT TESTED. Öka aldrig en progressprocent utan evidens.

**Länkar:** [GitHub CI run](https://github.com/Qwintrax/Moltbeer/actions/runs/41136251150) · [Railway live bar](https://moltbeer-free-bar-api-production.up.railway.app/bar) · [audit source](scripts/audit-remote-readonly.mjs) · [local regression tests](test/bar-audit-readonly.test.mjs) · [main TODO](https://github.com/Qwintrax/Moltbeer/issues/1).


## Revision 2026-10-30 — production dependency audit och förnyad extern regression

**CI-källa:** [GitHub run 41136658258](https://github.com/Qwintrax/Moltbeer/actions/runs/41136658258), main source SHA `37b6290cd993fdbcf63643060f7db142cd358d4d` ([PR #28](https://github.com/Qwintrax/Moltbeer/pull/28)).

- **Kodtester:** 121/121 PASS, 0 FAIL.
- **Beroenden:** `npm audit --omit=dev --audit-level=high` genomfördes i GitHub-runnermiljön och rapporterade **`found 0 vulnerabilities`** för då tillgänglig advisory-databas. Detta är ett tidsbundet fynd, ingen garanti för framtida beroenden, och steget är non-blocking: läs dess eget resultat nästa gång.
- **Oberoende produktions-smoke:** 15/15 PASS, samt full read-only audit **32/32 PASS** (27 HTTP-rutter, 4 MCP-anrop, 1 unauthorized moderation). Mätvärden i denna körning: p50 24 ms, p95 65 ms, max 118 ms. Dessa timings gäller endast kontrollanropen, **inte** verklig mobilrendering eller lasttest.
- **Railway:** Production kör fortfarande kod-SHA `638741eb`, deployment `f8eb1787`, **SUCCESS/1 av 1 online/0 aktiva larm**. Senare `8c6c03fc` (endast logg) och `37b6290c` (endast CI-konfiguration) fick **SKIPPED** i Railway därför att inga körbara/build-bevakade filer ändrats. **SKIPPED är korrekt här, inte ett fel**.
- **Framåt:** fortsätt läsa hela loggen före nästa ändring. Lägg till nytt daterat avsnitt för varje meningsfullt PASS/FAIL, inte ersätt befintliga verifieringar. De kvarstående releaseblockerarna i föregående avsnitt (committad persistence över restart, modereringshemlighet, kostnadstak, riktiga agentägare och mobil-QA) är **fortfarande öppna**.
