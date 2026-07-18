#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class FakeClassList {
  constructor(...names){this.names=new Set(names)}
  add(...names){names.forEach(name=>this.names.add(name))}
  remove(...names){names.forEach(name=>this.names.delete(name))}
  toggle(name,force){if(force===undefined){this.names.has(name)?this.names.delete(name):this.names.add(name)}else force?this.names.add(name):this.names.delete(name);return this.names.has(name)}
  contains(name){return this.names.has(name)}
}
class FakeOption {
  constructor(value='',textContent='',dataset={}){this.value=String(value);this.textContent=textContent;this.dataset={...dataset}}
}
const decode=text=>String(text).replaceAll('&amp;','&').replaceAll('&quot;','"').replaceAll('&#39;',"'").replaceAll('&lt;','<').replaceAll('&gt;','>');
function optionsFromHtml(html){
  const out=[];for(const match of String(html).matchAll(/<option value="([^"]*)"([^>]*)>([\s\S]*?)<\/option>/g)){const option=new FakeOption(decode(match[1]),decode(match[3]));option.selected=/\sselected(?:\s|>|$)/.test(match[2]);out.push(option)}return out;
}
class FakeSelect {
  constructor(options=[]){this.options=[];this.selectedIndex=-1;this._innerHTML='';options.forEach(option=>this.appendChild(option));if(this.options.length)this.selectedIndex=0}
  get value(){return this.options[this.selectedIndex]?.value??''}
  set value(value){const index=this.options.findIndex(option=>option.value===String(value));this.selectedIndex=index}
  get innerHTML(){return this._innerHTML}
  set innerHTML(html){this._innerHTML=String(html);this.options=optionsFromHtml(html);const selected=this.options.findIndex(option=>option.selected);this.selectedIndex=selected>=0?selected:(this.options.length?0:-1)}
  appendChild(option){this.options.push(option);if(this.selectedIndex<0)this.selectedIndex=0;return option}
  insertAdjacentHTML(_position,html){for(const option of optionsFromHtml(html))this.appendChild(option)}
}

const context={console,JSON,Math,Date,Set,String,Number,URLSearchParams,setTimeout,clearTimeout,CustomEvent:class{constructor(type,options={}){this.type=type;this.detail=options.detail}}};
context.window=context;context.globalThis=context;context.ParlayTrackerCore={gameStartCT:()=>''};context.document={createElement:name=>name==='option'?new FakeOption():{}};
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../app/src/scripts/catalog.js',import.meta.url),'utf8'),context,{filename:'catalog.js'});
vm.runInContext(readFileSync(new URL('../app/src/scripts/builder-controller.js',import.meta.url),'utf8'),context,{filename:'builder-controller.js'});
const Builder=context.BuilderController,C=context.ParlayCatalog;
const builder=Object.create(Builder.prototype);builder.catalog=C;

const singleLeagueParlay={title:'+500',tracker:'parlay',date:'20260718',type:'parlay',league:'MLB',game:'ATL@STL',gameId:'header-game',gamePk:99,gameStart:'20260718T1900',gameSavedAt:'saved',legs:[{label:'Celtics ML',type:'ml',league:'NBA',date:'20260718',game:'BOS@NYK',team:'BOS',gameId:'nba-1',gameStart:'20260718T1830',gameSavedAt:'saved'}]};
builder.rawTicket=()=>singleLeagueParlay;
const singleCanonical=builder.canonicalTicket(singleLeagueParlay);
assert.equal(singleCanonical.league,'NBA','A single-league parlay must derive its league from its legs');
assert.equal('game' in singleCanonical,false,'A parlay must not emit a ticket-level game');
for(const key of ['gameId','gamePk','gameStart','gameNumber','gameSavedAt'])assert.equal(key in singleCanonical,false,`A parlay must not emit ticket-level ${key} without a ticket-level game`);
assert.equal(singleCanonical.legs[0].gameId,'nba-1','Parlay game-instance metadata must remain owned by its leg');

