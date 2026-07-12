/* SETTLEMENT_STATUS_V37 */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const SETTLED=new Set(['WON','LOST','PUSH']);
  let scanTimer=null;
  let scanAttempts=0;
  let dashboardOverridesInstalled=false;

  const css=`
    .liveTicketCard.ticketWon{
      border:3px solid #15963A!important;
      box-shadow:0 0 0 2px rgba(21,150,58,.22),0 8px 20px rgba(21,150,58,.20)!important;
    }
    .liveTicketCard.ticketLost{
      border:3px solid #D9273D!important;
      box-shadow:0 0 0 2px rgba(217,39,61,.20),0 8px 20px rgba(217,39,61,.18)!important;
    }
    .liveLegValue{font-weight:950!important;text-shadow:0 1px 0 rgba(255,255,255,.72)}
    .liveLegValue.valueWin{color:#128A35!important}
    .liveLegValue.valueLoss{color:#D11F38!important}
    .liveLegValue.valuePush{color:#A86F00!important}
    .liveLegValue.valueSuspended{color:#B75C00!important}
    .liveLegValue.valuePending{color:#687383!important}
    .liveLegValue.valueTie{color:#1769C8!important}
    .liveLegValue.valueAhead1{color:#2B9348!important}
    .liveLegValue.valueAhead2{color:#168A35!important}
    .liveLegValue.valueAhead3{color:#087A2A!important}
    .liveLegValue.valueBehind1{color:#A86F00!important}
    .liveLegValue.valueBehind2{color:#D94841!important}
    .liveLegValue.valueBehind3{color:#C51F32!important}
    .settlementStamp{margin:7px 0 2px;color:#5A6472;font-size:10px;font-weight:800;letter-spacing:.04em}
    .savedStateRow{display:flex;flex-wrap:wrap;gap:6px;margin-top:7px}
    .savedStateBadge{display:inline-flex;align-items:center;padding:5px 8px;border-radius:7px;font-size:9px;font-weight:950;letter-spacing:.09em}
    .savedStateBadge.storage{background:#D4DBE5;color:#3F4855}
    .savedStateBadge.LIVE{background:#F1D07A;color:#694700}
    .savedStateBadge.PENDING{background:#CBD3DE;color:#44505E}
    .savedStateBadge.WON{background:#A9E2B5;color:#0C6128}
    .savedStateBadge.LOST{background:#F2B5BC;color:#861629}
    .savedStateBadge.PUSH{background:#F2D46F;color:#6B5100}
    .savedStateBadge.SUSPENDED{background:#F4C08B;color:#713800}
    .savedSettlement{margin-top:6px;color:#596372;font-size:10px;font-weight:750}
  `;

  function addCss(){
    if(document.getElementById('settlementStatusCss'))return;
    const style=document.createElement('style');
    style.id='settlementStatusCss';
    style.textContent=css;
    document.head.appendChild(style);
  }

  function load(){
    try{const list=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(list)?list:[]}
    catch{return[]}
  }
  function store(list){localStorage.setItem(KEY,JSON.stringify(list))}
  function clean(v){return String(v??'').trim()}
  function outcomeFromCard(card){
    const text=clean(card.querySelector('.ticketOutcome')?.textContent).toUpperCase();
    return text.replace(/^TICKET\s+/,'');
  }
  function formatStamp(value){
    if(!value)return'';
    const date=new Date(value);
    if(Number.isNaN(date.getTime()))return'';
    return date.toLocaleString([],{
      year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'
    });
  }
  function currentRecordsForView(list){
    const params=new URLSearchParams(location.hash.slice(1));
    const id=params.get('ticket');
    const active=params.get('view')==='active';
    if(id)return list.filter(r=>r.id===id);
    if(active)return list.filter(r=>r.status!=='completed');
    return[];
  }
  function addStamp(card,record){
    card.querySelector('.settlementStamp')?.remove();
    if(!record?.settledAt)return;
    const stamp=document.createElement('div');
    stamp.className='settlementStamp';
    stamp.textContent='Settled '+formatStamp(record.settledAt);
    const summary=card.querySelector('.liveSummary');
    if(summary)summary.insertAdjacentElement('beforebegin',stamp);
    else card.appendChild(stamp);
  }

  function scanRenderedTickets(){
    if(!location.hash)return false;
    const cards=[...document.querySelectorAll('#standaloneView .liveTicketCard')];
    if(!cards.length)return false;
    const list=load();
    const records=currentRecordsForView(list);
    if(!records.length)return false;
    const now=new Date().toISOString();
    let changed=false;

    cards.forEach((card,index)=>{
      const record=records[index];
      if(!record)return;
      const outcome=outcomeFromCard(card);
      if(!outcome)return;
      if(record.liveOutcome!==outcome){record.liveOutcome=outcome;changed=true}
      if(SETTLED.has(outcome)){
        if(!record.settledAt){record.settledAt=now;changed=true}
        if(record.status!=='completed'&&!record.manualActiveOverride){
          record.status='completed';
          record.updatedAt=now;
          record.autoCompleted=true;
          changed=true;
        }
      }
      addStamp(card,record);
    });

    if(changed)store(list);
    return true;
  }

  function scheduleScan(){
    clearInterval(scanTimer);
    scanAttempts=0;
    scanTimer=setInterval(()=>{
      scanAttempts++;
      const ready=document.querySelector('#liveRefreshStatus.good');
      if(ready&&scanRenderedTickets()){
        clearInterval(scanTimer);
        scanTimer=null;
      }else if(scanAttempts>=24){
        clearInterval(scanTimer);
        scanTimer=null;
      }
    },350);
  }

  function statusBadge(outcome){
    outcome=clean(outcome).toUpperCase()||'PENDING';
    return `<span class="savedStateBadge ${outcome}">TICKET ${outcome}</span>`;
  }

  function enhancedDashboard(){
    const box=document.getElementById('ticketList');
    if(!box)return;
    const list=load();
    if(!list.length){box.innerHTML='<div class="emptyState">No saved tickets yet.</div>';return}
    box.innerHTML=list.map((r,i)=>{
      const t=r.ticket||{};
      const meta=[r.sportsbook,(t.type||'').toUpperCase(),t.date,t.game,`${(t.legs||[]).length} legs`].filter(Boolean).join(' · ');
      const stored=(r.status||'active').toUpperCase();
      const outcome=(r.liveOutcome||'PENDING').toUpperCase();
      const settlement=r.settledAt?`<div class="savedSettlement">Settled ${formatStamp(r.settledAt)}</div>`:'';
      return `<article class="savedTicket"><div class="savedTicketTop"><div><span class="bookBadge">${esc(r.sportsbook||'Other')}</span><h3>${esc(t.title||'Untitled')}</h3><div class="savedMeta">${esc(meta)}</div><div class="savedStateRow"><span class="savedStateBadge storage">${esc(stored)}</span>${statusBadge(outcome)}</div>${settlement}</div><div class="savedOrder"><button class="ghost" type="button" onclick="moveSavedTicket('${r.id}',-1)" ${i===0?'disabled':''}>↑</button><button class="ghost" type="button" onclick="moveSavedTicket('${r.id}',1)" ${i===list.length-1?'disabled':''}>↓</button></div></div><div class="savedActions"><button class="ghost" type="button" onclick="openSavedTicketView('${r.id}')">View</button><button class="ghost" type="button" onclick="editSavedTicket('${r.id}')">Edit</button><button class="ghost" type="button" onclick="duplicateSavedTicket('${r.id}')">Duplicate</button><button class="ghost" type="button" onclick="copySavedTicketCode('${r.id}')">Copy Code</button><button class="ghost" type="button" onclick="toggleSavedTicketStatus('${r.id}')">${r.status==='completed'?'Mark Active':'Complete'}</button><button type="button" onclick="deleteSavedTicket('${r.id}')">Delete</button></div></article>`;
    }).join('');
  }

  function installDashboardOverrides(){
    if(dashboardOverridesInstalled)return;
    if(typeof window.renderTicketDashboard!=='function')return;
    dashboardOverridesInstalled=true;
    window.renderTicketDashboard=enhancedDashboard;

    if(typeof window.toggleSavedTicketStatus==='function'){
      window.toggleSavedTicketStatus=function(id){
        const list=load(),record=list.find(r=>r.id===id);
        if(!record)return;
        const now=new Date().toISOString();
        if(record.status==='completed'){
          record.status='active';
          record.manualActiveOverride=true;
        }else{
          record.status='completed';
          record.manualActiveOverride=false;
        }
        record.updatedAt=now;
        store(list);
        enhancedDashboard();
      };
    }

    if(typeof window.duplicateSavedTicket==='function'){
      const original=window.duplicateSavedTicket;
      window.duplicateSavedTicket=function(id){
        original(id);
        const list=load(),copy=list[list.length-1];
        if(copy&&copy.id!==id){
          copy.status='active';
          delete copy.liveOutcome;
          delete copy.settledAt;
          delete copy.autoCompleted;
          delete copy.manualActiveOverride;
          store(list);
          enhancedDashboard();
        }
      };
    }
  }

  addCss();
  installDashboardOverrides();
  window.addEventListener('load',()=>{
    installDashboardOverrides();
    if(location.hash)scheduleScan();
    else enhancedDashboard();
  });
  window.addEventListener('hashchange',()=>{if(location.hash)scheduleScan()});
  window.addEventListener('storage',e=>{if(e.key===KEY&&!location.hash)enhancedDashboard()});
  document.addEventListener('click',e=>{
    if(/^refresh$/i.test(clean(e.target?.textContent)))scheduleScan();
  },true);
})();