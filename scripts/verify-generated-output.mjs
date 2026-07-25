#!/usr/bin/env node
import assert from 'node:assert/strict';
import {createHash} from 'node:crypto';
import {cp, mkdtemp, readdir, readFile, rm, stat} from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawn} from 'node:child_process';

const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');

function run(command,args,cwd){
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd,stdio:'inherit',shell:false});
    child.on('error',reject);
    child.on('exit',code=>code===0?resolve():reject(new Error(`${command} ${args.join(' ')} exited with ${code}`)));
  });
}

async function files(dir,base=dir){
  const out=[];
  for(const name of (await readdir(dir)).sort()){
    const full=path.join(dir,name),info=await stat(full);
    if(info.isDirectory())out.push(...await files(full,base));
    else out.push(path.relative(base,full));
  }
  return out;
}

async function digestTree(dir){
  const list=await files(dir),hash=createHash('sha256');
  for(const relative of list){
    hash.update(relative);hash.update('\0');hash.update(await readFile(path.join(dir,relative)));hash.update('\0');
  }
  return{list,digest:hash.digest('hex')};
}

const temp=await mkdtemp(path.join(os.tmpdir(),'parlay-build-'));
try{
  await run(process.execPath,['scripts/build-static.mjs'],root);
  const first=path.join(temp,'first');await cp(path.join(root,'build'),first,{recursive:true});
  await run(process.execPath,['scripts/build-static.mjs'],root);
  const second=path.join(root,'build');
  const left=await digestTree(first),right=await digestTree(second);
  assert.deepEqual(right.list,left.list,'Generated file list changed between identical builds');
  assert.equal(right.digest,left.digest,'Generated file contents changed between identical builds');
  for(const build of ['gold','silver']){
    const html=await readFile(path.join(second,build,'index.html'),'utf8');
    assert.match(html,/ticket-state-model\.js/,'Generated build must include the normalized ticket state model');
    assert.doesNotMatch(html,/\{\{[A-Z_]+\}\}/,'Generated build contains unresolved template tokens');
  }
  console.log(`Generated output is deterministic: ${right.digest}`);
}finally{await rm(temp,{recursive:true,force:true});}
