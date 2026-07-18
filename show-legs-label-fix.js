/* SHOW LEGS LABEL FIX V3 — Safari label stability and ticket-ID-safe dashboard binding */
(() => {
  'use strict';

  const STYLE_ID='showLegsLabelFixCss';
  const KEY='parlayTracker.savedTickets.v1';
  const detailLoads=new Map();
  let stampRepairQueued=false;

  const esc=value=>window.esc?window.esc(value):String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const loadRecords=()=>{try{const list=window.loadSavedTickets?.()||JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(list)?list:[]}catch{return[]}};

  const addCss=()=>{
    if(document.getElementById(STYLE_ID))return;
    const style=document.createElement('style');
    style.id=STYLE_ID;
    style.textContent=`
      #ticketList .ticketExpandBtn,
      #ticketList .ticketExpandBtn.ticketDetailsAction,
      #ticketList .ticketExpandBtn.webkitPaintLayer{
        display:flex!important;
        align-items:center!important;
        justify-content:center!important;
        box-sizing:border-box!important;
        overflow:visible!important;
        text-overflow:clip!important;
        white-space:nowrap!important;
        padding-left:4px!important;
        padding-right:4px!important;
        letter-spacing:0!important;
        text-indent:0!important;
        -webkit-transform:none!important;
        transform:none!important;
        -webkit-backface-visibility:visible!important;
        backface-visibility:visible!important;
        clip-path:none!important;
        -webkit-clip-path:none!important;
        contain:none!important;
        mask:none!important;
        -webkit-mask:none!important;
      }
    `;
    document.head.appendChild(style);
  };

  const actionTicketId=card=>{
    const action=card?.querySelector?.('[onclick*="openSavedTicketView"]');
    const raw=String(action?.getAttribute?.('onclick')||'');
    const match=raw.match(/openSavedTicketView\(\s*(['"])(.*?)\1\s*\)/);
    return match?.[2]||'';
  };

  const stableTicketId=card=>{
    const actionId=actionTicketId(card);
    if(actionId){card.dataset.ticketId=actionId;return actionId}
    return String(card?.dataset?.ticketId||'');
  };

  const recordFor=card=>{
    const id=stableTicketId(card);
    return loadRecords().find(record=>String(record?.id||'')===id)||null;
  };

  const normalize=button=>{
    if(!button||button.dataset.labelFixBusy==='1')return;
    button.dataset.labelFixBusy='1';
    const card=button.closest('.savedTicket');
    const record=recordFor(card);
    const straight=String(record?.ticket?.type||'').toLowerCase()==='straight';
    const open=button.getAttribute('aria-expanded')==='true';
    const compact=window.matchMedia('(max-width:340px)').matches;
    const label=compact?(open?'Hide':'Show'):`${open?'Hide':'Show'} ${straight?'Pick':'Legs'}`;
    button.classList.remove('webkitPaintLayer');
    button.style.removeProperty('-webkit-transform');
    button.style.removeProperty('transform');
    if(button.textContent!==label)button.textContent=label;
    void button.offsetWidth;
    requestAnimationFrame(()=>{
      button.classList.remove('webkitPaintLayer');
      delete button.dataset.labelFixBusy;
    });
  };

  const datesFor=record=>{
    const dates=[],ticket=record?.ticket||{};
    if(ticket.date)dates.push(ticket.date);
    for(const leg of ticket.legs||[])if(leg.date)dates.push(leg.date);
    return [...new Set(dates)];
  };

  const stateClass=state=>String(state||'pending').toUpperCase();
  const valueClass=state=>state==='win'?'valueWin':state==='loss'?'valueLoss':state==='push'?'valuePush':state==='suspended'||state==='unavailable'?'valueSuspended':'valuePending';
  const detailsHtml=record=>{
    const C=window.ParlayTrackerCore,ticket=record?.ticket||{};
    if(!C)return '<div class="dashboardDetailsMessage">Tracker engine unavailable.</div>';
    return (record?.__evaluated||[]).map(leg=>{
      const live=leg.__live||C.statusObj('pending',''),game=leg.__game,state=stateClass(live.state);
      const meta=ticket.type==='sgp'?[game?C.baseGameMeta(game):'']:[C.legGame(ticket,leg),game?C.baseGameMeta(game):''];
      return `<div class="dashboardLeg leg${state}"><div><div class="dashboardLegLabel">${esc(leg.label||'Untitled')}</div><div class="dashboardLegMeta">${esc(meta.filter(Boolean).join(' · '))}</div></div><div class="dashboardLegRight"><div class="dashboardLegValue ${esc(live.valueClass||valueClass(live.state))}">${esc(live.value||'')}</div><span class="dashboardLegStatus ${state}">${esc(state)}</span></div></div>`;
    }).join('')||'<div class="dashboardDetailsMessage">No legs in this ticket.</div>';
  };

  const evaluateIntoPanel=async(card,panel)=>{
    const id=stableTicketId(card),record=loadRecords().find(item=>String(item?.id||'')===id);
    if(!record||!panel)return;
    const token=Symbol(id);detailLoads.set(id,token);
    panel.innerHTML='<div class="dashboardDetailsMessage">Refreshing leg status…</div>';
    try{
      const sources=window.ParlayTrackerSources,evaluator=window.ParlayTrackerEvaluator;
      if(!sources||!evaluator)throw new Error('Tracker engine unavailable');
      sources.resetTrackingCaches?.();
      const games=await sources.fetchScoreboards(datesFor(record));
      const evaluated=await evaluator.evaluateRecord(record,games);
      if(detailLoads.get(id)===token&&!panel.classList.contains('hide'))panel.innerHTML=detailsHtml(evaluated);
    }catch(error){
      if(detailLoads.get(id)===token&&!panel.classList.contains('hide'))panel.innerHTML=`<div class="dashboardDetailsMessage">Unable to refresh leg status: ${esc(error?.message||error)}</div>`;
    }finally{
      if(detailLoads.get(id)===token)detailLoads.delete(id);
    }
  };

  const syncExpandAll=()=>{
    const control=document.getElementById('toggleAllTicketsBtn');
    if(!control)return;
    const buttons=[...document.querySelectorAll('#ticketList .ticketExpandBtn[data-ticket-binding-fix]')];
    const anyOpen=buttons.some(button=>button.getAttribute('aria-expanded')==='true');
    control.textContent=anyOpen?'Collapse All':'Expand All';
    control.setAttribute('aria-pressed',String(anyOpen));
    control.setAttribute('aria-label',anyOpen?'Collapse all ticket details':'Expand all ticket details');
  };

  const setCardOpen=(card,open,refresh=true)=>{
    const button=card?.querySelector?.('.ticketExpandBtn'),panel=card?.querySelector?.('.savedTicketDetails');
    if(!button||!panel)return;
    button.setAttribute('aria-expanded',String(open));
    panel.classList.toggle('hide',!open);
    normalize(button);
    if(open&&refresh)evaluateIntoPanel(card,panel);
    syncExpandAll();
  };

  const bindCard=card=>{
    const id=stableTicketId(card);
    if(!id)return false;
    const current=card.querySelector('.ticketExpandBtn');
    if(!current)return false;
    if(current.dataset.ticketBindingFix===id)return true;
    const button=current.cloneNode(true);
    button.dataset.ticketBindingFix=id;
    current.replaceWith(button);
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      event.stopImmediatePropagation();
      setCardOpen(card,button.getAttribute('aria-expanded')!=='true',true);
    });
    normalize(button);
    return true;
  };

  const repairDashboard=()=>{
    const cards=[...document.querySelectorAll('#ticketList .savedTicket')];
    cards.forEach(bindCard);
    syncExpandAll();
  };

  const formatStamp=value=>{
    const date=new Date(value||'');
    return Number.isNaN(date.getTime())?'':date.toLocaleString([], {year:'numeric',month:'numeric',day:'numeric',hour:'numeric',minute:'2-digit'});
  };

  const ensureOutcomeRow=card=>{
    let row=card.querySelector('.ticketOutcomeRow');
    if(row)return row;
    const badge=card.querySelector('.ticketOutcome');
    if(!badge)return null;
    row=document.createElement('div');row.className='ticketOutcomeRow';badge.parentNode.insertBefore(row,badge);row.appendChild(badge);return row;
  };

  const repairStandaloneStamps=()=>{
    stampRepairQueued=false;
    const params=new URLSearchParams(location.hash.slice(1)),id=params.get('ticket'),active=params.get('view')==='active';
    if(!id&&!active)return;
    const list=loadRecords(),records=id?list.filter(record=>String(record.id)===String(id)):list.filter(record=>record.status!=='completed');
    const byId=new Map(records.map(record=>[String(record.id||''),record]));
    [...document.querySelectorAll('#standaloneView .liveTicketCard')].forEach((card,index)=>{
      const cardId=String(card.dataset.ticketId||''),record=(cardId&&byId.get(cardId))||records[index]||null;
      const desired=record?.settledAt?'Settled '+formatStamp(record.settledAt):'';
      const existing=card.querySelector('.settlementStamp');
      if(!desired){existing?.remove();return}
      if(existing?.textContent===desired)return;
      existing?.remove();
      const stamp=document.createElement('span');stamp.className='settlementStamp';stamp.textContent=desired;
      const row=ensureOutcomeRow(card);if(row)row.appendChild(stamp);else card.appendChild(stamp);
    });
  };

  const queueStampRepair=()=>{
    if(stampRepairQueued)return;
    stampRepairQueued=true;
    setTimeout(repairStandaloneStamps,0);
  };

  const normalizeAll=()=>document.querySelectorAll('#ticketList .ticketExpandBtn').forEach(normalize);
  const start=()=>{
    addCss();
    repairDashboard();
    normalizeAll();
    queueStampRepair();
    new MutationObserver(()=>{
      requestAnimationFrame(()=>{repairDashboard();normalizeAll()});
      queueStampRepair();
    }).observe(document.body,{subtree:true,childList:true,attributes:true,attributeFilter:['aria-expanded','class','data-ticket-id']});
    document.addEventListener('click',event=>{
      if(event.target.closest?.('#toggleAllTicketsBtn')){
        event.preventDefault();event.stopPropagation();event.stopImmediatePropagation();
        repairDashboard();
        const cards=[...document.querySelectorAll('#ticketList .savedTicket')];
        const shouldOpen=!cards.some(card=>card.querySelector('.ticketExpandBtn')?.getAttribute('aria-expanded')==='true');
        cards.forEach(card=>setCardOpen(card,shouldOpen,shouldOpen));
        return;
      }
      const button=event.target.closest?.('.ticketExpandBtn');
      if(button)setTimeout(()=>normalize(button),0);
      if(event.target.closest?.('#ticketsTab'))setTimeout(repairDashboard,0);
    },true);
    for(const name of ['parlay:dashboard-refreshed','parlay:tracker-refreshed','parlay:settlement-status-updated'])document.addEventListener(name,()=>{setTimeout(repairDashboard,0);queueStampRepair()});
    window.addEventListener('hashchange',queueStampRepair);
    window.addEventListener('resize',()=>{normalizeAll();repairDashboard()});
  };

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
