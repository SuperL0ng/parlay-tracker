/* DASHBOARD SORT FILTER V78 — immutable save times, automatic ordering and filtered views */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const DEFAULTS=Object.freeze({sort:'saved',direction:'desc',filter:'all'});
  const state={...DEFAULTS};
  let wrappedRender=null;

  const clean=value=>String(value??'').trim();
  const esc=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const load=()=>{try{const list=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(list)?list:[]}catch{return[]}};
  const validTime=value=>{const time=Date.parse(value||'');return Number.isFinite(time)?time:null};
  const saveTime=record=>validTime(record?.savedAt)??validTime(record?.createdAt);
  const settlementTime=record=>validTime(record?.settledAt);
  const outcome=record=>clean(record?.liveOutcome).toUpperCase();

  function addCss(){
    if(document.getElementById('dashboardSortFilterV78Css'))return;
    const style=document.createElement('style');
    style.id='dashboardSortFilterV78Css';
    style.textContent=`
      #ticketList .savedOrder{display:none!important}
      #dashboardView .dashboardToolbarV55{grid-template-columns:repeat(3,minmax(0,1fr))!important;grid-template-rows:auto auto!important}
      #dashboardView .dashboardToolbarStatus{grid-column:1/3!important;grid-row:1!important;align-self:center!important}
      #ticketSortFilterBtn{grid-column:3!important;grid-row:1!important;width:100%!important}
      #refreshTicketsBtn{grid-column:1!important;grid-row:2!important;width:100%!important}
      #toggleAllTicketsBtn{grid-column:2!important;grid-row:2!important;width:100%!important}
      #ticketSelectModeBtn{grid-column:3!important;grid-row:2!important;width:100%!important}
      #deleteSelectedTicketsBtn{grid-column:1/-1!important;grid-row:3!important}
      #ticketSortFilterBtn.filterActive{box-shadow:inset 0 0 0 2px rgba(179,122,31,.62),0 4px 8px rgba(0,0,0,.18)!important}
      .savedTimeStamp{margin-top:6px;color:#596372;font-size:10px;font-weight:750}
      .sortFilterEmpty{grid-column:1/-1}
      .ticketSortBackdrop{position:fixed;inset:0;z-index:12000;display:flex;align-items:flex-end;justify-content:center;padding:14px;background:rgba(20,27,36,.46);backdrop-filter:blur(3px)}
      .ticketSortBackdrop.hide{display:none!important}
      .ticketSortPanel{width:min(440px,100%);max-height:calc(100vh - 28px);overflow:auto;padding:16px;border:1px solid rgba(255,255,255,.8);border-radius:18px;background:linear-gradient(180deg,#f7f9fc,#d4dbe5);box-shadow:0 18px 48px rgba(0,0,0,.32)}
      .ticketSortPanel h3{margin:0 0 12px;font-size:17px;letter-spacing:.055em;text-transform:uppercase}
      .ticketSortGroup{margin:12px 0;padding:11px;border:1px solid rgba(92,104,120,.25);border-radius:11px;background:rgba(255,255,255,.52)}
      .ticketSortGroup legend{padding:0 5px;color:#4d5866;font-size:10px;font-weight:950;letter-spacing:.09em;text-transform:uppercase}
      .ticketSortOptions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px}
      .ticketSortOptions.outcomes{grid-template-columns:repeat(3,minmax(0,1fr))}
      .ticketSortOption{display:flex;align-items:center;gap:7px;min-height:39px;padding:7px 8px;border:1px solid rgba(93,105,120,.34);border-radius:8px;background:rgba(247,249,252,.74);font-size:11px;font-weight:850}
      .ticketSortOption input{width:17px;height:17px;margin:0;accent-color:#a76f18}
      .ticketSortActions{display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:13px}
      .ticketSortActions button{width:100%;min-width:0;padding:10px 5px;font-size:10px}
      @media(max-width:390px){.ticketSortPanel{padding:13px}.ticketSortOptions.outcomes{grid-template-columns:repeat(2,minmax(0,1fr))}.ticketSortOption{font-size:10px;padding:6px}.ticketSortActions{gap:6px}}
    `;
    document.head.appendChild(style);
  }

  function formatStamp(value){
    const time=validTime(value);
    if(time===null)return'';
    return new Date(time).toLocaleString([], {year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'});
  }

  function matchesFilter(record){
    if(state.filter==='all')return true;
    if(state.filter==='active')return clean(record.status).toLowerCase()!=='completed';
    if(state.filter==='completed')return clean(record.status).toLowerCase()==='completed';
    return outcome(record)===state.filter.toUpperCase();
  }

  function orderedRecords(list){
    const indexed=list.map((record,index)=>({record,index})).filter(item=>matchesFilter(item.record));
    const eligible=state.sort==='settled'?indexed.filter(item=>settlementTime(item.record)!==null):indexed;
    const direction=state.direction==='asc'?1:-1;
    eligible.sort((a,b)=>{
      const av=state.sort==='settled'?settlementTime(a.record):saveTime(a.record);
      const bv=state.sort==='settled'?settlementTime(b.record):saveTime(b.record);
      if(av===null&&bv===null)return a.index-b.index;
      if(av===null)return 1;
      if(bv===null)return -1;
      if(av!==bv)return(av-bv)*direction;
      const as=saveTime(a.record),bs=saveTime(b.record);
      if(as!==null&&bs!==null&&as!==bs)return(as-bs)*direction;
      return a.index-b.index;
    });
    return eligible.map(item=>item.record);
  }

  function addSaveStamp(card,record){
    card.querySelector('.savedTimeStamp')?.remove();
    const stamp=formatStamp(record.savedAt||record.createdAt);
    if(!stamp)return;
    const line=document.createElement('div');
    line.className='savedTimeStamp';
    line.textContent='Saved '+stamp;
    const stateRow=card.querySelector('.savedStateRow');
    if(stateRow)stateRow.insertAdjacentElement('afterend',line);
    else card.querySelector('.savedMeta')?.insertAdjacentElement('afterend',line);
  }

  function updateTrigger(total,visible){
    const button=document.getElementById('ticketSortFilterBtn');
    if(!button)return;
    const active=state.sort!==DEFAULTS.sort||state.direction!==DEFAULTS.direction||state.filter!==DEFAULTS.filter;
    button.classList.toggle('filterActive',active);
    button.textContent=active?'Sort / Filter •':'Sort / Filter';
    button.setAttribute('aria-label',active?`Sort and filter, showing ${visible} of ${total} tickets`:'Sort and filter tickets');
  }

  function applyView(){
    addCss();ensureControls();
    const box=document.getElementById('ticketList');
    if(!box)return;
    const list=load(),cards=[...box.querySelectorAll('.savedTicket')];
    cards.forEach((card,index)=>{if(!card.dataset.ticketId&&list[index])card.dataset.ticketId=list[index].id;card.querySelector('.savedOrder')?.remove()});
    const byId=new Map(cards.map(card=>[card.dataset.ticketId,card]));
    const ordered=orderedRecords(list),visibleCards=[];
    for(const record of ordered){const card=byId.get(record.id);if(card){addSaveStamp(card,record);visibleCards.push(card)}}
    box.replaceChildren(...visibleCards);
    if(!visibleCards.length&&list.length){
      const empty=document.createElement('div');empty.className='emptyState sortFilterEmpty';
      empty.textContent=state.sort==='settled'?'No tickets with settlement dates match this view.':'No tickets match this filter.';
      box.appendChild(empty);
    }
    updateTrigger(list.length,visibleCards.length);
  }

  function closeMenu(){document.getElementById('ticketSortBackdrop')?.classList.add('hide')}
  function syncMenu(){
    const modal=document.getElementById('ticketSortBackdrop');if(!modal)return;
    for(const [name,value] of Object.entries(state)){const input=modal.querySelector(`input[name="ticket-${name}"][value="${value}"]`);if(input)input.checked=true}
  }
  function collapseTransientModes(){
    const select=document.getElementById('ticketSelectModeBtn');
    if(document.body.classList.contains('ticketSelectMode'))select?.click();
    const expand=document.getElementById('toggleAllTicketsBtn');
    if(expand?.getAttribute('aria-pressed')==='true')expand.click();
  }
  function commitMenu(reset=false){
    const modal=document.getElementById('ticketSortBackdrop');if(!modal)return;
    collapseTransientModes();
    if(reset)Object.assign(state,DEFAULTS);
    else{
      state.sort=modal.querySelector('input[name="ticket-sort"]:checked')?.value||DEFAULTS.sort;
      state.direction=modal.querySelector('input[name="ticket-direction"]:checked')?.value||DEFAULTS.direction;
      state.filter=modal.querySelector('input[name="ticket-filter"]:checked')?.value||DEFAULTS.filter;
    }
    syncMenu();closeMenu();window.renderTicketDashboard?.();
  }

  function ensureMenu(){
    if(document.getElementById('ticketSortBackdrop'))return;
    const modal=document.createElement('div');modal.id='ticketSortBackdrop';modal.className='ticketSortBackdrop hide';modal.setAttribute('role','dialog');modal.setAttribute('aria-modal','true');modal.setAttribute('aria-labelledby','ticketSortTitle');
    modal.innerHTML=`<div class="ticketSortPanel"><h3 id="ticketSortTitle">Sort &amp; Filter Tickets</h3>
      <fieldset class="ticketSortGroup"><legend>Sort date</legend><div class="ticketSortOptions">
        <label class="ticketSortOption"><input type="radio" name="ticket-sort" value="saved">Saved date</label>
        <label class="ticketSortOption"><input type="radio" name="ticket-sort" value="settled">Settlement date</label>
      </div></fieldset>
      <fieldset class="ticketSortGroup"><legend>Order</legend><div class="ticketSortOptions">
        <label class="ticketSortOption"><input type="radio" name="ticket-direction" value="desc">Newest first</label>
        <label class="ticketSortOption"><input type="radio" name="ticket-direction" value="asc">Oldest first</label>
      </div></fieldset>
      <fieldset class="ticketSortGroup"><legend>Show</legend><div class="ticketSortOptions outcomes">
        <label class="ticketSortOption"><input type="radio" name="ticket-filter" value="all">All</label>
        <label class="ticketSortOption"><input type="radio" name="ticket-filter" value="active">Active</label>
        <label class="ticketSortOption"><input type="radio" name="ticket-filter" value="completed">Completed</label>
        <label class="ticketSortOption"><input type="radio" name="ticket-filter" value="won">Won</label>
        <label class="ticketSortOption"><input type="radio" name="ticket-filter" value="lost">Lost</label>
        <label class="ticketSortOption"><input type="radio" name="ticket-filter" value="push">Push</label>
      </div></fieldset>
      <div class="ticketSortActions"><button id="ticketSortReset" class="ghost" type="button">Clear</button><button id="ticketSortCancel" class="ghost" type="button">Cancel</button><button id="ticketSortApply" type="button">Apply</button></div></div>`;
    document.body.appendChild(modal);syncMenu();
    modal.addEventListener('click',event=>{if(event.target===modal)closeMenu()});
    modal.querySelector('#ticketSortReset').addEventListener('click',()=>commitMenu(true));
    modal.querySelector('#ticketSortCancel').addEventListener('click',closeMenu);
    modal.querySelector('#ticketSortApply').addEventListener('click',()=>commitMenu(false));
  }

  function ensureControls(){
    ensureMenu();
    const toolbar=document.getElementById('dashboardToolbarV55');
    if(!toolbar||document.getElementById('ticketSortFilterBtn'))return;
    const button=document.createElement('button');button.id='ticketSortFilterBtn';button.type='button';button.className='ghost';button.textContent='Sort / Filter';
    button.addEventListener('click',()=>{syncMenu();document.getElementById('ticketSortBackdrop')?.classList.remove('hide')});
    toolbar.appendChild(button);
  }

  function installSavedAtHook(){
    const original=window.ticketRecordFromBuilder;
    if(typeof original!=='function'||original.__savedAtWrapped)return;
    const wrapped=function(existing,...args){
      const record=original.call(this,existing,...args);
      record.savedAt=existing?.savedAt||existing?.createdAt||record.createdAt||new Date().toISOString();
      return record;
    };
    wrapped.__savedAtWrapped=true;window.ticketRecordFromBuilder=wrapped;
  }

  function wrapRender(){
    const original=window.renderTicketDashboard;if(typeof original!=='function')return;
    if(original===wrappedRender)return;
    const wrapped=function(...args){const result=original.apply(this,args);requestAnimationFrame(applyView);return result};
    wrapped.__sortFilterV78Wrapped=true;window.renderTicketDashboard=wrapped;wrappedRender=wrapped;
  }

  function prepare(){addCss();installSavedAtHook();ensureControls()}
  function install(){prepare();wrapRender();requestAnimationFrame(applyView)}
  window.__dashboardSortFilter={state,orderedRecords,applyView,reset:()=>commitMenu(true)};
  prepare();
  if(document.readyState==='complete')install();else window.addEventListener('load',install,{once:true});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
  document.addEventListener('parlay:dashboard-refreshed',event=>{
    if(event.detail?.source==='dashboard-refresh'&&state.filter!=='all')setTimeout(()=>window.renderTicketDashboard?.(),0);
    else requestAnimationFrame(applyView);
  });
})();
