#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
const events=[];globalThis.CustomEvent=class{constructor(type,options={}){this.type=type;this.detail=options.detail}};globalThis.dispatchEvent=event=>events.push(event);
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-core.js',import.meta.url),'utf8'),{filename:'tracker-core.js'});
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-service.js',import.meta.url),'utf8'),{filename:'tracker-service.js'});
const TrackerService=globalThis.TrackerService;
const clone=value=>JSON.parse(JSON.stringify(value));

function storageFor(initial){let data=clone(initial);return{clone,load:()=>clone(data),save:records=>(data=clone(records),clone(data)),get:()=>clone(data),set:value=>{data=clone(value)}}}
const baseRecord={id:'ticket-1',status:'active',ticket:{title:'+100',date:'20260718',league:'MLB',game:'TB@BOS',legs:[{label:'TB ML',type:'ml',team:'TB'}]}};

{
  const storage=storageFor([baseRecord,{...clone(baseRecord),id:'ticket-2'}]);
  const evaluator={evaluateRecord:async record=>({...record,__evaluated:[{...record.ticket.legs[0],__live:{state:'live',value:'1-0'},__game:{status:{type:{state:'in',detail:'Top 1st'}},competitions:[]}}]})};
  const service=new TrackerService({storage,sources:{resetTrackingCaches(){},fetchScoreboards:async()=>[]},evaluator,settlement:{reset(){},apply:async record=>record}});
  const detail=await service.refresh({ids:'ticket-1'});
  assert.deepEqual(detail.ids,['ticket-1'],'A scalar requested ticket ID must not be split into characters');
  assert.equal(storage.get()[1].liveOutcome,undefined,'Unrequested tickets must remain untouched');
}

{
  const completed={...clone(baseRecord),status:'completed',autoCompleted:true,liveOutcome:'WON',trackerSnapshot:{outcome:'WON',legs:[]},settledAt:'2026-07-18T20:00:00.000Z'};
  const storage=storageFor([completed]);
  const evaluator={evaluateRecord:async record=>({...record,__evaluated:[{...record.ticket.legs[0],__live:{state:'unavailable',value:'DATA UNAVAILABLE'}}]})};
  const service=new TrackerService({storage,sources:{resetTrackingCaches(){},fetchScoreboards:async()=>[]},evaluator,settlement:{reset(){},apply:async record=>record}});
  await service.refresh();const saved=storage.get()[0];
  assert.equal(saved.status,'completed','A transient data outage must not reopen an auto-completed ticket');
  assert.equal(saved.liveOutcome,'WON','A transient data outage must preserve the last confirmed final outcome');
  assert.equal(saved.settledAt,completed.settledAt,'A transient data outage must preserve a confirmed settlement timestamp');
  assert.ok(saved.trackerUnavailableAt,'The refresh outage must still be recorded explicitly');
}

{
  const storage=storageFor([baseRecord]);
  const evaluator={evaluateRecord:async record=>({...record,__evaluated:[{...record.ticket.legs[0],__live:{state:'win',value:'1/1'}}]})};
  const service=new TrackerService({storage,sources:{resetTrackingCaches(){},fetchScoreboards:async()=>[]},evaluator,settlement:{reset(){},apply:async()=>{throw new Error('ledger down')}}});
  const detail=await service.refresh();const saved=storage.get()[0];
  assert.equal(saved.status,'completed','A confirmed tracker outcome must still auto-complete when timestamp settlement is temporarily unavailable');
  assert.match(saved.settlementError,/ledger down/i,'Settlement failure must be retained for retry and diagnosis');
  assert.equal(detail.errors.length,1,'Per-ticket settlement failure must be reported without aborting the entire refresh');
}

{
  const storage=storageFor([baseRecord]);let release;
  const evaluator={evaluateRecord:record=>new Promise(resolve=>{release=()=>resolve({...record,__evaluated:[{...record.ticket.legs[0],__live:{state:'live',value:'1-0'}}]})})};
  const service=new TrackerService({storage,sources:{resetTrackingCaches(){},fetchScoreboards:async()=>[]},evaluator,settlement:{reset(){},apply:async record=>record}});
  const pending=service.refresh();
  while(!release)await new Promise(resolve=>setTimeout(resolve,0));
  storage.set([{...clone(baseRecord),sportsbook:'FanDuel'},{...clone(baseRecord),id:'ticket-new'}]);
  release();const detail=await pending;const saved=storage.get();
  assert.equal(saved.length,2,'A refresh must not overwrite a ticket added while network work was in progress');
  assert.equal(saved[0].sportsbook,'FanDuel','A refresh must preserve concurrent metadata edits');
  assert.equal(saved[0].liveOutcome,'LIVE','Tracker-owned fields may merge onto an otherwise unchanged ticket');
  assert.equal(detail.skippedStale.length,0);
}

{
  const storage=storageFor([baseRecord]);let release;
  const evaluator={evaluateRecord:record=>new Promise(resolve=>{release=()=>resolve({...record,__evaluated:[{...record.ticket.legs[0],__live:{state:'win',value:'1/1'}}]})})};
  const service=new TrackerService({storage,sources:{resetTrackingCaches(){},fetchScoreboards:async()=>[]},evaluator,settlement:{reset(){},apply:async record=>record}});
  const pending=service.refresh();
  while(!release)await new Promise(resolve=>setTimeout(resolve,0));
  storage.set([{...clone(baseRecord),ticket:{...clone(baseRecord.ticket),title:'+200'}}]);
  release();const detail=await pending;const saved=storage.get()[0];
  assert.equal(saved.ticket.title,'+200');
  assert.equal(saved.liveOutcome,undefined,'A stale refresh result must not attach to a ticket whose wager definition changed');
  assert.deepEqual(detail.skippedStale,['ticket-1']);
}

console.log('Tracker service contract verified.');
