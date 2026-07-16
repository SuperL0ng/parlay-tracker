/* TICKET DASHBOARD DETAILS V72 — labeled wager and leg disclosure controls */
(() => {
  'use strict';
  const KEY='parlayTracker.savedTickets.v1';
  const expandedIds=new Set();
  const loadingIds=new Set();
  const selectedIds=new Set();
  let selectMode=false;

  function esc(v){return window.esc?window.esc(v):String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]))}
  function load(){try{return window.loadSavedTickets?window.loadSavedTickets():JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return[]}}
  function store(list){if(typeof window.storeSavedTickets==='function')window.storeSavedTickets(list);else localStorage.setItem(KEY,JSON.stringify(list))}
  function stateClass(state){return String(state||'pending').toUpperCase()}
  function valueClass(state){return state==='win'?'valueWin':state==='loss'?'valueLoss':state==='push'?'valuePush':state==='suspended'||state==='unavailable'?'valueSuspended':'valuePending'}

  function addCss(){
    if(document.getElementById('ticketDashboardDetailsCss'))return;
    const style=document.createElement('style');
    style.id='ticketDashboardDetailsCss';
    style.textContent=`
      .savedTicket{position:relative}.savedTicketTop{align-items:center}
      .ticketExpandBtn{flex:0 0 auto;width:84px;min-width:84px;height:32px;min-height:32px;padding:4px 5px;border-radius:8px;font-size:8px;font-weight:900;line-height:1;letter-spacing:.035em;text-transform:uppercase;white-space:nowrap}
      .ticketExpandBtn .ticketExpandShort{display:none}
      .savedTicketDetails{margin-top:10px;padding:8px 10px 4px;border-radius:9px;background:rgba(255,255,255,.48);box-shadow:inset 0 1px 4px rgba(0,0,0,.15)}
      .savedTicketDetails.hide{display:none!important}
      .dashboardLeg{display:grid;grid-template-columns:minmax(0,1fr) auto;gap:12px;padding:10px 0;border-top:1px solid rgba(0,0,0,.1)}
      .dashboardLeg:first-child{border-top:0}.dashboardLegLabel{font-size:14px;font-weight:900;line-height:1.25}
      .dashboardLegMeta{margin-top:4px;color:#596372;font-size:12px;font-weight:750;line-height:1.35}
      .dashboardLegRight{text-align:right;min-width:70px}.dashboardLegValue{font-size:13px;font-weight:900;margin-bottom:4px}
      .dashboardLegStatus{display:inline-block;padding:4px 7px;border-radius:6px;font-size:9px;font-weight:900;letter-spacing:.08em}
      .dashboardLegStatus.WIN{background:#bfe3bd;color:#154e18}.dashboardLegStatus.LOSS{background:#efc1bc;color:#7a1710}.dashboardLegStatus.LIVE{background:#f1dda5;color:#674500}.dashboardLegStatus.PENDING,.dashboardLegStatus.PUSH{background:#d7dde6;color:#4f5966}.dashboardLegStatus.SUSPENDED,.dashboardLegStatus.UNAVAILABLE{background:#f4c27a;color:#6b3b00}
      .dashboardLegValue.valueWin{color:#278c31}.dashboardLegValue.valueLoss{color:#c72f3e}.dashboardLegValue.valuePush{color:#9b7600}.dashboardLegValue.valueSuspended{color:#a75e00}.dashboardLegValue.valuePending{color:#687383}
      .dashboardDetailsMessage{padding:10px 2px;color:#596372;font-size:12px;font-weight:750}
      .dashboardToolbarV55{display:grid;grid-template-columns:minmax(0,1fr) 70px 84px 58px;gap:6px;align-items:center;margin:0 0 10px}
      .dashboardToolbarV55 button{width:100%;min-width:0;padding:8px 5px;font-size:9px;white-space:nowrap}
      .dashboardToolbarStatus{grid-column:1;grid-row:1;justify-self:stretch;min-width:0;overflow:hidden;text-overflow:ellipsis;font-size:9px;font-weight:800;color:#596372;white-space:nowrap}
      #refreshTicketsBtn{grid-column:2;grid-row:1}#toggleAllTicketsBtn{grid-column:3;grid-row:1}#ticketSelectModeBtn{grid-column:4;grid-row:1}
      #deleteSelectedTicketsBtn{grid-column:1/-1;grid-row:2;justify-self:end;width:auto}
      .ticketSelectBox{display:none;position:absolute;left:8px;top:9px;width:22px;height:22px;z-index:3;accent-color:#b27b24}
      body.ticketSelectMode .ticketSelectBox{display:block}body.ticketSelectMode .savedTicket{padding-left:38px}.deleteSelectedBtn.hide{display:none!important}
      #standaloneView .liveGrid{gap:6px!important}#standaloneView .liveTicketCard{padding:8px 10px!important;margin-bottom:6px!important;border-radius:8px!important}
      #standaloneView .ticketTop{gap:6px!important}#standaloneView .title{font-size:15px!important;padding:4px 7px!important}#standaloneView .badge{padding:4px 6px!important;font-size:9px!important}
      #standaloneView .meta{margin:4px 0!important;font-size:10px!important}#standaloneView .ticketOutcome{margin:3px 0 1px!important;padding:3px 6px!important;font-size:8px!important}
      #standaloneView .liveSummary{margin:3px 0 1px!important;font-size:9px!important}#standaloneView .liveLeg{padding:5px 0!important}#standaloneView .liveLegLabel{font-size:14px!important;line-height:1.15!important}
      #standaloneView .liveLegMeta{margin-top:2px!important;font-size:11px!important;font-weight:800!important;line-height:1.2!important;color:#4f5b69!important;letter-spacing:.005em!important}
      #standaloneView .liveLegValue{font-size:13px!important;min-width:48px!important}#standaloneView .liveStatus{margin-top:3px!important;padding:3px 6px!important;font-size:8px!important}
      #standaloneView .liveLegTop{gap:10px!important}#standaloneView .standaloneTools{margin-bottom:6px!important}#standaloneView .dashboardHeader{margin-bottom:6px!important}
      @media(max-width:390px){.dashboardToolbarV55{grid-template-columns:minmax(0,1fr) 64px 80px 54px;gap:5px}.dashboardToolbarV55 button{padding:7px 3px;font-size:8px}.dashboardToolbarStatus{font-size:8px}.ticketExpandBtn{width:80px;min-width:80px;padding:4px;font-size:7.5px;letter-spacing:.025em}}
      @media(max-width:340px){.ticketExpandBtn{width:54px;min-width:54px}.ticketExpandBtn .ticketExpandLong{display:none}.ticketExpandBtn .ticketExpandShort{display:inline}}
      @media(min-width:600px){.dashboardLegLabel{font-size:15px}.dashboardLegMeta{font-size:13px}#standaloneView .liveLegLabel{font-size:15px!important}#standaloneView .liveLegMeta{font-size:12px!important}}
    `;
    document.head.appendChild(style);
  }

  function datesFor(record){const out=[];const t=record?.ticket||{};if(t.date)out.push(t.date);for(const leg of t.legs||[])if(leg.date)out.push(leg.date);return [...new Set(out)]}
  function detailsHtml(record){
    const C=window.ParlayTrackerCore,t=record.ticket||{};
    return (record.__evaluated||[]).map(leg=>{const x=leg.__live||C.statusObj('pending',''),game=leg.__game,state=stateClass(x.state);const meta=t.type==='sgp'?[game?C.baseGameMeta(game):'']:[C.legGame(t,leg),game?C.baseGameMeta(game):''];return `<div class="dashboardLeg leg${state}"><div><div class="dashboardLegLabel">${esc(leg.label||'Untitled')}</div><div class="dashboardLegMeta">${esc(meta.filter(Boolean).join(' · '))}</div></div><div class="dashboardLegRight"><div class="dashboardLegValue ${esc(x.valueClass||valueClass(x.state))}">${esc(x.value||'')}</div><span class="dashboardLegStatus ${state}">${esc(state)}</span></div></div>`}).join('')||'<div class="dashboardDetailsMessage">No legs in this ticket.</div>';
  }
  async function evaluateRecord(record){const S=window.ParlayTrackerSources,E=window.ParlayTrackerEvaluator;if(!S||!E)throw new Error('Tracker engine unavailable');const games=await S.fetchScoreboards(datesFor(record));return E.evaluateRecord(record,games)}
  async function loadDetails(id,panel,reset=true){if(loadingIds.has(id))return;const record=load().find(r=>r.id===id);if(!record)return;loadingIds.add(id);panel.innerHTML='<div class="dashboardDetailsMessage">Refreshing leg status…</div>';try{if(reset)window.ParlayTrackerSources?.resetTrackingCaches?.();const evaluated=await evaluateRecord(record);if(expandedIds.has(id))panel.innerHTML=detailsHtml(evaluated)}catch(error){panel.innerHTML=`<div class="dashboardDetailsMessage">Unable to refresh leg status: ${esc(error?.message||error)}</div>`}finally{loadingIds.delete(id)}}

  function clearOpenTicketHint(){
    const status=document.querySelector('.dashboardToolbarStatus');
    if(status&&/^Open(?: a)? ticket/i.test(String(status.textContent||'').trim()))status.textContent='';
  }

  function isStraight(record){return String(record?.ticket?.type||'').toLowerCase()==='straight'}
  function syncExpandButton(button,record,open){
    const straight=isStraight(record),noun=straight?'Wager':'Legs',verb=open?'Hide':'View',symbol=open?'⌄':'>';
    button.innerHTML=`<span class="ticketExpandLong">${verb} ${noun} ${symbol}</span><span class="ticketExpandShort">${verb} ${symbol}</span>`;
    button.setAttribute('aria-expanded',String(open));
    button.setAttribute('aria-label',`${verb} ${straight?'wager':'ticket legs'}`);
  }

  function updateExpandAllButton(){
    const button=document.getElementById('toggleAllTicketsBtn');
    if(!button)return;
    const anyOpen=expandedIds.size>0;
    button.textContent=anyOpen?'Collapse All':'Expand All';
    button.setAttribute('aria-label',anyOpen?'Collapse all ticket details':'Expand all ticket details');
    button.setAttribute('aria-pressed',String(anyOpen));
    if(anyOpen)clearOpenTicketHint();
  }

  function toggle(id,button,panel){
    const open=!expandedIds.has(id);
    if(open)expandedIds.add(id);else expandedIds.delete(id);
    syncExpandButton(button,load().find(record=>record.id===id),open);
    panel.classList.toggle('hide',!open);
    updateExpandAllButton();
    if(open)loadDetails(id,panel,true);
  }

  function setAllExpanded(open){
    const cards=[...document.querySelectorAll('#ticketList .savedTicket')],records=new Map(load().map(record=>[record.id,record]));
    if(open){clearOpenTicketHint();window.ParlayTrackerSources?.resetTrackingCaches?.()}
    cards.forEach(card=>{
      const id=card.dataset.ticketId,button=card.querySelector('.ticketExpandBtn'),panel=card.querySelector('.savedTicketDetails');
      if(!id||!button||!panel)return;
      if(open){expandedIds.add(id);syncExpandButton(button,records.get(id),true);panel.classList.remove('hide');loadDetails(id,panel,false)}
      else{expandedIds.delete(id);syncExpandButton(button,records.get(id),false);panel.classList.add('hide')}
    });
    updateExpandAllButton();
  }

  function updateSelectionToolbar(){document.body.classList.toggle('ticketSelectMode',selectMode);const selectBtn=document.getElementById('ticketSelectModeBtn');const deleteBtn=document.getElementById('deleteSelectedTicketsBtn');if(selectBtn)selectBtn.textContent=selectMode?'Cancel':'Select';if(deleteBtn){deleteBtn.classList.toggle('hide',!selectMode);deleteBtn.textContent=selectedIds.size?`Delete Selected (${selectedIds.size})`:'Delete Selected';deleteBtn.disabled=selectedIds.size===0}document.querySelectorAll('.ticketSelectBox').forEach(box=>{box.checked=selectedIds.has(box.value)})}
  function deleteSelected(){if(!selectedIds.size)return;const count=selectedIds.size;if(!confirm(`Delete ${count} selected ticket${count===1?'':'s'}?`))return;const remaining=load().filter(r=>!selectedIds.has(r.id));selectedIds.forEach(id=>expandedIds.delete(id));selectedIds.clear();selectMode=false;store(remaining);window.renderTicketDashboard?.();updateSelectionToolbar();updateExpandAllButton()}

  function ensureToolbar(){
    const dashboard=document.getElementById('dashboardView');
    if(!dashboard||document.getElementById('dashboardToolbarV55'))return;
    const toolbar=document.createElement('div');toolbar.id='dashboardToolbarV55';toolbar.className='dashboardToolbarV55';
    toolbar.innerHTML='<span class="dashboardToolbarStatus"></span><button id="refreshTicketsBtn" class="ghost" type="button">Refresh</button><button id="toggleAllTicketsBtn" class="ghost" type="button" aria-pressed="false">Expand All</button><button id="ticketSelectModeBtn" class="ghost" type="button">Select</button><button id="deleteSelectedTicketsBtn" class="deleteSelectedBtn hide" type="button">Delete Selected</button>';
    const header=dashboard.querySelector('.dashboardHeader');if(header)header.insertAdjacentElement('afterend',toolbar);else dashboard.prepend(toolbar);
    toolbar.querySelector('#refreshTicketsBtn').onclick=()=>window.__refreshDashboardTickets?.();
    toolbar.querySelector('#ticketSelectModeBtn').addEventListener('click',()=>{selectMode=!selectMode;if(!selectMode)selectedIds.clear();updateSelectionToolbar()});
    toolbar.querySelector('#deleteSelectedTicketsBtn').addEventListener('click',deleteSelected);
    toolbar.querySelector('#toggleAllTicketsBtn').addEventListener('click',()=>setAllExpanded(expandedIds.size===0));
  }

  function decorate(){
    addCss();ensureToolbar();
    const records=load(),validIds=new Set(records.map(r=>r.id));
    [...selectedIds].forEach(id=>{if(!validIds.has(id))selectedIds.delete(id)});
    [...expandedIds].forEach(id=>{if(!validIds.has(id))expandedIds.delete(id)});
    const cards=[...document.querySelectorAll('#ticketList .savedTicket')];
    cards.forEach((card,index)=>{
      const record=records[index];if(!record)return;
      card.dataset.ticketId=record.id;
      let checkbox=card.querySelector('.ticketSelectBox');
      if(!checkbox){checkbox=document.createElement('input');checkbox.type='checkbox';checkbox.className='ticketSelectBox';checkbox.setAttribute('aria-label','Select ticket');card.prepend(checkbox);checkbox.addEventListener('change',()=>{if(checkbox.checked)selectedIds.add(record.id);else selectedIds.delete(record.id);updateSelectionToolbar()})}
      checkbox.value=record.id;checkbox.checked=selectedIds.has(record.id);
      if(card.dataset.detailsReady==='1')return;
      card.dataset.detailsReady='1';
      const top=card.querySelector('.savedTicketTop');if(!top)return;
      const button=document.createElement('button');button.type='button';button.className='ghost ticketExpandBtn';syncExpandButton(button,record,expandedIds.has(record.id));top.appendChild(button);
      const panel=document.createElement('div');panel.className='savedTicketDetails'+(expandedIds.has(record.id)?'':' hide');const actions=card.querySelector('.savedActions');card.insertBefore(panel,actions||null);
      button.addEventListener('click',()=>toggle(record.id,button,panel));
      if(expandedIds.has(record.id))loadDetails(record.id,panel,true);
    });
    updateSelectionToolbar();updateExpandAllButton();
  }

  function wrapDashboard(){const original=window.renderTicketDashboard;if(typeof original!=='function'||original.__detailsV71Wrapped)return;const wrapped=function(...args){const out=original.apply(this,args);requestAnimationFrame(decorate);return out};wrapped.__detailsV71Wrapped=true;window.renderTicketDashboard=wrapped}
  function install(){wrapDashboard();decorate()}
  install();window.addEventListener('load',()=>{wrapDashboard();decorate()},{once:true});document.addEventListener('click',event=>{if(event.target.closest?.('#ticketsTab'))setTimeout(decorate,0)},true);
})();
