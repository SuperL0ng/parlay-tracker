/* PARLAY TRACKER SOURCES V51 — ESPN primary, MLB supplemental */
(() => {
  'use strict';
  const C=window.ParlayTrackerCore;
  const summaryCache=new Map(),mlbScheduleCache=new Map(),mlbFeedCache=new Map();
  async function jsonFetch(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw new Error(`HTTP ${r.status}`);return r.json()}
  function sportPath(sport){return sport==='nba'?'basketball/nba':sport==='wnba'?'basketball/wnba':'baseball/mlb'}
  async function fetchScoreboards(dates){let events=[];for(const date of [...new Set(dates.filter(Boolean))]){for(const sport of ['mlb','nba','wnba']){try{const data=await jsonFetch(`https://site.api.espn.com/apis/site/v2/sports/${sportPath(sport)}/scoreboard?dates=${date}&limit=100`);for(const e of data.events||[])e.__sport=sport;events=events.concat(data.events||[])}catch{}}}return events}
  async function fetchSummary(event){if(!event?.id)return null;if(summaryCache.has(event.id))return summaryCache.get(event.id);const p=jsonFetch(`https://site.api.espn.com/apis/site/v2/sports/${sportPath(event.__sport||'mlb')}/summary?event=${event.id}`).catch(()=>null);summaryCache.set(event.id,p);return p}
  function mlbDateParam(v){const s=String(v||'');return `${s.slice(0,4)}-${s.slice(4,6)}-${s.slice(6,8)}`}
  async function fetchMLBSchedule(date){const key=mlbDateParam(date);if(mlbScheduleCache.has(key))return mlbScheduleCache.get(key);const p=jsonFetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${key}`).then(d=>(d.dates||[]).flatMap(x=>x.games||[]));mlbScheduleCache.set(key,p);return p}
  function mlbTeamMatches(team,abbr){const names=C.TEAM_ALIASES[abbr]||[abbr];const vals=[team?.abbreviation,team?.teamName,team?.name,team?.shortName,team?.clubName,team?.locationName].filter(Boolean);return vals.some(v=>names.some(n=>C.clean(v)===C.clean(n)))}
  async function resolveMLBGamePk(date,key){const [away,home]=String(key||'').split('@');const games=await fetchMLBSchedule(date);const found=games.find(g=>mlbTeamMatches(g.teams?.away?.team,away)&&mlbTeamMatches(g.teams?.home?.team,home));return found?.gamePk||null}
  async function fetchMLBFeed(ticket,leg){const date=leg?.date||ticket?.date,key=C.legGame(ticket,leg);if(!date||!key)return null;const pk=await resolveMLBGamePk(date,key);if(!pk)return null;if(mlbFeedCache.has(pk))return mlbFeedCache.get(pk);const p=jsonFetch(`https://statsapi.mlb.com/api/v1.1/game/${pk}/feed/live`).catch(()=>null);mlbFeedCache.set(pk,p);return p}
  function playerStats(summary,teamAbbr,playerName){if(!summary?.boxscore)return null;const target=C.clean(playerName);const rowMatches=row=>{const a=row.athlete||{};const nm=C.clean(a.displayName||a.shortName||a.fullName||row.displayName||row.name);return nm&&(nm.includes(target)||target.includes(nm))};const read=container=>{let merged=null;for(const group of container.statistics||[]){const labels=group.labels||[],names=group.names||[];for(const row of group.athletes||[]){if(!rowMatches(row))continue;const stats=row.stats||[];if(!merged)merged={};labels.forEach((k,i)=>merged[k]=stats[i]);names.forEach((k,i)=>merged[k]=stats[i])}}return merged};for(const team of summary.boxscore.players||[]){if(C.teamMatches(team.team||{},teamAbbr)){const r=read(team);if(r)return r}}for(const team of summary.boxscore.teams||[]){if(C.teamMatches(team.team||{},teamAbbr)){const r=read(team);if(r)return r}}return null}
  function nStat(stats,keys){if(!stats)return null;for(const k of keys){if(stats[k]==null)continue;const raw=String(stats[k]);if(raw.includes('-'))continue;const n=Number(raw);if(!Number.isNaN(n))return n}return null}
  function getHits(s,t,p){return nStat(playerStats(s,t,p),['H','hits','Hits'])}
  function getHR(s,t,p){return nStat(playerStats(s,t,p),['HR','homeRuns','Home Runs'])}
  function getRuns(s,t,p){return nStat(playerStats(s,t,p),['R','runs','Runs'])}
  function getRBI(s,t,p){return nStat(playerStats(s,t,p),['RBI','runsBattedIn','Runs Batted In'])}
  function getWalks(s,t,p){return nStat(playerStats(s,t,p),['BB','walks','Walks'])}
  function getStolenBases(s,t,p){return nStat(playerStats(s,t,p),['SB','stolenBases','Stolen Bases'])}
  function getPoints(s,t,p){return nStat(playerStats(s,t,p),['PTS','points','Points'])}
  function getRebounds(s,t,p){return nStat(playerStats(s,t,p),['REB','rebounds','Rebounds'])}
  function getAssists(s,t,p){return nStat(playerStats(s,t,p),['AST','assists','Assists'])}
  function getBlocks(s,t,p){return nStat(playerStats(s,t,p),['BLK','blocks','Blocks'])}
  function getThrees(s,t,p){const st=playerStats(s,t,p);const direct=nStat(st,['3PM','3PTM','FG3M','threePointFieldGoalsMade']);if(direct!=null)return direct;for(const k of ['3PT','3PT FG','3-PT','3 Point']){const raw=String(st?.[k]??'');if(raw.includes('-')){const n=Number(raw.split('-')[0]);if(!Number.isNaN(n))return n}}return null}
  function getDoubleCount(s,t,p){return [getPoints(s,t,p)||0,getRebounds(s,t,p)||0,getAssists(s,t,p)||0].filter(v=>v>=10).length}
  function parseIPToOuts(raw){if(raw==null)return null;const s=String(raw).trim();if(!s)return null;if(s.includes('.')){const [i,f='0']=s.split('.').map(Number);return Number.isNaN(i)||Number.isNaN(f)?null:i*3+f}const n=Number(s);return Number.isNaN(n)?null:Math.round(n*3)}
  function getPitcherOuts(s,t,p){const st=playerStats(s,t,p);for(const k of ['IP','inningsPitched','Innings Pitched'])if(st?.[k]!=null)return parseIPToOuts(st[k]);return null}
  function mlbPlayer(feed,teamAbbr,playerName){const target=C.clean(playerName);for(const side of ['away','home']){const team=feed?.liveData?.boxscore?.teams?.[side];if(!mlbTeamMatches(team?.team,teamAbbr))continue;for(const p of Object.values(team.players||{})){const nm=C.clean(p?.person?.fullName||p?.person?.boxscoreName||'');if(nm&&(nm.includes(target)||target.includes(nm)))return p}}return null}
  function getMLBTB(feed,t,p){const b=mlbPlayer(feed,t,p)?.stats?.batting;if(!b)return null;if(b.totalBases!=null)return Number(b.totalBases);const h=Number(b.hits||0),d=Number(b.doubles||0),tr=Number(b.triples||0),hr=Number(b.homeRuns||0);return Math.max(0,h-d-tr-hr)+d*2+tr*3+hr*4}
  function getMLBKs(feed,t,p){const x=mlbPlayer(feed,t,p)?.stats?.pitching;return x?Number(x.strikeOuts??x.strikeouts??x.so??0):null}
  async function loadGameData(ticket,leg,event){const summary=event?await fetchSummary(event):null;let mlbFeed=null;if((event?.__sport||C.effectiveLeague(ticket,leg)||'mlb')==='mlb'){try{mlbFeed=await fetchMLBFeed(ticket,leg)}catch{}}return{summary,mlbFeed}}
  window.ParlayTrackerSources={fetchScoreboards,loadGameData,playerStats,nStat,getHits,getHR,getRuns,getRBI,getWalks,getStolenBases,getPoints,getRebounds,getAssists,getBlocks,getThrees,getDoubleCount,getPitcherOuts,getMLBTB,getMLBKs};
})();