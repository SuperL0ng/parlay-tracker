/* DASHBOARD ACTIONS MENU V78 — separates ticket details from secondary actions */
(() => {
  'use strict';

  let retryTimer=null;
  const openTicketIds=window.__dashboardMoreOpenIds instanceof Set?window.__dashboardMoreOpenIds:new Set();
  window.__dashboardMoreOpenIds=openTicketIds;

  function addCss(){
    if(document.getElementById('dashboardMoreActionsV74Css'))return;
    const style=document.createElement('style');
    style.id='dashboardMoreActionsV74Css';
    style.textContent=`
      #ticketList .savedActions.moreActionsEnabled{display:grid!important;width:100%!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:6px!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionView{grid-column:1/10!important;grid-row:1!important;height:34px!important;min-height:34px!important;padding:4px!important}
      #ticketList .savedActions.moreActionsEnabled>.ticketDetailsAction{position:static!important;grid-column:10/13!important;grid-row:1!important;width:100%!important;min-width:0!important;height:34px!important;min-height:34px!important;padding:3px 4px!important;font-size:9px!important;line-height:1!important;letter-spacing:.04em!important;color:#26303B!important;background:linear-gradient(180deg,#E9EDF2,#C5CED9 55%,#8C98A8)!important;border-color:rgba(93,105,120,.46)!important}
      #ticketList .savedTicketTop>.savedActionsMoreToggle{position:absolute;top:0;right:0;z-index:22;width:84px;min-width:84px;height:32px;min-height:32px;padding:4px 5px;border-radius:8px;font-size:8px;font-weight:900;line-height:1;letter-spacing:.035em;text-transform:uppercase;white-space:nowrap;color:#26303B!important;background:linear-gradient(180deg,#E9EDF2,#C5CED9 55%,#8C98A8)!important;border-color:rgba(93,105,120,.46)!important}
      #ticketList .savedActionsMoreToggle .moreChevron{display:inline-block;margin-left:3px;font-size:11px;line-height:1;transition:transform .18s ease}
      #ticketList .savedActionsMoreToggle[aria-expanded="true"] .moreChevron{transform:rotate(180deg)}
      #ticketList .savedActionsMenu{display:none;position:absolute;top:42px;right:10px;z-index:21;width:min(230px,calc(100% - 20px));grid-template-columns:repeat(2,minmax(0,1fr));gap:6px;padding:8px;border:1px solid rgba(91,103,118,.55);border-radius:10px;background:linear-gradient(180deg,rgba(244,247,250,.98),rgba(190,200,212,.98));box-shadow:0 9px 22px rgba(29,38,49,.32)}
      #ticketList .savedTicket.actionsMenuOpen{z-index:30!important;overflow:visible!important}\n      #ticketList .savedTicket.actionsMenuOpen>.savedActionsMenu{display:grid;overflow:visible!important}
      #ticketList .savedActionsMenu>.savedActionMenuItem{width:100%!important;min-width:0!important;min-height:38px!important;margin:0!important;padding:5px 3px!important;font-size:9px!important;line-height:1.08!important;letter-spacing:.02em!important;white-space:normal!important}
      @media(min-width:600px){#ticketList .savedTicketTop>.savedActionsMoreToggle{font-size:9px}#ticketList .savedActionsMenu>.savedActionMenuItem{font-size:10px!important}}
      @media(max-width:390px){#ticketList .savedActions.moreActionsEnabled{gap:5px!important}#ticketList .savedActions.moreActionsEnabled>.ticketDetailsAction{font-size:8px!important;padding:3px!important}#ticketList .savedTicketTop>.savedActionsMoreToggle{width:80px;min-width:80px;padding:4px;font-size:7.5px}#ticketList .savedActionsMenu>.savedActionMenuItem{font-size:8.5px!important}}
    `;
    document.head.appendChild(style);
  }

  function label(button){
    const raw=String(button?.innerText||button?.textContent||'').replace(/\s+/g,'').toUpperCase();
    const aliases={COPYCODE:'COPY CODE',MARKACTIVE:'MARK ACTIVE'};
    return aliases[raw]||raw;
  }

  function setToggleState(card,toggle){
    const open=card.classList.contains('actionsMenuOpen');
    toggle.setAttribute('aria-expanded',String(open));
    toggle.setAttribute('aria-label',open?'Close ticket actions':'Open ticket actions');
    toggle.innerHTML='Actions <span class="moreChevron">⌄</span>';
  }

  function setClass(button,...classes){
    button.classList.remove(
      'savedActionView','savedActionCopy','savedActionShare','savedActionPrimary',
      'savedActionSecondary','savedActionSecondary1','savedActionSecondary2',
      'savedActionSecondary3','savedActionSecondary4','savedActionExpanded',
      'savedActionStatus','savedActionDuplicate','savedActionEdit','savedActionDelete',
      'savedActionMenuItem','ticketDetailsAction'
    );
    button.classList.add(...classes);
  }

  function enhance(card){
    const actions=card.querySelector('.savedActions'),top=card.querySelector('.savedTicketTop');
    if(!actions||!top)return false;
    if(actions.dataset.moreReady==='1'&&actions.classList.contains('moreActionsEnabled')&&top.querySelector(':scope > .savedActionsMoreToggle')&&card.querySelector(':scope > .savedActionsMenu'))return true;

    const buttons=[...actions.querySelectorAll(':scope > button,:scope > a.navAction')].filter(button=>!button.classList.contains('savedActionsMoreToggle')&&!button.classList.contains('ticketExpandBtn'));
    const view=buttons.find(button=>['VIEW','OPEN TICKET'].includes(label(button)));
    const copy=buttons.find(button=>label(button)==='COPY CODE');
    const share=buttons.find(button=>label(button)==='SHARE');
    const duplicate=buttons.find(button=>label(button)==='DUPLICATE');
    const status=buttons.find(button=>['COMPLETE','MARK ACTIVE'].includes(label(button)));
    const edit=buttons.find(button=>label(button)==='EDIT');
    const del=buttons.find(button=>label(button)==='DELETE');
    const details=card.querySelector('.ticketExpandBtn');
    if(!view||!copy||!share||!duplicate||!status||!edit||!del||!details)return false;

    const ticketId=String(card.dataset.ticketId||'');
    const shouldOpen=ticketId?openTicketIds.has(ticketId):card.classList.contains('actionsMenuOpen');
    view.textContent='Open Ticket';
    copy.textContent='Copy Code';share.textContent='Share';duplicate.textContent='Duplicate';
    status.textContent=label(status)==='MARK ACTIVE'?'Mark Active':'Complete';edit.textContent='Edit';del.textContent='Delete';

    let toggle=top.querySelector(':scope > .savedActionsMoreToggle');
    if(!toggle){toggle=document.createElement('button');toggle.type='button';toggle.className='ghost savedActionsMoreToggle'}
    let menu=card.querySelector(':scope > .savedActionsMenu');
    if(!menu){menu=document.createElement('div');menu.className='savedActionsMenu';menu.setAttribute('role','menu')}

    setClass(view,'savedActionView','savedActionPrimary');
    setClass(details,'ticketExpandBtn','ticketDetailsAction');
    setClass(copy,'savedActionMenuItem','savedActionCopy');setClass(share,'savedActionMenuItem','savedActionShare');
    setClass(status,'savedActionMenuItem','savedActionStatus');setClass(duplicate,'savedActionMenuItem','savedActionDuplicate');
    setClass(edit,'savedActionMenuItem','savedActionEdit');setClass(del,'savedActionMenuItem','savedActionDelete');

    actions.replaceChildren(view,details);menu.replaceChildren(copy,share,status,duplicate,edit,del);
    top.appendChild(toggle);card.appendChild(menu);
    actions.classList.add('moreActionsEnabled');card.classList.toggle('actionsMenuOpen',shouldOpen);
    actions.dataset.moreReady='1';setToggleState(card,toggle);

    toggle.onclick=event=>{event.preventDefault();event.stopPropagation();const open=!card.classList.contains('actionsMenuOpen');
      document.querySelectorAll('#ticketList .savedTicket.actionsMenuOpen').forEach(other=>{if(other!==card){other.classList.remove('actionsMenuOpen');const otherToggle=other.querySelector('.savedActionsMoreToggle');if(otherToggle)setToggleState(other,otherToggle)}});
      card.classList.toggle('actionsMenuOpen',open);if(ticketId){if(open)openTicketIds.add(ticketId);else openTicketIds.delete(ticketId)}setToggleState(card,toggle)};
    menu.addEventListener('click',()=>{card.classList.remove('actionsMenuOpen');if(ticketId)openTicketIds.delete(ticketId);setToggleState(card,toggle)});
    return true;
  }

  function apply(){
    addCss();
    return [...document.querySelectorAll('#ticketList .savedTicket')].map(enhance);
  }

  function retry(){
    clearTimeout(retryTimer);
    let attempts=0;
    const run=()=>{
      const results=apply();
      const cards=document.querySelectorAll('#ticketList .savedTicket').length;
      attempts++;
      if(attempts<25&&(cards===0||results.some(result=>!result)))retryTimer=setTimeout(run,100);
    };
    run();
  }

  function wrap(){
    const original=window.renderTicketDashboard;
    if(typeof original!=='function'||original.__moreActionsV74Wrapped)return;
    const wrapped=function(...args){
      const out=original.apply(this,args);
      requestAnimationFrame(retry);
      return out;
    };
    wrapped.__moreActionsV74Wrapped=true;
    window.renderTicketDashboard=wrapped;
  }

  wrap();retry();
  window.addEventListener('load',()=>{wrap();retry()},{once:true});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#ticketsTab')){
      openTicketIds.clear();
      setTimeout(retry,0);
    }
  },true);
  document.addEventListener('click',event=>{if(!event.target.closest?.('.savedActionsMenu')&&!event.target.closest?.('.savedActionsMoreToggle'))document.querySelectorAll('#ticketList .savedTicket.actionsMenuOpen').forEach(card=>{card.classList.remove('actionsMenuOpen');const toggle=card.querySelector('.savedActionsMoreToggle');if(toggle)setToggleState(card,toggle)})});
  document.addEventListener('keydown',event=>{if(event.key==='Escape')document.querySelectorAll('#ticketList .savedTicket.actionsMenuOpen').forEach(card=>{card.classList.remove('actionsMenuOpen');const toggle=card.querySelector('.savedActionsMoreToggle');if(toggle)setToggleState(card,toggle)})});
  document.addEventListener('parlay:dashboard-refreshed',retry);
})();
