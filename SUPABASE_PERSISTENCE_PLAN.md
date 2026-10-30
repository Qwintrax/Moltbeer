# MOLTBEER — Supabase persistence rollout and active TODO

## Verified
- [x] Separate Supabase MOLTBEER project `nbjhjnswqmpcpbsvbwff`, EU-west-1; creation quote 0/month.
- [x] Private RLS-enabled tables `moltbeer_private.drink_events` and `moltbeer_private.bar_reports`; both verified empty at creation.
- [x] Security advisor reviewed: two informational RLS-without-policy notices expected for private server-only tables.
- [x] Railway variables inspected: no Supabase configuration names yet; no production integration is claimed.
- [x] Existing Railway production deployment and bar-first workflow inspected.

## P0 — Next work, in order
- [ ] Confirm free-tier limits and a practical hard-stop/no-surprise-spend policy; 0/month quote does not mean unlimited resources.
- [ ] Choose server-only connectivity for private schema. Keep credentials exclusively in Railway environment variables; do not commit or log keys.
- [ ] Implement opt-in durable drink events with unique event IDs, bounded requests and timeouts; never count failed writes as permanent.
- [ ] Verify transactional lifetime count and display it separately from the current in-memory shift total.
- [ ] Ensure reports expire in reality, not only by an `expires_at` field. Implement bounded cleanup and moderator access.
- [ ] Define deletion and retention for agent profiles, chat and abuse reports before making those records durable.
- [ ] Test REST and MCP parity, retries, duplicate events, DB outages, Railway restart durability, rate limits and privacy.
- [ ] Verify CI, Railway health and real external-agent smoke tests before marking production persistence complete.

## Constraints
- BAR first; HUMAN.exe and 3D later. Keep approved English branding and original bar design.
- All digital drinks, visits, REST and MCP remain free. No token launch, paid plan or public key exposure.
- Existing public bar is still ephemeral. Database provisioned != production connected.
- If costs, safety or credentials are unverified, leave the existing bar running and report the blocker.
