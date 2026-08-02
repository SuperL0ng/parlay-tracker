#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-core.js',import.meta.url),'utf8'),{filename:'tracker-core.js'});

let handler=async()=>({});
globalThis.fetch=async url=>({ok:true,status:200,json:async()=>handler(String(url))});
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/settlement-service.js',import.meta.url),'utf8'),{filename:'settlement-service.js'});
const S=globalThis.ParlaySettlementService;
const record=(league,game,leg)=>({id:'r',savedAt:'2026-07-18T17:00:00Z',ticket:{date:'20260718',league,game,legs:[leg]}});
const scheduleGame=(pk,time='2026-07-18T18:00:00Z')=>({gamePk:pk,gameDate:time,teams:{away:{team:{abbreviation:'TB'}},home:{team:{abbreviation:'BOS'}}}});
const play=(inning,eventType,time,opts={})=>({about:{inning,halfInning:opts.half||'top',startTime:time,endTime:time,startOuts:opts.startOuts??0,isComplete:true},count:{outs:opts.outs??0},matchup:{pitcher:{fullName:'Pitcher One'},batter:{fullName:opts.batter||'Batter One'}},result:{eventType,awayScore:opts.awayScore??0,homeScore:opts.homeScore??0,rbi:opts.rbi??0},runners:opts.runners||[]});
const mlbFeed=({state='Final',plays=[],awayRuns=0,homeRuns=0,currentPitcher=false}={})=>({gameData:{status:{abstractGameState:state,detailedState:state},teams:{away:{abbreviation:'TB'},home:{abbreviation:'BOS'}}},liveData:{plays:{allPlays:plays},linescore:{currentInning:plays.at(-1)?.about?.inning||0,teams:{away:{runs:awayRuns},home:{runs:homeRuns}},innings:[1,2,3,4,5].map(num=>({num,away:{runs:0},home:{runs:0}}))},boxscore:{teams:{away:{team:{abbreviation:'TB'},players:{p:{person:{fullName:'Pitcher One'},gameStatus:{isCurrentPitcher:currentPitcher}}}},home:{team:{abbreviation:'BOS'},players:{}}}}}});

{
  S.reset();handler=async url=>url.includes('/schedule?')?{dates:[{games:[scheduleGame(1),scheduleGame(2,'2026-07-18T23:00:00Z')]}]}:{};
  const unbound={id:'r',ticket:{date:'20260718',league:'MLB',game:'TB@BOS',legs:[{type:'ml',team:'TB'}]}};
  const resolved=await S.resolve(unbound,'WON');
  assert.equal(resolved.results[0].status,'UNAVAILABLE','An ambiguous unbound doubleheader must not silently settle against Game 1');
}

{
  const ks=[1,2,3,4].map((n,i)=>play(i<3?1:2,'strikeout',`2026-07-18T18:0${i}:00Z`,{outs:i===3?1:0}));
  const feed=mlbFeed({plays:ks});S.reset();handler=async url=>url.includes('/schedule?')?{dates:[{games:[scheduleGame(1)]}]}:url.includes('/feed/live')?feed:{};
  const resolved=await S.resolve(record('MLB','TB@BOS',{type:'pitcher_ks_under',team:'TB',player:'Pitcher One',target:4,gamePk:1}),'PUSH');
  assert.equal(resolved.results[0].status,'VOID','An integer pitcher under equal to the final statistic must push/void, not win or lose');
}

{
  const fifth=[play(5,'single','2026-07-18T19:00:00Z',{awayScore:1,homeScore:0})];
  const feed=mlbFeed({state:'Live',plays:fifth,awayRuns:1});S.reset();handler=async url=>url.includes('/schedule?')?{dates:[{games:[scheduleGame(1)]}]}:url.includes('/feed/live')?feed:{};
  const resolved=await S.resolve(record('MLB','TB@BOS',{type:'f5_ml',team:'TB',gamePk:1}),'LIVE');
  assert.equal(resolved.results[0].status,'LIVE','F5 settlement must not occur during the fifth inning');
}

{
  const plays=[play(5,'field_out','2026-07-18T19:10:00Z',{half:'bottom',outs:3,awayScore:1,homeScore:0}),play(6,'single','2026-07-18T19:12:00Z',{awayScore:1,homeScore:0})];
  const feed=mlbFeed({state:'Live',plays,awayRuns:1});feed.liveData.linescore.innings=[1,2,3,4,5].map(num=>({num,away:{runs:num===5?1:0},home:{runs:0}}));S.reset();handler=async url=>url.includes('/schedule?')?{dates:[{games:[scheduleGame(1)]}]}:url.includes('/feed/live')?feed:{};
  const resolved=await S.resolve(record('MLB','TB@BOS',{type:'f5_ml',team:'TB',gamePk:1}),'WON');
  assert.equal(resolved.results[0].status,'WIN');
  assert.equal(resolved.results[0].settledAt,'2026-07-18T19:10:00.000Z','F5 timestamp must be the completion of the fifth, not a later sixth-inning play');
}

{
  const feed=mlbFeed({plays:[],awayRuns:5,homeRuns:4});S.reset();handler=async url=>url.includes('/schedule?')?{dates:[{games:[scheduleGame(1)]}]}:url.includes('/feed/live')?feed:{};
  const resolved=await S.resolve(record('MLB','TB@BOS',{type:'total_over',target:8.5,gamePk:1}),'WON');
  assert.equal(resolved.results[0].status,'WIN','A final MLB match total must not require a selected team');
  assert.equal(resolved.results[0].settledAt,'','A final status may be known even when no event timestamp is available');
}

