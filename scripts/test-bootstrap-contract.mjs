#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

const requiredIds=['ticketList','dashboardStatus','standaloneView','builderView','dashboardView','appTabs','ticketsTab','builderTab','newTicketBtn','backToTicketsBtn','saveTicketBtn','importTicketBtn','codeMenuBtn','codeSheetBackdrop','cancelCodeAction','showCodeAction','copyCodeAction','hideCodeBtn','codeSheet','codePanel','ticketShareModal'];
const elements=new Map(requiredIds.map(id=>[id,{}]));
const domReadyHandlers=[];
globalThis.window=globalThis;
globalThis.document={readyState:'loading',getElementById:id=>elements.get(id)||{},addEventListener(type,fn){if(type==='DOMContentLoaded')domReadyHandlers.push(fn)}};
globalThis.CustomEvent=class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}};
globalThis.dispatchEvent=()=>true;
const counts={construct:{},start:{},stop:{}};
const klass=name=>class{
  constructor(args){this.args=args;counts.construct[name]=(counts.construct[name]||0)+1}
  async start(){counts.start[name]=(counts.start[name]||0)+1;return this}
  stop(){counts.stop[name]=(counts.stop[name]||0)+1}
};
globalThis.ParlayStorage={};globalThis.ParlayTrackerSources={};globalThis.ParlayTrackerEvaluator={};globalThis.ParlaySettlementService={};
globalThis.TrackerService=klass('tracker');globalThis.BuilderController=klass('builder');globalThis.SharingController=klass('sharing');globalThis.TicketViewController=klass('viewer');globalThis.DashboardController=klass('dashboard');globalThis.AppController=klass('app');
const source=readFileSync(new URL('../app/src/scripts/bootstrap.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'bootstrap.js'});const firstApi=globalThis.ParlayBootstrap;
vm.runInThisContext(source,{filename:'bootstrap-second-copy.js'});const secondApi=globalThis.ParlayBootstrap;

assert.equal(domReadyHandlers.length,2,'Each physical script copy may register once, but startup must share one global lock');
assert.equal(typeof domReadyHandlers[0],'function','Bootstrap must retain DOM-ready auto-start behavior');
assert.equal(typeof globalThis.ParlayBootstrap?.start,'function','Bootstrap must expose a controlled start operation');
assert.equal(typeof globalThis.ParlayBootstrap?.stop,'function','Bootstrap must expose teardown for rollback and tests');
const [first,second]=await Promise.all([firstApi.start(),secondApi.start()]);
assert.equal(first,second,'Concurrent bootstrap calls must resolve to the same application instance');
for(const name of ['tracker','builder','sharing','viewer','dashboard','app'])assert.equal(counts.construct[name],1,`${name} must be constructed once`);
for(const name of ['builder','sharing','viewer','dashboard','app'])assert.equal(counts.start[name],1,`${name} must be started once`);
assert.equal(globalThis.parlayApp,first,'Successful bootstrap must publish the one application instance');
await globalThis.ParlayBootstrap.stop();
for(const name of ['app','dashboard','viewer','sharing','builder'])assert.equal(counts.stop[name],1,`${name} must be stopped during teardown`);
assert.equal(globalThis.parlayApp,undefined,'Teardown must release the published application instance');


globalThis.AppController=class{
  constructor(){counts.construct.app=(counts.construct.app||0)+1}
  start(){counts.start.app=(counts.start.app||0)+1;throw new Error('app start failed')}
  stop(){counts.stop.app=(counts.stop.app||0)+1}
};
await assert.rejects(globalThis.ParlayBootstrap.start(),/app start failed/,'A startup failure must reject the controlled bootstrap');
for(const name of ['dashboard','viewer','sharing','builder'])assert.equal(counts.stop[name],2,`${name} must roll back after a later startup failure`);
assert.equal(globalThis.parlayApp,undefined,'Failed bootstrap must not publish a partial application');

console.log('Bootstrap lifecycle contract passed.');
