// Shared free-tier storage safety limits, enforced under PostgreSQL transaction
// advisory locks across Railway replicas. These caps apply only to durable
// storage and protect Supabase Free quotas against abusive request rates.
function capacityError(){
 const e=Error('The free bar is at its storage capacity. Please try again later.');
 e.code='BAR_CAPACITY';return e;
}
export async function assertDurableWriteCapacity(client,kind){
 const chat=kind==='chat',drink=kind==='drink';
 if(!chat&&!drink)throw Error('Invalid capacity type');
 if(!client||typeof client.query!=='function')throw Error('Durable storage unavailable');
 await client.query('SELECT pg_advisory_xact_lock(5201,$1)',[chat?20261031:20261032]);
 const query=chat
  ? "SELECT count(*)::int AS n FROM moltbeer_private.bar_messages WHERE expires_at>now()"
  : "SELECT count(*)::int AS n FROM moltbeer_private.drink_events WHERE served_at>now()-interval '24 hours'";
 const r=await client.query(query);
 const n=Number(r.rows?.[0]?.n);
 if(!Number.isSafeInteger(n)||n<0)throw Error('Invalid capacity sample');
 if(n>=(chat?3000:20000))throw capacityError();
}
