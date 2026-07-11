/* PARLAY_VIEW_FIXES_V25 */
(() => {
  'use strict';

  function baseUrl(){ return location.href.split('#')[0]; }
  function goToHash(hash){
    const next=baseUrl()+hash;
    if(location.href===next){ window.dispatchEvent(new CustomEvent('parlay:viewchange')); return; }
    location.href=next;
  }

  window.openSavedTicketView=id=>goToHash('#ticket='+encodeURIComponent(id));
  window.openActiveTicketsView=()=>goToHash('#view=active');
  window.closeStandaloneViewer=()=>goToHash('');

  function addCompactHeaderCss(){
    if(document.getElementById('compactViewHeaderCss'))return;
    const style=document.createElement('style');
    style.id='compactViewHeaderCss';
    style.textContent=`
      body.standaloneCompactHeader .top{padding:9px 12px 8px;margin-bottom:10px}
      body.standaloneCompactHeader .top .logo{width:min(116px,29vw);margin:0 auto;filter:drop-shadow(0 5px 8px rgba(0,0,0,.22))}
      body.standaloneCompactHeader .top h1,
      body.standaloneCompactHeader .top p{display:none!important}
    `;
    document.head.appendChild(style);
  }

  function syncCompactHeader(){
    addCompactHeaderCss();
    const logo=document.querySelector('.top .logo');
    const inTicketView=Boolean(location.hash);
    document.body.classList.toggle('standaloneCompactHeader',inTicketView);
    if(!logo)return;
    if(!logo.dataset.fullLogoSrc)logo.dataset.fullLogoSrc=logo.getAttribute('src')||'';
    if(inTicketView){
      logo.src='./ssb_apple_touch_home_dark_180.png?v=compact-view-25';
      logo.alt='Simon Sports Betting';
    }else if(logo.dataset.fullLogoSrc){
      logo.src=logo.dataset.fullLogoSrc;
    }
  }

  function cleanStandaloneView(){
    syncCompactHeader();
    document.querySelectorAll('.phaseNote').forEach(el=>el.remove());

    const statuses=[...document.querySelectorAll('#liveRefreshStatus')];
    statuses.slice(0,-1).forEach(el=>el.remove());

    document.querySelectorAll('.liveLeg').forEach(row=>{
      const label=row.querySelector('.liveLegLabel')?.textContent||'';
      if(!/team total/i.test(label))return;
      const value=row.querySelector('.liveLegValue');
      if(!value)return;
      const match=value.textContent.trim().match(/^(-?\d+(?:\.\d+)?)\s+[OU]\s+(-?\d+(?:\.\d+)?)$/i);
      if(match)value.textContent=`${match[1]} / ${match[2]}`;
    });
  }

  const observer=new MutationObserver(cleanStandaloneView);
  function start(){
    cleanStandaloneView();
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener('hashchange',()=>setTimeout(cleanStandaloneView,0));
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
})();