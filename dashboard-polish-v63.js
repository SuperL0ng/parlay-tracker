/* DASHBOARD POLISH V72 — My Tickets visual hierarchy, stable toolbar, completed badge */
(() => {
  'use strict';

  function addCss(){
    if(document.getElementById('dashboardPolishV63Css'))return;
    const style=document.createElement('style');
    style.id='dashboardPolishV63Css';
    style.textContent=`
      #dashboardView .ticketList{gap:8px!important}
      #dashboardView .savedTicket{position:relative;padding:9px 9px 8px 11px!important;border:1px solid rgba(255,255,255,.82);border-left:4px solid #9AA4B2;border-radius:10px!important;background:linear-gradient(180deg,rgba(255,255,255,.82),rgba(214,221,231,.72));box-shadow:inset 0 1px 0 rgba(255,255,255,.92),0 4px 10px rgba(0,0,0,.11)!important}
      #dashboardView .savedTicket.outcomeLIVE{border-left-color:#D39A24}#dashboardView .savedTicket.outcomeWON{border-left-color:#1F9A43}#dashboardView .savedTicket.outcomeLOST{border-left-color:#D52C42}#dashboardView .savedTicket.outcomePUSH{border-left-color:#C69C19}#dashboardView .savedTicket.outcomeSUSPENDED{border-left-color:#A4639A}
      #dashboardView .savedTicketTop{align-items:flex-start!important;gap:8px!important}#dashboardView .savedTicketTop>div:first-child{min-width:0;flex:1}
      #dashboardView .savedTitleLine,#dashboardView .savedTicketTop>div:first-child>h3{margin:0!important}
      #dashboardView .savedTitleLine{display:flex!important;align-items:center!important;flex-wrap:wrap!important;gap:6px!important;min-height:24px}
      #dashboardView .savedTitleLine h3,#dashboardView .savedTicket h3{font-size:18px!important;line-height:1.05!important;font-weight:950!important;letter-spacing:.01em!important;color:#171D25!important}
      #dashboardView .bookBadge{display:inline-flex!important;align-items:center!important;min-height:20px!important;padding:3px 6px!important;border-radius:6px!important;font-size:8px!important;letter-spacing:.08em!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.7)!important}
      #dashboardView .savedMeta{margin-top:4px!important;color:#697482!important;font-size:9px!important;font-weight:800!important;line-height:1.25!important;letter-spacing:.035em!important}
      #dashboardView .savedStateRow{margin-top:5px!important;gap:5px!important}#dashboardView .savedStateBadge{min-height:20px!important;padding:3px 7px!important;border-radius:6px!important;font-size:8px!important;line-height:1!important}
      #dashboardView .savedStateBadge.storage{color:#56606D!important;background:rgba(255,255,255,.28)!important;border:1px solid rgba(91,103,118,.42)!important;box-shadow:none!important}
      #dashboardView .savedStateBadge.storage.storageCompleted{color:#D4DBE5!important;background:#3F4855!important;border-color:#303844!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.16),0 1px 2px rgba(0,0,0,.16)!important}
      #dashboardView .savedStateBadge:not(.storage){border:1px solid rgba(255,255,255,.5)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.55)!important}
      #dashboardView .savedSettlement{margin-top:4px!important;font-size:9px!important}
      #dashboardView .savedOrder{display:flex!important;gap:5px!important;align-items:center!important}
      #dashboardView .savedOrder button,#dashboardView .ticketExpandBtn{width:30px!important;min-width:30px!important;height:30px!important;min-height:30px!important;padding:0!important;border-radius:50%!important;font-size:15px!important;line-height:1!important;color:#4E5967!important;border-color:rgba(105,116,130,.42)!important;background:linear-gradient(180deg,rgba(249,251,254,.9),rgba(198,207,219,.86))!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.82),0 2px 5px rgba(0,0,0,.12)!important}
      #dashboardView .ticketExpandBtn{font-size:21px!important}
      #dashboardView .savedTicketDetails{margin-top:7px!important;padding:2px 8px 2px 10px!important;border:1px solid rgba(112,124,139,.24)!important;border-radius:8px!important;background:rgba(248,250,253,.48)!important;box-shadow:none!important}
      #dashboardView .dashboardLeg{position:relative;gap:10px!important;padding:7px 0 7px 8px!important;border-top:1px solid rgba(72,83,96,.12)!important}
      #dashboardView .dashboardLeg::before{content:"";position:absolute;left:0;top:7px;bottom:7px;width:3px;border-radius:3px;background:#9AA4B2}
      #dashboardView .dashboardLeg.legWIN::before{background:#1F9A43}#dashboardView .dashboardLeg.legLOSS::before{background:#D52C42}#dashboardView .dashboardLeg.legLIVE::before{background:#D39A24}#dashboardView .dashboardLeg.legPUSH::before{background:#C69C19}#dashboardView .dashboardLeg.legSUSPENDED::before,#dashboardView .dashboardLeg.legUNAVAILABLE::before{background:#A4639A}
      #dashboardView .dashboardLegLabel{font-size:13px!important;line-height:1.16!important}#dashboardView .dashboardLegMeta{margin-top:2px!important;font-size:10px!important;line-height:1.2!important;color:#647080!important}
      #dashboardView .dashboardLegRight{min-width:64px!important;display:flex;flex-direction:column;align-items:flex-end;justify-content:center}#dashboardView .dashboardLegValue{font-size:15px!important;line-height:1!important;margin-bottom:4px!important}#dashboardView .dashboardLegStatus{padding:3px 6px!important;font-size:8px!important}
      #dashboardView .savedActions{margin-top:7px!important;gap:6px!important}#dashboardView .savedActions button{min-height:40px!important;padding:6px 3px!important}
      #dashboardView .savedActions .actionUse{background:linear-gradient(180deg,#F9FBFE,#D5DDE7 52%,#929EAD)!important;border-color:rgba(93,105,120,.58)!important}
      #dashboardView .savedActions .actionChange{color:#26303B!important;background:linear-gradient(180deg,#E9EDF2,#C5CED9 55%,#8C98A8)!important;border-color:rgba(93,105,120,.46)!important;box-shadow:inset 0 1px 0 rgba(255,255,255,.68),0 2px 5px rgba(0,0,0,.12)!important}
      #dashboardView .savedActions button:last-child{color:#FFF!important;border-color:#7B1D28!important;background:linear-gradient(180deg,#E56B79,#B52B3B 56%,#741824)!important}
      #dashboardView .dashboardToolbarV55{grid-template-columns:minmax(0,1fr) 74px 100px 58px!important;gap:5px!important}
      #dashboardView .dashboardToolbarV55 button{width:100%!important;min-width:0!important;padding:7px 3px!important;font-size:8px!important;line-height:1!important;letter-spacing:.025em!important;white-space:nowrap!important}
      #dashboardView .dashboardToolbarStatus{min-width:0!important;overflow:hidden!important;text-overflow:ellipsis!important;white-space:nowrap!important}
      #refreshTicketsBtn{grid-column:2!important}#toggleAllTicketsBtn{grid-column:3!important}#ticketSelectModeBtn{grid-column:4!important}
      #refreshTicketsBtn.refreshing{opacity:.72;pointer-events:none}#refreshTicketsBtn.refreshing::after{content:''!important}
      @media(max-width:390px){
        #dashboardView .savedTicket{padding:8px 8px 7px 10px!important}
        #dashboardView .savedTitleLine h3,#dashboardView .savedTicket h3{font-size:17px!important}
        #dashboardView .savedActions button{min-height:38px!important}
        #dashboardView .dashboardToolbarV55{grid-template-columns:minmax(0,1fr) 72px 94px 56px!important;gap:4px!important}
        #dashboardView .dashboardToolbarV55 button{padding:7px 2px!important;font-size:7.5px!important;letter-spacing:.015em!important}
        #dashboardView .dashboardToolbarStatus{font-size:8px!important}
      }
    `;
    document.head.appendChild(style);
  }

  function decorateCard(card){
    card.classList.remove('outcomeLIVE','outcomeWON','outcomeLOST','outcomePUSH','outcomePENDING','outcomeSUSPENDED');
    const badge=[...card.querySelectorAll('.savedStateBadge:not(.storage)')][0];
    const outcome=String(badge?.textContent||'PENDING').replace(/^TICKET\s+/i,'').trim().toUpperCase();
    card.classList.add('outcome'+(outcome||'PENDING'));
    const storageBadge=card.querySelector('.savedStateBadge.storage');
    if(storageBadge)storageBadge.classList.toggle('storageCompleted',String(storageBadge.textContent||'').trim().toUpperCase()==='COMPLETED');
    card.querySelectorAll('.dashboardLeg').forEach(leg=>{
      [...leg.classList].filter(x=>x.startsWith('leg')).forEach(x=>leg.classList.remove(x));
      const status=String(leg.querySelector('.dashboardLegStatus')?.textContent||'PENDING').trim().toUpperCase();
      leg.classList.add('leg'+status);
    });
  }

  function apply(){addCss();document.querySelectorAll('#ticketList .savedTicket').forEach(decorateCard)}
  function wrap(){const original=window.renderTicketDashboard;if(typeof original!=='function'||original.__polishV72Wrapped)return;const wrapped=function(...args){const out=original.apply(this,args);requestAnimationFrame(apply);return out};wrapped.__polishV72Wrapped=true;window.renderTicketDashboard=wrapped}

  wrap();apply();
  window.addEventListener('load',()=>{wrap();apply()},{once:true});
  document.addEventListener('parlay:dashboard-refreshed',apply);
  document.addEventListener('click',event=>{if(event.target.closest?.('#ticketsTab,#refreshTicketsBtn,.ticketExpandBtn'))setTimeout(apply,0)},true);
})();