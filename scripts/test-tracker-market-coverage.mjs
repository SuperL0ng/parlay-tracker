#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

globalThis.window=globalThis;globalThis.fetch=async()=>({ok:true,json:async()=>({})});
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-core.js',import.meta.url),'utf8'),{filename:'tracker-core.js'});
globalThis.ParlayTrackerSources={sourceStatusFor:()=>'',loadGameData:async()=>({summary:null,mlbFeed:null,errors:[]}),baseballStat:()=>null,getPoints:()=>null,getRebounds:()=>null,getAssists:()=>null,getBlocks:()=>null,getThrees:()=>null,getDoubleCount:()=>null};
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/tracker-evaluator.js',import.meta.url),'utf8'),{filename:'tracker-evaluator.js'});
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/settlement-service.js',import.meta.url),'utf8'),{filename:'settlement-service.js'});

const markets={
  MLB:['ml','spread','f5_ml','f5_spread','f5_total_over','f5_total_under','team_total_over','team_total_under','total_over','total_under','pitcher_outs_under','pitcher_ks','pitcher_ks_under','player_hits','player_total_bases','player_runs','player_hr','player_rbi','player_walks','player_stolen_bases','player_hwsb','player_hrrbi','manual','void'],
  NBA:['ml','spread','h1_ml','h1_spread','team_total_over','team_total_under','total_over','total_under','h1_total_over','h1_total_under','player_points','player_rebounds','player_assists','player_points_rebounds','player_pr','player_points_assists','player_pa','player_rebounds_assists','player_ra','player_points_rebounds_assists','player_pra','player_double_double','player_triple_double','player_blocks','player_threes','manual','void'],
  WNBA:['ml','spread','h1_ml','h1_spread','team_total_over','team_total_under','total_over','total_under','h1_total_over','h1_total_under','player_points','player_rebounds','player_assists','player_points_rebounds','player_pr','player_points_assists','player_pa','player_rebounds_assists','player_ra','player_points_rebounds_assists','player_pra','player_double_double','player_triple_double','player_blocks','player_threes','manual','void']
};
for(const [league,types] of Object.entries(markets))for(const type of types){assert.equal(globalThis.ParlayTrackerEvaluator.supports(league,type),true,`${league} ${type} must have live evaluator coverage`);assert.equal(globalThis.ParlaySettlementService.supports(league,type),true,`${league} ${type} must have settlement coverage`);}
assert.equal(globalThis.ParlayTrackerEvaluator.supports('WC','ml'),false,'World Cup is intentionally outside Gate 3');
assert.equal(globalThis.ParlaySettlementService.supports('WC','ml'),false,'World Cup is intentionally outside Gate 3');
console.log('Tracker market coverage verified.');
