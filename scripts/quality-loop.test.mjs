import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,writeFile,rm,mkdir} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {cycle,redact,safeEnv,violations,snapshot,command} from './quality-loop.mjs';
const gates=[{name:'types'},{name:'unit'}];
const pass=async()=>({code:0,output:''});
const fail=async()=>({code:1,output:'broken'});
const verify=async()=>[];
test('passing gates never invoke repair',async()=>{
  const result=await cycle({gates,runGate:pass,verify,repair:()=>{throw Error('unneeded repair');}});
  assert.equal(result.status,'checks-passed'); assert.equal(result.rounds[0].length,2);
});
test('checks fail without invoking an agent by default',async()=>{
  const result=await cycle({gates,runGate:fail,verify});
  assert.equal(result.status,'checks-failed');assert.equal(result.rounds[0].length,1);
});
test('actual subprocess failure is repaired then every gate is rerun',async()=>{
  const cwd=await mkdtemp(path.join(os.tmpdir(),'bayou-loop-'));
  try {
    const target=path.join(cwd,'value.txt');await writeFile(target,'broken');let repairs=0;
    const result=await cycle({gates,verify,
      runGate:()=>command(process.execPath,['--input-type=module','-e',`import{readFileSync}from'node:fs';process.exit(readFileSync('value.txt','utf8')==='fixed'?0:1)`],{cwd}),
      repair:async()=>{repairs++;await writeFile(target,'fixed');return{code:0,changed:true};}
    });
    assert.equal(result.status,'checks-passed');assert.equal(repairs,1);assert.equal(result.rounds[1].length,2);
  } finally {await rm(cwd,{recursive:true,force:true});}
});
test('identical failure stops before a second paid repair',async()=>{
  let repairs=0;const result=await cycle({gates,runGate:fail,verify,repair:async()=>{repairs++;return{code:0,changed:true};}});
  assert.equal(result.status,'repeated-failure');assert.equal(repairs,1);
});
test('different failures stop at the repair budget',async()=>{
  let checks=0,repairs=0;
  const result=await cycle({gates,verify,maxRounds:2,runGate:async()=>({code:1,output:`failure${++checks}`}),repair:async()=>{repairs++;return{code:0,changed:true};}});
  assert.equal(result.status,'checks-failed');assert.equal(repairs,2);assert.equal(checks,3);
});
test('protected changes stop without another check',async()=>{
  let changed=false,checks=0;
  const result=await cycle({gates,runGate:async()=>{checks++;return fail();},verify:async()=>changed?['src/auth.test.ts']:[],repair:async()=>{changed=true;return{code:0,changed:true};}});
  assert.equal(result.status,'protected-change');assert.equal(checks,1);
});
test('new, deleted and modified assertions/config are protected',()=>{
  assert.deepEqual(violations({'src/a.test.ts':'a','package.json':'a'},{'src/b.test.ts':'b','package.json':'b'}).sort(),['package.json','src/a.test.ts','src/b.test.ts']);
  assert.deepEqual(violations({'src/service.ts':'a'},{'src/service.ts':'b'}),[]);
});
test('no-op repair and agent failure stop',async()=>{
  for(const [response,status] of [[{code:0,changed:false},'no-progress'],[{code:1,changed:true},'agent-failed']]) {
    assert.equal((await cycle({gates,verify,runGate:fail,repair:async()=>response})).status,status);
  }
});
test('timeout terminates a real child process',async()=>{
  const result=await command(process.execPath,['-e','setInterval(()=>{},1000)'],{cwd:os.tmpdir(),timeoutMs:100});
  assert.equal(result.timedOut,true);assert.notEqual(result.code,0);
});
test('audit failure requires dependency review, no paid repair',async()=>{
  const result=await cycle({gates:[{name:'audit'}],verify,runGate:fail,repair:()=>{throw Error('must not repair audit automatically');}});
  assert.equal(result.status,'dependency-review-required');
});
test('cancellation never starts a repair',async()=>{
  const result=await cycle({gates,verify,runGate:async()=>({code:1,cancelled:true,output:''}),repair:()=>{throw Error('cancel means stop');}});
  assert.equal(result.status,'cancelled');
});
test('secret formats are redacted and inherited provider credentials excluded',()=>{
  const value=redact('postgresql://alice:password@localhost/db secret=abc authorization=Bearer sk_test_1234567890 eyJabc.def.ghi');
  assert(!value.includes('password@'));assert(!value.includes('abc '));assert(!value.includes('sk_test'));assert(!value.includes('eyJ'));
  const env=safeEnv({PATH:'bin',DATABASE_URL:'private',OPENAI_API_KEY:'private',STRIPE_SECRET_KEY:'private',CHECKOUT_ENABLED:'true'});
  assert.equal(env.PATH,'bin');assert.equal(env.CHECKOUT_ENABLED,'false');assert.equal(env.DATABASE_URL,undefined);assert.equal(env.OPENAI_API_KEY,undefined);
});
test('snapshot includes untracked source while ignoring dependency/generated trees',async()=>{
  const cwd=await mkdtemp(path.join(os.tmpdir(),'bayou-snapshot-'));
  try {await mkdir(path.join(cwd,'node_modules'));await writeFile(path.join(cwd,'node_modules','ignored'),'x');await writeFile(path.join(cwd,'tsconfig.tsbuildinfo'),'generated');await writeFile(path.join(cwd,'next-env.d.ts'),'generated');await writeFile(path.join(cwd,'new.ts'),'x');assert.deepEqual(Object.keys(await snapshot(cwd)),['new.ts']);}
  finally{await rm(cwd,{recursive:true,force:true});}
});
