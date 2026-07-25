#!/usr/bin/env node
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const storageSource=readFileSync(new URL('../app/src/scripts/storage.js',import.meta.url),'utf8');
const stateModelSource=readFileSync(new URL('../app/src/scripts/ticket-state-model.js',import.meta.url),'utf8');
const dashboardSource=readFileSync(new URL('../app/src/scripts/dashboard-controller.js',import.meta.url),'utf8');
const memory=new Map();

globalThis.window=globalThis;
globalThis.localStorage={
  getItem:key=>memory.has(key)?memory.get(key):null,
  setItem:(key,value)=>memory.set(key,String(value)),
  removeItem:key=>memory.delete(key)
};
globalThis.CustomEvent=class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}};
globalThis.dispatchEvent=()=>true;
vm.runInThisContext(storageSource,{filename:'app/src/scripts/storage.js'});
vm.runInThisContext(stateModelSource,{filename:'app/src/scripts/ticket-state-model.js'});

const storage=globalThis.ParlayStorage;
const stateModel=globalThis.ParlayTicketStateModel;
localStorage.setItem(storage.KEY,JSON.stringify([
  {id:'2000',status:'active',savedAt:'2026-07-18T04:00:00Z',ticket:{title:'A',type:'straight',legs:[{type:'ml'}]}},
  {id:'1718',status:'active',savedAt:'2026-07-18T03:00:00Z',ticket:{title:'B',type:'straight',legs:[{type:'ml'}]}},
  {id:'1043',status:'completed',savedAt:'2026-07-18T02:00:00Z',settledAt:'2026-07-18T05:00:00Z',liveOutcome:'WON',ticket:{title:'C',type:'straight',legs:[{type:'ml'}]}},
  {id:'1969',status:'completed',savedAt:'2026-07-18T01:00:00Z',settledAt:'2026-07-18T04:30:00Z',liveOutcome:'LOST',ticket:{title:'D',type:'straight',legs:[{type:'ml'}]}},
  {id:'2000',status:'active',savedAt:'2026-07-18T00:00:00Z',ticket:{title:'Duplicate',type:'straight',legs:[{type:'ml'}]}}
]));

const normalized=storage.load();
const ids=normalized.map(record=>String(record.id));
assert.equal(new Set(ids).size,ids.length,'Duplicate stored ticket IDs must be normalized to unique IDs');
assert.equal(ids[0],'2000','An existing unique ticket ID must remain stable');
assert.equal(ids[1],'1718','An existing unique ticket ID must remain stable');
const updated=storage.update('2000',record=>({...record,id:'must-not-replace-id',ticket:{...record.ticket,title:'Updated'}}));
assert.equal(updated.id,'2000','Storage updates must preserve the original ticket ID');
assert.equal(storage.find('2000').ticket.title,'Updated','Ticket lookup must resolve by stable ID');

const cards=[];
globalThis.document={
  createElement:tag=>{const node={tagName:String(tag).toUpperCase(),dataset:{},className:'',innerHTML:''};cards.push(node);return node;}
};
vm.runInThisContext(dashboardSource,{filename:'app/src/scripts/dashboard-controller.js'});

const records=storage.load().slice(0,4);
const dashboard=new globalThis.DashboardController({storage:{load:()=>records,find:id=>records.find(record=>String(record.id)===String(id))||null},tracker:{},stateModel,root:{},status:{}});
assert.deepEqual(dashboard.recordsForRender().map(record=>String(record.id)),['2000','1718','1043','1969'],'Default dashboard order must sort by saved time before rendering');
dashboard.state.filter='active';
assert.deepEqual(dashboard.recordsForRender().map(record=>String(record.id)),['2000','1718'],'Active filtering must preserve stable ticket ownership');
dashboard.state.filter='all';dashboard.state.sort='settled';dashboard.state.direction='desc';
assert.deepEqual(dashboard.recordsForRender().map(record=>String(record.id)),['1043','1969'],'Settlement sorting must exclude unsettled tickets and preserve ID ownership');

dashboard.state.sort='saved';dashboard.state.direction='desc';dashboard.state.expandedIds.add('1718');dashboard.state.selectedIds.add('1718');dashboard.state.selectMode=true;
const card=dashboard.ticketCard(records.find(record=>String(record.id)==='1718'));
assert.equal(card.dataset.ticketId,'1718','Rendered card ownership must be bound to the ticket ID');
assert.match(card.innerHTML,/href="#ticket=1718"/,'View links must target the ticket ID');
assert.match(card.innerHTML,/data-ticket-id="1718"/,'Ticket controls must carry the ticket ID');
assert.match(card.innerHTML,/data-ticket-select="1718"/,'Selection controls must carry the ticket ID');
assert.match(card.innerHTML,/checked/,'Selected state must follow the ticket ID after sorting');
assert.doesNotMatch(card.innerHTML,/class="ticketDetails" hidden/,'Expanded state must follow the ticket ID after sorting');
assert.match(dashboardSource,/this\.storage\.find\(id\)/,'Action-menu lookup must resolve by ticket ID');
assert.doesNotMatch(dashboardSource,/show-legs-label-fix\.js/,'Canonical dashboard must not depend on the historical ticket-binding patch');

console.log('Canonical ticket-ID ownership regression passed.');