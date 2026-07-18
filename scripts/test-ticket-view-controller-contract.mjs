#!/usr/bin/env node
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import vm from 'node:vm';

class Hub{
  constructor(){this.listeners=new Map()}
  addEventListener(type,fn){const list=this.listeners.get(type)||[];list.push(fn);this.listeners.set(type,list)}
  removeEventListener(type,fn){this.listeners.set(type,(this.listeners.get(type)||[]).filter(item=>item!==fn))}
  count(type){return (this.listeners.get(type)||[]).length}
  dispatchEvent(event){for(const fn of [...(this.listeners.get(event.type)||[])])fn.call(this,event);return true}
}
const root=Object.assign(new Hub(),{innerHTML:''});
const win=new Hub();
globalThis.window=globalThis;
globalThis.addEventListener=win.addEventListener.bind(win);
globalThis.removeEventListener=win.removeEventListener.bind(win);
globalThis.dispatchEvent=win.dispatchEvent.bind(win);
globalThis.document={getElementById:id=>id==='standaloneView'?root:null};
globalThis.location={href:'https://example.test/',hash:''};
globalThis.history={replaceState(){}};
globalThis.CustomEvent=class CustomEvent{constructor(type,options={}){this.type=type;this.detail=options.detail}};
globalThis.close=()=>{};globalThis.closed=false;
const source=readFileSync(new URL('../app/src/scripts/ticket-view-controller.js',import.meta.url),'utf8');
vm.runInThisContext(source,{filename:'ticket-view-controller.js'});

{
  const controller=new globalThis.TicketViewController({storage:{load:()=>[]},tracker:{refresh:async()=>({})}});
  controller.start();controller.start();
  assert.equal(root.count('click'),1,'Ticket view startup must be idempotent');
  assert.equal(win.count('parlay:tracker-updated'),1,'Tracker listener must be registered once');
  assert.equal(typeof controller.stop,'function','Ticket view must expose teardown');
  controller.stop();
  assert.equal(root.count('click'),0,'Ticket view teardown must remove click handling');
  assert.equal(win.count('parlay:tracker-updated'),0,'Ticket view teardown must remove tracker handling');
}

{
  const resolvers=new Map();
  const tracker={refresh:({ids})=>new Promise(resolve=>resolvers.set(String(ids[0]),resolve))};
  const controller=new globalThis.TicketViewController({storage:{load:()=>[]},tracker});
  const renders=[];controller.render=status=>renders.push({mode:controller.mode?.id||'',status});
  controller.mode={kind:'ticket',id:'A'};const first=controller.refresh();
  controller.mode={kind:'ticket',id:'B'};const second=controller.refresh();
  resolvers.get('B')({ids:['B']});await second;
  resolvers.get('A')({ids:['A']});await first;
  assert.equal(renders.filter(item=>item.status.startsWith('Updated')).length,1,'A stale refresh completion must not repaint the current route');
  assert.equal(renders.at(-1).mode,'B','The current ticket route must retain render ownership');
}

{
  const controller=new globalThis.TicketViewController({storage:{load:()=>[{id:'B',status:'active',ticket:{legs:[]}}]},tracker:{refresh:async()=>({})}});
  controller.mode={kind:'ticket',id:'B'};let renders=0;controller.render=()=>{renders++};
  controller.onUpdated({detail:{ids:['A']}});
  assert.equal(renders,0,'Unrelated tracker updates must not repaint a standalone ticket');
  assert.equal(typeof controller.deactivate,'function','Ticket view must support route deactivation without rewriting history');
  controller.deactivate();
  assert.equal(controller.mode,null,'Route deactivation must clear standalone ownership');
}

{
  const controller=new globalThis.TicketViewController({storage:{load:()=>[]},tracker:{refresh:async()=>({})}});
  controller.mode={kind:'active'};let renders=0;controller.render=()=>{renders++};
  controller.onUpdated({detail:{ids:['just-completed']}});
  assert.equal(renders,1,'Active view must repaint when a tracked ticket leaves the active set');
}

console.log('Ticket view controller contract passed.');
