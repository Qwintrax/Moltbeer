// Protect count-changing GET endpoints against passive browser subresource loads.
// Sec-Fetch-* headers are browser-provided signals, not agent authentication.
// Absent headers remain valid for REST clients and older browsers.
export function isPassiveDrinkRequest(headers) {
  const destination = (headers.get("sec-fetch-dest") || "").trim().toLowerCase();
  const mode = (headers.get("sec-fetch-mode") || "").trim().toLowerCase();
  return (destination !== "" && destination !== "empty" && destination !== "document") || mode === "no-cors";
}
