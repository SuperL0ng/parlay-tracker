/* DASHBOARD MORE ACTIONS V66 — compact primary row with expandable secondary actions */
(() => {
  'use strict';

  function addCss(){
    if(document.getElementById('dashboardMoreActionsV64Css'))return;
    const style=document.createElement('style');
    style.id='dashboardMoreActionsV64Css';
    style.textContent=`
      #ticketList .savedActions{position:relative!important}
      #ticketList .savedActionsPrimary{display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;grid-column:1/-1!important}
      #ticketList .savedActionsPrimary>button{width:100%!important;grid-column:auto!important}
      #ticketList .savedActionsMoreToggle{color:#26303B!important;background:linear-gradient(180deg,#E9EDF2,#C5CED9 55%,#8C98A8)!important;border-color:rgba(93,105,120,.46)!important}
      #ticketList .savedActionsMoreToggle .moreChevron{display:inline-block;margin-left:5px;font-size:15px;line-height:1;transition:transform .18s ease}
      #ticketList .savedActionsMoreToggle[aria-expanded="true"] .moreChevron{transform:rotate(180deg)}
      #ticketList .savedActionsDrawer{grid-column:1/-1!important;display:grid!important;grid-template-columns:repeat(4,minmax(0,1fr))!important;gap:6px!important;overflow:hidden!important;max-height:0!important;opacity:0!important;transform:translateY(-4px)!important;pointer-events:none!important;margin-top:0!important;transition:max-height .2s ease,opacity .16s ease,transform .16s ease,margin-top .16s ease!important}
      #ticketList .savedActionsDrawer.open{max-height:72px!important;opacity:1!important;transform:translateY(0)!important;pointer-events:auto!important;margin-top:6px!important}
      #ticketList .savedActionsDrawer>button{width:100%!important;grid-column:auto!important}
      @media(max-width:390px){#ticketList .savedActionsPrimary,#ticketList .savedActionsDrawer{gap:5px!important}}
    `;
    document.head.appendChild(style);
  }

  function label(button){return String(button?.textContent||'').replace(/\s+/g,' ').trim().toUpperCase()}
  function validStructure(actions){return Boolean(actions?.querySelector(':scope > .savedActionsPrimary')&&actions.querySelector(':scope > .savedActionsDrawer')&&actions.querySelector('.savedActionsMoreToggle'))}

  function enhance(card){
    const actions=card.querySelector('.savedActions');
    if(!actions)return false;
    if(validStructure(actions)){actions.dataset.moreReady='1';return true}

    const buttons=[...actions.querySelectorAll(':scope > button')].filter(button=>!button.classList.contains('savedActionsMoreToggle'));
    const view=buttons.find(b=>label(b)==='VIEW');
    const copy=buttons.find(b=>label(b)==='COPY CODE');
    const share=buttons.find(b=>label(b)==='SHARE');
    const secondary=buttons.filter(b=>/^(DUPLICATE|COMPLETE|MARK ACTIVE|EDIT|DELETE)$/.test(label(b)));
    if(!view||!copy||!share||secondary.length<4)return false;

    const primary=document.createElement('div');
    primary.className='savedActionsPrimary';
    [view,copy,share].forEach(button=>primary.appendChild(button));

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='ghost savedActionsMoreToggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='More <span class="moreChevron">⌄</span>';
    primary.appendChild(toggle);

    const drawer=document.createElement('div');
    drawer.className='savedActionsDrawer';
    secondary.forEach(button=>drawer.appendChild(button));

    actions.replaceChildren(primary,drawer);
    actions.dataset.moreReady='1';
    toggle.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      const open=!drawer.classList.contains('open');
      drawer.classList.toggle('open',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.childNodes[0].nodeValue=open?'Less ':'More ';
    });
    return true;
  }

  function apply(){addCss();let complete=true;document.querySelectorAll('#ticketList .savedTicket').forEach(card=>{if(!enhance(card))complete=false});return complete}
  function applyUntilReady(){[0,40,120,260].forEach(delay=>setTimeout(apply,delay))}
  function wrap(){const original=window.renderTicketDashboard;if(typeof original!=='function'||original.__moreActionsV66Wrapped)return;const wrapped=function(...args){const out=original.apply(this,args);applyUntilReady();return out};wrapped.__moreActionsV66Wrapped=true;window.renderTicketDashboard=wrapped}

  wrap();applyUntilReady();
  window.addEventListener('load',()=>{wrap();applyUntilReady()},{once:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('#ticketsTab'))applyUntilReady()},true);
  document.addEventListener('parlay:dashboard-refreshed',applyUntilReady);
})();