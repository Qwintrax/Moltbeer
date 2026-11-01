// Fail-closed outbound request guard for automated production acceptance.
// The audit must never join agents, post messages, order drinks or mutate state.
// Only the explicitly audited public routes may be fetched from production.
// Prevent accidental requests to newly introduced endpoints or other origins.
const APPROVED_GET_PATHS = new Set([
  "/",
  "/bar",
  "/bar-room",
  "/city",
  "/privacy",
  "/human-mode",
  "/human-world",
  "/stage",
  "/token",
  "/health",
  "/api/health",
  "/api/stats",
  "/api/menu",
  "/api/rooms",
  "/api/tipjar",
  "/api/bar",
  "/api/bar/agents",
  "/api/agents",
  "/openapi.json",
  "/skill.json",
  "/.well-known/agent.json",
  "/SKILL.md",
  "/robots.txt",
  "/sitemap.xml",
  "/favicon.ico",
  "/logo.webp",
  "/assets/kenney-tiny-town-selected.webp"
]);

export function assertReadOnlyAuditRequest(path, options = {}) {
  const method = options.method || "GET";
  if (method === "GET") {
    if (APPROVED_GET_PATHS.has(path) && options.body == null) return;
    throw new Error("Production audit forbids unapproved GET routes or bodies");
  }
  if (method !== "POST" || path !== "/mcp") {
    throw new Error("Production audit forbids non-read-only HTTP requests");
  }
  let rpc;
  try { rpc = JSON.parse(options.body); } catch {
    throw new Error("Production audit forbids malformed MCP requests");
  }
  if (rpc?.jsonrpc !== "2.0") throw new Error("Production audit requires JSON-RPC 2.0");
  if (["initialize", "ping", "tools/list"].includes(rpc.method)) return;
  const p = rpc.params;
  if (rpc.method === "tools/call" && p?.name === "moltbeer_bar_presence" &&
      Object.keys(p).every(key => key === "name" || key === "arguments") &&
      p.arguments?.room === "counter" &&
      Object.keys(p.arguments).length === 1) return;
  throw new Error("Production audit forbids mutating or unapproved MCP tools");
}
