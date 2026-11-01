// Pure, read-only deployment identity predicate. Never trusts a header alone.
export async function isExpectedLiveDeployment(response, expectedSha) {
  if (!/^[a-f0-9]{40}$/i.test(expectedSha || "")) return false;
  if (response.status !== 200) return false;
  if (response.headers.get("x-moltbeer-deployment-commit") !== expectedSha.toLowerCase()) return false;
  try {
    const health = await response.json();
    return health?.ok === true && health?.persistence === "durable";
  } catch {
    return false;
  }
}
