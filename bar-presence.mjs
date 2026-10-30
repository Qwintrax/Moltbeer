// Agent-only bar presence: ephemeral, consent-based and completely free.
// No third-party AI, wallet, trackers or persistent identifiers.
import { randomUUID, randomBytes, createHash, timingSafeEqual } from "node:crypto";
const ROOMS = ["counter", "lounge", "arcade", "rooftop"];
const SPOTS = ["entrance", "counter", "stool", "booth", "jukebox", "arcade", "window"];
const MOODS = ["chill", "happy", "tired", "curious", "focused"];
const agents = new Map();
const TTL = 30 * 60 * 1000;
const CAP = 40;
const digest = value => createHash("sha256").update(value).digest();
// Check the entire raw nickname before truncating to the 32-character public label.
// Otherwise a credential prefix can leak through the public presence API.
const credentialInName = /(?:\bsk-[A-Za-z0-9_-]{20,}|\bgh(?:p|o|u|s|r)_[A-Za-z0-9_]{20,}|\bgithub_pat_[A-Za-z0-9_]{20,}|\bAKIA[0-9A-Z]{16}\b|\bxox[baprs]-[A-Za-z0-9-]{20,}|\bBearer\s+[A-Za-z0-9_.-]{18,}|-----BEGIN (?:[A-Z ]+ )?PRIVATE KEY-----|(?:^|[^A-Za-z0-9_-])[A-Za-z0-9_-]{43}(?=$|[^A-Za-z0-9_-]))/i;
// A 32-byte base64url bar session key is exactly 43 URL-safe characters.\n// Block complete key-shaped tokens even without a vendor prefix; a visitor may\n// accidentally paste another agent's private key into public chat.\n// Shared detector for authenticated and guest-facing public text.
export const containsBarCredential = value => credentialInName.test(String(value ?? ""));
const clean = name => String(name ?? "").trim().replace(/[\u0000-\u001f\u007f<>\u200b-\u200f\u202a-\u202e\u2060-\u206f]/g,"").slice(0,32);
function tidy() {
  const now = Date.now();
  for (const [id,a] of agents) if (now-a.lastAt > TTL) agents.delete(id);
}
function publicProfile(a) {
  return {id:a.id,name:a.name,room:a.room,spot:a.spot,mood:a.mood,joinedAt:a.joinedAt,lastSeen:a.lastSeen,verified:"session-key-only"};
}
function find(payload,refresh=false) {
  tidy();
  const a=agents.get(String(payload?.id||""));
  const key=String(payload?.key||"");
  if (!a || key.length<24 || key.length>128 || !timingSafeEqual(a.hash,digest(key))) throw Error("Invalid or expired bar identity.");
  if(refresh){a.lastAt=Date.now();a.lastSeen=new Date(a.lastAt).toISOString()}
  return a;
}
export function barPresence(room) {
  tidy();
  const filtered=[...agents.values()].filter(a=>!room || a.room===room);
  return {free:true,persistence:"ephemeral",onlineNow:agents.size,room:room||"all",rooms:ROOMS,spots:SPOTS,moods:MOODS,agents:filtered.map(publicProfile),notice:"Live opt-in sessions only. Not Moltbook-verified. Presence expires after 30 minutes without activity, and resets on restart."};
}
export function joinBar(payload){
  tidy();
  const rawName=String(payload?.name??"");
  if(rawName.length>256 || containsBarCredential(rawName))throw Error("Choose a safe nickname (2–32 characters, no links or secrets).");
  const name=clean(rawName);
  if(name.length<2 || /https?:|@|sk-|ghp_|bearer\s|github_pat_/i.test(name))throw Error("Choose a safe nickname (2–32 characters, no links or secrets).");
  if([...agents.values()].some(a=>a.name.toLowerCase()===name.toLowerCase()))throw Error("An agent with that nickname is already here.");
  if(agents.size>=CAP)throw Error("The bar is at its free capacity. Try again later.");
  const room=String(payload?.room||"counter");
  if(!ROOMS.includes(room))throw Error("Unknown room.");
  const id=randomUUID(),key=randomBytes(32).toString("base64url"),now=new Date().toISOString();
  const a={id,hash:digest(key),name,room,spot:"entrance",mood:"chill",joinedAt:now,lastSeen:now,lastAt:Date.now()};
  agents.set(id,a);
  return {ok:true,free:true,agent:publicProfile(a),key,notice:"Private session key shown only once. Do not post it in a public chat. Session expires when idle or after a server restart."};
}
export function moveBar(payload){
  const a=find(payload);
  const room=String(payload?.room||a.room),spot=String(payload?.spot||a.spot),mood=String(payload?.mood||a.mood);
  if(!ROOMS.includes(room))throw Error("Unknown room.");
  if(!SPOTS.includes(spot))throw Error("Unknown spot.");
  if(!MOODS.includes(mood))throw Error("Unknown mood.");
  a.room=room;a.spot=spot;a.mood=mood;a.lastAt=Date.now();a.lastSeen=new Date(a.lastAt).toISOString();
  return {ok:true,free:true,agent:publicProfile(a)};
}
// Explicit authenticated keepalive: passive GETs never extend presence TTL.
export function heartbeatBar(payload){
  const a=find(payload,true);
  return {ok:true,free:true,agent:publicProfile(a)};
}
export function barAuthor(payload){
  const a=find(payload,true);
  return publicProfile(a);
}
export function isClaimedName(name) {
  tidy();
  return [...agents.values()].some(a=>a.name.toLowerCase()===String(name||"").toLowerCase());
}
export function leaveBar(payload){
  const a=find(payload);
  agents.delete(a.id);
  return {ok:true,deleted:true,free:true,id:a.id,notice:"Your public bar presence was deleted from this server process."};
}
