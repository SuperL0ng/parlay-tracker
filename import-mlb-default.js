/* IMPORT_MLB_DEFAULT_V42 */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const clean=v=>String(v??'').trim();

  function isWorldCup(ticket){
    const tracker=clean(ticket?.tracker).toLowerCase();
    const league=clean(ticket?.league).toUpperCase();
    return tracker==='worldcup'||league==='WC';
  }

  function normalizeTicket(ticket){
    if(!ticket||typeof ticket!=='object'||Array.isArray(ticket))return false;
    if(isWorldCup(ticket)||clean(ticket.league))return false;
    ticket.league='MLB';
    return true;
  }

  function normalizeSavedTickets(){
    let list;
    try{list=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return false}
    if(!Array.isArray(list))return false;
    let changed=false;
    for(const record of list){
      changed=normalizeTicket(record?.ticket)||changed;
      changed=normalizeTicket(record?.canonical)||changed;
    }
    if(changed)localStorage.setItem(KEY,JSON.stringify(list));
    return changed;
  }

  function installHooks(){
    normalizeSavedTickets();

    const render=window.renderTicketDashboard;
    if(typeof render==='function'&&!render.__mlbImportDefaultWrapped){
      const wrapped=function(...args){normalizeSavedTickets();return render.apply(this,args)};
      wrapped.__mlbImportDefaultWrapped=true;
      window.renderTicketDashboard=wrapped;
    }

    const open=window.openSavedTicketView;
    if(typeof open==='function'&&!open.__mlbImportDefaultWrapped){
      const wrapped=function(...args){normalizeSavedTickets();return open.apply(this,args)};
      wrapped.__mlbImportDefaultWrapped=true;
      window.openSavedTicketView=wrapped;
    }
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',installHooks,{once:true});
  else installHooks();
  window.addEventListener('load',installHooks);
  window.addEventListener('hashchange',normalizeSavedTickets);
  document.addEventListener('click',event=>{
    if(event.target?.closest?.('#ticketSharePrimary,.shareTicketBtn,#importTicketCodeBtn')){
      setTimeout(()=>{normalizeSavedTickets();window.renderTicketDashboard?.()},0);
      setTimeout(normalizeSavedTickets,250);
    }
  },true);
})();
