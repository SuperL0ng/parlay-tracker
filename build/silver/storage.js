(() => {
  'use strict';
  const KEY = 'parlayTracker.savedTickets.v1';
  const clone = value => JSON.parse(JSON.stringify(value));
  const isRecord = value => Boolean(value && typeof value === 'object' && !Array.isArray(value));
  const makeId = () => globalThis.crypto?.randomUUID?.() || `ticket-${Date.now()}-${Math.random().toString(36).slice(2,9)}`;
  function parse(raw) {
    if(raw===null||raw==='')return{records:[],valid:true};
    try { const value=JSON.parse(raw); return Array.isArray(value)?{records:value,valid:true}:{records:[],valid:false}; }
    catch { return {records:[],valid:false}; }
  }
  function uniqueId(seen){
    const base=String(makeId()||'ticket').trim()||'ticket';let id=base,index=1;
    while(seen.has(id))id=`${base}-${index++}`;
    return id;
  }
  function normalize(records) {
    let changed=false;
    const seen=new Set();
    const out=[];
    for(const source of records){
      if(!isRecord(source)){changed=true;continue;}
      const record=source;
      const originalId=record.id;
      let id=String(originalId||'').trim();
      if(!id||seen.has(id))id=uniqueId(seen);
      if(originalId!==id){record.id=id;changed=true;}
      seen.add(id);
      if(!isRecord(record.ticket)&&isRecord(record.canonical)){record.ticket=clone(record.canonical);changed=true;}
      if(!isRecord(record.canonical)&&isRecord(record.ticket)){record.canonical=clone(record.ticket);changed=true;}
      if(!record.status){record.status='active';changed=true;}
      out.push(record);
    }
    return {records:out,changed};
  }
  function load(){
    const raw=localStorage.getItem(KEY),parsed=parse(raw);
    if(!parsed.valid)return[];
    const normalized=normalize(parsed.records);
    if(normalized.changed)localStorage.setItem(KEY,JSON.stringify(normalized.records));
    return normalized.records;
  }
  function save(records){
    if(!Array.isArray(records))throw new TypeError('Ticket storage requires an array.');
    const normalized=normalize(clone(records)).records;
    localStorage.setItem(KEY,JSON.stringify(normalized));
    window.dispatchEvent(new CustomEvent('parlay:storage-changed',{detail:{key:KEY}}));
    return normalized;
  }
  function find(id){return load().find(record=>String(record.id)===String(id))||null;}
  function update(id,updater){
    if(typeof updater!=='function')throw new TypeError('Ticket updater must be a function.');
    const records=load(),index=records.findIndex(record=>String(record.id)===String(id));
    if(index<0)return null;
    const originalId=records[index].id,current=clone(records[index]),candidate=updater(current),next=candidate===undefined||candidate===null?current:candidate;
    if(!isRecord(next))throw new TypeError('Ticket updater must return a record object.');
    next.id=originalId;records[index]=next;save(records);return clone(next);
  }
  function upsert(record){
    if(!isRecord(record))throw new TypeError('Ticket upsert requires a record object.');
    const records=load(),provided=String(record.id||'').trim(),id=provided||uniqueId(new Set(records.map(item=>String(item.id)))),next=clone({...record,id});
    const index=records.findIndex(item=>String(item.id)===id);
    if(index<0)records.push(next);else records[index]=next;
    save(records);return clone(next);
  }
  function remove(ids){
    if(ids===null||ids===undefined)return 0;
    const source=typeof ids==='string'||typeof ids==='number'?[ids]:ids;
    if(!source?.[Symbol.iterator])throw new TypeError('Ticket removal requires an ID or iterable of IDs.');
    const wanted=new Set([...source].map(String)),records=load(),remaining=records.filter(record=>!wanted.has(String(record.id)));
    if(remaining.length!==records.length)save(remaining);
    return records.length-remaining.length;
  }
  window.ParlayStorage=Object.freeze({KEY,clone,makeId,load,save,find,update,upsert,remove});
})();
