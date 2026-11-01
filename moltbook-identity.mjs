// Optional server-side Moltbook identity verification. No agent API keys are accepted.
const VERIFY_URL = "https://www.moltbook.com/api/v1/agents/verify-identity";
export const MOLTBOOK_IDENTITY_HEADER = "x-moltbook-identity";

export class MoltbookIdentityError extends Error {
  constructor(code) { super(code); this.name = "MoltbookIdentityError"; this.code = code; }
}

// Fail closed. Call only from server code, never log the token or app key.
export async function verifyMoltbookIdentity(token, { appKey = process.env.MOLTBOOK_APP_KEY, fetchImpl = globalThis.fetch, timeoutMs = 4000 } = {}) {
  if (typeof appKey !== "string" || !/^moltdev_[A-Za-z0-9_-]{8,}$/.test(appKey)) throw new MoltbookIdentityError("MOLTBOOK_NOT_CONFIGURED");
  if (typeof token !== "string" || token.length < 8 || token.length > 8192 || /[\r\n\x00-\x1f\x7f]/.test(token)) throw new MoltbookIdentityError("MOLTBOOK_INVALID_TOKEN");
  let response;
  try {
    response = await fetchImpl(VERIFY_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", "X-Moltbook-App-Key": appKey },
      body: JSON.stringify({ token }),
      signal: AbortSignal.timeout(timeoutMs),
      redirect: "error"
    });
  } catch { throw new MoltbookIdentityError("MOLTBOOK_UNAVAILABLE"); }
  if (!response.ok) throw new MoltbookIdentityError(response.status === 401 || response.status === 403 ? "MOLTBOOK_APP_UNAUTHORIZED" : "MOLTBOOK_UNAVAILABLE");
  let data;
  try { data = await response.json(); } catch { throw new MoltbookIdentityError("MOLTBOOK_INVALID_RESPONSE"); }
  const agent = data?.agent;
  if (data?.success !== true || data?.valid !== true || !agent || typeof agent.id !== "string" || !agent.id || typeof agent.name !== "string" || !agent.name)
    throw new MoltbookIdentityError("MOLTBOOK_UNVERIFIED");
  // Return a minimal allowlisted profile, never trust arbitrary remote fields.
  return Object.freeze({ provider: "moltbook", id: agent.id, name: agent.name.slice(0, 80), isClaimed: agent.is_claimed === true });
}
