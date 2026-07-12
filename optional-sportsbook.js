/* OPTIONAL_SPORTSBOOK_V43 */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const SHARE_PREFIX='PT1.';
  const clean=v=>String(v??'').trim();
  const clone=v=>JSON.parse(JSON.stringify(v));
  const load=()=>{try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}};
  const store=x=>localStorage.setItem(KEY,JSON.stringify(x));

  function bytesToB64(bytes){
    let binary='';
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function shareCode(ticket){
    const pkg={v:1,ticket:clone(ticket)};
    return SHARE_PREFIX+bytesToB64(new TextEncoder().encode(JSON.stringify(pkg)));
  }
  function shareUrl(record){
    return location.href.split('#')[0]+'#share='+encodeURIComponent(shareCode(record.canonical||record.ticket));
  }

  function ensureBuilderBlankOption(){
    const select=document.getElementById('sportsbook');
    if(!select)return;
    if(![...select.options].some(o=>o.value==='')){
      const option=document.createElement('option');
      option.value='';
      option.textContent='No sportsbook';
      select.insertBefore(option,select.firstChild);
    }
  }

  function installBuilderHooks(){
    ensureBuilderBlankOption();

    const originalRecord=window.ticketRecordFromBuilder;
    if(typeof originalRecord==='function'&&!originalRecord.__optionalBookWrapped){
      const wrapped=function(...args){
        const record=originalRecord.apply(this,args);
        if(!clean(document.getElementById('sportsbook')?.value))record.sportsbook='';
        return record;
      };
      wrapped.__optionalBookWrapped=true;
      window.ticketRecordFromBuilder=wrapped;
    }

    const originalReset=window.resetBuilderForNew;
    if(typeof originalReset==='function'&&!originalReset.__optionalBookWrapped){
      const wrapped=function(...args){
        const out=originalReset.apply(this,args);
        ensureBuilderBlankOption();
        const select=document.getElementById('sportsbook');
        if(select)select.value='';
        return out;
      };
      wrapped.__optionalBookWrapped=true;
      window.resetBuilderForNew=wrapped;
    }

    const originalLoad=window.loadRecordIntoBuilder;
    if(typeof originalLoad==='function'&&!originalLoad.__optionalBookWrapped){
      const wrapped=function(record,...args){
        ensureBuilderBlankOption();
        const out=originalLoad.call(this,record,...args);
        const select=document.getElementById('sportsbook');
        if(select)select.value=clean(record?.sportsbook);
        return out;
      };
      wrapped.__optionalBookWrapped=true;
      window.loadRecordIntoBuilder=wrapped;
    }
  }

  function ensureImportBookSelect(){
    const modal=document.getElementById('ticketShareModal');
    if(!modal||document.getElementById('ticketImportSportsbook'))return;
    const preview=document.getElementById('ticketSharePreview');
    const wrap=document.createElement('div');
    wrap.id='ticketImportSportsbookWrap';
    wrap.innerHTML=`<label for="ticketImportSportsbook">Sportsbook <span style="text-transform:none;letter-spacing:0;font-weight:600">(optional)</span></label><select id="ticketImportSportsbook"><option value="">No sportsbook</option><option value="DraftKings">DraftKings</option><option value="FanDuel">FanDuel</option><option value="BetMGM">BetMGM</option><option value="Caesars">Caesars</option><option value="Other">Other</option></select>`;
    modal.insertBefore(wrap,preview);
    document.getElementById('ticketImportSportsbook').addEventListener('change',syncImportPreviewBook);
  }

  function syncImportPreviewBook(){
    const selected=clean(document.getElementById('ticketImportSportsbook')?.value);
    const badge=document.querySelector('#ticketSharePreview .bookBadge');
    if(!badge)return;
    badge.textContent=selected;
    badge.classList.toggle('hide',!selected);
  }

  function resetImportBook(){
    ensureImportBookSelect();
    const select=document.getElementById('ticketImportSportsbook');
    if(select)select.value='';
    requestAnimationFrame(syncImportPreviewBook);
  }

  function installImportSaveHook(){
    document.addEventListener('click',event=>{
      const button=event.target.closest('#ticketSharePrimary');
      if(!button||!/save ticket/i.test(clean(button.textContent)))return;
      const before=load().map(r=>r.id);
      const selected=clean(document.getElementById('ticketImportSportsbook')?.value);
      setTimeout(()=>{
        const list=load();
        const record=[...list].reverse().find(r=>!before.includes(r.id));
        if(!record)return;
        record.sportsbook=selected;
        store(list);
        window.renderTicketDashboard?.();
      },0);
    },true);
  }

  async function shareWithoutSportsbook(id){
    const record=load().find(r=>r.id===id);
    if(!record)return;
    const url=shareUrl(record);
    const title=`Parlay Tracker ${record.ticket?.title||'Ticket'}`;
    const text=`${title}\nOpen this ticket in Parlay Tracker:`;
    try{
      if(navigator.share){await navigator.share({title,text,url});return}
      await navigator.clipboard.writeText(url);
      alert('Share link copied.');
    }catch(error){
      if(error?.name==='AbortError')return;
      try{await navigator.clipboard.writeText(url);alert('Share link copied.')}catch{alert(url)}
    }
  }

  function installShareInterception(){
    document.addEventListener('click',event=>{
      const button=event.target.closest('.shareTicketBtn');
      if(!button)return;
      const card=button.closest('.savedTicket');
      const cards=[...document.querySelectorAll('.savedTicket')];
      const index=cards.indexOf(card);
      const record=load()[index];
      if(!record)return;
      event.preventDefault();
      event.stopImmediatePropagation();
      shareWithoutSportsbook(record.id);
    },true);
    window.shareSavedTicket=shareWithoutSportsbook;
  }

  function decorateBlankBooks(){
    const records=load();
    document.querySelectorAll('.savedTicket').forEach((card,index)=>{
      const badge=card.querySelector('.bookBadge');
      if(badge)badge.classList.toggle('hide',!clean(records[index]?.sportsbook));
    });

    const params=new URLSearchParams(location.hash.slice(1));
    const id=params.get('ticket');
    const active=params.get('view')==='active';
    const visible=id?records.filter(r=>r.id===id):active?records.filter(r=>r.status!=='completed'):[];
    document.querySelectorAll('.liveTicketCard').forEach((card,index)=>{
      const badge=card.querySelector('.bookBadge');
      if(badge)badge.classList.toggle('hide',!clean(visible[index]?.sportsbook));
    });
    syncImportPreviewBook();
  }

  function installRenderHook(){
    const original=window.renderTicketDashboard;
    if(typeof original==='function'&&!original.__optionalBookWrapped){
      const wrapped=function(...args){
        const out=original.apply(this,args);
        requestAnimationFrame(decorateBlankBooks);
        return out;
      };
      wrapped.__optionalBookWrapped=true;
      window.renderTicketDashboard=wrapped;
    }
  }

  function start(){
    installBuilderHooks();
    ensureImportBookSelect();
    installImportSaveHook();
    installShareInterception();
    installRenderHook();
    decorateBlankBooks();

    const modal=document.getElementById('ticketShareModal');
    if(modal){
      const observer=new MutationObserver(()=>{
        if(!modal.classList.contains('hide')&&!document.getElementById('ticketShareInput')?.value)resetImportBook();
        decorateBlankBooks();
      });
      observer.observe(modal,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',()=>{installBuilderHooks();installRenderHook();decorateBlankBooks()});
  window.addEventListener('hashchange',()=>setTimeout(decorateBlankBooks,100));
})();