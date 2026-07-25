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
const classList=()=>({add(){},remove(){},contains(){return false},toggle(){}});
const docHub=new Hub(),winHub=new Hub();
const bodyChildren=[];
const makePanel=()=>({className:'',dataset:{},innerHTML:'',style:{},offsetHeight:100,remove(){this.removed=true},querySelector(selector){return{value:selector.includes('sort')?'saved':selector.includes('direction')?'desc':'all'}},classList:classList()});
globalThis.window=globalThis;
globalThis.addEventListener=winHub.addEventListener.bind(winHub);globalThis.removeEventListener=winHub.removeEventListener.bind(winHub);
globalThis.document={
  hidden:false,
  body:{classList:classList(),append(...nodes){bodyChildren.push(...nodes)},appendChild(node){bodyChildren.push(node)}},
  addEventListener:docHub.addEventListener.bind(docHub),removeEventListener:docHub.removeEventListener.bind(docHub),
  createElement:()=>makePanel(),createDocumentFragment:()=>({appendChild(){}}),createTextNode:text=>({textContent:text}),
  querySelector:()=>null,querySelectorAll:()=>[]
};
globalThis.confirm=()=>true;
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/ticket-state-model.js',import.meta.url),'utf8'),{filename:'ticket-state-model.js'});
vm.runInThisContext(readFileSync(new URL('../app/src/scripts/dashboard-controller.js',import.meta.url),'utf8'),{filename:'dashboard-controller.js'});
const dashboardCss=readFileSync(new URL('../app/src/styles/dashboard.css',import.meta.url),'utf8');
const stateModel=globalThis.ParlayTicketStateModel;
const root={replaceChildren(){},appendChild(){},parentElement:{querySelector:()=>null,querySelectorAll:()=>[]},insertAdjacentElement(){}};
const status={textContent:''};
const makeController=({storage={KEY:'k',load:()=>[]},tracker={}}={})=>new globalThis.DashboardController({storage,tracker,stateModel,root,status});

{
  const controller=makeController();
  controller.render=()=>{};
  controller.start();controller.start();
  assert.equal(docHub.count('click'),1,'Dashboard startup must be idempotent');
  assert.equal(winHub.count('storage'),1,'Dashboard storage listener must be registered once');
  assert.equal(typeof controller.stop,'function','Dashboard controller must expose teardown');
  controller.stop();
  assert.equal(docHub.count('click'),0,'Dashboard teardown must remove document listeners');
  assert.equal(winHub.count('storage'),0,'Dashboard teardown must remove window listeners');
}

{
  const controller=makeController({storage:{load:()=>[],find:()=>null}});
  controller.state.actionMenuId='old';
  controller.showActions('missing',{getBoundingClientRect:()=>({right:10,bottom:10}),setAttribute(){}});
  assert.equal(controller.state.actionMenuId,'','A missing ticket must not retain action-menu ownership');
}

{
  const controller=makeController();
  let closedActions=0;controller.closeActions=()=>{closedActions++;controller.state.actionMenuId=''};
  controller.closeSortFilter=()=>{};
  controller.showSortFilter();
  assert.equal(closedActions,1,'Opening Sort & Filter must destroy any Actions panel first');
}

{
  let controller;
  const renderStates=[];
  const storage={
    load:()=>[],
    remove(){controller.onStorage({});return 2}
  };
  controller=makeController({storage});
  controller.render=()=>renderStates.push({selectMode:controller.state.selectMode,selected:controller.state.selectedIds.size});
  controller.state.selectMode=true;controller.state.selectedIds=new Set(['a','b']);
  controller.deleteSelected();
  assert.equal(controller.state.selectMode,false,'Bulk deletion must exit Select mode');
  assert.equal(controller.state.selectedIds.size,0,'Bulk deletion must clear selection ownership');
  assert.deepEqual(renderStates.at(-1),{selectMode:false,selected:0},'Synchronous storage events must render the post-deletion state, not stale Select mode');
}

{
  const records=[{id:'a',status:'active',ticket:{type:'straight',legs:[{}]}},{id:'b',status:'active',ticket:{type:'straight',legs:[{}]}}];
  const controller=makeController({storage:{load:()=>records}});controller.render=()=>{};
  controller.toggleExpandAll();
  assert.deepEqual([...controller.state.expandedIds].sort(),['a','b'],'Expand All must own expansion by visible ticket ID');
  controller.toggleExpandAll();
  assert.equal(controller.state.expandedIds.size,0,'Collapse All must clear visible expansion ownership');
  controller.state.selectMode=true;controller.toggleSelectAll();
  assert.deepEqual([...controller.state.selectedIds].sort(),['a','b'],'Select All must select the currently visible ticket IDs');
  controller.toggleSelectAll();
  assert.equal(controller.state.selectedIds.size,0,'Deselect All must clear the visible selection');
  controller.state.selectedIds.add('a');controller.cancelSelection(false);
  assert.equal(controller.state.selectMode,false,'Cancel must leave selection mode');
  assert.equal(controller.state.selectedIds.size,0,'Cancel must clear selected IDs');
}

