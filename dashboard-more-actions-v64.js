/* DASHBOARD MORE ACTIONS V64 — compact primary row with expandable secondary actions */
(() => {
  'use strict';

  function addCss(){
    if(document.getElementById('dashboardMoreActionsV64Css'))return;
    const style=document.createElement('style');
    style.id='dashboardMoreActionsV64Css';
    style.textContent=`
      #ticketList .savedActions{position:relative!important}
      #ticketList .savedActionsPrimary{
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:6px;
        grid-column:1/-1;
      }
      #ticketList .savedActionsPrimary>button{width:100%!important}
      #ticketList .savedActionsMoreToggle{
        color:#26303B!important;
        background:linear-gradient(180deg,#E9EDF2,#C5CED9 55%,#8C98A8)!important;
        border-color:rgba(93,105,120,.46)!important;
      }
      #ticketList .savedActionsMoreToggle .moreChevron{
        display:inline-block;
        margin-left:5px;
        font-size:15px;
        line-height:1;
        transition:transform .18s ease;
      }
      #ticketList .savedActionsMoreToggle[aria-expanded="true"] .moreChevron{transform:rotate(180deg)}
      #ticketList .savedActionsDrawer{
        grid-column:1/-1;
        display:grid;
        grid-template-columns:repeat(4,minmax(0,1fr));
        gap:6px;
        overflow:hidden;
        max-height:0;
        opacity:0;
        transform:translateY(-4px);
        pointer-events:none;
        transition:max-height .2s ease,opacity .16s ease,transform .16s ease,margin-top .16s ease;
        margin-top:0;
      }
      #ticketList .savedActionsDrawer.open{
        max-height:72px;
        opacity:1;
        transform:translateY(0);
        pointer-events:auto;
        margin-top:6px;
      }
      #ticketList .savedActionsDrawer>button{width:100%!important}
      @media(max-width:390px){
        #ticketList .savedActionsPrimary,#ticketList .savedActionsDrawer{gap:5px}
      }
    `;
    document.head.appendChild(style);
  }

  function label(button){return String(button?.textContent||'').replace(/\s+/g,' ').trim().toUpperCase()}

  function enhance(card){
    const actions=card.querySelector('.savedActions');
    if(!actions||actions.dataset.moreReady==='1')return;
    const buttons=[...actions.querySelectorAll(':scope > button')];
    if(buttons.length<4)return;

    const view=buttons.find(b=>label(b)==='VIEW');
    const copy=buttons.find(b=>label(b)==='COPY CODE');
    const share=buttons.find(b=>label(b)==='SHARE');
    const secondary=buttons.filter(b=>/^(DUPLICATE|COMPLETE|MARK ACTIVE|EDIT|DELETE)$/.test(label(b)));
    const primaryButtons=[view,copy,share].filter(Boolean);
    if(!primaryButtons.length||!secondary.length)return;

    const primary=document.createElement('div');
    primary.className='savedActionsPrimary';
    primaryButtons.forEach(button=>primary.appendChild(button));

    const toggle=document.createElement('button');
    toggle.type='button';
    toggle.className='ghost savedActionsMoreToggle';
    toggle.setAttribute('aria-expanded','false');
    toggle.innerHTML='More <span class="moreChevron">⌄</span>';
    primary.appendChild(toggle);

    const drawer=document.createElement('div');
    drawer.className='savedActionsDrawer';
    secondary.forEach(button=>drawer.appendChild(button));

    actions.innerHTML='';
    actions.append(primary,drawer);
    actions.dataset.moreReady='1';

    toggle.addEventListener('click',()=>{
      const open=!drawer.classList.contains('open');
      drawer.classList.toggle('open',open);
      toggle.setAttribute('aria-expanded',String(open));
      toggle.firstChild.nodeValue=open?'Less ':'More ';
    });
  }

  function apply(){
    addCss();
    document.querySelectorAll('#ticketList .savedTicket').forEach(enhance);
  }

  function wrap(){
    const original=window.renderTicketDashboard;
    if(typeof original!=='function'||original.__moreActionsV64Wrapped)return;
    const wrapped=function(...args){
      const out=original.apply(this,args);
      requestAnimationFrame(apply);
      return out;
    };
    wrapped.__moreActionsV64Wrapped=true;
    window.renderTicketDashboard=wrapped;
  }

  wrap();
  apply();
  window.addEventListener('load',()=>{wrap();apply()},{once:true});
  document.addEventListener('click',event=>{
    if(event.target.closest?.('#ticketsTab'))setTimeout(apply,0);
  },true);
})();