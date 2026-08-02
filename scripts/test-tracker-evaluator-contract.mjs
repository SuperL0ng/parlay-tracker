#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-core.js',import.meta.url),'utf8'),{filename:'tracker-core.js'});
const C=globalThis.ParlayTrackerCore;
const S={
  sourceStatusFor:(games,league,date)=>games?.sourceStatus?.[`${String(league).toLowerCase()}|${date}`]||'',
  loadGameData:async()=>({summary:{},mlbFeed:null,errors:[]}),
  baseballStat:()=>null,
  getPoints:()=>null,getRebounds:()=>null,getAssists:()=>null,getBlocks:()=>null,getThrees:()=>null,getDoubleCount:()=>null
};
globalThis.ParlayTrackerSources=S;
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-evaluator.js',import.meta.url),'utf8'),{filename:'tracker-evaluator.js'});
const E=globalThis.ParlayTrackerEvaluator;
const competitor=(abbr,score,lines=[])=>({team:{abbreviation:abbr},score:String(score),linescores:lines.map(value=>({value}))});
const game=({sport='mlb',state='post',completed=true,period=9,detail='Final',away='TB',home='BOS',awayScore=4,homeScore=4,awayLines=[1,1,1,1,0],homeLines=[1,1,1,1,0]}={})=>({id:'g',date:'2026-07-18T18:00:00Z',__sport:sport,status:{period,type:{state,completed,detail,shortDetail:detail}},competitions:[{competitors:[competitor(away,awayScore,awayLines),competitor(home,homeScore,homeLines)]}]});
const evaluate=async(ticket,games)=> (await E.evaluateRecord({id:'r',ticket,savedAt:'2026-07-18T17:00:00Z'},games)).__evaluated[0].__live;

const outage=[];outage.sourceStatus={'mlb|20260718':'error'};
let result=await evaluate({date:'20260718',league:'MLB',game:'TB@BOS',legs:[{type:'ml',team:'TB'}]},outage);
assert.equal(result.state,'unavailable','A failed scoreboard source must not look like an unstarted game');

const finalGame=game();
result=await evaluate({date:'20260718',league:'MLB',game:'TB@BOS',legs:[{type:'total_over',target:8}]},[finalGame]);
assert.equal(result.state,'push','An integer total equal to the final score must push');
result=await evaluate({date:'20260718',league:'MLB',game:'TB@BOS',legs:[{type:'f5_ml',team:'TB'}]},[finalGame]);
assert.equal(result.state,'push','A tied F5 moneyline must push rather than lose');
result=await evaluate({date:'20260718',league:'MLB',game:'TB@BOS',legs:[{type:'pitcher_ks_under',team:'TB',player:'Pitcher',target:4}]},[finalGame]);
assert.equal(result.state,'unavailable','Missing final player data must not be converted into a zero and graded as a win');

S.baseballStat=kind=>kind==='ks'?4:null;
result=await evaluate({date:'20260718',league:'MLB',game:'TB@BOS',legs:[{type:'pitcher_ks_under',team:'TB',player:'Pitcher',target:4}]},[finalGame]);
assert.equal(result.state,'push','An integer under line equal to the final statistic must push');

const suspended=game({state:'in',completed:false,period:4,detail:'Suspended',awayScore:2,homeScore:1});
S.baseballStat=()=>2;
result=await evaluate({date:'20260718',league:'MLB',game:'TB@BOS',legs:[{type:'pitcher_ks_under',team:'TB',player:'Pitcher',target:4.5}]},[suspended]);
assert.equal(result.state,'suspended','An unresolved under during a suspended game must be suspended, not live');

const nba=game({sport:'nba',state:'in',completed:false,period:3,detail:'3rd Quarter',away:'LAL',home:'BOS',awayScore:55,homeScore:50,awayLines:[25,30],homeLines:[24,26]});
result=await evaluate({date:'20260718',league:'NBA',game:'LAL@BOS',legs:[{type:'h1_ml',team:'LAL'}]},[nba]);
assert.equal(result.state,'win','NBA first-half moneyline must be evaluated when the second half begins');
result=await evaluate({date:'20260718',league:'NBA',game:'LAL@BOS',legs:[{type:'h1_total_over',target:105}]},[nba]);
assert.equal(result.state,'push','NBA first-half integer totals must support pushes');

const wnba=game({sport:'wnba',state:'post',completed:true,period:4,detail:'Final',away:'GS',home:'NY',awayScore:80,homeScore:75,awayLines:[20,20,20,20],homeLines:[20,20,20,15]});
result=await evaluate({date:'20260718',league:'WNBA',game:'GS@NY',legs:[{type:'ml',team:'GS'}]},[wnba]);
assert.equal(result.state,'win','WNBA catalog team codes must evaluate against feed team codes');

console.log('Tracker evaluator contract verified.');
