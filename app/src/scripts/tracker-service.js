(() => {
  'use strict';

  class TrackerService {
    constructor({storage,sources,evaluator,settlement}){
      this.storage=storage;this.sources=sources;this.evaluator=evaluator;this.settlement=settlement;this.running=false;
    }
    clean(value){return String(value??'').trim()}
    outcomeFor(legs){
      const states=legs.map(leg=>leg.__live?.state||'pending');
      const state=window.ParlayTrackerCore.ticketState(states.map(value=>({state:value})));
      return({win:'WON',loss:'LOST',push:'PUSH',live:'LIVE',suspended:'SUSPENDED',pending:'PENDING'})[state]||'PENDING';
    }
    dates(records){
      const values=[];
      for(const record of records){
        const ticket=record.ticket||{};
        if(ticket.date)values.push(ticket.date);
        for(const leg of ticket.legs||[])if(leg.date)values.push(leg.date);
      }
      return[...new Set(values.filter(Boolean))];
    }
    snapshot(record,evaluated,outcome){
      const ticket=record.ticket||{};
      const legs=(evaluated.__evaluated||[]).map(leg=>({label:leg.label||leg.type||'Untitled leg',state:leg.__live?.state||'pending',value:leg.__live?.value||'',valueClass:leg.__live?.valueClass||'',game:window.ParlayTrackerCore.legGame(ticket,leg),gameMeta:leg.__game?window.ParlayTrackerCore.baseGameMeta(leg.__game):'',team:leg.team||'',player:leg.player||'',target:leg.target??''}));
      return{outcome,updatedAt:new Date().toISOString(),legs};
    }
    async refresh(options={}){
      if(this.running)return{skipped:true};
      this.running=true;
      const requestedIds=options.ids?new Set([...options.ids].map(String)):null;
      try{
        const records=this.storage.load();
        const targets=records.filter(record=>requestedIds?requestedIds.has(String(record.id)):options.activeOnly?this.clean(record.status).toLowerCase()!=='completed':true);
        this.sources.resetTrackingCaches?.();
        this.settlement.reset?.();
        const games=await this.sources.fetchScoreboards(this.dates(targets));
        for(const record of targets){
          const evaluated=await this.evaluator.evaluateRecord(record,games),outcome=this.outcomeFor(evaluated.__evaluated||[]),now=new Date().toISOString();
          record.liveOutcome=outcome;record.trackerSnapshot=this.snapshot(record,evaluated,outcome);record.updatedAt=now;
          if(['WON','LOST','PUSH'].includes(outcome)){if(this.clean(record.status).toLowerCase()!=='completed'&&!record.manualActiveOverride){record.status='completed';record.autoCompleted=true}await this.settlement.apply(record,outcome)}else if(record.autoCompleted&&!record.manualActiveOverride){record.status='active';record.autoCompleted=false;delete record.settledAt;delete record.settlementSource;delete record.settlementReason;delete record.settlementLegIndexes}
        }
        this.storage.save(records);
        const detail={ids:targets.map(record=>String(record.id)),count:targets.length,updatedAt:new Date().toISOString()};
        window.dispatchEvent(new CustomEvent('parlay:tracker-updated',{detail}));
        return detail;
      }finally{this.running=false}
    }
  }

  window.TrackerService=TrackerService;
})();
