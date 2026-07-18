#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class MemoryStorage {
  constructor(){this.map=new Map();this.writes=[]}
  getItem(key){return this.map.has(key)?this.map.get(key):null}
  setItem(key,value){const text=String(value);this.map.set(key,text);this.writes.push([key,text])}
  removeItem(key){this.map.delete(key)}
  clear(){this.map.clear();this.writes.length=0}
}
class FakeCustomEvent {constructor(type,options={}){this.type=type;this.detail=options.detail}}

const localStorage=new MemoryStorage(),events=[];
const context={console,JSON,Math,Date,Set,String,TypeError,localStorage,CustomEvent:FakeCustomEvent,crypto:{randomUUID:()=> 'duplicate-id'}};
context.window=context;context.globalThis=context;context.dispatchEvent=event=>events.push(event);
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../app/src/scripts/storage.js',import.meta.url),'utf8'),context,{filename:'storage.js'});
const S=context.ParlayStorage,KEY='parlayTracker.savedTickets.v1';
assert.equal(S.KEY,KEY,'The established localStorage key must not change');

localStorage.setItem(KEY,'{broken');localStorage.writes.length=0;
assert.equal(S.load().length,0,'Malformed JSON must fail closed');
assert.equal(localStorage.getItem(KEY),'{broken','Malformed source data must never be overwritten during load');
assert.equal(localStorage.writes.length,0,'Malformed source data must not trigger a repair write');

localStorage.setItem(KEY,JSON.stringify([null,7,{id:'valid',ticket:{title:'A'},canonical:{title:'A'},status:'active'}]));localStorage.writes.length=0;
assert.equal(S.load().length,1,'Invalid array members must be removed');
assert.equal(JSON.parse(localStorage.getItem(KEY)).length,1,'Removal of invalid members must be persisted');

localStorage.setItem(KEY,JSON.stringify([{id:'  spaced  ',ticket:{title:'A'},status:'active'},{id:'spaced',canonical:{title:'B'}}]));
const repaired=S.load();
assert.equal(repaired[0].id,'spaced','IDs must be normalized to trimmed strings');
assert.notEqual(repaired[1].id,'spaced','Duplicate IDs must receive a unique replacement');
assert.equal(new Set(repaired.map(record=>record.id)).size,repaired.length,'Every normalized record must have a unique ID');
assert.equal(JSON.stringify(repaired[1].ticket),JSON.stringify({title:'B'}),'Legacy canonical-only records must receive a ticket copy');
assert.equal(repaired[1].status,'active','Legacy records must receive the active default status');

const caller=[{id:'caller',ticket:{title:'Original'},canonical:{title:'Original'},status:'active'}];
events.length=0;S.save(caller);caller[0].ticket.title='Mutated';
assert.equal(S.find('caller').ticket.title,'Original','Saving must not retain caller-owned object references');
assert.equal(events.length,1,'A successful save must dispatch exactly one storage event');
assert.equal(events[0].detail.key,KEY,'Storage events must identify the canonical key');

S.update('caller',record=>{record.id='hijacked';record.ticket.title='Updated';return record});
assert.equal(S.find('caller').ticket.title,'Updated','Updates must persist record changes');
assert.equal(S.find('hijacked'),null,'Updates must not permit ID reassignment');
const beforeInvalidUpdate=localStorage.getItem(KEY);
assert.throws(()=>S.update('caller',()=>[]),TypeError,'An updater must not replace a record with a non-record value');
assert.equal(localStorage.getItem(KEY),beforeInvalidUpdate,'A rejected update must leave storage unchanged');
assert.throws(()=>S.upsert(null),TypeError,'Upsert must reject non-record values');

S.upsert({id:'single-id',ticket:{title:'Single'},canonical:{title:'Single'},status:'active'});
assert.equal(S.remove('single-id'),1,'A scalar string ID must be treated as one ID, not an iterable of characters');
assert.equal(S.find('single-id'),null,'Scalar removal must remove the intended record');
assert.equal(S.remove(null),0,'Removing no IDs must be a no-op');

S.save([{id:'duplicate-id',ticket:{title:'Existing'},canonical:{title:'Existing'},status:'active'}]);
const inserted=S.upsert({ticket:{title:'New'},canonical:{title:'New'},status:'active'});
assert.equal(inserted.id,'duplicate-id-1','A generated ID collision must be resolved without overwriting an existing ticket');
assert.equal(S.load().length,2,'Generated ID collisions must preserve both tickets');
assert.equal(S.find('duplicate-id').ticket.title,'Existing','Generated ID collisions must not replace the existing ticket');

console.log('Storage contract verified.');
