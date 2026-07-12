/* BUILDER_BEHAVIOR_FIXES_V49 */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const store=x=>localStorage.setItem(KEY,JSON.stringify(x));
  let internalLegGameChange=false;
  let previousTicketGame='';
  let readableFrame=0;
  let manualTicketGameTimer=0;

  function addPerformanceCss(){
    if(document.getElementById('mobilePerformanceCss'))return;
    const style=document.createElement('style');
    style.id='mobilePerformanceCss';
    style.textContent='@supports (-webkit-touch-callout:none){body{background-attachment:scroll!important}}';
    document.head.appendChild(style);
  }

  function disconnectBroadReadableObserver(){
    try{readableOptionsObserver.disconnect()}catch{}
  }

  function scheduleReadableRefresh(){
    if(readableFrame)return;
    readableFrame=requestAnimationFrame(()=>{
      readableFrame=0;
      try{refreshReadableOptions()}catch{}
    });
  }

  function wrapReadableRenderers(){
    for(const name of ['renderOptions','renderPlayers']){
      const original=window[name];
      if(typeof original!=='function'||original.__targetedReadableRefresh)return;
      const wrapped=function(...args){
        const out=original.apply(this,args);
        scheduleReadableRefresh();
        return out;
      };
      wrapped.__targetedReadableRefresh=true;
      window[name]=wrapped;
    }
  }

  function legGameValue(leg){
    if(!leg)return'';
    try{return window.legGame(leg)}catch{return''}
  }

  function exactGameOption(select,value){
    return [...(select?.options||[])].find(option=>option.value===value)||null;
  }

  function setLegGame(leg,value,inherited=true){
    if(!leg)return;
    value=String(value||'').trim();
    const select=leg.querySelector('.lgame');
    const manual=leg.querySelector('.lgameManual');
    if(!select||!manual)return;
    internalLegGameChange=true;
    const exact=exactGameOption(select,value);
    if(!value){
      select.value='';
      manual.value='';
      manual.classList.add('hide');
    }else if(exact){
      select.value=value;
      manual.value='';
      manual.classList.add('hide');
    }else{
      select.value=typeof MAN!=='undefined'?MAN:'__manual__';
      manual.value=value;
      manual.classList.remove('hide');
    }
    leg.dataset.ticketGameInherited=inherited?'1':'0';
    leg.dataset.ticketGameInheritedValue=inherited?value:'';
    try{refreshLeg(leg)}catch{}
    try{autoFillLabel(leg)}catch{}
    internalLegGameChange=false;
    if(inherited&&value){
      for(const delay of [150,500,1200])setTimeout(()=>reconcileInheritedGame(leg,value),delay);
    }
  }

  function reconcileInheritedGame(leg,value){
    if(!leg?.isConnected||leg.dataset.ticketGameInherited!=='1'||leg.dataset.ticketGameInheritedValue!==value)return;
    const select=leg.querySelector('.lgame'),manual=leg.querySelector('.lgameManual'),exact=exactGameOption(select,value);
    if(!exact)return;
    internalLegGameChange=true;
    select.value=value;
    manual.value='';
    manual.classList.add('hide');
    try{refreshLeg(leg)}catch{}
    internalLegGameChange=false;
  }

  function applyTicketGameToLegs(){
    if(typeof ttype!=='function'||ttype()!=='parlay')return;
    const current=typeof ticketGame==='function'?ticketGame():'';
    document.querySelectorAll('#legs > .leg').forEach(leg=>{
      const existing=legGameValue(leg);
      const inherited=leg.dataset.ticketGameInherited==='1';
      if(!existing||inherited||(previousTicketGame&&existing===previousTicketGame))setLegGame(leg,current,true);
    });
    previousTicketGame=current;
    try{preview()}catch{}
  }

  function seedNewLeg(leg){
    if(!leg||typeof ttype!=='function'||ttype()!=='parlay')return;
    const current=typeof ticketGame==='function'?ticketGame():'';
    if(!current)return;
    const dateInput=leg.querySelector('.ldate');
    const leagueSelect=leg.querySelector('.lleague');
    if(dateInput&&!dateInput.value)dateInput.value=document.getElementById('date')?.value||'';
    if(leagueSelect&&typeof league==='function')leagueSelect.value=league();
    setLegGame(leg,current,true);
  }

  function installAddLegHook(){
    const original=window.addLeg;
    if(typeof original!=='function'||original.__ticketGameSeedWrapped)return;
    const wrapped=function(...args){
      const before=new Set([...document.querySelectorAll('#legs > .leg')]);
      const out=original.apply(this,args);
      const added=[...document.querySelectorAll('#legs > .leg')].find(leg=>!before.has(leg));
      if(added)requestAnimationFrame(()=>seedNewLeg(added));
      return out;
    };
    wrapped.__ticketGameSeedWrapped=true;
    window.addLeg=wrapped;
  }

  function installLoadRecordHook(){
    const original=window.loadRecordIntoBuilder;
    if(typeof original!=='function'||original.__ticketGameInheritanceWrapped)return;
    const wrapped=function(record,...args){
      const out=original.call(this,record,...args);
      const ticket=record?.ticket||{};
      const legs=[...document.querySelectorAll('#legs > .leg')];
      legs.forEach((leg,index)=>{
        const source=ticket.legs?.[index]||{};
        const inherited=Boolean(ticket.game)&&(!source.game||source.game===ticket.game);
        leg.dataset.ticketGameInherited=inherited?'1':'0';
        leg.dataset.ticketGameInheritedValue=inherited?ticket.game:'';
      });
      previousTicketGame=String(ticket.game||'');
      return out;
    };
    wrapped.__ticketGameInheritanceWrapped=true;
    window.loadRecordIntoBuilder=wrapped;
  }

  function installSaveOrderHook(){
    const original=window.saveCurrentTicket;
    if(typeof original!=='function'||original.__newTicketFirstWrapped)return;
    const wrapped=function(...args){
      const beforeIds=new Set(load().map(record=>record.id));
      const out=original.apply(this,args);
      const list=load();
      const createdIndex=list.findIndex(record=>!beforeIds.has(record.id));
      if(createdIndex>0){
        const [created]=list.splice(createdIndex,1);
        list.unshift(created);
        store(list);
        window.renderTicketDashboard?.();
      }
      return out;
    };
    wrapped.__newTicketFirstWrapped=true;
    window.saveCurrentTicket=wrapped;
  }

  function installDuplicateOrderHook(){
    if(typeof window.duplicateSavedTicket!=='function'||window.duplicateSavedTicket.__belowOriginalWrapped)return;
    const wrapped=function(id){
      const list=load();
      const index=list.findIndex(record=>record.id===id);
      if(index<0)return;
      const src=list[index],now=new Date().toISOString(),copy=JSON.parse(JSON.stringify(src));
      copy.id=globalThis.crypto?.randomUUID?.()||('ticket-'+Date.now()+'-'+Math.random().toString(36).slice(2,8));
      copy.createdAt=now;
      copy.updatedAt=now;
      if(copy.ticket)copy.ticket.title=(copy.ticket.title||'Untitled')+' Copy';
      if(copy.canonical)copy.canonical.title=(copy.canonical.title||'Untitled')+' Copy';
      list.splice(index+1,0,copy);
      store(list);
      window.renderTicketDashboard?.();
    };
    wrapped.__belowOriginalWrapped=true;
    window.duplicateSavedTicket=wrapped;
  }

  function installImportedTicketOrder(){
    document.addEventListener('click',event=>{
      const button=event.target.closest?.('#ticketSharePrimary');
      if(!button||!/save ticket/i.test(String(button.textContent||'')))return;
      const beforeIds=new Set(load().map(record=>record.id));
      setTimeout(()=>{
        const list=load();
        const index=list.findIndex(record=>!beforeIds.has(record.id));
        if(index>0){
          const [created]=list.splice(index,1);
          list.unshift(created);
          store(list);
          window.renderTicketDashboard?.();
        }
      },40);
    },true);
  }

  function installBuilderEvents(){
    const ticketGameSelect=document.getElementById('ticketGame');
    const ticketGameManual=document.getElementById('ticketGameManual');
    previousTicketGame=typeof ticketGame==='function'?ticketGame():'';
    ticketGameSelect?.addEventListener('change',()=>setTimeout(applyTicketGameToLegs,0));
    ticketGameManual?.addEventListener('input',()=>{
      clearTimeout(manualTicketGameTimer);
      manualTicketGameTimer=setTimeout(applyTicketGameToLegs,180);
    });
    document.getElementById('ticketType')?.addEventListener('change',()=>setTimeout(applyTicketGameToLegs,0));
    document.addEventListener('change',event=>{
      const select=event.target.closest?.('.lgame');
      if(select&&!internalLegGameChange){
        const leg=select.closest('.leg');
        if(leg){leg.dataset.ticketGameInherited='0';leg.dataset.ticketGameInheritedValue=''}
      }
    });
    document.addEventListener('input',event=>{
      const input=event.target.closest?.('.lgameManual');
      if(input&&!internalLegGameChange){
        const leg=input.closest('.leg');
        if(leg){leg.dataset.ticketGameInherited='0';leg.dataset.ticketGameInheritedValue=''}
      }
    });
  }

  function install(){
    addPerformanceCss();
    wrapReadableRenderers();
    disconnectBroadReadableObserver();
    installAddLegHook();
    installLoadRecordHook();
    installSaveOrderHook();
    installDuplicateOrderHook();
    installImportedTicketOrder();
    installBuilderEvents();
    scheduleReadableRefresh();
  }

  install();
  window.addEventListener('load',()=>{
    disconnectBroadReadableObserver();
    wrapReadableRenderers();
    installAddLegHook();
    installLoadRecordHook();
    installSaveOrderHook();
    installDuplicateOrderHook();
    scheduleReadableRefresh();
  },{once:true});
})();