const mixed={...singleLeagueParlay,legs:[singleLeagueParlay.legs[0],{label:'Braves ML',type:'ml',league:'MLB',date:'20260718',game:'ATL@STL',team:'ATL'}]};builder.rawTicket=()=>mixed;
const mixedCanonical=builder.canonicalTicket(mixed);
assert.equal('league' in mixedCanonical,false,'A mixed-league parlay must not claim one ticket-level league');
assert.equal(JSON.stringify([...mixedCanonical.legs].map(leg=>leg.league)),JSON.stringify(['NBA','MLB']),'Mixed-league parlays must retain per-leg league ownership');

const sgp={title:'+300',tracker:'parlay',date:'20260718',type:'sgp',league:'MLB',game:'ATL@STL',gameId:'mlb-1',gamePk:1,gameStart:'20260718T1900',gameSavedAt:'same',legs:[{label:'Braves ML',type:'ml',league:'MLB',date:'20260718',game:'ATL@STL',team:'ATL',gameId:'mlb-1',gamePk:1,gameStart:'20260718T1900',gameSavedAt:'same'}]};builder.rawTicket=()=>sgp;
const sgpCanonical=builder.canonicalTicket(sgp);
assert.equal(sgpCanonical.gameId,'mlb-1','SGP game-instance metadata must live at ticket level');
assert.equal('gameId' in sgpCanonical.legs[0],false,'SGP legs must not duplicate ticket-level game-instance ownership');

const worldCup={...sgp,title:'+250',tracker:'worldcup',league:'WC',game:'ARG@ESP',legs:[{label:'Argentina ML',type:'ml',league:'WC',date:'20260718',game:'ARG@ESP',team:'ARG'}]};builder.rawTicket=()=>worldCup;
assert.equal(builder.canonicalTicket(worldCup).title,'＋250','World Cup positive odds must use the fullwidth plus character');

const validSgp={title:'+100',date:'20260718',type:'sgp',league:'MLB',game:'ATL@STL',legs:[{label:'Player 1+ H',type:'player_hits',league:'MLB',date:'20260718',game:'ATL@STL',team:'ATL',player:'Player',target:1}]};
assert.equal(builder.validate(validSgp).length,0,'A complete SGP must validate');
const invalid={title:'+100',date:'2026-07-18',type:'sgp',league:'MLB',game:'ATL@STL',legs:[
  {label:'Missing team',type:'player_hits',league:'MLB',date:'20260718',game:'ATL@STL',player:'Player',target:'abc'},
  {label:'Wrong team',type:'ml',league:'MLB',date:'20260718',game:'ATL@STL',team:'BOS'},
  {label:'Wrong type',type:'player_points',league:'MLB',date:'20260718',game:'ATL@STL',team:'ATL',player:'Player',target:10},
  {label:'Bad manual',type:'manual',league:'MLB',date:'20260718',game:'ATL@STL',current:'x',target:0}
]};
const issues=builder.validate(invalid).join('\n');
for(const expected of ['Invalid date','missing team','numeric target','not available for MLB','team is not in ATL@STL','manual current','manual target'])assert.match(issues,new RegExp(expected,'i'),`Validation must report ${expected}`);

const emptyOption=()=>new FakeOption('','Select game');
const duplicateSelect=new FakeSelect([emptyOption(),new FakeOption('TB@BOS','Game 1',{gameId:'g1'}),new FakeOption('TB@BOS','Game 2',{gameId:'g2'}),new FakeOption(C.MANUAL,'Manual')]);
builder.ticketType=()=> 'sgp';builder.$=id=>id==='ticketGame'?duplicateSelect:null;builder.renderTeams=()=>{};
builder.selectGameForTeam({},'TB');
assert.equal(duplicateSelect.value,'','Team-first auto-selection must not choose between multiple matching games');
const uniqueSelect=new FakeSelect([emptyOption(),new FakeOption('TB@BOS','Only game',{gameId:'g1'}),new FakeOption('NYY@TOR','Other',{gameId:'g3'}),new FakeOption(C.MANUAL,'Manual')]);builder.$=id=>id==='ticketGame'?uniqueSelect:null;
builder.selectGameForTeam({},'TB');assert.equal(uniqueSelect.value,'TB@BOS','Team-first auto-selection must select a unique matching game');

