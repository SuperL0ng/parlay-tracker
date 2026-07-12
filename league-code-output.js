/* LEAGUE_CODE_OUTPUT_V49 */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const clean=v=>String(v??'').trim();

  function canonicalFromRawTicket(raw){
    raw=raw&&typeof raw==='object'?raw:{};
    const out={
      title:raw.title||'Untitled',
      date:raw.date||'',
      type:raw.type||'',
    };

    const ticketLeague=clean(raw.league);
    const ticketGame=clean(raw.game);
    if(ticketLeague)out.league=ticketLeague;
    if(ticketGame)out.game=ticketGame;

    out.legs=(raw.legs||[]).map(source=>{
      const leg={label:source.label||'',type:source.type||''};
      const legLeague=clean(source.league);
      const legGame=clean(source.game);
      if(legLeague&&legLeague!==ticketLeague)leg.league=legLeague;
      if(raw.type==='parlay'){
        if(legGame&&legGame!==ticketGame)leg.game=legGame;
        if(source.date&&source.date!==raw.date)leg.date=source.date;
      }
      if(source.team)leg.team=source.team;
      if(source.player)leg.player=source.player;
      if(source.target!==undefined&&source.target!==null&&source.target!=='')leg.target=source.target;
      if(source.half!==undefined)leg.half=source.half;
      return leg;
    });

    return out;
  }

  function formatWithLeague(o){
    const q=v=>JSON.stringify(v);
    const lines=['{',`  title: ${q(o.title)},`,`  date: ${q(o.date)},`,`  type: ${q(o.type)},`];
    if(o.league)lines.push(`  league: ${q(o.league)},`);
    if(o.game)lines.push(`  game: ${q(o.game)},`);
    lines.push('  legs: [');
    (o.legs||[]).forEach((leg,i)=>{
      const body=Object.entries(leg).map(([k,v])=>`${k}: ${q(v)}`).join(', ');
      lines.push(`    { ${body} }${i<o.legs.length-1?',':''}`);
    });
    lines.push('  ]','}');
    return lines.join('\n');
  }

  function repairSavedCanonical(){
    let list;
    try{list=JSON.parse(localStorage.getItem(KEY)||'[]')}catch{return}
    if(!Array.isArray(list))return;
    let changed=false;
    for(const record of list){
      if(!record?.ticket)continue;
      const next=canonicalFromRawTicket(record.ticket);
      if(JSON.stringify(record.canonical)!==JSON.stringify(next)){
        record.canonical=next;
        changed=true;
      }
    }
    if(changed)localStorage.setItem(KEY,JSON.stringify(list));
  }

  window.canonicalTicket=function(){return canonicalFromRawTicket(window.rawTicket())};
  window.formatTicket=formatWithLeague;
  window.__canonicalFromRawTicket=canonicalFromRawTicket;

  function start(){
    repairSavedCanonical();
    window.renderTicketDashboard?.();
  }

  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});
  else start();
  window.addEventListener('load',repairSavedCanonical);
})();