{
  const controller=makeController();
  let closed=0;controller.closeOverlays=()=>{closed++};document.hidden=true;
  controller.onVisibility();controller.onPageHide();
  assert.equal(closed,2,'Backgrounding or leaving the page must remove all dashboard overlays');
  document.hidden=false;
}

{
  const controller=makeController();
  const overlays=[{removed:false,remove(){this.removed=true}},{removed:false,remove(){this.removed=true}},{removed:false,remove(){this.removed=true}}];
  const originalAll=document.querySelectorAll,originalOne=document.querySelector;
  document.querySelectorAll=selector=>selector==='.sortFilterPanel,.sortFilterBackdrop'?overlays:[];document.querySelector=()=>null;
  controller.closeSortFilter();
  assert.ok(overlays.every(node=>node.removed),'Overlay cleanup must remove every stale Sort & Filter node, not only the first');
  document.querySelectorAll=originalAll;document.querySelector=originalOne;
}

{
  const record={id:'ticket-735',status:'completed',sportsbook:'DraftKings',liveOutcome:'PENDING',ticket:{title:'+735',type:'sgp',league:'MLB',game:'TEX@ATL',legs:[{label:'A',target:1},{label:'B',target:1},{label:'C',target:2},{label:'D',target:2}]},trackerSnapshot:{outcome:'PENDING',legs:[{state:'pending',value:1},{state:'pending',value:1},{state:'pending',value:2},{state:'pending',value:2}]},legSettlements:[{index:0,status:'WIN',actualValue:2},{index:1,status:'WIN',actualValue:1},{index:2,status:'WIN',actualValue:4},{index:3,status:'WIN',actualValue:6}]};
  const controller=makeController({storage:{load:()=>[record]}});
  const view=controller.recordsForRender()[0];
  assert.equal(view.workflow,'COMPLETE','Dashboard must keep workflow state independent from outcome');
  assert.equal(view.displayOutcome,'WON','Dashboard must derive the final result from terminal settlements');
  assert.deepEqual([...view.legs].map(leg=>leg.actualValue),[2,1,4,6],'Dashboard must consume normalized actual values');
  const card=controller.ticketCard(view);
  assert.match(card.innerHTML,/DRAFTKINGS/,'Sportsbook badges must retain uppercase display text');
  assert.match(card.innerHTML,/workflowBadge">COMPLETE/,'Workflow and result must render as separate concepts');
  assert.match(card.innerHTML,/stateBadge">WON/,'Final result must remain independently visible');
  assert.match(card.innerHTML,/data-leg-state="won"/,'Terminal winning legs must expose a semantic presentation state');
}

{
  const record={id:'states',status:'active',ticket:{title:'+100',type:'parlay',league:'MLB',legs:[{label:'Lost'},{label:'Push'},{label:'Live'},{label:'Pending'}]},trackerSnapshot:{outcome:'LIVE',legs:[{state:'lost',value:0},{state:'push',value:1},{state:'live',value:2},{state:'pending',value:0}]},legSettlements:[{index:0,status:'LOSS',actualValue:0},{index:1,status:'VOID',actualValue:1}]};
  const controller=makeController({storage:{load:()=>[record]}});
  const html=controller.legsHtml(controller.view(record));
  for(const state of ['lost','push','live','pending'])assert.match(html,new RegExp(`data-leg-state="${state}"`),`Expanded legs must expose ${state} state`);
  for(const state of ['won','lost','push','live','pending','suspended','unavailable'])assert.ok(dashboardCss.includes(`data-leg-state="${state}"`),`Dashboard stylesheet must define ${state} leg presentation`);
}

{
  const record={id:'parlay-1',status:'active',ticket:{title:'+200',type:'parlay',league:'MLB',legs:[{game:'ATL@NYM'},{game:'LAD@SF'}]}};
  const controller=makeController({storage:{load:()=>[record]}});
  const card=controller.ticketCard(controller.view(record));
  assert.doesNotMatch(card.innerHTML,/ATL@NYM/,'A multi-game parlay must not infer ticket metadata from one leg');
  assert.match(card.innerHTML,/PARLAY · MLB · 2 LEGS/,'Parlay metadata must retain type, league, and leg count');
}

console.log('Dashboard controller contract passed.');