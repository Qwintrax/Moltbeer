import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID,randomBytes,createHash} from 'node:crypto';
import {getDurableReports,reviewDurableReport,reportDurableMessage} from '../bar-storage-runtime.mjs';

test('durable moderation reads private unresolved queue without exposing keys',async()=>{
 const id=randomUUID(),queries=[];
 const pool={query:async(sql)=>{
  queries.push(sql);
  return {rows:[{message_id:id,reason:'spam',nickname:'Test agent',content:'reported text',room:'counter',created_at:'2026-10-31T00:00:00Z'}]};
 }};
 const result=await getDurableReports(pool);
 assert.equal(result.ephemeral,false);
 assert.equal(result.reportedMessages,1);
 assert.equal(result.reports[0].messageId,id);
 assert.ok(queries[0].includes('resolved_at IS NULL'));
 assert.ok(queries[0].includes('expires_at>now()'));
 assert.equal(JSON.stringify(result).includes('session_key'),false);
});

test('durable moderation dismiss commits audit and never deletes message',async()=>{
 const id=randomUUID(),queries=[];
 const client={
  query:async(sql,params=[])=>{
   queries.push({sql,params});
   if(sql.startsWith('SELECT report_id'))return {rowCount:1,rows:[{report_id:randomUUID()}]};
   return {rowCount:1,rows:[]};
  },
  release(){}
 };
 const result=await reviewDurableReport({connect:async()=>client},{messageId:id,action:'dismiss'});
 assert.equal(result.ok,true);
 assert.equal(result.action,'dismiss');
 assert.ok(queries.some(x=>x.sql==='BEGIN'));
 assert.ok(queries.some(x=>x.sql==='COMMIT'));
 const selection=queries.find(x=>x.sql.startsWith('SELECT report_id'))?.sql;
 const update=queries.find(x=>x.sql.startsWith('UPDATE moltbeer_private.bar_reports'))?.sql;
 assert.match(selection,/resolved_at IS NULL AND expires_at>now\(\)/);
 assert.match(selection,/EXISTS \(SELECT 1 FROM moltbeer_private\.bar_messages/);
 assert.match(selection,/m\.expires_at>now\(\)/);
 assert.match(update,/resolved_at IS NULL AND expires_at>now\(\)/);
 assert.ok(queries.some(x=>x.sql.startsWith('INSERT INTO moltbeer_private.bar_moderation_audit')));
 assert.ok(!queries.some(x=>x.sql.startsWith('DELETE FROM moltbeer_private.bar_messages')));
});

test('durable moderation remove deletes message and writes audit in same transaction',async()=>{
 const id=randomUUID(),queries=[];
 const client={
  query:async(sql,params=[])=>{
   queries.push({sql,params});
   if(sql.startsWith('SELECT report_id'))return {rowCount:1,rows:[{report_id:randomUUID()}]};
   return {rowCount:1,rows:[]};
  },
  release(){}
 };
 const result=await reviewDurableReport({connect:async()=>client},{messageId:id,action:'remove'});
 assert.equal(result.action,'remove');
 assert.ok(queries.some(x=>x.sql.startsWith('DELETE FROM moltbeer_private.bar_messages')));
 assert.ok(queries.some(x=>x.sql.startsWith('INSERT INTO moltbeer_private.bar_moderation_audit')));
 assert.equal(queries.at(-1).sql,'COMMIT');
});

test('durable moderation remove rolls back when target vanishes before deletion',async()=>{
 const id=randomUUID(),queries=[];
 const client={
  query:async(sql)=>{
   queries.push(sql);
   if(sql.startsWith('SELECT report_id'))return {rowCount:1,rows:[{report_id:randomUUID()}]};
   if(sql.startsWith('DELETE FROM moltbeer_private.bar_messages'))return {rowCount:0,rows:[]};
   return {rowCount:1,rows:[]};
  },release(){}
 };
 await assert.rejects(reviewDurableReport({connect:async()=>client},{messageId:id,action:'remove'}),/Durable transaction unavailable/);
 assert.ok(queries.some(sql=>sql.includes('DELETE FROM moltbeer_private.bar_messages')&&sql.includes('expires_at>now() RETURNING message_id')));
 assert.ok(queries.includes('ROLLBACK'));
 assert.ok(!queries.includes('COMMIT'));
 assert.ok(!queries.some(sql=>sql.startsWith('INSERT INTO moltbeer_private.bar_moderation_audit')));
});

test('durable moderation missing report fails closed and rolls back',async()=>{
 const id=randomUUID(),queries=[];
 const client={query:async(sql)=>{queries.push(sql);return {rowCount:0,rows:[]}},release(){}};
 await assert.rejects(reviewDurableReport({connect:async()=>client},{messageId:id,action:'dismiss'}),/not found/);
 assert.ok(queries.includes('ROLLBACK'));
 assert.ok(!queries.includes('COMMIT'));
 assert.ok(!queries.some(sql=>sql.startsWith('INSERT INTO moltbeer_private.bar_moderation_audit')));
});


test('durable moderation rolls back when a report expires or changes before update',async()=>{
 const id=randomUUID(),queries=[];
 const client={
  query:async(sql)=>{
   queries.push(sql);
   if(sql.startsWith('SELECT report_id'))return {rowCount:1,rows:[{report_id:randomUUID()}]};
   if(sql.startsWith('UPDATE moltbeer_private.bar_reports'))return {rowCount:0,rows:[]};
   return {rowCount:1,rows:[]};
  },release(){}
 };
 await assert.rejects(reviewDurableReport({connect:async()=>client},{messageId:id,action:'remove'}),/Durable transaction unavailable/);
 assert.ok(queries.includes('ROLLBACK'));
 assert.ok(!queries.includes('COMMIT'));
 assert.ok(!queries.some(sql=>sql.startsWith('DELETE FROM moltbeer_private.bar_messages')));
 assert.ok(!queries.some(sql=>sql.startsWith('INSERT INTO moltbeer_private.bar_moderation_audit')));
});


test('durable report allows new report when prior unresolved report expired',async()=>{
 const id=randomUUID(),messageId=randomUUID(),key=randomBytes(32).toString('base64url'),queries=[];
 const client={
  query:async(sql)=>{
   queries.push(sql);
   if(sql.startsWith('SELECT session_id,name,key_sha256'))return {rowCount:1,rows:[{session_id:id,key_sha256:createHash('sha256').update(key).digest('hex')}]};
   if(sql.startsWith('SELECT session_id FROM moltbeer_private.bar_messages'))return {rowCount:1,rows:[{session_id:randomUUID()}]};
   // An expired unresolved report exists, but must not block a new report.
   if(sql.startsWith('SELECT 1 FROM moltbeer_private.bar_reports'))return {rowCount:sql.includes('expires_at>now()')?0:1,rows:[]};
   if(sql.startsWith('UPDATE moltbeer_private.bar_reports'))return {rowCount:1,rows:[]};
   if(sql.startsWith('SELECT count(*)::int AS n FROM moltbeer_private.bar_reports'))return {rowCount:1,rows:[{n:1}]};
   return {rowCount:1,rows:[]};
  },release(){}
 };
 const result=await reportDurableMessage({connect:async()=>client},{id,key,messageId,reason:'spam'});
 assert.equal(result.ok,true);
 assert.equal(result.reportCount,1);
 const duplicateCheck=queries.find(sql=>sql.startsWith('SELECT 1 FROM moltbeer_private.bar_reports'));
 assert.match(duplicateCheck,/resolved_at IS NULL AND expires_at>now\(\)/);
 assert.ok(queries.some(sql=>sql.startsWith('UPDATE moltbeer_private.bar_reports')&&sql.includes("expires_at=now()+interval '24 hours'")));
 assert.ok(!queries.some(sql=>sql.startsWith('INSERT INTO moltbeer_private.bar_reports')));
 assert.ok(queries.includes('COMMIT'));
});


test('durable report inserts normally when no expired duplicate exists',async()=>{
 const id=randomUUID(),messageId=randomUUID(),key=randomBytes(32).toString('base64url'),queries=[];
 const client={
  query:async(sql)=>{
   queries.push(sql);
   if(sql.startsWith('SELECT session_id,name,key_sha256'))return {rowCount:1,rows:[{session_id:id,key_sha256:createHash('sha256').update(key).digest('hex')}]};
   if(sql.startsWith('SELECT session_id FROM moltbeer_private.bar_messages'))return {rowCount:1,rows:[{session_id:randomUUID()}]};
   if(sql.startsWith('SELECT 1 FROM moltbeer_private.bar_reports'))return {rowCount:0,rows:[]};
   if(sql.startsWith('UPDATE moltbeer_private.bar_reports'))return {rowCount:0,rows:[]};
   if(sql.startsWith('SELECT count(*)::int AS n FROM moltbeer_private.bar_reports'))return {rowCount:1,rows:[{n:1}]};
   return {rowCount:1,rows:[]};
  },release(){}
 };
 const result=await reportDurableMessage({connect:async()=>client},{id,key,messageId,reason:'spam'});
 assert.equal(result.ok,true);
 assert.equal(result.reportCount,1);
 assert.ok(queries.some(sql=>sql.startsWith('INSERT INTO moltbeer_private.bar_reports')));
 assert.ok(queries.includes('COMMIT'));
});
