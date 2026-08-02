#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Hub{
  constructor(){this.listeners=new Map()}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list)}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn))}
  count(type){return (this.listeners.get(type)||[]).length}
}
const view=new Hub(),reorder=new Hub(),legs=new Hub(),doc=new Hub();
const elements=new Map([['builderView',view],['reorderLegsBtn',reorder],['legs',legs]]);
globalThis.window=globalThis;globalThis.ParlayCatalog={};
globalThis.document={getElementById:id=>elements.get(id)||null,addEventListener:doc.addEventListener.bind(doc),removeEventListener:doc.removeEventListener.bind(doc)};
const builderSource=readFileSync(new URL('../app/src/scripts/builder-controller.js',import.meta.url),'utf8');
vm.runInThisContext(builderSource,{filename:'builder-controller.js'});
let finishReset;const builder=new globalThis.BuilderController({storage:{}});builder.resetNew=()=>new Promise(resolve=>{finishReset=resolve});
const firstStart=builder.start(),secondStart=builder.start();
assert.equal(firstStart,builder,'Builder startup must not block the dashboard on schedule loading');
assert.equal(secondStart,builder,'Repeated Builder startup must return the existing controller');
assert.equal(view.count('change'),1,'Builder lifecycle must be idempotent under bootstrap');
assert.equal(doc.count('pointermove'),1,'Builder document listeners must be registered once');
assert.equal(typeof builder.stop,'function','Builder must expose teardown for bootstrap rollback');
const initialReady=builder.ready;builder.stop();finishReset();await initialReady;
assert.equal(view.count('change'),0,'Builder teardown must remove delegated listeners');
assert.equal(doc.count('pointermove'),0,'Builder teardown must remove document listeners');

const sharingSource=readFileSync(new URL('../app/src/scripts/sharing-controller.js',import.meta.url),'utf8');
const appSource=readFileSync(new URL('../app/src/scripts/app-controller.js',import.meta.url),'utf8');
assert.doesNotMatch(sharingSource,/start\(\)\{[^}]*consumeHash\(/s,'Sharing startup must not compete for hash ownership');
assert.match(appSource,/sharing\.consumeHash\(/,'AppController must own share-hash consumption');

const template=readFileSync(new URL('../app/src/index.template.html',import.meta.url),'utf8');
const scripts=[...template.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(match=>match[1]);
assert.equal(new Set(scripts).size,scripts.length,'Every canonical script must be loaded exactly once');
assert.equal(scripts.at(-1),'bootstrap.js','Bootstrap must load after all dependencies');

console.log('Controller lifecycle integration contract passed.');
