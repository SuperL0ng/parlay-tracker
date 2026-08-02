#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Hub{
  constructor(){this.listeners=new Map()}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list)}
  removeEventListener(type,fn){const list=this.listeners.get(type)||[];this.listeners.set(type,list.filter(item=>item!==fn))}
  count(type){return (this.listeners.get(type)||[]).length}
  dispatchEvent(event){for(const fn of [...(this.listeners.get(event.type)||[])])fn.call(this,event);return true}
}
const classList=()=>{const set=new Set();return{add:(...v)=>v.forEach(x=>set.add(x)),remove:(...v)=>v.forEach(x=>set.delete(x)),contains:v=>set.has(v),toggle(v,on){if(on===undefined? !set.has(v):on)set.add(v);else set.delete(v)}}};
const element=()=>Object.assign(new Hub(),{classList:classList(),value:'',textContent:'',innerHTML:''});
const ids=['ticketShareBackdrop','ticketShareCancel','ticketSharePrimary','ticketShareTitle','ticketShareHelp','ticketShareInput','ticketImportSportsbook','ticketShareStatus','ticketSharePreview','ticketShareModal'];
const elements=new Map(ids.map(id=>[id,element()]));
const win=new Hub();
Object.assign(globalThis,win);
globalThis.window=globalThis;
const documentHub=new Hub();
globalThis.document={body:{classList:classList()},getElementById:id=>elements.get(id)||null,addEventListener:documentHub.addEventListener.bind(documentHub),removeEventListener:documentHub.removeEventListener.bind(documentHub)};
globalThis.location={href:'https://example.test/',hash:''};
globalThis.history={replaceState(){}};
globalThis.CustomEvent=class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}};
const source=readFileSync(new URL('../app/src/scripts/sharing-controller.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'sharing-controller.js'});

{
  const controller=new globalThis.SharingController({storage:{}});
  let consumed=0;controller.consumeHash=()=>{consumed++;return false};
  controller.start();controller.start();
  assert.equal(consumed,0,'Sharing startup must not own hash routing; AppController is the sole hash consumer');
  assert.equal(elements.get('ticketShareBackdrop').count('click'),1,'Sharing startup must be idempotent');
  assert.equal(elements.get('ticketSharePrimary').count('click'),1,'Primary import listener must be registered once');
  assert.equal(typeof controller.stop,'function','Sharing controller must expose teardown');
  controller.stop();
  assert.equal(elements.get('ticketShareBackdrop').count('click'),0,'Sharing teardown must remove listeners');
}

{
  let upserted=null,dispatched=null;
  const storage={
    makeId:()=> 'collision-id',
    upsert(record){upserted=record;return{...record,id:'storage-owned-id'}}
  };
  const controller=new globalThis.SharingController({storage});
  controller.pending={ticket:{title:'+100',date:'20260718',type:'straight',legs:[{type:'ml'}]},sportsbook:''};
  globalThis.dispatchEvent=event=>{dispatched=event;return true};
  controller.primary();
  assert.ok(upserted&&!Object.hasOwn(upserted,'id'),'Import must let storage allocate collision-safe ticket identity');
  assert.equal(dispatched?.detail?.id,'storage-owned-id','Import event must publish the ID returned by storage');
}

{
  const controller=new globalThis.SharingController({storage:{}});
  location.hash='';
  assert.equal(controller.consumeHash(),false,'consumeHash must report when no shared ticket was consumed');
}

{
  const controller=new globalThis.SharingController({storage:{}}),ticket={title:'＋250',date:'20260718',type:'straight',league:'MLB',game:'ATL@STL',legs:[{label:'Acuña 1+ H',type:'player_hits',team:'ATL',player:'Ronald Acuña Jr.',target:1}]};
  assert.deepEqual(controller.decode(controller.encode(ticket)),ticket,'Share-code encoding must round-trip canonical Unicode ticket data');
  assert.throws(()=>controller.parseTicket('{title:"+100",date:"20260718",type:"straight",legs:[{type:"ml"}],__proto__:{polluted:true}}'),/Unsupported property/,'Untrusted imports must reject prototype-mutating properties');
}

console.log('Sharing controller contract passed.');
