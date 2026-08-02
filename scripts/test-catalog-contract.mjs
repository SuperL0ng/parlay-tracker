#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const context={console,Object,Array,String,Number,Set,Math};context.window=context;context.globalThis=context;
vm.createContext(context);
vm.runInContext(readFileSync(new URL('../app/src/scripts/catalog.js',import.meta.url),'utf8'),context,{filename:'catalog.js'});
const C=context.ParlayCatalog;

const expectedWorldCupCodes=['ARG','AUS','AUT','BEL','BIH','BRA','CAN','CIV','COD','COL','CPV','CRO','CUW','CZE','DZA','ECU','EGY','ENG','ESP','FRA','GER','GHA','HTI','IRI','IRQ','JOR','JPN','KOR','KSA','MAR','MEX','NED','NOR','NZL','PAN','PAR','POR','QAT','RSA','SCO','SEN','SUI','SWE','TUN','TUR','URU','USA','UZB'];
assert.equal(JSON.stringify([...C.TEAM_CODES.WC].sort()),JSON.stringify(expectedWorldCupCodes),'World Cup team codes must match the confirmed 48-team field');
assert.equal(C.TEAM_CODES.WC.includes('DEN'),false,'Non-participating Denmark must not remain in the 2026 World Cup catalog');

for(const [league,types] of Object.entries(C.TYPES)){
  assert.equal(new Set(types).size,types.length,`${league} market types must be unique`);
  for(const type of types){
    assert.ok(C.LABELS[type],`${league} market ${type} must have a display label`);
    const spec=C.targetSpec(type,league);
    assert.ok(['none','milestone','line','spread'].includes(spec.mode),`${league} market ${type} returned an invalid target mode`);
    assert.equal(new Set(spec.values.map(String)).size,spec.values.length,`${league} market ${type} target values must be unique`);
    assert.ok(spec.values.every(Number.isFinite),`${league} market ${type} target values must be finite numbers`);
    if(C.needsTarget(type))assert.notEqual(spec.mode,'none',`${league} market ${type} requires a target but has no target specification`);
  }
}
for(const [league,codes] of Object.entries(C.TEAM_CODES)){
  assert.equal(new Set(codes).size,codes.length,`${league} team codes must be unique`);
  for(const code of codes)assert.ok(C.TEAM_NAMES[league]?.[code],`${league} team code ${code} must have a display name`);
}

assert.equal(JSON.stringify([...C.gameTeams('ATL @ STL')]),JSON.stringify(['ATL','STL']),'At-sign game parsing must tolerate whitespace');
assert.equal(JSON.stringify([...C.gameTeams('STL vs ATL')]),JSON.stringify(['ATL','STL']),'Versus game parsing must preserve away/home order');
assert.equal(C.displayTeam('atl','mlb'),'Atlanta Braves','Display lookups must normalize code and league case');
assert.equal(C.displayGame('atl@stl','mlb'),'Atlanta Braves @ St. Louis Cardinals','Game display must normalize code and league case');

assert.ok(Object.isFrozen(C),'The exported catalog must be frozen');
assert.ok(Object.isFrozen(C.TYPES),'The type registry must be frozen');
assert.ok(Object.isFrozen(C.TYPES.MLB),'Nested market arrays must be frozen');
assert.ok(Object.isFrozen(C.TEAM_NAMES.WC),'Nested team maps must be frozen');
assert.throws(()=>C.TYPES.MLB.push('tamper'),error=>error?.name==='TypeError','Consumers must not be able to mutate shared market definitions');

console.log('Catalog contract verified.');
