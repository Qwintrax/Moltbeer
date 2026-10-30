// Explicit, read-only diagnostic. Does not run on server startup or enable durable mode.
// Run only in a trusted environment with DATABASE_URL set privately.
import {Pool} from 'pg';
import {createPrivateDatabasePool} from '../bar-storage-pool.mjs';
let pool;
try{
 pool=await createPrivateDatabasePool({PoolClass:Pool});
 const result=await pool.query(`SELECT
   (SELECT count(*)::int FROM moltbeer_private.bar_sessions) AS sessions,
   (SELECT count(*)::int FROM moltbeer_private.bar_messages) AS messages,
   (SELECT count(*)::int FROM moltbeer_private.drink_events) AS drink_events`);
 if(result.rowCount!==1)throw Error('Read-only verification failed');
 console.log('MOLTBEER private PostgreSQL read-only probe: OK (no writes performed).');
}catch{
 console.error('MOLTBEER private PostgreSQL read-only probe: FAILED (no credentials logged).');
 process.exitCode=1;
}finally{
 if(pool)try{await pool.end()}catch{}
}
