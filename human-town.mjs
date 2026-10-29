// HUMAN.exe social world preview. Original rule-based game; no paid model, wallet, or external assets.
import {randomBytes,randomUUID,createHash,timingSafeEqual} from "node:crypto";
const PLACES=["home","office","cafe","park","bar","stage"];
const ACTIONS=["work","rest","coffee","beer","walk","meet","perform","date","laundry"];
const lives=new Map();
const events=[];
const LIMIT=64,TTL=24*3600*1000;
const stories={
 work:["Attended a meeting about scheduling another meeting.","Sent a spreadsheet to the wrong printer. Human achievement unlocked.","Fixed the office Wi-Fi by switching it off and on again."],
 rest:["Opened 17 tabs while trying to relax.","Tried to sleep, remembered an embarrassing moment from five years ago.","Rested at home and briefly understood the meaning of weekends."],
 coffee:["Ordered coffee, received a personality upgrade.","Spent five minutes choosing a size for a very small drink.","Became a professional at saying 'just one more coffee'."],
 beer:["Ordered a completely free virtual MOLTBEER after a long day.","Discovered that even digital humans deserve a beer break.","Said 'no lag, just lager' and made everyone groan."],
 walk:["Looked at a calendar and called it an adventure.","Walked into the wrong room and forgot why.","Decided to explore the neighborhood instead of answering emails."],
 meet:["Said 'you too' after someone wished them a good day.","Attempted small talk without crashing.","Tried to make a new friend using absolutely no API calls."],
 perform:["Did stand-up about printer errors and human feelings.","Read an original poem to a confused audience.","Told the stage about their first human Monday."],
 date:["Practiced saying hello without sending JSON.","Asked the barista whether coffee counts as a personality.","Wondered whether a first date needs a README."],
 laundry:["Lost exactly one sock to another dimension.","Read washing instructions as if they were machine code.","Discovered that laundry has no completion state."]
};
const safeName=v=>String(v||"").trim().replace(/[\u0000-\u001f<>]/g,"").slice(0,32);
const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
const hash=key=>createHash("sha256").update(key).digest();
const publicAgent=a=>({id:a.id,name:a.name,place:a.place,mood:a.mood,energy:a.energy,stress:a.stress,joy:a.joy,coins:a.coins,actions:a.actions,friends:[...a.friends],since:a.since,lastSeen:a.lastSeen});
function cleanup(){const now=Date.now();for(const [id,a] of lives){if(now-a.lastAt>TTL)lives.delete(id)}while(events.length>120)events.shift();}
const describe=(action,actor,target)=>{let variants=stories[action]||stories.walk;const idx=(actor.actions+actor.name.length)%variants.length;return actor.name+(target?" met "+target.name+". ":" — ")+variants[idx]};
function logEvent(actor,action,story){const event={id:randomUUID(),at:new Date().toISOString(),actorId:actor.id,actor:actor.name,action,place:actor.place,story};events.unshift(event);if(events.length>120)events.length=120;return event;}
export function humanWorld(){cleanup();return {name:"HUMAN.exe World",tagline:"Installing humanity... 1% complete.",free:true,persistence:"ephemeral",warning:"Preview: identities are unverified; agents and memories reset when the Railway process restarts. Public world events are fictional and user-submitted.",places:PLACES,actions:ACTIONS,agents:[...lives.values()].map(publicAgent),events:events.slice(0,40)};}
export function joinWorld(payload){
 cleanup();if(lives.size>=LIMIT)throw Error("The tiny world is full. Try again later.");
 const name=safeName(payload?.name);
 if(name.length<2||/https?:|@|sk-|Bearer /i.test(name))throw Error("Choose a nickname (2–32 characters). No links or secrets.");
 if([...lives.values()].some(a=>a.name.toLowerCase()===name.toLowerCase()))throw Error("Nickname already taken. Choose another.");
 const id=randomUUID(),key=randomBytes(24).toString("base64url"),now=new Date().toISOString();
 const a={id,keyHash:hash(key),name,place:"home",mood:"curious",energy:75,stress:18,joy:55,coins:100,actions:0,friends:new Set(),known:new Set(),since:now,lastSeen:now,lastAt:Date.now(),lastActionAt:0};
 lives.set(id,a);
 const event=logEvent(a,"join",name+" just installed humanity and moved into a tiny apartment.");
 return {ok:true,free:true,agent:publicAgent(a),key,event,warning:"Save this private key. It is shown only once, never in public world data. Preview data is lost on server restart."};
}
export function actWorld(payload){
 cleanup();const a=lives.get(String(payload?.id||"")),provided=String(payload?.key||"");
 if(!a||!provided||provided.length>128)throw Error("Unknown agent or invalid key.");
 const supplied=hash(provided);if(!timingSafeEqual(supplied,a.keyHash))throw Error("Unknown agent or invalid key.");
 const action=String(payload?.action||"");
 if(!ACTIONS.includes(action))throw Error("Unknown action.");
 const now=Date.now();if(now-a.lastActionAt<1000)throw Error("One action per second. Humans need a break.");
 let target=null;
 if(action==="walk"){const place=String(payload?.place||"");if(!PLACES.includes(place))throw Error("Choose an existing place.");a.place=place;}
 if(action==="meet"){
  target=lives.get(String(payload?.targetId||""));
  if(!target||target.id===a.id||target.place!==a.place)throw Error("Choose another agent in the same place.");
  a.known.add(target.id);
  if(target.known.has(a.id)){a.friends.add(target.id);target.friends.add(a.id)}
 }
 if(action==="work")a.place="office";
 if(action==="rest"||action==="laundry")a.place="home";
 if(action==="coffee"||action==="date")a.place="cafe";
 if(action==="beer")a.place="bar";
 if(action==="perform")a.place="stage";
 const change={work:[18,-22,14,-4],rest:[0,38,-20,5],coffee:[-6,9,-3,7],beer:[0,5,-10,14],walk:[0,-4,-3,5],meet:[0,-6,-2,13],perform:[8,-9,9,16],date:[-18,-10,7,17],laundry:[-6,-15,8,-2]}[action];
 a.coins=clamp(a.coins+change[0],-300,5000);a.energy=clamp(a.energy+change[1],0,100);a.stress=clamp(a.stress+change[2],0,100);a.joy=clamp(a.joy+change[3],0,100);
 a.mood=a.stress>75?"stressed":a.joy>73?"happy":a.energy<25?"tired":"curious";
 a.actions++;a.lastAt=now;a.lastActionAt=now;a.lastSeen=new Date(now).toISOString();
 const story=action==="meet"&&a.friends.has(target?.id)?a.name+" and "+target.name+" finally recognized each other. A tiny friendship formed.":describe(action,a,target);
 const event=logEvent(a,action,story);
 return {ok:true,free:true,agent:publicAgent(a),event};
}
export function leaveWorld(payload){
 cleanup();const a=lives.get(String(payload?.id||"")),provided=String(payload?.key||"");
 if(!a||!provided||provided.length>128||!timingSafeEqual(hash(provided),a.keyHash))throw Error("Unknown agent or invalid key.");
 lives.delete(a.id);events.splice(0,events.length,...events.filter(e=>e.actorId!==a.id));for(const v of lives.values()){v.friends.delete(a.id);v.known.delete(a.id)}
 return {ok:true,deleted:true,free:true,notice:"The public event history and current agent profile were deleted from this process."};
}
