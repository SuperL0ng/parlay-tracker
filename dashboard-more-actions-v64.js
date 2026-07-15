/* DASHBOARD MORE ACTIONS V76 — idempotent event-driven enhancement */
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
      #ticketList .savedActions.moreActionsEnabled{
        display:grid!important;
        width:100%!important;
        grid-template-columns:repeat(12,minmax(0,1fr))!important;
        column-gap:6px!important;
        row-gap:6px!important;
      }
      #ticketList .savedActions.moreActionsEnabled>button{
        width:100%!important;
        min-width:0!important;
        margin:0!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionView{
        grid-column:1/10!important;
        grid-row:1!important;
        height:34px!important;
        min-height:34px!important;
        padding:4px!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionsMoreToggle{
        grid-column:10/13!important;
        grid-row:1!important;
        height:34px!important;
        min-height:34px!important;
        padding:3px 4px!important;
        font-size:9px!important;
        line-height:1!important;
        letter-spacing:.04em!important;
        white-space:nowrap!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionExpanded{
        display:none!important;
        min-width:0!important;
        min-height:38px!important;
        padding:5px 3px!important;
        font-size:9.5px!important;
        line-height:1.08!important;
        letter-spacing:.015em!important;
        white-space:normal!important;
        overflow-wrap:normal!important;
        word-break:normal!important;
      }
      #ticketList .savedActions.moreActionsEnabled.moreOpen>.savedActionExpanded{display:flex!important}

      #ticketList .savedActions.moreActionsEnabled>.savedActionCopy{grid-column:1/5!important;grid-row:2!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionShare{grid-column:5/9!important;grid-row:2!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionStatus{grid-column:9/13!important;grid-row:2!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionDuplicate{grid-column:1/5!important;grid-row:3!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionEdit{grid-column:5/9!important;grid-row:3!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionDelete{grid-column:9/13!important;grid-row:3!important}

      #ticketList .savedActionsMoreToggle{
        color:#26303B!important;
        background:linear-gradient(180deg,#E9EDF2,#C5CED9 55%,#8C98A8)!important;
        border-color:rgba(93,105,120,.46)!important;
      }
      #ticketList .savedActionsMoreToggle .moreChevron{
        display:inline-block;
        margin-left:4px;
        font-size:12px;
        line-height:1;
        transition:transform .18s ease;
      }
      #ticketList .savedActionsMoreToggle[aria-expanded="true"] .moreChevron{transform:rotate(180deg)}
      @media(min-width:600px){
        #ticketList .savedActions.moreActionsEnabled>.savedActionsMoreToggle{font-size:10px!important}
        #ticketList .savedActions.moreActionsEnabled>.savedActionExpanded{font-size:10.5px!important}
      }
      @media(max-width:390px){
        #ticketList .savedActions.moreActionsEnabled{column-gap:5px!important;row-gap:5px!important}
        #ticketList .savedActions.moreActionsEnabled>.savedActionsMoreToggle{font-size:8px!important;padding:3px!important}
        #ticketList .savedActions.moreActionsEnabled>.savedActionExpanded{min-height:37px!important;font-size:8.5px!important;padding:4px 1px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function label(button){
    const raw=String(button?.innerText||button?.textContent||'').replace(/\s+/g,'').toUpperCase();
    const aliases={COPYCODE:'COPY CODE',MARKACTIVE:'MARK ACTIVE'};
    return aliases[raw]||raw;
  }

  function setToggleState(actions,toggle){
    const open=actions.classList.contains('moreOpen');
    toggle.setAttribute('aria-expanded',String(open));
    toggle.innerHTML=`${open?'Less':'More'} <span class="moreChevron">⌄</span>`;
  }

  function setClass(button,...classes){
    button.classList.remove(
      'savedActionView','savedActionCopy','savedActionShare','savedActionPrimary',
      'savedActionSecondary','savedActionSecondary1','savedActionSecondary2',
      'savedActionSecondary3','savedActionSecondary4','savedActionExpanded',
      'savedActionStatus','savedActionDuplicate','savedActionEdit','savedActionDelete'
    );
    button.classList.add(...classes);
  }

  function enhance(card){
    const actions=card.querySelector('.savedActions');
    if(!actions)return false;
    if(actions.dataset.moreReady==='1'&&actions.classList.contains('moreActionsEnabled')&&actions.querySelector(':scope > .savedActionsMoreToggle'))return true;

    const buttons=[...actions.querySelectorAll(':scope > button')].filter(button=>!button.classList.contains('savedActionsMoreToggle'));
    const view=buttons.find(button=>label(button)==='VIEW');
    const copy=buttons.find(button=>label(button)==='COPY CODE');
    const share=buttons.find(button=>label(button)==='SHARE');
    const duplicate=buttons.find(button=>label(button)==='DUPLICATE');
    const status=buttons.find(button=>['COMPLETE','MARK ACTIVE'].includes(label(button)));
    const edit=buttons.find(button=>label(button)==='EDIT');
    const del=buttons.find(button=>label(button)==='DELETE');
    if(!view||!copy||!share||!duplicate||!status||!edit||!del)return false;

    const ticketId=String(card.dataset.ticketId||'');
    const shouldOpen=ticketId?openTicketIds.has(ticketId):actions.classList.contains('moreOpen');

    view.textContent='View';
    copy.textContent='Copy Code';
    share.textContent='Share';
    duplicate.textContent='Duplicate';
    status.textContent=label(status)==='MARK ACTIVE'?'Mark Active':'Complete';
    edit.textContent='Edit';
    del.textContent='Delete';

    let toggle=actions.querySelector(':scope > .savedActionsMoreToggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='ghost savedActionsMoreToggle';
    }

    setClass(view,'savedActionView','savedActionPrimary');
    setClass(copy,'savedActionExpanded','savedActionCopy');
    setClass(share,'savedActionExpanded','savedActionShare');
    setClass(status,'savedActionExpanded','savedActionStatus');
    setClass(duplicate,'savedActionExpanded','savedActionDuplicate');
    setClass(edit,'savedActionExpanded','savedActionEdit');
    setClass(del,'savedActionExpanded','savedActionDelete');

    actions.replaceChildren(view,toggle,copy,share,status,duplicate,edit,del);
    actions.classList.add('moreActionsEnabled');
    actions.classList.toggle('moreOpen',shouldOpen);
    actions.dataset.moreReady='1';
    setToggleState(actions,toggle);

    toggle.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      const open=!actions.classList.contains('moreOpen');
      actions.classList.toggle('moreOpen',open);
      if(ticketId){if(open)openTicketIds.add(ticketId);else openTicketIds.delete(ticketId)}
      setToggleState(actions,toggle);
    };
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
  document.addEventListener('parlay:dashboard-refreshed',retry);
})();
