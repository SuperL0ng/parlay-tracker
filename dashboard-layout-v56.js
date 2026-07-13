/* DASHBOARD LAYOUT V62 — exact action order, dense header, inline sportsbook badge */
(() => {
  'use strict';

  function addCss(){
    if(document.getElementById('dashboardLayoutV56Css'))return;
    const style=document.createElement('style');
    style.id='dashboardLayoutV56Css';
    style.textContent=`
      #dashboardView .dashboardHeader{display:grid!important;grid-template-columns:minmax(118px,.9fr) minmax(0,2.7fr)!important;gap:10px!important;align-items:stretch!important}
      #dashboardView .dashboardHeader h2{align-self:center!important;min-width:0!important;line-height:1.18!important}
      #dashboardView .dashboardActions{display:grid!important;grid-template-columns:repeat(3,minmax(0,1fr))!important;gap:8px!important;min-width:0!important}
      #dashboardView .dashboardActions button,#dashboardView .dashboardActions a{width:100%!important;min-width:0!important;min-height:58px!important;padding:8px 5px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;white-space:normal!important;line-height:1.18!important;font-size:11px!important}
      #dashboardView .dashboardActions .forcedTwoLine{display:block!important;width:100%!important;text-align:center!important}
      #dashboardView .dashboardToolbarV55{display:grid!important;grid-template-columns:minmax(0,1fr) auto auto!important;gap:8px!important;align-items:center!important;margin:0 0 10px!important}
      #dashboardView .dashboardToolbarStatus{grid-column:1!important;grid-row:1!important;margin:0!important;text-align:left!important;min-width:0!important}
      #refreshTicketsBtn{grid-column:2!important;grid-row:1!important}
      #ticketSelectModeBtn{grid-column:3!important;grid-row:1!important}
      #deleteSelectedTicketsBtn{grid-column:1/-1!important;grid-row:2!important;justify-self:end!important}
      #ticketList .savedTitleRow{display:flex;align-items:center;gap:7px;min-width:0;flex-wrap:wrap}
      #ticketList .savedTitleRow h3{margin:0!important}
      #ticketList .savedTitleRow .bookBadge{flex:0 0 auto;margin:0!important}
      #ticketList .savedActions{display:grid!important;grid-template-columns:repeat(12,minmax(0,1fr))!important;gap:8px!important}
      #ticketList .savedActions button{width:100%!important;min-width:0!important;min-height:46px!important;padding:7px 4px!important;display:flex!important;align-items:center!important;justify-content:center!important;text-align:center!important;white-space:normal!important;line-height:1.12!important;font-size:10px!important;font-weight:900!important;letter-spacing:.065em!important}
      #ticketList .savedActions .actionUse{grid-column:span 4!important}
      #ticketList .savedActions .actionChange{grid-column:span 3!important}
      #ticketList .savedActions .forcedTwoLine{display:block!important;width:100%!important;text-align:center!important}
      @media(max-width:390px){
        #dashboardView .dashboardHeader{grid-template-columns:minmax(102px,.85fr) minmax(0,2.8fr)!important;gap:7px!important}
        #dashboardView .dashboardActions{gap:6px!important}
        #dashboardView .dashboardActions button,#dashboardView .dashboardActions a{font-size:10px!important;padding:7px 3px!important}
        #ticketList .savedActions{gap:6px!important}
        #ticketList .savedActions button{font-size:9px!important;padding:6px 2px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function normalizedText(el){return String(el?.textContent||'').replace(/\s+/g,' ').trim().toUpperCase()}
  function setTwoLines(el,first,second){if(el)el.innerHTML=`<span class="forcedTwoLine">${first}<br>${second}</span>`}

  function formatHeaderActions(){
    const actions=document.querySelector('#dashboardView .dashboardActions');
    if(!actions)return;
    const controls=[...actions.querySelectorAll('button,a')],find=pattern=>controls.find(control=>pattern.test(normalizedText(control)));
    [
      {control:find(/IMPORT/),lines:['IMPORT','CODE']},
      {control:find(/VIEW.*ACTIVE|ACTIVE.*VIEW/),lines:['VIEW','ACTIVE']},
      {control:find(/NEW.*TICKET|TICKET.*NEW/),lines:['NEW','TICKET']}
    ].forEach(item=>{if(item.control){setTwoLines(item.control,...item.lines);actions.appendChild(item.control)}});
  }

  function formatTicketHeading(card){
    const h3=card.querySelector('.savedTicketTop h3'),badge=card.querySelector('.savedTicketTop .bookBadge');
    if(!h3||!badge)return;
    let row=h3.closest('.savedTitleRow');
    if(!row){row=document.createElement('div');row.className='savedTitleRow';h3.parentNode.insertBefore(row,h3);row.appendChild(h3)}
    row.appendChild(badge);
    const meta=card.querySelector('.savedMeta');
    if(meta){const book=String(badge.textContent||'').trim();const text=String(meta.textContent||'').trim();if(book&&text.toUpperCase().startsWith(book.toUpperCase()+' · '))meta.textContent=text.slice(book.length+3)}
  }

  function arrangeTicketActions(card){
    formatTicketHeading(card);
    const actions=card.querySelector('.savedActions');
    if(!actions)return;
    const buttons=[...actions.querySelectorAll('button')],find=pattern=>buttons.find(button=>pattern.test(normalizedText(button)));
    [
      {button:find(/^VIEW$/),kind:'actionUse'},
      {button:find(/^COPY CODE$/),kind:'actionUse',lines:['COPY','CODE']},
      {button:find(/^SHARE$/),kind:'actionUse'},
      {button:find(/^DUPLICATE$/),kind:'actionChange'},
      {button:find(/^(COMPLETE|MARK ACTIVE)$/),kind:'actionChange'},
      {button:find(/^EDIT$/),kind:'actionChange'},
      {button:find(/^DELETE$/),kind:'actionChange'}
    ].forEach(item=>{if(item.button){item.button.classList.remove('actionUse','actionChange');item.button.classList.add(item.kind);if(item.lines)setTwoLines(item.button,...item.lines);actions.appendChild(item.button)}});
  }

  function apply(){addCss();formatHeaderActions();document.querySelectorAll('#ticketList .savedTicket').forEach(arrangeTicketActions)}
  function wrapDashboard(){const original=window.renderTicketDashboard;if(typeof original!=='function'||original.__layoutV62Wrapped)return;const wrapped=function(...args){const out=original.apply(this,args);requestAnimationFrame(apply);return out};wrapped.__layoutV62Wrapped=true;window.renderTicketDashboard=wrapped}

  wrapDashboard();apply();
  window.addEventListener('load',()=>{wrapDashboard();apply()},{once:true});
  document.addEventListener('click',event=>{if(event.target.closest?.('#ticketsTab'))setTimeout(apply,0)},true);
})();