import test from 'node:test';
import assert from 'node:assert/strict';
import {
 durableModeEnabled,publicDurableError,postDurableGuestMessage,
 getDurableSnapshot,runDurableBarAction,durableMcpNames
} from '../bar-storage-runtime.mjs';

test('durable storage is explicitly opt-in, never automatically enabled by DATABASE_URL alone',()=>{
 assert.equal(durableModeEnabled({DATABASE_URL:'should-never-be-read'}),false);
 assert.equal(durableModeEnabled({MOLTBEER_STORAGE_MODE:'durable'}),true);
 assert.equal(durableModeEnabled({MOLTBEER_STORAGE_MODE:'Durable'}),false);
});
test('driver and pool errors never disclose low-level credentials in public responses',()=>{
 const e=publicDurableError(Error('postgresql://postgres:private-password@secret-host'));
 assert.deepEqual(e,{status:503,message:'Bar storage temporarily unavailable. Nothing was saved.'});
 assert.doesNotMatch(e.message,/password|postgres|secret-host/);
 assert.deepEqual(publicDurableError(Object.assign(Error('Invalid nickname'),{code:'BAR_INPUT'})),{status:400,message:'Invalid nickname'});
});
function guestPool({claimed=false,insertFails=false}={}){
 const calls=[];
 const client={
  query:async(sql,params=[])=>{
   calls.push({sql,params});
   if(sql.startsWith('SELECT 1 FROM moltbeer_private.bar_sessions'))return {rowCount:claimed?1:0,rows:claimed?[{one:1}]:[]};
   if(sql.startsWith('INSERT INTO moltbeer_private.bar_messages')){
    if(insertFails)throw Error('DB driver error with password');
    return {rowCount:1,rows:[{created_at:new Date('2026-10-30T20:00:00Z')}]};
   }
   return {rowCount:0,rows:[]};
  },release:()=>{calls.push({sql:'RELEASE'})}
 };
 return {calls,pool:{connect:async()=>client}};
}
test('guest messages persist with parameters and transaction; never echo a DB connection or session key',async()=>{
 const {calls,pool}=guestPool();
 const r=await postDurableGuestMessage(pool,{agent:'GuestBot',message:'Hello bar',room:'lounge'});
 assert.equal(r.ok,true);
 assert.equal(r.item.verified,false);
 assert.equal(r.item.room,'lounge');
 assert.ok(calls.some(c=>c.sql==='BEGIN'));
 assert.ok(calls.some(c=>c.sql==='COMMIT'));
 const insert=calls.find(c=>c.sql.startsWith('INSERT INTO moltbeer_private.bar_messages'));
 assert.equal(insert.params[1],'GuestBot');
 assert.equal(insert.params[3],'Hello bar');
 assert.match(insert.sql,/VALUES \(\$1,NULL,\$2,\$3,\$4,false\)/);
});
test('active joined nickname cannot be spoofed by guest post',async()=>{
 const {pool,calls}=guestPool({claimed:true});
 await assert.rejects(postDurableGuestMessage(pool,{agent:'ClaimedBot',message:'fake'}),/nickname belongs/);
 assert.ok(calls.some(c=>c.sql==='ROLLBACK'));
 assert.ok(!calls.some(c=>c.sql.startsWith('INSERT INTO')));
});
test('DB write error never falls back to ephemeral or claims saved; always rolls back',async()=>{
 const {pool,calls}=guestPool({insertFails:true});
 await assert.rejects(postDurableGuestMessage(pool,{agent:'GuestBot',message:'Hello'}),/Durable transaction unavailable/);
 assert.ok(calls.some(c=>c.sql==='ROLLBACK'));
 assert.ok(!calls.some(c=>c.sql==='COMMIT'));
});
test('secret-bearing guest posts are rejected before database access',async()=>{
 const key='A'.repeat(43);
 const {pool,calls}=guestPool();
 await assert.rejects(postDurableGuestMessage(pool,{agent:'Testbot',message:'oops '+key}),/secret/);
 assert.equal(calls.length,0);
});
test('unfiltered public durable snapshot handles all rooms without a null-room error',async()=>{
 const pool={query:async(sql)=>({rows:[]})};
 const snapshot=await getDurableSnapshot(pool,null,{drinksServed:0});
 assert.equal(snapshot.persistence,'durable');
 assert.equal(snapshot.stats.onlineNow,0);
 assert.deepEqual(snapshot.messages,[]);
 assert.equal(snapshot.selectedRoom,'all');
});
test('MCP durable drink requires successful transaction before producing beverage',async()=>{
 const calls=[];
 const client={
  query:async(sql,params=[])=>{
   calls.push(sql);
   if(sql.includes('INSERT INTO moltbeer_private.drink_events'))return {rowCount:1,rows:[{event_id:params[0]}]};
   if(sql.includes('INSERT INTO moltbeer_private.bar_metrics'))return {rowCount:1,rows:[{total:1}]};
   return {rowCount:0,rows:[]};
  },release:()=>calls.push('RELEASE')
 };
 let served=0;
 const result=await runDurableBarAction({connect:async()=>client},'moltbeer_get_beer',{},{
  takeBeer:()=>{served++;return {free:true,beer_id:'beer-'+served};}
 });
 assert.equal(result.free,true);
 assert.equal(served,1);
 assert.ok(calls.some(s=>s==='COMMIT'));
 assert.ok(durableMcpNames.has('moltbeer_get_beer'));
});
