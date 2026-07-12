/* MLB live runtime bootstrap V32 */
(async()=>{
  'use strict';
  try{
    const response=await fetch('./mlb-live.js?v=32',{cache:'no-store'});
    if(!response.ok)throw new Error('MLB runtime HTTP '+response.status);
    let code=await response.text();

    const oldNorm="function norm(v){return cleanText(v).toLowerCase().replace(/[^a-z0-9]/g,'')}";
    const newNorm="function norm(v){return cleanText(v).normalize('NFD').replace(/[\\u0300-\\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'')}";
    if(!code.includes(oldNorm))throw new Error('MLB name-normalization marker missing');
    code=code.replace(oldNorm,newNorm);

    const oldStatus="const status=document.createElement('div');status.id='liveRefreshStatus';";
    const newStatus="document.getElementById('liveRefreshStatus')?.remove();const status=document.createElement('div');status.id='liveRefreshStatus';";
    if(code.includes(oldStatus))code=code.replace(oldStatus,newStatus);

    const oldTeam="if(t==='team_total_over'||t==='team_total_under')return overUnder(score,target,t==='team_total_over',final,started);";
    const newTeam="if(t==='team_total_over'||t==='team_total_under'){const r=overUnder(score,target,t==='team_total_over',final,started);r.display=`${score} / ${target}`;return r;}";
    if(code.includes(oldTeam))code=code.replace(oldTeam,newTeam);

    const oldManual="if(t==='manual')return result('PENDING',null,null,'Manual');";
    const newManual="if(t==='manual'){const current=Number(leg.current??0),manualTarget=Number(leg.target??1);return result(current>=manualTarget?'WIN':'PENDING',current,manualTarget,`${current} / ${manualTarget}`);}";
    if(code.includes(oldManual))code=code.replace(oldManual,newManual);

    const oldPlayerFns="function batting(feed,name){return findPlayer(feed,name)?.stats?.batting||null}\n  function pitching(feed,name){return findPlayer(feed,name)?.stats?.pitching||null}";
    const newPlayerFns=`function batting(feed,name){return findPlayer(feed,name)?.stats?.batting||null}
  function pitching(feed,name){return findPlayer(feed,name)?.stats?.pitching||null}
  function playStats(feed,name){
    const wanted=norm(name),out={hits:0,runs:0,rbi:0};
    if(!wanted)return out;
    const same=person=>{const n=norm(person?.fullName||person?.fullNameLastFirst||'');return n===wanted||n.includes(wanted)||wanted.includes(n)};
    for(const play of feed?.liveData?.plays?.allPlays||[]){
      if(same(play?.matchup?.batter)){
        const event=cleanText(play?.result?.eventType).toLowerCase();
        if(['single','double','triple','home_run'].includes(event))out.hits+=1;
        out.rbi+=Number(play?.result?.rbi||0);
      }
      for(const runner of play?.runners||[]){
        if(same(runner?.details?.runner)&&cleanText(runner?.movement?.end).toLowerCase()==='score'&&!runner?.movement?.isOut)out.runs+=1;
      }
    }
    return out;
  }
  function hrrbiLive(feed,name,b){
    const p=playStats(feed,name);
    const hits=Math.max(Number(b?.hits||0),p.hits);
    const runs=Math.max(Number(b?.runs||0),p.runs);
    const rbi=Math.max(Number(b?.rbi||0),p.rbi);
    return hits+runs+rbi;
  }`;
    if(!code.includes(oldPlayerFns))throw new Error('MLB player-stat marker missing');
    code=code.replace(oldPlayerFns,newPlayerFns);
    code=code.replace(/player_hrrbi:b\?Number\(b\.hits\|\|0\)\+Number\(b\.runs\|\|0\)\+Number\(b\.rbi\|\|0\):null/,'player_hrrbi:hrrbiLive(feed,player,b)');

    const summaryCss=".liveSummary{margin:8px 0 2px;font-size:11px;font-weight:850;color:#596372}";
    const outcomeCss=summaryCss+".ticketOutcome{display:inline-block;margin:8px 0 2px;padding:5px 9px;border-radius:7px;font-size:10px;font-weight:900;letter-spacing:.08em}.ticketOutcome.WON{background:#bfe3bd;color:#154e18}.ticketOutcome.LOST{background:#efc1bc;color:#7a1710}.ticketOutcome.LIVE{background:#f1dda5;color:#674500}.ticketOutcome.PENDING{background:#d7dde6;color:#4f5966}.ticketOutcome.PUSH{background:#d7dde6;color:#4f5966}.ticketOutcome.SUSPENDED{background:#e0cbd9;color:#683451}.liveTicketCard.ticketWon{box-shadow:inset 0 0 0 2px rgba(56,139,63,.22)}.liveTicketCard.ticketLost{box-shadow:inset 0 0 0 2px rgba(173,55,43,.22)}";
    if(!code.includes(summaryCss))throw new Error('Ticket outcome CSS marker missing');
    code=code.replace(summaryCss,outcomeCss);

    const renderStart=code.indexOf('  function renderLiveCard(record){');
    const renderEnd=code.indexOf('\n\n  async function refreshStandaloneLive',renderStart);
    if(renderStart<0||renderEnd<0)throw new Error('Live ticket renderer marker missing');
    const newRenderer=`  function ticketState(legs){
    const states=legs.map(l=>cleanText(l.__live?.status).toUpperCase()).filter(Boolean);
    if(states.includes('LOSS'))return'LOST';
    if(states.includes('UNAVAILABLE'))return'SUSPENDED';
    if(states.length&&states.every(s=>s==='VOID'))return'PUSH';
    if(states.length&&states.every(s=>s==='WIN'||s==='VOID'))return'WON';
    if(states.includes('LIVE'))return'LIVE';
    return'PENDING';
  }

  function renderLiveCard(record){
    const t=record.ticket||{},legs=record.__evaluated||[],counts={WIN:0,LOSS:0,LIVE:0,PENDING:0,VOID:0,UNAVAILABLE:0};
    legs.forEach(l=>counts[l.__live?.status]=(counts[l.__live?.status]||0)+1);
    const states=Object.entries(counts).filter(([,n])=>n).map(([k,n])=>\`${'${n}'} ${'${k}'}\`).join(' · ');
    const feed=legs.find(l=>l.__feed)?.__feed;
    const outcome=ticketState(legs);
    const cardClass=outcome==='WON'?' ticketWon':outcome==='LOST'?' ticketLost':'';
    return \`<div class="liveTicketCard${'${cardClass}'}"><div class="ticketTop"><div><span class="bookBadge">${'${esc(record.sportsbook||\'Other\')}'}</span><span class="title">${'${esc(t.title||\'Untitled\')}'}</span></div><span class="badge">${'${esc((t.type||\'\').toUpperCase())}'}</span></div><div class="meta">${'${esc([t.game,t.date,feed?gameState(feed):(record.status||\'active\').toUpperCase()].filter(Boolean).join(\' · \'))}'}</div><div class="ticketOutcome ${'${outcome}'}">TICKET ${'${outcome}'}</div><div class="liveSummary">${'${esc(states||\'No legs\')}'}</div>${'${legs.map(l=>{const x=l.__live||result(\'UNAVAILABLE\',null,l.target,\'—\');return `<div class="liveLeg"><div class="liveLegTop"><div><div class="liveLegLabel">${esc(l.label||\'Untitled\')}</div><div class="liveLegMeta">${esc([l.team,l.player,x.meta].filter(Boolean).join(\' · \'))}</div><span class="liveStatus ${esc(x.status)}">${esc(x.status)}</span></div><div class="liveLegValue">${esc(x.display)}</div></div></div>`}).join(\'\')}'}</div>\`;
  }`;
    code=code.slice(0,renderStart)+newRenderer+code.slice(renderEnd);

    const oldInit="window.addEventListener('load',()=>setTimeout(wireRefresh,0));";
    const newInit="window.__parlayLiveRefresh=()=>{feedCache.clear();document.getElementById('liveRefreshStatus')?.remove();refreshStandaloneLive()};window.addEventListener('parlay:viewchange',()=>setTimeout(wireRefresh,0));if(document.readyState==='loading'){window.addEventListener('load',()=>setTimeout(wireRefresh,0),{once:true})}else{setTimeout(wireRefresh,0)}";
    if(!code.includes(oldInit))throw new Error('MLB runtime initialization marker missing');
    code=code.replace(oldInit,newInit)+'\n//# sourceURL=mlb-live-runtime-v32.js';
    (0,eval)(code);
  }catch(error){
    console.error('MLB live runtime failed to initialize',error);
    const show=()=>{
      const box=document.getElementById('standaloneView');
      if(!box||!location.hash)return;
      let status=document.getElementById('liveRefreshStatus');
      if(!status){status=document.createElement('div');status.id='liveRefreshStatus';status.className='liveRefreshStatus bad';const tools=box.querySelector('.standaloneTools');if(tools)tools.insertAdjacentElement('afterend',status)}
      if(status)status.textContent='Live tracker failed to initialize: '+String(error.message||error);
    };
    document.readyState==='loading'?window.addEventListener('load',show,{once:true}):show();
  }
})();