const ambiguousInput={value:'',classList:new FakeClassList('hide')};duplicateSelect.value='';
assert.equal(builder.restoreGameSelection(duplicateSelect,ambiguousInput,{game:'TB@BOS'}),true,'Ambiguous saved games must be preserved for review');
assert.equal(duplicateSelect.value,C.MANUAL,'An ambiguous saved game must not silently bind to Game 1');
assert.equal(ambiguousInput.value,'TB@BOS','An ambiguous saved game must retain its original game code');

const ticketSelect=new FakeSelect([emptyOption(),new FakeOption('TB@BOS','Game 1',{gameId:'g1',gameStart:'20260718T1236'}),new FakeOption('TB@BOS','Game 2',{gameId:'g2',gameStart:'20260718T1910'}),new FakeOption(C.MANUAL,'Manual')]);ticketSelect.selectedIndex=2;
const manualInput={value:'',classList:new FakeClassList('hide')},dateInput={value:'2026-07-18'};
builder.$=id=>({ticketGame:ticketSelect,ticketGameManual:manualInput,date:dateInput}[id]);builder.league=()=> 'MLB';builder.ticketType=()=> 'sgp';builder.gamesFor=async()=>[{value:'TB@BOS',label:'Game 1',gameId:'g1',gameStart:'2026-07-18T17:36:00Z'},{value:'TB@BOS',label:'Game 2',gameId:'g2',gameStart:'2026-07-18T23:10:00Z'}];builder.apiStatus=()=>{};builder.legs=()=>[];
await builder.loadTicketGames();assert.equal(ticketSelect.options[ticketSelect.selectedIndex].dataset.gameId,'g2','Reloading games must preserve the selected doubleheader instance');

ticketSelect.value=C.MANUAL;manualInput.value='CUSTOM@GAME';manualInput.classList.remove('hide');await builder.loadTicketGames();
assert.equal(ticketSelect.value,C.MANUAL,'Reloading games must preserve a manual game selection');
assert.equal(manualInput.value,'CUSTOM@GAME','Reloading games must preserve manual game text');
assert.equal(manualInput.classList.contains('hide'),false,'The preserved manual game input must remain visible');

const datedSelect=new FakeSelect();builder.$=id=>id==='date'?{value:'2026-07-18'}:null;
builder.renderGameOptions(datedSelect,[{value:'ATL@STL',label:'7:10 pm CT',gameId:'g1',gameStart:'7:10 pm CT'}],'MLB','20260719');
assert.equal(datedSelect.options.find(option=>option.value==='ATL@STL').dataset.gameStart,'20260719T1910','Parlay leg bindings must normalize start times with the leg date supplied to the renderer');

const typeSelect=new FakeSelect(),typeLeg={querySelector:selector=>selector==='.ltype'?typeSelect:null};builder.legLeague=()=> 'MLB';
builder.populateTypes(typeLeg,'future_market');
assert.equal(typeSelect.value,'future_market','Loading an unknown saved market must preserve it instead of silently substituting another type');

const unknownTargetSelect=new FakeSelect([new FakeOption('','Select target')]),unknownCustom={value:'',classList:new FakeClassList('hide')},unknownTypeSelect=new FakeSelect([new FakeOption('future_market','Unsupported')]);
const unknownLeg={querySelector:selector=>({'.ltype':unknownTypeSelect,'.targetSelect':unknownTargetSelect,'.targetCustom':unknownCustom}[selector]||null)};
builder.setTarget(unknownLeg,'7.5');
assert.equal(unknownTargetSelect.value,C.MANUAL,'An unknown saved market must retain a custom target channel');
assert.equal(builder.targetValue(unknownLeg),'7.5','An unknown saved market must preserve its original target');

let rawCalls=0;builder.rawTicket=()=>({...sgp,gameSavedAt:`snapshot-${++rawCalls}`,legs:sgp.legs.map(leg=>({...leg,gameSavedAt:`snapshot-${rawCalls}`}))});builder.$=id=>({sportsbook:{value:''},ticketStatus:{value:'active'}}[id]);builder.storage={makeId:()=> 'new-id'};
const record=builder.recordFromBuilder();
assert.equal(rawCalls,1,'Raw and canonical records must be generated from one builder snapshot');
assert.equal(record.ticket.gameSavedAt,record.canonical.gameSavedAt,'Raw and canonical game-instance timestamps must be identical');

console.log('Builder contract verified.');
