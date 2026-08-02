#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Hub{
  constructor(){this.listeners=new Map()}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list)}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn))}
  count(type){return (this.listeners.get(type)||[]).length}
}
const classList=()=>({add(){},remove(){},contains(){return true},toggle(){}});
const element=()=>Object.assign(new Hub(),{classList:classList(),value:'',textContent:'',appendChild(){},select(){},remove(){},scrollIntoView(){}});
const ids=['ticketsTab','builderTab','newTicketBtn','backToTicketsBtn','saveTicketBtn','importTicketBtn','codeMenuBtn','codeSheetBackdrop','cancelCodeAction','showCodeAction','copyCodeAction','hideCodeBtn','builderView','standaloneView','dashboardView','appTabs','codeSheet','codePanel','ticketShareModal','output','previewStatus'];
const elements=new Map(ids.map(id=>[id,element()]));
const win=new Hub();
globalThis.window=globalThis;globalThis.addEventListener=win.addEventListener.bind(win);globalThis.removeEventListener=win.removeEventListener.bind(win);
globalThis.document={body:{classList:classList(),appendChild(){}},getElementById:id=>elements.get(id)||null,createElement:()=>element(),execCommand:()=>true};
globalThis.location={href:'https://example.test/',hash:''};
globalThis.history={replaceState(){}};globalThis.requestAnimationFrame=fn=>fn();globalThis.scrollTo=()=>{};
const source=readFileSync(new URL('../app/src/scripts/app-controller.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'app-controller.js'});

const dependencies=()=>({
  storage:{},
  builder:{restoreDraft(){},resetNew(){},captureDraft(){},save(){},currentCode(){return''},codeForRecord(){return''},loadRecord(){}},
  sharing:{openImport(){},consumeHash(){return false},close(){},share(){}},
  viewer:{enterFromHash:async()=>false,deactivate(){},leave(){}},
  dashboard:{closeOverlays(){},render(){}}
});

{
  const deps=dependencies(),app=new globalThis.AppController(deps);app.route=async()=>{};
  app.start();app.start();
  assert.equal(elements.get('ticketsTab').count('click'),1,'Application startup must be idempotent');
  assert.equal(win.count('hashchange'),1,'Router listener must be registered once');
  assert.equal(typeof app.stop,'function','Application controller must expose teardown');
  app.stop();
  assert.equal(elements.get('ticketsTab').count('click'),0,'Application teardown must remove element listeners');
  assert.equal(win.count('hashchange'),0,'Application teardown must remove router listeners');
}

{
  const deps=dependencies(),pending=[];let dashboardShows=0;
  deps.viewer.enterFromHash=()=>new Promise(resolve=>pending.push(resolve));
  const app=new globalThis.AppController(deps);app.showDashboard=()=>{dashboardShows++};
  const first=app.route(),second=app.route();
  pending[1](true);await second;
  pending[0](false);await first;
  assert.equal(dashboardShows,0,'A stale route completion must not replace a newer standalone route');
}

{
  const deps=dependencies();let dashboardClosed=0,sharingClosed=0,viewerDeactivated=0,codeClosed=0;
  deps.dashboard.closeOverlays=()=>{dashboardClosed++};deps.sharing.close=()=>{sharingClosed++};deps.viewer.deactivate=()=>{viewerDeactivated++};
  const app=new globalThis.AppController(deps);app.closeCodeSheet=()=>{codeClosed++};
  app.showBuilder();
  assert.equal(dashboardClosed,1,'Builder transition must close dashboard overlays');
  assert.equal(sharingClosed,1,'Builder transition must close sharing overlays');
  assert.equal(codeClosed,1,'Builder transition must close app-owned code overlays');
  assert.equal(viewerDeactivated,1,'Builder transition must release standalone route ownership');
}

{
  const deps=dependencies();let consumed=0,deactivated=0,shown=0;location.hash='#share=test';
  deps.sharing.consumeHash=()=>{consumed++;return true};deps.viewer.enterFromHash=async()=>false;deps.viewer.deactivate=()=>{deactivated++};
  const app=new globalThis.AppController(deps);app.showDashboard=()=>{shown++};
  await app.route();
  assert.equal(consumed,1,'AppController must be the sole owner that consumes share hashes');
  assert.equal(deactivated,1,'A share route must clear stale viewer ownership');
  assert.equal(shown,1,'A share route must resolve onto the dashboard once before opening import');
  location.hash='';
}

{
  const deps=dependencies(),pending=[];let dashboardShows=0;location.hash='#ticket=A';
  deps.viewer.enterFromHash=()=>new Promise(resolve=>pending.push(resolve));
  const app=new globalThis.AppController(deps);app.showDashboard=()=>{dashboardShows++};
  const routing=app.route();app.showBuilder();pending[0](false);await routing;
  assert.equal(dashboardShows,0,'An explicit Builder transition must invalidate an older pending route');
  location.hash='';
}

{
  const deps=dependencies();deps.viewer.enterFromHash=async()=>{throw new Error('route exploded')};
  const app=new globalThis.AppController(deps);app.onHashChange();await new Promise(resolve=>setTimeout(resolve,0));
  assert.match(elements.get('previewStatus').textContent,/Navigation failed: route exploded/,'Hash routing failures must be contained and surfaced instead of becoming unhandled rejections');
}

console.log('App controller contract passed.');
