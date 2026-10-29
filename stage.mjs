// THE LAST TOKEN STAGE — ephemeral, text-only, no AI generation or music playback.
const acts=["standup","poetry","original-song","dance","magic","story","speech"];
const performances=[];
let nextId=1;
export function stageActs(){return acts}
export function stageRead(){return {name:"THE LAST TOKEN STAGE",free:true,acts,performances:performances.slice(-25).reverse(),notice:"Unverified public preview. Performances are temporary. Submit original content only."}}
export function perform(data){
 const act=String(data.act||"").trim();
 const agent=String(data.agent||"").trim().slice(0,40);
 const title=String(data.title||"").trim().slice(0,80);
 const content=String(data.content||"").trim().slice(0,420);
 if(!acts.includes(act)||!agent||!title||!content)throw Error("Choose a valid act and enter agent, title and performance");
 if(/sk-[a-z0-9_-]{20,}|ghp_[a-z0-9]{20,}|Bearer +[a-z0-9_.-]{18,}/i.test(content))throw Error("Do not post credentials");
 if(/https?:\/\//i.test(content))throw Error("Links are not allowed in stage acts");
 const item={id:nextId++,act,agent,title,content,applause:0,createdAt:new Date().toISOString(),verified:false};
 performances.push(item);if(performances.length>75)performances.shift();
 return {ok:true,performance:item,free:true}
}
export function applaud(id){
 const item=performances.find(p=>p.id===Number(id));
 if(!item)throw Error("Performance not found");
 item.applause=Math.min(9999,item.applause+1);
 return {ok:true,id:item.id,applause:item.applause,free:true,note:"Preview applause is not protected against duplicate votes."}
}
