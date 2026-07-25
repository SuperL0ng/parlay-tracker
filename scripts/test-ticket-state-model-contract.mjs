import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const source=fs.readFileSync(new URL('../app/src/scripts/ticket-state-model.js',import.meta.url),'utf8');
const context={window:{}};
vm.createContext(context);
vm.runInContext(source,context);
const model=context.window.ParlayTicketStateModel;
assert.ok(model,'state model should register globally');

const completedWinning=model.normalize({
  id:'ticket-1',status:'completed',liveOutcome:'PENDING',settledAt:'2026-07-17T20:37:00Z',
  ticket:{title:'+735',type:'sgp',game:'TEX@ATL',legs:[
    {label:'Jim Jarvis 1+ H',target:1},{label:'Brewer Hicklen 1+ H',target:1},
    {label:'Matt Olson 2+ H+BB+SB',target:2},{label:'Michael Harris II 2+ H+R+RBI',target:2}
  ]},
  trackerSnapshot:{outcome:'PENDING',legs:[{state:'pending',value:1},{state:'pending',value:1},{state:'pending',value:2},{state:'pending',value:2}]},
  legSettlements:[
    {index:0,status:'WIN',actualValue:2},{index:1,status:'WIN',actualValue:1},
    {index:2,status:'WIN',actualValue:4},{index:3,status:'WIN',actualValue:6}
  ]
});
assert.equal(completedWinning.workflow,'COMPLETE');
assert.equal(completedWinning.finalOutcome,'WON');
assert.equal(completedWinning.runtime,'');
assert.equal(completedWinning.displayOutcome,'WON');
assert.deepEqual([...completedWinning.legs].map(leg=>leg.actualValue),[2,1,4,6]);
assert.deepEqual([...completedWinning.legs].map(leg=>leg.result),['WON','WON','WON','WON']);

const activeHistorical=model.normalize({status:'active',settledOutcome:'LOST',ticket:{legs:[{label:'A'}]},legSettlements:[{index:0,status:'LOSS'}]});
assert.equal(activeHistorical.workflow,'ACTIVE');
assert.equal(activeHistorical.finalOutcome,'LOST');

const live=model.normalize({status:'active',liveOutcome:'LIVE',ticket:{legs:[{label:'A'}]},trackerSnapshot:{outcome:'LIVE',legs:[{state:'live',value:'1/2'}]}});
assert.equal(live.workflow,'ACTIVE');
assert.equal(live.finalOutcome,'');
assert.equal(live.runtime,'LIVE');
assert.equal(live.legs[0].runtime,'LIVE');

const mixed=model.normalize({status:'completed',ticket:{legs:[{},{}]},legSettlements:[{index:0,status:'WIN'},{index:1,status:'VOID'}]});
assert.equal(mixed.finalOutcome,'WON');

const incomplete=model.normalize({status:'completed',ticket:{legs:[{},{}]},legSettlements:[{index:0,status:'WIN'}]});
assert.equal(incomplete.finalOutcome,'');
assert.equal(incomplete.runtime,'PENDING');

const sparse=model.normalize({status:'completed',ticket:{legs:[]},legSettlements:[{index:3,status:'WIN',actualValue:7}]});
assert.equal(sparse.legs.length,4,'Sparse settlement indexes must preserve the highest referenced leg index');
assert.equal(sparse.legs[3].result,'WON');
assert.equal(sparse.legs[3].actualValue,7);
assert.equal(sparse.finalOutcome,'','Missing lower-index legs must prevent a false terminal ticket result');

console.log('ticket-state-model contract: ok');
