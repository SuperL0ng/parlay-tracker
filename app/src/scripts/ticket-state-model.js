(() => {
  'use strict';

  const FINAL_OUTCOMES=new Set(['WON','LOST','PUSH']);
  const RUNTIME_STATES=new Set(['PENDING','LIVE','SUSPENDED','UNAVAILABLE']);
  const clean=value=>String(value??'').trim();
  const upper=value=>clean(value).toUpperCase();
  const clone=value=>JSON.parse(JSON.stringify(value));
  const asArray=value=>Array.isArray(value)?value:[];
  const terminalLegState=value=>({WIN:'WON',WON:'WON',LOSS:'LOST',LOST:'LOST',VOID:'PUSH',PUSH:'PUSH'})[upper(value)]||'';
  const runtimeLegState=value=>({PENDING:'PENDING',LIVE:'LIVE',SUSPENDED:'SUSPENDED',UNAVAILABLE:'UNAVAILABLE'})[upper(value)]||'';

  function workflow(record){return clean(record?.status).toLowerCase()==='completed'?'COMPLETE':'ACTIVE'}

  function settlementByIndex(record){const map=new Map();for(const item of asArray(record?.legSettlements)){const index=Number(item?.index);if(Number.isInteger(index)&&index>=0)map.set(index,item)}return map}

  function deriveFinalOutcome(legs){
    if(!legs.length)return'';
    const states=legs.map(leg=>leg.result).filter(Boolean);
    if(states.length!==legs.length)return'';
    if(states.includes('LOST'))return'LOST';
    if(states.every(state=>state==='PUSH'))return'PUSH';
    return states.every(state=>state==='WON'||state==='PUSH')?'WON':'';
  }

  function normalizeLeg(record,ticket,index,settlements){
    const saved=asArray(ticket.legs)[index]||{};
    const snapshot=asArray(record?.trackerSnapshot?.legs)[index]||{};
    const settlement=settlements.get(index)||{};
    const result=terminalLegState(settlement.status||settlement.outcome||settlement.state||snapshot.state);
    const runtime=result?'':runtimeLegState(snapshot.state||settlement.status||settlement.state)||'PENDING';
    const actual=settlement.actualValue??settlement.value??snapshot.actualValue??snapshot.value;
    const target=saved.target??snapshot.target??'';
    return Object.freeze({
      index,
      label:clean(snapshot.label||saved.label||saved.type||'Untitled leg'),
      game:clean(snapshot.game||saved.game||ticket.game),
      team:clean(snapshot.team||saved.team),
      player:clean(snapshot.player||saved.player),
      target,
      actualValue:actual===undefined||actual===null?'':actual,
      valueClass:clean(snapshot.valueClass),
      gameMeta:clean(snapshot.gameMeta),
      result,
      runtime,
      settledAt:settlement.settledAt||null,
      settlementReason:clean(settlement.settlementReason||settlement.reason)
    })
  }

  function normalize(record){
    const source=record&&typeof record==='object'?record:{};
    const ticket=source.ticket&&typeof source.ticket==='object'?source.ticket:source.canonical&&typeof source.canonical==='object'?source.canonical:{};
    const settlements=settlementByIndex(source);
    const count=Math.max(asArray(ticket.legs).length,asArray(source.trackerSnapshot?.legs).length,settlements.size);
    const legs=Array.from({length:count},(_,index)=>normalizeLeg(source,ticket,index,settlements));
    const derived=deriveFinalOutcome(legs);
    const explicitFinal=FINAL_OUTCOMES.has(upper(source.settledOutcome))?upper(source.settledOutcome):'';
    const live=upper(source.liveOutcome||source.trackerSnapshot?.outcome);
    const finalOutcome=explicitFinal||derived||(FINAL_OUTCOMES.has(live)?live:'');
    const runtime=finalOutcome?'':RUNTIME_STATES.has(live)?live:'PENDING';
    return Object.freeze({
      id:clean(source.id),
      record:source,
      ticket:clone(ticket),
      workflow:workflow(source),
      finalOutcome,
      runtime,
      displayOutcome:finalOutcome||runtime,
      legs:Object.freeze(legs),
      savedAt:source.savedAt||source.createdAt||null,
      settledAt:source.settledAt||null,
      sportsbook:clean(source.sportsbook),
      trackerUpdatedAt:source.trackerUpdatedAt||source.trackerSnapshot?.updatedAt||null,
      isFinal:Boolean(finalOutcome),
      isActive:workflow(source)==='ACTIVE'
    })
  }

  const api=Object.freeze({normalize,deriveFinalOutcome,workflow,terminalLegState,runtimeLegState});
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(typeof window!=='undefined')window.ParlayTicketStateModel=api;
})();