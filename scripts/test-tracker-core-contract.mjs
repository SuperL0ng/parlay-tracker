#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-core.js',import.meta.url),'utf8'),{filename:'tracker-core.js'});
const C=globalThis.ParlayTrackerCore;

const competitor=(abbr,score='0',linescores=[])=>({team:{abbreviation:abbr},score,linescores:linescores.map(value=>({value}))});
const game=({id='g',date='2026-07-18T18:00:00Z',sport='mlb',state='pre',completed=false,period=0,detail='Scheduled',away='TB',home='BOS',awayScore='0',homeScore='0',awayLines=[],homeLines=[]}={})=>({
  id,date,__sport:sport,status:{period,type:{state,completed,detail,shortDetail:detail}},competitions:[{competitors:[competitor(away,awayScore,awayLines),competitor(home,homeScore,homeLines)]}]
});

assert.equal(typeof C.effectiveLeague,'function','effectiveLeague must be exported for dependent components');
assert.equal(C.effectiveLeague({league:'NBA'},{league:'wnba'}),'wnba');

for(const [code,name] of [['GS','Golden State Warriors'],['SA','San Antonio Spurs'],['UTA','Utah Jazz'],['CON','Connecticut Sun'],['LA','Los Angeles Sparks'],['LV','Las Vegas Aces'],['NY','New York Liberty']]){
  assert.equal(C.teamMatches({displayName:name},code),true,`${code} must match its canonical catalog team name`);
}

const first=game({id:'one',date:'2026-07-18T17:00:00Z',state:'post',completed:true});
const second=game({id:'two',date:'2026-07-18T23:00:00Z'});
const base={date:'20260718',league:'MLB',game:'TB@BOS'};
const twoPregame=[game({id:'pre-one',date:'2026-07-18T17:00:00Z'}),game({id:'pre-two',date:'2026-07-18T23:00:00Z'})];
assert.equal(C.findGame(twoPregame,'TB@BOS',base,{}),null,'An unbound ambiguous event with no unique started instance must fail closed');
assert.equal(C.findGame([first,second],'TB@BOS',base,{}),first,'A legacy ticket may retain the only started instance when the other game has not begun');
assert.equal(C.findGame([first,second],'TB@BOS',{...base,gameId:'missing'},{}),null,'A stale explicit event ID must not silently switch instances');
assert.equal(C.findGame([first,second],'TB@BOS',{...base,gameNumber:3},{}),null,'An invalid doubleheader ordinal must fail closed');
assert.equal(C.findGame([first,second],'TB@BOS',{...base,__recordReferenceTime:'2026-07-18T22:40:00Z'},{}),second,'A legacy record reference time may disambiguate the nearest instance');
assert.equal(C.findGame([first], 'TB@BOS',{...base,date:'20260719'},{}),null,'A supplied event date must not fall back to another date');

const fifthLive=game({state:'in',period:5,detail:'Bot 5th',awayLines:[0,0,0,0,0],homeLines:[0,0,0,0,0]});
const endFifth=game({state:'in',period:5,detail:'End 5th',awayLines:[0,0,0,0,0],homeLines:[0,0,0,0,0]});
assert.equal(C.f5Complete(fifthLive),false,'F5 cannot complete merely because fifth-inning line-score cells exist');
assert.equal(C.f5Complete(endFifth),true,'End of the fifth inning must complete F5 markets');
const secondQuarter=game({sport:'nba',state:'in',period:2,detail:'2nd Quarter',awayLines:[25,25],homeLines:[24,24]});
const thirdQuarter=game({sport:'nba',state:'in',period:3,detail:'3rd Quarter',awayLines:[25,25],homeLines:[24,24]});
assert.equal(C.h1Complete(secondQuarter),false,'First-half markets must remain open during the second quarter');
assert.equal(C.h1Complete(thirdQuarter),true,'The start of the third quarter must close first-half markets');
assert.equal(C.marginForPick(first,'TB@BOS','NYY',0),null,'An invalid selected team must not be scored as zero');
assert.equal(C.ticketState([{state:'win'},{state:'unavailable'}]),'unavailable','Unavailable data must remain distinguishable from pending data');

console.log('Tracker core contract verified.');
