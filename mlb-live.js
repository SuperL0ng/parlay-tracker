/* MLB_LIVE_TRACKING_V22 */
(() => {
  'use strict';

  const MLB_SCHEDULE='https://statsapi.mlb.com/api/v1/schedule';
  const MLB_FEED='https://statsapi.mlb.com/api/v1.1/game';
  const feedCache=new Map();
  let refreshRunning=false;

  const css=`
  .liveRefreshStatus{margin:0 0 10px;padding:9px 10px;border-radius:8px;background:rgba(255,255,255,.55);font-size:11px;color:#596372}
  .liveRefreshStatus.good{color:#236122;font-weight:800}.liveRefreshStatus.bad{color:#8b3200;font-weight:800}
  .liveLeg{border-top:1px solid rgba(0,0,0,.09);padding:8px 0}.liveLegTop{display:flex;justify-content:space-between;gap:10px;align-items:flex-start}.liveLegLabel{font-weight:850;font-size:13px}.liveLegValue{font-weight:900;font-size:12px;text-align:right}.liveLegMeta{margin-top:3px;color:#687383;font-size:10px;line-height:1.35}.liveStatus{display:inline-block;margin-top:4px;padding:3px 6px;border-radius:5px;font-size:9px;font-weight:900;letter-spacing:.08em}.liveStatus.WIN{background:#bfe3bd;color:#154e18}.liveStatus.LOSS{background:#efc1bc;color:#7a1710}.liveStatus.LIVE{background:#f1dda5;color:#674500}.liveStatus.PENDING{background:#d7dde6;color:#4f5966}.liveStatus.VOID{background:#d7dde6;color:#4f5966}.liveStatus.UNAVAILABLE{background:#e0cbd9;color:#683451}.liveSummary{margin:8px 0 2px;font-size:11px;font-weight:850;color:#596372}
  `;

  function addCss(){if(document.getElementById('mlbLiveCss'))return;const s=document.createElement('style');s.id='mlbLiveCss';s.textContent=css;document.head.appendChild(s)}
  function cleanText(v){return String(v??'').trim()}
  function norm(v){return cleanText(v).toLowerCase().replace(/[^a-z0-9]/g,'')}
  function dateDash(v){v=cleanText(v).replace(/[^0-9]/g,'').slice(0,8);return v.length===8?`${v.slice(0,4)}-${v.slice(4,6)}-${v.slice(6)}`:v}
  function gameParts(game){game=cleanText(game);if(game.includes('@')){const [away,home]=game.split('@');return{away:cleanText(away),home:cleanText(home)}}if(game.includes(' v ')){const [home,away]=game.split(' v ');return{away:cleanText(away),home:cleanText(home)}}return{away:'',home:''}}
  function teamCode(team){return cleanText(team).toUpperCase()}
  function scheduleTeamCode(t){return cleanText(t?.team?.abbreviation||t?.abbreviation||'').toUpperCase()}

  async function jsonFetch(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
  async function findGamePk(date,game){const p=gameParts(game),url=`${MLB_SCHEDULE}?sportId=1&date=${encodeURIComponent(dateDash(date))}&hydrate=team,linescore`;const data=await jsonFetch(url);const games=(data.dates||[]).flatMap(d=>d.games||[]);const match=games.find(g=>scheduleTeamCode(g.teams?.away)===teamCode(p.away)&&scheduleTeamCode(g.teams?.home)===teamCode(p.home));return match?.gamePk||null}
  async function loadFeed(date,game){const key=`${date}|${game}`;if(feedCache.has(key))return feedCache.get(key);const promise=(async()=>{const gamePk=await findGamePk(date,game);if(!gamePk)throw new Error('Game not found');return jsonFetch(`${MLB_FEED}/${gamePk}/feed/live`)} )();feedCache.set(key,promise);try{return await promise}catch(e){feedCache.delete(key);throw e}}

  function teamSide(feed,code){const away=teamCode(feed?.gameData?.teams?.away?.abbreviation),home=teamCode(feed?.gameData?.teams?.home?.abbreviation);code=teamCode(code);if(code===away)return'away';if(code===home)return'home';return''}
  function scores(feed){const l=feed?.liveData?.linescore||{};return{away:Number(l.teams?.away?.runs||0),home:Number(l.teams?.home?.runs||0)}}
  function sideScore(feed,team){const side=teamSide(feed,team),s=scores(feed);return side?s[side]:null}
  function oppScore(feed,team){const side=teamSide(feed,team),s=scores(feed);return side?(side==='away'?s.home:s.away):null}
  function isFinal(feed){const s=feed?.gameData?.status||{};return s.abstractGameState==='Final'||/final|game over|completed/i.test(cleanText(s.detailedState))}
  function isLive(feed){const s=feed?.gameData?.status||{};return s.abstractGameState==='Live'||/in progress|delayed/i.test(cleanText(s.detailedState))}
  function hasStarted(feed){return isLive(feed)||isFinal(feed)||Number(feed?.liveData?.linescore?.currentInning||0)>0}
  function gameState(feed){const l=feed?.liveData?.linescore||{},s=feed?.gameData?.status||{},sc=scores(feed);if(isFinal(feed))return`Final · ${sc.away}-${sc.home}`;if(!hasStarted(feed))return cleanText(s.detailedState)||'Scheduled';const inning=l.currentInningOrdinal||l.currentInning||'',half=l.inningState||'',outs=Number(l.outs||0);return`${half} ${inning} · ${outs} out${outs===1?'':'s'} · ${sc.away}-${sc.home}`}
  function inningRuns(feed,through=5){const innings=feed?.liveData?.linescore?.innings||[];let away=0,home=0;innings.filter(x=>Number(x.num)<=through).forEach(x=>{away+=Number(x.away?.runs||0);home+=Number(x.home?.runs||0)});return{away,home}}
  function f5Complete(feed){return isFinal(feed)||Number(feed?.liveData?.linescore?.currentInning||0)>5||Number(feed?.liveData?.linescore?.currentInning||0)===5&&/middle|end/i.test(cleanText(feed?.liveData?.linescore?.inningState))}

  function allPlayers(feed){const teams=feed?.liveData?.boxscore?.teams||{};return['away','home'].flatMap(side=>Object.values(teams[side]?.players||{}).map(p=>({...p,__side:side})))}
  function findPlayer(feed,name){const n=norm(name);if(!n)return null;const players=allPlayers(feed);return players.find(p=>norm(p.person?.fullName)===n)||players.find(p=>norm(p.person?.fullName).includes(n)||n.includes(norm(p.person?.fullName)))||null}
  function batting(feed,name){return findPlayer(feed,name)?.stats?.batting||null}
  function pitching(feed,name){return findPlayer(feed,name)?.stats?.pitching||null}
  function totalBases(b){if(!b)return null;if(Number.isFinite(Number(b.totalBases)))return Number(b.totalBases);return Number(b.hits||0)+Number(b.doubles||0)+2*Number(b.triples||0)+3*Number(b.homeRuns||0)}
  function outsFromIP(ip){const s=cleanText(ip);if(!s)return 0;const [whole,frac='0']=s.split('.');return Number(whole||0)*3+Number(frac||0)}

  function result(status,current,target,display,meta){return{status,current,target,display:display??(current==null?'—':String(current)),meta:meta||''}}
  function milestone(current,target,feed){if(current==null)return result('UNAVAILABLE',null,target,'—','Player stat unavailable');if(current>=target)return result('WIN',current,target,`${current} / ${target}`);if(isFinal(feed))return result('LOSS',current,target,`${current} / ${target}`);return result(hasStarted(feed)?'LIVE':'PENDING',current,target,`${current} / ${target}`)}
  function overUnder(current,target,over,complete,started){if(current==null)return result('UNAVAILABLE',null,target,'—');if(over&&current>target)return result('WIN',current,target,`${current} ${over?'O':'U'} ${target}`);if(!over&&current>=target)return result('LOSS',current,target,`${current} ${over?'O':'U'} ${target}`);if(complete)return result(over?'LOSS':'WIN',current,target,`${current} ${over?'O':'U'} ${target}`);return result(started?'LIVE':'PENDING',current,target,`${current} ${over?'O':'U'} ${target}`)}

  function evaluateMlbLeg(leg,feed){const t=leg.type,target=Number(leg.target),team=leg.team,player=leg.player;
    if(t==='void')return result('VOID',null,null,'VOID');
    if(t==='manual')return result('PENDING',null,null,'Manual');
    const started=hasStarted(feed),final=isFinal(feed),score=sideScore(feed,team),opp=oppScore(feed,team);
    if(t==='ml'){if(score==null)return result('UNAVAILABLE',null,null,'—');if(!started)return result('PENDING',score,null,`${score}-${opp}`);if(final)return result(score>opp?'WIN':score<opp?'LOSS':'VOID',score,null,`${score}-${opp}`);return result('LIVE',score,null,`${score}-${opp}`)}
    if(t==='spread'){if(score==null)return result('UNAVAILABLE',null,target,'—');const adjusted=score+target;if(!started)return result('PENDING',adjusted,opp,`${score}${target>=0?'+':''}${target} vs ${opp}`);if(final)return result(adjusted>opp?'WIN':adjusted<opp?'LOSS':'VOID',adjusted,opp,`${score}${target>=0?'+':''}${target} vs ${opp}`);return result('LIVE',adjusted,opp,`${score}${target>=0?'+':''}${target} vs ${opp}`)}
    if(t==='f5_ml'||t==='f5_spread'||t==='f5_total_over'||t==='f5_total_under'){
      const r=inningRuns(feed,5),side=teamSide(feed,team),mine=side?r[side]:null,theirs=side?(side==='away'?r.home:r.away):null,total=r.away+r.home,done=f5Complete(feed);
      if(t==='f5_ml'){if(mine==null)return result('UNAVAILABLE',null,null,'—');if(!started)return result('PENDING',mine,null,`${mine}-${theirs}`);if(done)return result(mine>theirs?'WIN':mine<theirs?'LOSS':'VOID',mine,null,`${mine}-${theirs}`);return result('LIVE',mine,null,`${mine}-${theirs}`)}
      if(t==='f5_spread'){if(mine==null)return result('UNAVAILABLE',null,target,'—');const adj=mine+target;if(!started)return result('PENDING',adj,theirs,`${mine}${target>=0?'+':''}${target} vs ${theirs}`);if(done)return result(adj>theirs?'WIN':adj<theirs?'LOSS':'VOID',adj,theirs,`${mine}${target>=0?'+':''}${target} vs ${theirs}`);return result('LIVE',adj,theirs,`${mine}${target>=0?'+':''}${target} vs ${theirs}`)}
      return overUnder(total,target,t==='f5_total_over',done,started);
    }
    if(t==='total_over'||t==='total_under')return overUnder(scores(feed).away+scores(feed).home,target,t==='total_over',final,started);
    if(t==='team_total_over'||t==='team_total_under')return overUnder(score,target,t==='team_total_over',final,started);
    const b=batting(feed,player),p=pitching(feed,player);
    const map={player_hits:b?.hits,player_total_bases:totalBases(b),player_runs:b?.runs,player_hr:b?.homeRuns,player_rbi:b?.rbi,player_walks:b?.baseOnBalls,player_stolen_bases:b?.stolenBases,player_hwsb:b?Number(b.hits||0)+Number(b.baseOnBalls||0)+Number(b.stolenBases||0):null,player_hrrbi:b?Number(b.hits||0)+Number(b.runs||0)+Number(b.rbi||0):null,pitcher_ks:p?.strikeOuts};
    if(Object.prototype.hasOwnProperty.call(map,t))return milestone(Number(map[t]??0),target,feed);
    if(t==='pitcher_ks_under'){const cur=Number(p?.strikeOuts||0);if(cur>=target)return result('LOSS',cur,target,`${cur} / U${target}`);if(final)return result('WIN',cur,target,`${cur} / U${target}`);return result(started?'LIVE':'PENDING',cur,target,`${cur} / U${target}`)}
    if(t==='pitcher_outs_under'){const cur=outsFromIP(p?.inningsPitched);if(cur>=target)return result('LOSS',cur,target,`${cur} / U${target}`);if(final)return result('WIN',cur,target,`${cur} / U${target}`);return result(started?'LIVE':'PENDING',cur,target,`${cur} / U${target}`)}
    return result('UNAVAILABLE',null,target,'—','Unsupported MLB leg');
  }

  function ticketGameForLeg(ticket,leg){return leg.game||ticket.game||''}
  function ticketDateForLeg(ticket,leg){return leg.date||ticket.date||''}
  function ticketIsMlb(ticket){return ticket.league==='MLB'||(ticket.legs||[]).some(l=>(l.league||ticket.league)==='MLB')}
  async function evaluateRecord(record){const ticket=record.ticket||{},evaluated=[];for(const leg of ticket.legs||[]){const league=leg.league||ticket.league;if(league!=='MLB'){evaluated.push({...leg,__live:result('UNAVAILABLE',null,leg.target,'—','Live support not added yet')});continue}const game=ticketGameForLeg(ticket,leg),date=ticketDateForLeg(ticket,leg);if(!game||!date){evaluated.push({...leg,__live:result('UNAVAILABLE',null,leg.target,'—','Missing game or date')});continue}try{const feed=await loadFeed(date,game);evaluated.push({...leg,__feed:feed,__live:evaluateMlbLeg(leg,feed)})}catch(e){evaluated.push({...leg,__live:result('UNAVAILABLE',null,leg.target,'—',e.message||'Live data failed')})}}return{...record,__evaluated:evaluated}}

  function renderLiveCard(record){const t=record.ticket||{},legs=record.__evaluated||[],counts={WIN:0,LOSS:0,LIVE:0,PENDING:0,VOID:0,UNAVAILABLE:0};legs.forEach(l=>counts[l.__live?.status]=(counts[l.__live?.status]||0)+1);const states=Object.entries(counts).filter(([,n])=>n).map(([k,n])=>`${n} ${k}`).join(' · ');const feed=legs.find(l=>l.__feed)?.__feed;return `<div class="liveTicketCard"><div class="ticketTop"><div><span class="bookBadge">${esc(record.sportsbook||'Other')}</span><span class="title">${esc(t.title||'Untitled')}</span></div><span class="badge">${esc((t.type||'').toUpperCase())}</span></div><div class="meta">${esc([t.game,t.date,feed?gameState(feed):(record.status||'active').toUpperCase()].filter(Boolean).join(' · '))}</div><div class="liveSummary">${esc(states||'No legs')}</div>${legs.map(l=>{const x=l.__live||result('UNAVAILABLE',null,l.target,'—');return `<div class="liveLeg"><div class="liveLegTop"><div><div class="liveLegLabel">${esc(l.label||'Untitled')}</div><div class="liveLegMeta">${esc([l.team,l.player,x.meta].filter(Boolean).join(' · '))}</div><span class="liveStatus ${esc(x.status)}">${esc(x.status)}</span></div><div class="liveLegValue">${esc(x.display)}</div></div></div>`}).join('')}</div>`}

  async function refreshStandaloneLive(){if(refreshRunning)return;const hash=location.hash.slice(1),params=new URLSearchParams(hash),id=params.get('ticket'),active=params.get('view')==='active';if(!id&&!active)return;refreshRunning=true;addCss();const box=document.getElementById('standaloneView');if(!box){refreshRunning=false;return}const list=loadSavedTickets(),items=active?list.filter(x=>x.status!=='completed'):list.filter(x=>x.id===id);const status=document.createElement('div');status.id='liveRefreshStatus';status.className='liveRefreshStatus';status.textContent='Refreshing live MLB data…';const tools=box.querySelector('.standaloneTools');if(tools)tools.insertAdjacentElement('afterend',status);try{const evaluated=[];for(const r of items)evaluated.push(ticketIsMlb(r.ticket||{})?await evaluateRecord(r):{...r,__evaluated:(r.ticket?.legs||[]).map(l=>({...l,__live:result('UNAVAILABLE',null,l.target,'—','Live support not added yet')}))});const grid=box.querySelector('.liveGrid');if(grid)grid.innerHTML=evaluated.length?evaluated.map(renderLiveCard).join(''):'<div class="emptyState">Ticket not found on this device.</div>';status.textContent=`Updated ${new Date().toLocaleTimeString([], {hour:'numeric',minute:'2-digit',second:'2-digit'})}`;status.className='liveRefreshStatus good'}catch(e){status.textContent=`Live refresh failed: ${e.message||e}`;status.className='liveRefreshStatus bad'}finally{refreshRunning=false}}

  function wireRefresh(){const box=document.getElementById('standaloneView');if(!box||!location.hash)return;const buttons=[...box.querySelectorAll('button')];const refreshBtn=buttons.find(b=>/^refresh$/i.test(cleanText(b.textContent)));if(refreshBtn){refreshBtn.onclick=()=>{feedCache.clear();document.getElementById('liveRefreshStatus')?.remove();refreshStandaloneLive()}}refreshStandaloneLive()}

  window.addEventListener('load',()=>setTimeout(wireRefresh,0));
})();
