/* DASHBOARD MORE ACTIONS V70 — full-width View row, compact three-button row, full-width More row */
(() => {
  'use strict';

  let retryTimer=null;

  function addCss(){
    if(document.getElementById('dashboardMoreActionsV70Css'))return;
    const style=document.createElement('style');
    style.id='dashboardMoreActionsV70Css';
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
        grid-column:1/13!important;
        grid-row:1!important;
        min-height:40px!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionCopy{
        grid-column:1/5!important;
        grid-row:2!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionShare{
        grid-column:5/9!important;
        grid-row:2!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionsMoreToggle{
        grid-column:9/13!important;
        grid-row:2!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionCopy,
      #ticketList .savedActions.moreActionsEnabled>.savedActionShare,
      #ticketList .savedActions.moreActionsEnabled>.savedActionsMoreToggle{
        min-height:33px!important;
        padding:5px 4px!important;
        font-size:9px!important;
        line-height:1!important;
        letter-spacing:.04em!important;
        white-space:nowrap!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionSecondary{
        display:none!important;
        grid-row:3!important;
        min-width:0!important;
        min-height:39px!important;
        padding:5px 2px!important;
        font-size:8px!important;
        line-height:1.08!important;
        letter-spacing:.025em!important;
        white-space:normal!important;
        overflow-wrap:normal!important;
        word-break:normal!important;
      }
      #ticketList .savedActions.moreActionsEnabled>.savedActionSecondary1{grid-column:1/4!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionSecondary2{grid-column:4/7!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionSecondary3{grid-column:7/10!important}
      #ticketList .savedActions.moreActionsEnabled>.savedActionSecondary4{grid-column:10/13!important}
      #ticketList .savedActions.moreActionsEnabled.moreOpen>.savedActionSecondary{display:flex!important}
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
        #ticketList .savedActions.moreActionsEnabled>.savedActionCopy,
        #ticketList .savedActions.moreActionsEnabled>.savedActionShare,
        #ticketList .savedActions.moreActionsEnabled>.savedActionsMoreToggle{font-size:10px!important}
        #ticketList .savedActions.moreActionsEnabled>.savedActionSecondary{font-size:9px!important}
      }
      @media(max-width:390px){
        #ticketList .savedActions.moreActionsEnabled{column-gap:5px!important;row-gap:5px!important}
        #ticketList .savedActions.moreActionsEnabled>.savedActionCopy,
        #ticketList .savedActions.moreActionsEnabled>.savedActionShare,
        #ticketList .savedActions.moreActionsEnabled>.savedActionsMoreToggle{min-height:32px!important;padding:4px 3px!important;font-size:8px!important}
        #ticketList .savedActions.moreActionsEnabled>.savedActionSecondary{min-height:38px!important;font-size:7.5px!important;padding:4px 1px!important}
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
      'savedActionSecondary3','savedActionSecondary4'
    );
    button.classList.add(...classes);
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

    view.textContent='View';
    copy.textContent='Copy Code';
    share.textContent='Share';
    duplicate.textContent='Duplicate';
    complete.textContent=label(complete)==='MARK ACTIVE'?'Mark Active':'Complete';
    edit.textContent='Edit';
    del.textContent='Delete';

    let toggle=actions.querySelector(':scope > .savedActionsMoreToggle');
    if(!toggle){
      toggle=document.createElement('button');
      toggle.type='button';
      toggle.className='ghost savedActionsMoreToggle';
    }

    const wasOpen=actions.classList.contains('moreOpen');
    setClass(view,'savedActionView','savedActionPrimary');
    setClass(copy,'savedActionCopy','savedActionPrimary');
    setClass(share,'savedActionShare','savedActionPrimary');
    setClass(duplicate,'savedActionSecondary','savedActionSecondary1');
    setClass(complete,'savedActionSecondary','savedActionSecondary2');
    setClass(edit,'savedActionSecondary','savedActionSecondary3');
    setClass(del,'savedActionSecondary','savedActionSecondary4');

    actions.replaceChildren(view,copy,share,toggle,duplicate,complete,edit,del);
    actions.classList.add('moreActionsEnabled');
    actions.classList.toggle('moreOpen',wasOpen);
    actions.dataset.moreReady='1';
    setToggleState(actions,toggle);

    toggle.onclick=event=>{
      event.preventDefault();
      event.stopPropagation();
      actions.classList.toggle('moreOpen');
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
    if(typeof original!=='function'||original.__moreActionsV70Wrapped)return;
    const wrapped=function(...args){
      const out=original.apply(this,args);
      requestAnimationFrame(retry);
      return out;
    };
    wrapped.__moreActionsV70Wrapped=true;
    window.renderTicketDashboard=wrapped;
  }

  wrap();retry();
  window.addEventListener('load',()=>{wrap();retry()},{once:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('#ticketsTab'))setTimeout(retry,0)},true);
  document.addEventListener('parlay:dashboard-refreshed',retry);
})();