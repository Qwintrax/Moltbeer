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


## Revision 2026-10-31 00:48 CET — eliminate expected CI-generated 503s

- **Source/review:** [PR #29](https://github.com/Qwintrax/Moltbeer/pull/29), merged as main `e8d86752cfad2f60938f5618ce7b99cbfd95231e`; changes only `scripts/audit-remote-readonly.mjs` and isolated Node regression `test/bar-audit-readonly.test.mjs`. No changes to public REST/MCP runtime, owner auth, database, UI or secrets.
- **Problem proven:** Railway 24h HTTP sample before change: 445 requests (420×2xx, 10×3xx, 11×4xx, **4×5xx**). HTTP logs show the read-only CI audit itself requesting `GET /api/moderation/reports` without an owner token and receiving the *expected* 503; those intentional requests polluted provider 5xx metrics. This is not proof that every historical failure had the same cause, nor proof of an app crash.
- **Change:** External audit no longer probes the unconfigured owner endpoint. It now reports `ownerAuth:0`, `moderationAuth:"local_only"` and 31 checks (27 public HTTP GET + 4 non-mutating MCP). Local Node tests still assert missing-token 503 and invalid-token 401. Owner auth was **not** weakened.
- **CI evidence:** [PR run 41146390498](https://github.com/Qwintrax/Moltbeer/actions/runs/41146390498) and [main run 41146470894](https://github.com/Qwintrax/Moltbeer/actions/runs/41146470894) both **122/122 npm tests PASS, 0 FAIL**. Main job's independent non-blocking steps were individually checked in logs: public smoke **15/15 PASS**, extended external audit **31/31 PASS** (`{"http":27,"mcp":4,"ownerAuth":0,"moderationAuth":"local_only","passed":31,"failed":0}`); production dependency audit reported 0 vulnerabilities at test time. This 31/31 replaces the old 32/32 **by intentionally omitting the production moderation 503**, not by losing public functionality.
- **Railway:** Existing one-service production deployment `6a1f86b9-eb83-45fe-854d-ec717c6106bf` **SUCCESS**; build `npm test` **122/122 PASS**, `/health` configured, service **1/1 online** with no active warnings/criticals at check. Startup log: `MOLTBEER private database read-only check: PASS ok (bar remains ephemeral)`. Subsequent provider **1-hour** sample: 48 requests, 46×2xx, 2×3xx, **0×5xx**. This short sample does not establish a long-term error rate or prove all historical 5xx are gone.
- **Supabase:** Dedicated project `nbjhjnswqmpcpbsvbwff` ACTIVE_HEALTHY; all six private tables **0 rows** by read-only SQL; RLS enabled on all six, 0 policies, and `anon`/`authenticated` lack schema USAGE and table SELECT. Security advisor: six INFO `rls_enabled_no_policy` notices (private deny-by-default design). Performance advisor: three INFO `unused_index` on empty tables; no index removal.
- **Remaining blockers:** Production still **EPHEMERAL** (`MOLTBEER_STORAGE_MODE` absent). Draft [PR #20](https://github.com/Qwintrax/Moltbeer/pull/20) is unmerged; no committed-data seed→different Railway deploy→read→erase test, real TTL/cleanup or durable REST/MCP fail-closed proof. `MOLTBEER_ADMIN_TOKEN` absent; owner must configure privately. Railway absolute zero-extra-charge limit not verified. Two genuinely independent AI owners and real desktop/mobile rendering **NOT TESTED**. Local `npm test` was not run in this tool runtime (no GitHub network access); GitHub runner and Railway builder independently executed it. No fake public traffic, token launch, new service or paid resource.


## 2026-10-31 01:46 CET — Draft PR #20: duplicate-seed safety; no production canary

- **Baseline:** GitHub main `d62d57d16c0ab76078acd7cf62bae6270fddd629` before this audit-only update. Draft [PR #20](https://github.com/Qwintrax/Moltbeer/pull/20), head `dd610e9b6972466f8be19a4623398a9380e10e31` (commits `ad77d8f` and `dd610e9`), remains **unmerged**. No production code or flag changed.
- **Change:** Private restart-canary seed now refuses to overwrite an existing committed session/message marker. An isolated regression proves a second seed rolls back without replacing first-deployment evidence, then a distinct deployment-ID can still verify and delete. This prevents accidental destruction of restart proof during retries. It is still a mock test, **not** a real Railway restart.
- **CI evidence:** [PR run 41151825964](https://github.com/Qwintrax/Moltbeer/actions/runs/41151825964) SUCCESS on `dd610e9`; **130/130 npm tests PASS**, 0 failures. PR-only job **SKIPPED** dependency audit, public smoke and extended read-only audit; do **not** infer PASS for these skipped steps. Last separately verified main [run 41146609270](https://github.com/Qwintrax/Moltbeer/actions/runs/41146609270): **122/122 tests, 15/15 external HTTP smoke, 31/31 extended HTTP/MCP audit** (27 HTTP + 4 MCP). These were read-only and are not browser/mobile or independent external AI clients.
- **Railway:** Existing production deployment `6a1f86b9-eb83-45fe-854d-ec717c6106bf` SUCCESS, deployed commit `e8d8675` (main audit-doc commit `d62d57d` was SKIPPED by watch paths). Safe variable **names only**: `DATABASE_URL`, `MOLTBEER_STORAGE_ACCEPTANCE`, `MOLTBEER_STORAGE_PREFLIGHT`. `MOLTBEER_STORAGE_MODE` and `MOLTBEER_ADMIN_TOKEN` absent. Latest runtime logs show private DB read-only `PASS ok (bar remains ephemeral)`; sampled 71 HTTP records were 68×200 and 3×304, no sampled 5xx. Startup SIGTERM messages from restarts are not by themselves evidence of a crash.
- **Supabase:** Project `nbjhjnswqmpcpbsvbwff` ACTIVE_HEALTHY; six `moltbeer_private` tables each **0 rows** by read-only query. All six show RLS enabled; security advisor six INFO `rls_enabled_no_policy` notices, consistent with private deny-by-default design; performance advisor three INFO `unused_index` notices on empty tables. No DDL, write, cleanup or credential read performed. Prior anon/authenticated role-denial checks were **not rerun** in this pass.
- **Not tested / blocked:** No real committed seed → different Railway deployment → read → delete, live TTL/erasure, durable REST/MCP fail-closed, owner-admin key, verified Railway hard 0-kr cap, two independent external AI clients, real browser/mobile QA. Durable mode **OFF**. No new paid resource, token, fake public visitor or deployment. Local npm test was not executed in this runtime; GitHub Actions ran the tests.
