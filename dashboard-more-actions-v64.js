/* DASHBOARD MORE ACTIONS V68 — reliable four-button row with collapsible secondary actions */
(() => {
  'use strict';

  let retryTimer=null;

  function addCss(){
    if(document.getElementById('dashboardMoreActionsV68Css'))return;
    const style=document.createElement('style');
    style.id='dashboardMoreActionsV68Css';
    style.textContent=`
      #ticketList .savedActions.moreActionsEnabled{
        display:grid!important;
        grid-template-columns:repeat(4,minmax(0,1fr))!important;
        gap:6px!important;
      }
      #ticketList .savedActions.moreActionsEnabled>button{
        grid-column:auto!important;
        width:100%!important;
        min-width:0!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionSecondary{
        display:none!important;
      }
      #ticketList .savedActions.moreActionsEnabled.moreOpen>.savedActionSecondary{
        display:flex!important;
      }
      #ticketList .savedActionsMoreToggle{
        color:#26303B!important;
        background:linear-gradient(180deg,#E9EDF2,#C5CED9 55%,#8C98A8)!important;
        border-color:rgba(93,105,120,.46)!important;
      }
      #ticketList .savedActionsMoreToggle .moreChevron{
        display:inline-block;
        margin-left:5px;
        font-size:14px;
        line-height:1;
        transition:transform .18s ease;
      }
      #ticketList .savedActionsMoreToggle[aria-expanded="true"] .moreChevron{
        transform:rotate(180deg);
      }
      #ticketList .savedActions.moreActionsEnabled.moreOpen{
        row-gap:7px!important;
      }
      @media(max-width:390px){
        #ticketList .savedActions.moreActionsEnabled{gap:5px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function label(button){
    const raw=String(button?.innerText||button?.textContent||'').replace(/\s+/g,'').toUpperCase();
    const aliases={COPYCODE:'COPY CODE',MARKACTIVE:'MARK ACTIVE'};
    return aliases[raw]||raw;
  }

  function enhance(card){
    const actions=card.querySelector('.savedActions');
    if(!actions)return false;

    const buttons=[...actions.querySelectorAll(':scope > button')].filter(button=>!button.classList.contains('savedActionsMoreToggle'));
    const view=buttons.find(button=>label(button)==='VIEW');
    const copy=buttons.find(button=>label(button)==='COPY CODE');
    const share=buttons.find(button=>label(button)==='SHARE');
    const duplicate=buttons.find(button=>label(button)==='DUPLICATE');
    const complete=buttons.find(button=>['COMPLETE','MARK ACTIVE'].includes(label(button)));
    const edit=buttons.find(button=>label(button)==='EDIT');
    const del=buttons.find(button=>label(button)==='DELETE');
    if(!view||!copy||!share||!duplicate||!complete||!edit||!del)return false;

    let toggle=actions.querySelector(':scope > .savedActionsMoreToggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='ghost savedActionsMoreToggle';
    }

    [view,copy,share].forEach(button=>{
      button.classList.remove('savedActionSecondary');
      button.classList.add('savedActionPrimary');
    });
    [duplicate,complete,edit,del].forEach(button=>{
      button.classList.remove('savedActionPrimary');
      button.classList.add('savedActionSecondary');
    });

    actions.classList.add('moreActionsEnabled');
    actions.dataset.moreReady='1';
    actions.classList.remove('moreOpen');
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='More <span class="moreChevron">⌄</span>';

    toggle.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      const open=!actions.classList.contains('moreOpen');
      actions.classList.toggle('moreOpen',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.innerHTML=`${open?'Less':'More'} <span class="moreChevron">⌄</span>`;
    };

    actions.replaceChildren(view,copy,share,toggle,duplicate,complete,edit,del);
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
    if(typeof original!=='function'||original.__moreActionsV68Wrapped)return;
    const wrapped=function(...args){
      const out=original.apply(this,args);
      requestAnimationFrame(retry);
      return out;
    };
    wrapped.__moreActionsV68Wrapped=true;
    window.renderTicketDashboard=wrapped;
  }

  wrap();
  retry();
  window.addEventListener('load',()=>{wrap();retry()},{once:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('#ticketsTab'))setTimeout(retry,0)},true);
  document.addEventListener('parlay:dashboard-refreshed',retry);
})();