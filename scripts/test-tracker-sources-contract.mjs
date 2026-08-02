#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-core.js',import.meta.url),'utf8'),{filename:'tracker-core.js'});

let fetchCalls=[];
globalThis.fetch=async url=>{
  fetchCalls.push(String(url));
  if(String(url).includes('/baseball/mlb/scoreboard'))return {ok:false,status:503,json:async()=>({})};
  if(String(url).includes('/scoreboard'))return {ok:true,status:200,json:async()=>({events:[{id:String(fetchCalls.length),date:'2026-07-18T18:00:00Z',competitions:[]}]})};
  throw new Error(`Unexpected URL ${url}`);
};
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-sources.js',import.meta.url),'utf8'),{filename:'tracker-sources.js'});
const S=globalThis.ParlayTrackerSources;

const board=await S.fetchScoreboards(['20260718']);
assert.equal(S.sourceStatusFor(board,'MLB','20260718'),'error','Scoreboard source failures must be recorded, not silently converted to an empty slate');
assert.equal(S.sourceStatusFor(board,'NBA','20260718'),'ok');
assert.equal(S.sourceStatusFor(board,'WNBA','20260718'),'ok');
assert.equal(board.length,2,'Successful sports must remain available when another sport fails');

const summary={boxscore:{players:[{team:{abbreviation:'OKC'},statistics:[{labels:['PTS'],athletes:[
  {athlete:{displayName:'Jalen Williams'},stats:['20']},
  {athlete:{displayName:'Jaylin Williams'},stats:['8']}
]}]}]}};
assert.equal(S.playerStats(summary,'OKC','Williams'),null,'An ambiguous partial player name must not select an arbitrary athlete');
assert.equal(S.getPoints(summary,'OKC','Jalen Williams'),20,'An exact player name must resolve correctly');
assert.equal(S.parseIPToOuts('5.2'),17);
assert.equal(S.parseIPToOuts('5.3'),null,'Invalid baseball innings notation must not produce an out count');
assert.equal(S.parseIPToOuts('bad'),null);

const allCategories={boxscore:{players:[{team:{abbreviation:'LAL'},statistics:[{labels:['PTS','REB','AST','STL','BLK'],athletes:[{athlete:{displayName:'Test Player'},stats:['12','3','2','10','1']}]}]}]}};
assert.equal(S.getDoubleCount(allCategories,'LAL','Test Player'),2,'Double-double detection must include steals and blocks, not only points/rebounds/assists');
const incomplete={boxscore:{players:[{team:{abbreviation:'LAL'},statistics:[{labels:['PTS'],athletes:[{athlete:{displayName:'Test Player'},stats:['12']}]}]}]}};
assert.equal(S.getDoubleCount(incomplete,'LAL','Test Player'),null,'Incomplete category data must not be treated as zeroes');

S.resetTrackingCaches();
let attempts=0;
globalThis.fetch=async url=>{
  const text=String(url);attempts++;
  if(text.includes('/summary?event=')){
    if(attempts===1)return {ok:false,status:500,json:async()=>({})};
    return {ok:true,status:200,json:async()=>({boxscore:{}})};
  }
  if(text.includes('/schedule?'))return {ok:true,status:200,json:async()=>({dates:[]})};
  return {ok:true,status:200,json:async()=>({})};
};
const event={id:'evt',__sport:'nba'};
const first=await S.loadGameData({league:'NBA',date:'20260718',game:'LAL@BOS'},{},event);
const second=await S.loadGameData({league:'NBA',date:'20260718',game:'LAL@BOS'},{},event);
assert.equal(first.summary,null,'A failed summary request must be represented as unavailable data');
assert.equal(first.errors.length,1);
assert.ok(second.summary,'A failed cached request must be evicted so a later refresh can retry');

console.log('Tracker sources contract verified.');
