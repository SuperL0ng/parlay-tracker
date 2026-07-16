/* DASHBOARD REFRESH V72 — refresh every ticket without changing leg expansion */
(() => {
  'use strict';
  const KEY='parlayTracker.savedTickets.v1';
  const SETTLED=new Set(['WON','LOST','PUSH']);

  function esc(v){return window.esc?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function load(){try{return window.loadSavedTickets?window.loadSavedTickets():JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function store(list){if(typeof window.storeSavedTickets==='function')window.storeSavedTickets(list);else localStorage.setItem(KEY,JSON.stringify(list))}
  function stateClass(state){return String(state||'pending').toUpperCase()}
  function valueClass(state){return state==='win'?'valueWin':state==='loss'?'valueLoss':state==='push'?'valuePush':state==='suspended'||state==='unavailable'?'valueSuspended':'valuePending'}

  function addCss(){
    if(document.getElementById('dashboardRefreshV58Css'))return;
    const style=document.createElement('style');
    style.id='dashboardRefreshV58Css';
    style.textContent=`
      #dashboardView .dashboardToolbarV55{grid-template-columns:minmax(0,1fr) 70px 84px 58px!important;gap:6px!important}
      #dashboardView .dashboardToolbarStatus{grid-column:1!important;grid-row:1!important;justify-self:stretch!important;text-align:left!important;min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #refreshTicketsBtn{grid-column:2!important;grid-row:1!important;width:100%!important}
      #toggleAllTicketsBtn{grid-column:3!important;grid-row:1!important;width:100%!important}
      #ticketSelectModeBtn{grid-column:4!important;grid-row:1!important;width:100%!important}
      #deleteSelectedTicketsBtn{grid-column:1/-1!important;grid-row:2!important}
      @media(max-width:390px){#dashboardView .dashboardToolbarV55{grid-template-columns:minmax(0,1fr) 64px 80px 54px!important;gap:5px!important}}
    `;
    document.head.appendChild(style);
  }

  function datesFor(records){const dates=[];for(const record of records){const t=record?.ticket||{};if(t.date)dates.push(t.date);for(const leg of t.legs||[])if(leg.date)dates.push(leg.date)}return [...new Set(dates)]}
  function detailsHtml(record){const C=window.ParlayTrackerCore,t=record.ticket||{};return (record.__evaluated||[]).map(leg=>{const x=leg.__live||C.statusObj('pending',''),game=leg.__game,state=stateClass(x.state);const meta=t.type==='sgp'?[game?C.baseGameMeta(game):'']:[C.legGame(t,leg),game?C.baseGameMeta(game):''];return `<div class="dashboardLeg leg${state}"><div><div class="dashboardLegLabel">${esc(leg.label||'Untitled')}</div><div class="dashboardLegMeta">${esc(meta.filter(Boolean).join(' · '))}</div></div><div class="dashboardLegRight"><div class="dashboardLegValue ${esc(x.valueClass||valueClass(x.state))}">${esc(x.value||'')}</div><span class="dashboardLegStatus ${state}">${esc(state)}</span></div></div>`}).join('')||'<div class="dashboardDetailsMessage">No legs in this ticket.</div>'}
  function outcomeFor(record){
    const C=window.ParlayTrackerCore;
    const states=(record.__evaluated||[]).map(leg=>({state:leg.__live?.state||'pending'}));
    const result=C.ticketState(states);
    return ({win:'WON',loss:'LOST',push:'PUSH',live:'LIVE',suspended:'SUSPENDED',pending:'PENDING'})[result]||'PENDING';
  }
  function updateCardState(card,record){
    const stored=(record.status||'active').toUpperCase();
    const outcome=(record.liveOutcome||'PENDING').toUpperCase();
    const storageBadge=card.querySelector('.savedStateBadge.storage');
    const outcomeBadge=[...card.querySelectorAll('.savedStateBadge')].find(x=>!x.classList.contains('storage'));
    if(storageBadge)storageBadge.textContent=stored;
    if(outcomeBadge){outcomeBadge.className=`savedStateBadge ${outcome}`;outcomeBadge.textContent=`TICKET ${outcome}`}
    const complete=[...card.querySelectorAll('.savedActions button')].find(x=>/^(COMPLETE|MARK ACTIVE)$/i.test(String(x.textContent||'').replace(/\s+/g,' ').trim()));
    if(complete)complete.textContent=record.status==='completed'?'Mark Active':'Complete';
  }

  window.__refreshDashboardTickets=async function(){
    if(window.__dashboardRefreshRunning)return;
    const status=document.querySelector('.dashboardToolbarStatus');
    const refreshButton=document.getElementById('refreshTicketsBtn');
    const list=load();
    if(!list.length){if(status)status.textContent='No tickets to refresh.';return}
    const cards=new Map([...document.querySelectorAll('#ticketList .savedTicket')].map((card,index)=>[card.dataset.ticketId||list[index]?.id,card]).filter(([id])=>id));
    const targets=list.map(record=>{const card=cards.get(record.id)||null;return{card,panel:card?.querySelector('.savedTicketDetails')||null,record}});
    if(!targets.length)return;
    window.__dashboardRefreshRunning=true;
    if(refreshButton){refreshButton.disabled=true;refreshButton.classList.add('refreshing');refreshButton.textContent='Refresh…'}
    if(status)status.textContent='Refreshing…';
    targets.forEach(x=>{if(x.panel&&!x.panel.classList.contains('hide'))x.panel.innerHTML='<div class="dashboardDetailsMessage">Refreshing leg status…</div>'});
    try{
      const S=window.ParlayTrackerSources,E=window.ParlayTrackerEvaluator;
      if(!S||!E)throw new Error('Tracker engine unavailable');
      S.resetTrackingCaches?.();
      const games=await S.fetchScoreboards(datesFor(targets.map(x=>x.record)));
      const evaluated=await Promise.all(targets.map(x=>E.evaluateRecord(x.record,games)));
      const now=new Date().toISOString();
      evaluated.forEach((evaluatedRecord,index)=>{
        const target=targets[index],record=target.record,outcome=outcomeFor(evaluatedRecord);
        record.liveOutcome=outcome;
        if(SETTLED.has(outcome)&&record.status!=='completed'&&!record.manualActiveOverride){record.status='completed';record.autoCompleted=true;record.updatedAt=now}
        if(target.panel)target.panel.innerHTML=detailsHtml(evaluatedRecord);
        if(target.card)updateCardState(target.card,record);
      });
      store(list);
      if(status)status.textContent=`Updated ${new Date().toLocaleTimeString([],{hour:'numeric',minute:'2-digit'})}`;
    }catch(error){
      targets.forEach(x=>{if(x.panel&&!x.panel.classList.contains('hide'))x.panel.innerHTML=`<div class="dashboardDetailsMessage">Unable to refresh leg status: ${esc(error?.message||error)}</div>`});
      if(status)status.textContent='Refresh failed';
    }finally{
      window.__dashboardRefreshRunning=false;
      if(refreshButton){refreshButton.disabled=false;refreshButton.classList.remove('refreshing');refreshButton.textContent='Refresh'}
      document.dispatchEvent(new CustomEvent('parlay:dashboard-refreshed',{detail:{source:'dashboard-refresh'}}));
    }
  };

  addCss();
})();