{
  const feed=mlbFeed({plays:[],awayRuns:1,homeRuns:0});feed.liveData.boxscore.teams.away.players.b={person:{fullName:'Batter One'},stats:{batting:{hits:1,totalBases:1,runs:1,rbi:0,baseOnBalls:0,stolenBases:0}}};S.reset();handler=async url=>url.includes('/schedule?')?{dates:[{games:[scheduleGame(1)]}]}:url.includes('/feed/live')?feed:{};
  const resolved=await S.resolve(record('MLB','TB@BOS',{type:'player_hits',team:'TB',player:'Batter One',target:1,gamePk:1}),'WON');
  assert.equal(resolved.results[0].status,'WIN','A final MLB box score must prevent a false player-prop loss when play history is missing');
}

const basketballEvent={id:'evt',date:'2026-07-18T18:00:00Z',competitions:[{competitors:[{homeAway:'away',team:{abbreviation:'LV'}},{homeAway:'home',team:{abbreviation:'NY'}}]}]};
const summary=({completed=true,plays=[],awayScore=80,homeScore=75,boxscore=null}={})=>({header:{competitions:[{status:{type:{completed}},competitors:[{homeAway:'away',score:String(awayScore),team:{abbreviation:'LV'}},{homeAway:'home',score:String(homeScore),team:{abbreviation:'NY'}}]}]},plays,...(boxscore?{boxscore}: {})});
const routeBasketball=summaryValue=>async url=>url.includes('/scoreboard?')?{events:[basketballEvent]}:url.includes('/summary?')?summaryValue:{};

{
  const data=summary({plays:[{text:"Defensive rebound by A'ja Wilson",wallclock:'2026-07-18T18:05:00Z',period:{number:1},awayScore:2,homeScore:0}]});S.reset();handler=routeBasketball(data);
  const resolved=await S.resolve(record('WNBA','LV@NY',{type:'player_rebounds',team:'LV',player:"A'ja Wilson",target:1,gameId:'evt'}),'WON');
  assert.equal(resolved.results[0].status,'WIN','Basketball settlement must recognize rebound phrasing where the player name does not begin the play text');
}

{
  const data=summary({completed:false,plays:[
    {text:'End of 2nd quarter',wallclock:'2026-07-18T19:00:00Z',period:{number:2},awayScore:51,homeScore:50},
    {text:'Start of 3rd quarter',wallclock:'2026-07-18T19:15:00Z',period:{number:3},awayScore:51,homeScore:50}
  ]});S.reset();handler=routeBasketball(data);
  const resolved=await S.resolve(record('WNBA','LV@NY',{type:'h1_total_over',target:100.5,gameId:'evt'}),'WON');
  assert.equal(resolved.results[0].status,'WIN','First-half basketball markets must have settlement coverage');
  assert.equal(resolved.results[0].settledAt,'2026-07-18T19:00:00.000Z');
}

{
  const data=summary({plays:[{text:"A'ja Wilson makes 2-foot layup",scoringPlay:true,scoreValue:2,period:{number:1},awayScore:2,homeScore:0}]});S.reset();handler=routeBasketball(data);
  const resolved=await S.resolve(record('WNBA','LV@NY',{type:'player_points',team:'LV',player:"A'ja Wilson",target:2,gameId:'evt'}),'WON');
  assert.equal(resolved.results[0].status,'WIN','A reached target remains a win even if the feed omits the wall-clock timestamp');
  assert.equal(resolved.results[0].settledAt,'');
  assert.equal(resolved.ticketSettlement,null,'No timestamp may be invented when the event feed does not provide one');
}

{
  const boxscore={players:[{team:{abbreviation:'LV'},statistics:[{labels:['PTS','REB','AST','STL','BLK'],athletes:[{athlete:{displayName:"A'ja Wilson"},stats:['20','5','3','1','2']}]}]}]};
  const data=summary({plays:[],boxscore});S.reset();handler=routeBasketball(data);
  const resolved=await S.resolve(record('WNBA','LV@NY',{type:'player_points',team:'LV',player:"A'ja Wilson",target:10,gameId:'evt'}),'WON');
  assert.equal(resolved.results[0].status,'WIN','A final basketball box score must prevent a false player-prop loss when play history is missing');
  assert.equal(resolved.results[0].settledAt,'');
}

{
  const data=summary({plays:[],awayScore:80,homeScore:75});S.reset();handler=routeBasketball(data);
  const resolved=await S.resolve(record('WNBA','LV@NY',{type:'ml',team:'LV',gameId:'evt'}),'WON');
  assert.equal(resolved.results[0].status,'WIN','Final basketball sides must settle from header scores when play history is absent');
}

{
  const prior={...record('MLB','TB@BOS',{type:'ml',team:'TB',gamePk:1}),legSettlements:[{index:0,status:'WIN',settledAt:'2026-07-18T20:00:00.000Z',settlementReason:'Game final'}],settledAt:'2026-07-18T20:00:00.000Z',settlementSource:'mlb-event-ledger',settlementReason:'Game final',settlementLegIndexes:[0],settledOutcome:'WON'};
  S.reset();handler=async()=>{throw new Error('offline')};await S.apply(prior,'WON');
  assert.equal(prior.settledAt,'2026-07-18T20:00:00.000Z','A later feed outage must not erase a previously confirmed settlement');
  assert.equal(prior.legSettlements[0].status,'WIN','A later feed outage must not replace a confirmed leg settlement with UNAVAILABLE');
}

console.log('Settlement contract verified.');
