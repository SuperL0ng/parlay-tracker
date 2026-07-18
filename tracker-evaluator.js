/* PARLAY TRACKER EVALUATOR — fail-closed MLB/NBA/WNBA grading */
(() => {
  'use strict';

  const C=window.ParlayTrackerCore,S=window.ParlayTrackerSources;
  const MLB_PLAYER_TYPES=new Set(['pitcher_outs_under','pitcher_ks','pitcher_ks_under','player_hits','player_total_bases','player_runs','player_hr','player_rbi','player_walks','player_stolen_bases','player_hwsb','player_hrrbi']);
  const BASKETBALL_PLAYER_TYPES=new Set(['player_points','player_rebounds','player_assists','player_threes','player_double_double','player_triple_double','player_points_rebounds','player_points_assists','player_rebounds_assists','player_points_rebounds_assists','player_pra','player_pr','player_pa','player_ra','player_blocks']);
  const MLB_TYPES=new Set(['ml','spread','f5_ml','f5_spread','f5_total_over','f5_total_under','team_total_over','team_total_under','total_over','total_under','manual','void',...MLB_PLAYER_TYPES]);
  const BASKETBALL_TYPES=new Set(['ml','spread','h1_ml','h1_spread','h1_total_over','h1_total_under','team_total_over','team_total_under','total_over','total_under','manual','void',...BASKETBALL_PLAYER_TYPES]);
  function supports(league,type){const normalizedLeague=String(league||'').trim().toUpperCase(),normalizedType=String(type||'').trim().toLowerCase();return normalizedLeague==='MLB'?MLB_TYPES.has(normalizedType):normalizedLeague==='NBA'||normalizedLeague==='WNBA'?BASKETBALL_TYPES.has(normalizedType):false;}
  function valClass(state,trend=''){return state==='win'?'valueWin':state==='loss'?'valueLoss':state==='push'?'valuePush':state==='suspended'||state==='unavailable'?'valueSuspended':trend||'valuePending';}
  function unavailable(message='DATA UNAVAILABLE'){return C.statusObj('unavailable',message,'valueSuspended');}
  function pendingOrLive(game,value='',trend=''){const live=C.isLive(game);return C.statusObj(live?'live':'pending',live?value:'',live?trend:'');}
  function numericTarget(leg){const value=Number(leg?.target);return Number.isFinite(value)?value:null;}
  function milestone(value,target,game){if(value==null||!Number.isFinite(Number(value)))return unavailable();const number=Number(value);if(number>=target)return C.statusObj('win',C.fmtRecord(number,target),'valueWin');if(C.isSuspended(game))return C.statusObj('suspended',C.fmtRecord(number,target),'valueSuspended');if(C.isFinal(game))return C.statusObj('loss',C.fmtRecord(number,target),'valueLoss');return pendingOrLive(game,C.fmtRecord(number,target));}
  function lineResult(value,target,game,direction,done=C.isFinal(game)){if(value==null||!Number.isFinite(Number(value)))return unavailable();const number=Number(value),display=C.fmtRecord(number,target);if(direction==='over'&&number>target)return C.statusObj('win',display,'valueWin');if(direction==='under'&&number>target)return C.statusObj('loss',display,'valueLoss');if(C.isSuspended(game)&&!done)return C.statusObj('suspended',display,'valueSuspended');if(done){const state=number===target?'push':direction==='over'?'loss':'win';return C.statusObj(state,display,valClass(state));}return pendingOrLive(game,display);}
  function scorePair(away,home){return away==null||home==null?null:`${away}-${home}`;}
  function sumKnown(values){return values.every(value=>value!=null&&Number.isFinite(Number(value)))?values.reduce((sum,value)=>sum+Number(value),0):null;}
  function sourceFailed(games,ticket,leg){return S.sourceStatusFor?.(games,C.effectiveLeague(ticket,leg),leg?.date||ticket?.date)==='error';}
  async function loadPlayerData(ticket,leg,game){try{return await S.loadGameData(ticket,leg,game);}catch(error){return{summary:null,mlbFeed:null,errors:[{message:error?.message||String(error)}]};}}

  async function evalLeg(ticket,leg,games){
    if(leg.type==='void')return{...leg,__live:C.statusObj('push','VOID','valuePush')};
    if(leg.type==='manual'){
      const current=Number(leg.current??0),target=Number(leg.target??1);
      if(!Number.isFinite(current)||!Number.isFinite(target)||target<=0)return{...leg,__live:unavailable('INVALID MANUAL')};
      const state=leg.result==='win'?'win':leg.result==='loss'?'loss':leg.result==='push'?'push':current>=target?'win':'live';
      return{...leg,__live:C.statusObj(state,state==='push'?'PUSH':C.fmtRecord(current,target),valClass(state))};
    }
    const key=C.legGame(ticket,leg),game=C.findGame(games,key,ticket,leg);
    if(!game)return{...leg,__live:sourceFailed(games,ticket,leg)?unavailable('SOURCE UNAVAILABLE'):C.statusObj('pending','')};
    const final=C.isFinal(game),live=C.isLive(game),started=C.hasStarted(game),suspended=C.isSuspended(game),teams=String(key||'').split('@').map(value=>value.trim()),away=teams[0],home=teams[1],target=numericTarget(leg);
    if(!away||!home)return{...leg,__game:game,__live:unavailable('INVALID GAME')};
    let summary=null,feed=null;
    if(started&&(MLB_PLAYER_TYPES.has(leg.type)||BASKETBALL_PLAYER_TYPES.has(leg.type))){const data=await loadPlayerData(ticket,leg,game);summary=data?.summary||null;feed=data?.mlbFeed||null;}
    let status;
    switch(leg.type){
      case'ml':{
        const margin=C.marginForPick(game,key,leg.team,0),value=C.gameScoreValue(game,away,home);
        if(margin==null)status=unavailable('TEAM UNAVAILABLE');
        else if(suspended)status=C.statusObj('suspended',value,'valueSuspended');
        else if(final){const state=margin>0?'win':margin<0?'loss':'push';status=C.statusObj(state,value,valClass(state));}
        else status=pendingOrLive(game,value,C.trendClass(game,margin));
        break;
      }
      case'spread':{
        if(target==null){status=unavailable('INVALID TARGET');break;}const margin=C.marginForPick(game,key,leg.team,target),value=C.gameScoreValue(game,away,home);
        if(margin==null)status=unavailable('TEAM UNAVAILABLE');
        else if(suspended)status=C.statusObj('suspended',value,'valueSuspended');
        else if(final){const state=margin>0?'win':margin<0?'loss':'push';status=C.statusObj(state,value,valClass(state));}
        else status=pendingOrLive(game,value,C.trendClass(game,margin));
        break;
      }
      case'f5_ml':case'f5_spread':{
        if(leg.type==='f5_spread'&&target==null){status=unavailable('INVALID TARGET');break;}const awayScore=C.f5Score(game,away),homeScore=C.f5Score(game,home),value=scorePair(awayScore,homeScore),margin=leg.type==='f5_ml'?C.f5MarginForPick(game,key,leg.team,0):C.f5MarginForPick(game,key,leg.team,target),done=C.f5Complete(game);
        if(value==null||margin==null)status=unavailable();
        else if(suspended&&!done)status=C.statusObj('suspended',value,'valueSuspended');
        else if(done){const state=margin>0?'win':margin<0?'loss':'push';status=C.statusObj(state,value,valClass(state));}
        else status=pendingOrLive(game,value,C.trendClass(game,margin));
        break;
      }
      case'f5_total_over':case'f5_total_under':{
        if(target==null){status=unavailable('INVALID TARGET');break;}const awayScore=C.f5Score(game,away),homeScore=C.f5Score(game,home),value=awayScore==null||homeScore==null?null:awayScore+homeScore;status=lineResult(value,target,game,leg.type.endsWith('_over')?'over':'under',C.f5Complete(game));break;
      }
      case'h1_ml':case'h1_spread':{
        if(leg.type==='h1_spread'&&target==null){status=unavailable('INVALID TARGET');break;}const awayScore=C.h1Score(game,away),homeScore=C.h1Score(game,home),value=scorePair(awayScore,homeScore),margin=leg.type==='h1_ml'?C.h1MarginForPick(game,key,leg.team,0):C.h1MarginForPick(game,key,leg.team,target),done=C.h1Complete(game);
        if(value==null||margin==null)status=unavailable();
        else if(suspended&&!done)status=C.statusObj('suspended',value,'valueSuspended');
        else if(done){const state=margin>0?'win':margin<0?'loss':'push';status=C.statusObj(state,value,valClass(state));}
        else status=pendingOrLive(game,value,C.trendClass(game,margin));
        break;
      }
      case'h1_total_over':case'h1_total_under':{
        if(target==null){status=unavailable('INVALID TARGET');break;}const awayScore=C.h1Score(game,away),homeScore=C.h1Score(game,home),value=awayScore==null||homeScore==null?null:awayScore+homeScore;status=lineResult(value,target,game,leg.type.endsWith('_over')?'over':'under',C.h1Complete(game));break;
      }
      case'team_total_over':case'team_total_under':{
        if(target==null){status=unavailable('INVALID TARGET');break;}status=lineResult(C.score(game,leg.team),target,game,leg.type.endsWith('_over')?'over':'under',final);break;
      }
      case'total_over':case'total_under':{
        if(target==null){status=unavailable('INVALID TARGET');break;}status=lineResult(C.total(game),target,game,leg.type.endsWith('_over')?'over':'under',final);break;
      }
      case'pitcher_outs_under':case'pitcher_ks':case'pitcher_ks_under':case'player_hits':case'player_total_bases':case'player_runs':case'player_hr':case'player_rbi':case'player_walks':case'player_stolen_bases':{
        if(target==null){status=unavailable('INVALID TARGET');break;}if(!started){status=C.statusObj('pending','');break;}
        const kind={pitcher_outs_under:'outs',pitcher_ks:'ks',pitcher_ks_under:'ks',player_hits:'hits',player_total_bases:'tb',player_runs:'runs',player_hr:'hr',player_rbi:'rbi',player_walks:'walks',player_stolen_bases:'sb'}[leg.type],value=S.baseballStat(kind,summary,feed,leg.team,leg.player);
        status=leg.type.endsWith('_under')?lineResult(value,target,game,'under',final):milestone(value,target,game);break;
      }
      case'player_hwsb':case'player_hrrbi':{
        if(target==null){status=unavailable('INVALID TARGET');break;}if(!started){status=C.statusObj('pending','');break;}
        const kinds=leg.type==='player_hwsb'?['hits','walks','sb']:['hits','runs','rbi'],value=sumKnown(kinds.map(kind=>S.baseballStat(kind,summary,feed,leg.team,leg.player)));status=milestone(value,target,game);break;
      }
      case'player_points':case'player_rebounds':case'player_assists':case'player_threes':case'player_blocks':{
        if(target==null){status=unavailable('INVALID TARGET');break;}if(!started){status=C.statusObj('pending','');break;}const getter={player_points:S.getPoints,player_rebounds:S.getRebounds,player_assists:S.getAssists,player_threes:S.getThrees,player_blocks:S.getBlocks}[leg.type];status=milestone(getter(summary,leg.team,leg.player),target,game);break;
      }
      case'player_points_rebounds':case'player_pr':case'player_points_assists':case'player_pa':case'player_rebounds_assists':case'player_ra':case'player_points_rebounds_assists':case'player_pra':{
        if(target==null){status=unavailable('INVALID TARGET');break;}if(!started){status=C.statusObj('pending','');break;}const getters=leg.type==='player_points_rebounds'||leg.type==='player_pr'?[S.getPoints,S.getRebounds]:leg.type==='player_points_assists'||leg.type==='player_pa'?[S.getPoints,S.getAssists]:leg.type==='player_rebounds_assists'||leg.type==='player_ra'?[S.getRebounds,S.getAssists]:[S.getPoints,S.getRebounds,S.getAssists];status=milestone(sumKnown(getters.map(getter=>getter(summary,leg.team,leg.player))),target,game);break;
      }
      case'player_double_double':case'player_triple_double':{
        if(!started){status=C.statusObj('pending','');break;}status=milestone(S.getDoubleCount(summary,leg.team,leg.player),leg.type==='player_double_double'?2:3,game);break;
      }
      default:status=unavailable('UNSUPPORTED');
    }
    return{...leg,__game:game,__live:status};
  }
  async function evaluateRecord(record,games){const source=record.ticket||{},ticket={...source,__recordReferenceTime:record.savedAt||record.createdAt||record.updatedAt||''},legs=await Promise.all((source.legs||[]).map(async leg=>{try{return await evalLeg(ticket,leg,games);}catch(error){return{...leg,__live:unavailable(error?.message?'EVALUATION ERROR':'DATA UNAVAILABLE')};}}));return{...record,__evaluated:legs};}

  window.ParlayTrackerEvaluator=Object.freeze({evaluateRecord,supports});
})();
