import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

test('Railway rebuilds for application, startup probes, TLS and assets',()=>{
 const config=JSON.parse(readFileSync(new URL('../railway.json',import.meta.url),'utf8'));
 const paths=config.build.watchPatterns;
 for(const path of ['/*.mjs','/scripts/**','/certs/**','/assets/**','/package.json','/railway.json','/test/**']){
  assert.ok(paths.includes(path),path+' must trigger Railway redeploy');
 }
 assert.equal(config.build.buildCommand,'npm test');
 assert.equal(config.deploy.healthcheckPath,'/health');
 assert.equal(config.deploy.sleepApplication,true);
});
