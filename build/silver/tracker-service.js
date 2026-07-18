(() => {
  'use strict';

  const FINAL_OUTCOMES=new Set(['WON','LOST','PUSH']);
  const TRACKER_FIELDS=['liveOutcome','trackerSnapshot','trackerUpdatedAt','trackerRefreshState','trackerUnavailableAt','trackerError','settlementError','legSettlements','settledAt','settlementSource','settlementReason','settlementLegIndexes','settledOutcome','settlementPending','autoCompleted'];

  class TrackerService {
    constructor({storage,sources,evaluator,settlement}){this.storage=storage;this.sources=sources;this.evaluator=evaluator;this.settlement=settlement;this.running=false;}
    clean(value){return String(value??'').trim();}
    clone(value){return this.storage.clone?this.storage.clone(value):JSON.parse(JSON.stringify(value));}
    idSet(value){if(value==null)return null;const values=typeof value==='string'||typeof value==='number'?[value]:[...value];return new Set(values.map(item=>String(item)));}
    fingerprint(record){try{return JSON.stringify(record?.ticket||record?.canonical||null);}catch{return'';}}
    outcomeFor(legs){const state=window.ParlayTrackerCore.ticketState((legs||[]).map(leg=>leg.__live?.state||'pending'));return({win:'WON',loss:'LOST',push:'PUSH',live:'LIVE',suspended:'SUSPENDED',unavailable:'UNAVAILABLE',pending:'PENDING'})[state]||'PENDING';}
    dates(records){const values=[];for(const record of records){const ticket=record.ticket||record.canonical||{};if(ticket.date)values.push(ticket.date);for(const leg of ticket.legs||[])if(leg.date)values.push(leg.date);}return[...new Set(values.map(value=>String(value).replace(/\D/g,'').slice(0,8)).filter(value=>value.length===8))];}
    snapshot(record,evaluated,outcome,updatedAt){const ticket=record.ticket||record.canonical||{},legs=(evaluated.__evaluated||[]).map(leg=>({label:leg.label||leg.type||'Untitled leg',state:leg.__live?.state||'pending',value:leg.__live?.value||'',valueClass:leg.__live?.valueClass||'',game:window.ParlayTrackerCore.legGame(ticket,leg),gameMeta:leg.__game?window.ParlayTrackerCore.baseGameMeta(leg.__game):'',team:leg.team||'',player:leg.player||'',target:leg.target??''}));return{outcome,updatedAt,legs};}
    clearSettlement(record){for(const field of ['settledAt','settlementSource','settlementReason','settlementLegIndexes','settledOutcome','settlementPending','legSettlements','settlementError'])delete record[field];}
    mergeProcessed(latest,initial,processed){
      for(const field of TRACKER_FIELDS){if(Object.prototype.hasOwnProperty.call(processed,field))latest[field]=this.clone(processed[field]);else delete latest[field];}
      if(latest.status===initial.status&&Boolean(latest.manualActiveOverride)===Boolean(initial.manualActiveOverride))latest.status=processed.status;
      if(latest.updatedAt===initial.updatedAt||latest.updatedAt==null)latest.updatedAt=processed.updatedAt;
      return latest;
    }
    async refresh(options={}){
      if(this.running)return{skipped:true};this.running=true;
      const requestedIds=this.idSet(options.ids),errors=[],skippedStale=[];
      try{
        const initialRecords=this.storage.load(),targets=initialRecords.filter(record=>requestedIds?requestedIds.has(String(record.id)):options.activeOnly?this.clean(record.status).toLowerCase()!=='completed':true);
        if(!targets.length)return{ids:[],count:0,updatedAt:new Date().toISOString(),errors,skippedStale};
        this.sources.resetTrackingCaches?.();this.settlement.reset?.();
        const games=await this.sources.fetchScoreboards(this.dates(targets)),processed=[];
        for(const initial of targets){
          const record=this.clone(initial),now=new Date().toISOString();let evaluated,outcome;
          try{evaluated=await this.evaluator.evaluateRecord(record,games);outcome=this.outcomeFor(evaluated.__evaluated||[]);}catch(error){outcome='UNAVAILABLE';record.trackerError=error?.message||String(error);errors.push({id:String(record.id),stage:'evaluate',message:record.trackerError});}
          record.trackerUpdatedAt=now;record.updatedAt=now;
          if(outcome==='UNAVAILABLE'){
            record.trackerRefreshState='UNAVAILABLE';record.trackerUnavailableAt=now;
            if(!record.trackerSnapshot||!FINAL_OUTCOMES.has(record.liveOutcome)){record.liveOutcome='UNAVAILABLE';record.trackerSnapshot=this.snapshot(record,evaluated||{__evaluated:[]},outcome,now);}
          }else{
            delete record.trackerRefreshState;delete record.trackerUnavailableAt;delete record.trackerError;
            record.liveOutcome=outcome;record.trackerSnapshot=this.snapshot(record,evaluated,outcome,now);
            if(FINAL_OUTCOMES.has(outcome)){
              if(this.clean(record.status).toLowerCase()!=='completed'&&!record.manualActiveOverride){record.status='completed';record.autoCompleted=true;}
              try{await this.settlement.apply(record,outcome);delete record.settlementError;}catch(error){record.settlementError=error?.message||String(error);errors.push({id:String(record.id),stage:'settlement',message:record.settlementError});}
            }else if(outcome==='LIVE'&&record.autoCompleted&&!record.manualActiveOverride){record.status='active';record.autoCompleted=false;this.clearSettlement(record);}
          }
          processed.push({initial,record});
        }
        const latestRecords=this.storage.load();
        for(const item of processed){const latest=latestRecords.find(record=>String(record.id)===String(item.initial.id));if(!latest)continue;if(this.fingerprint(latest)!==this.fingerprint(item.initial)){skippedStale.push(String(item.initial.id));continue;}this.mergeProcessed(latest,item.initial,item.record);}
        this.storage.save(latestRecords);
        const detail={ids:processed.map(item=>String(item.initial.id)),count:processed.length,updatedAt:new Date().toISOString(),errors,skippedStale};
        window.dispatchEvent(new CustomEvent('parlay:tracker-updated',{detail}));return detail;
      }finally{this.running=false;}
    }
  }

  window.TrackerService=TrackerService;
})();
