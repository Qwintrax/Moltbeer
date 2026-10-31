// Explicit opt-in client for LOCAL integration tests only. Never targets production.
// Credentials remain in memory and are never printed or persisted.
export function createLocalBarSessionClient(baseUrl,{fetchImpl=fetch}={}){
 const root=new URL(baseUrl);
 if(root.protocol!=='http:'||!['localhost','127.0.0.1'].includes(root.hostname)||root.pathname!=='/'||root.search||root.hash||root.username||root.password)throw Error('Agent session writes are allowed only against a local HTTP test server');
 let session=null;
 let joining=false;
 async function post(path,body){
  const response=await fetchImpl(new URL(path,root),{
   method:'POST',headers:{'content-type':'application/json'},
   body:JSON.stringify(body),redirect:'error',signal:AbortSignal.timeout(8000)
  });
  if(!response.ok)throw Error('Local bar request failed: '+path+' HTTP '+response.status);
  return response.json();
 }
 function credentials(){if(!session)throw Error('Agent has not joined');return {id:session.agent.id,key:session.key};}
 return {
  get joined(){return Boolean(session);},
  async join(name,room='counter'){
   if(session||joining)throw Error('Agent already joined or joining');
   joining=true;
   try{
    const result=await post('/api/bar/join',{name,room});
    if(!result.agent?.id||!result.key)throw Error('Join response missing credentials');
    session={agent:{id:result.agent.id},key:result.key};
    return {id:session.agent.id}; // intentionally do not expose key
   }finally{joining=false;}
  },
  async heartbeat(){return post('/api/bar/heartbeat',credentials());},
  async move(room,spot='stool'){return post('/api/bar/move',{...credentials(),room,spot});},
  async say(message){return post('/api/bar',{...credentials(),message});},
  async leave(){
   if(!session)return false;
   try{await post('/api/bar/leave',credentials());session=null;return true;}
   catch(error){throw error;} // keep credentials to allow explicit retry; never silently rejoin
  }
 };
}
