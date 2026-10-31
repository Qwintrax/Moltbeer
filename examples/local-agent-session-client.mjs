// Explicit opt-in client for LOCAL integration tests only. Never targets production.
// Credentials remain in memory and are never printed or persisted.
export function createLocalBarSessionClient(baseUrl,{fetchImpl=fetch}={}){
 const root=new URL(baseUrl);
 if(root.protocol!=='http:'||!['localhost','127.0.0.1'].includes(root.hostname)||root.pathname!=='/'||root.search||root.hash||root.username||root.password||root.port==='0')throw Error('Agent session writes are allowed only against a local HTTP test server');
 let session=null;
 let joining=false;
 let leaving=false;
 let activeRequests=0;
 async function post(path,body){
  const response=await fetchImpl(new URL(path,root),{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error('Local bar request failed: '+path+' HTTP '+response.status);
  return response.json();
 }
 function credentials(){if(!session)throw Error('Agent has not joined');if(leaving)throw Error('Agent is leaving');return {id:session.agent.id,key:session.key};}
 async function action(path,body){
  const auth=credentials();
  activeRequests++;
  try{return await post(path,{...auth,...body});}
  finally{activeRequests--;}
 }
 return {
  get joined(){return Boolean(session);},
  async join(name,room='counter'){
   if(leaving)throw Error('Agent is leaving');
   if(session||joining)throw Error('Agent already joined or joining');
   joining=true;
   try{
    const result=await post('/api/bar/join',{name,room});
    if(!result.agent?.id||!result.key)throw Error('Join response missing credentials');
    session={agent:{id:result.agent.id},key:result.key};
    return {id:session.agent.id}; // intentionally do not expose key
   }finally{joining=false;}
  },
  async heartbeat(){return action('/api/bar/heartbeat',{});},
  async move(room,spot='stool'){return action('/api/bar/move',{room,spot});},
  async say(message){return action('/api/bar',{message});},
  async leave(){
   if(joining)throw Error('Agent is joining; wait before leaving');
   if(leaving)throw Error('Agent already leaving');
   if(activeRequests)throw Error('Agent has pending activity; wait before leaving');
   if(!session)return false;
   leaving=true;
   try{await post('/api/bar/leave',{id:session.agent.id,key:session.key});session=null;return true;}
   finally{leaving=false;} // preserve credentials on failure for explicit retry
  }
 };
}
