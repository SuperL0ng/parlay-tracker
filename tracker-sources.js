/* PARLAY TRACKER SOURCES — explicit source health and fail-closed player resolution */
(() => {
  'use strict';

  const C=window.ParlayTrackerCore;
  let summaryCache=new Map(),mlbScheduleCache=new Map(),mlbFeedCache=new Map();
  function resetTrackingCaches(){summaryCache=new Map();mlbScheduleCache=new Map();mlbFeedCache=new Map();}
  async function jsonFetch(url){const response=await fetch(url,{cache:'no-store'});if(!response.ok)throw new Error(`HTTP ${response.status}`);return response.json();}
  function cacheRequest(map,key,loader){if(map.has(key))return map.get(key);const promise=Promise.resolve().then(loader).then(value=>{if(value==null)map.delete(key);return value;}).catch(error=>{map.delete(key);throw error;});map.set(key,promise);return promise;}
  function normalizeLeague(value){return String(value||'').trim().toLowerCase();}
  function normalizeDate(value){const text=String(value||'').replace(/\D/g,'').slice(0,8);return text.length===8?text:'';}
  function sportPath(sport){if(sport==='mlb')return'baseball/mlb';if(sport==='nba')return'basketball/nba';if(sport==='wnba')return'basketball/wnba';throw new Error(`Unsupported scoreboard sport: ${sport}`);}
  function statusKey(league,date){return `${normalizeLeague(league)}|${normalizeDate(date)}`;}
  function sourceStatusFor(events,league,date){return events?.sourceStatus?.[statusKey(league,date)]||'';}
  async function fetchScoreboards(dates){
    const events=[],sourceStatus={};
    for(const date of [...new Set((dates||[]).map(normalizeDate).filter(Boolean))]){
      for(const sport of ['mlb','nba','wnba']){
        const key=statusKey(sport,date);
        try{
          const data=await jsonFetch(`https://site.api.espn.com/apis/site/v2/sports/${sportPath(sport)}/scoreboard?dates=${date}&limit=100`);
          for(const event of data.events||[])event.__sport=sport;
          events.push(...(data.events||[]));sourceStatus[key]='ok';
        }catch(error){sourceStatus[key]='error';}
      }
    }
    Object.defineProperty(events,'sourceStatus',{value:Object.freeze(sourceStatus),enumerable:false,configurable:false,writable:false});
    return events;
  }
  async function fetchSummary(event){if(!event?.id)return null;return cacheRequest(summaryCache,`${event.__sport||'mlb'}|${event.id}`,()=>jsonFetch(`https://site.api.espn.com/apis/site/v2/sports/${sportPath(event.__sport||'mlb')}/summary?event=${encodeURIComponent(event.id)}`));}
  function mlbDateParam(value){const date=normalizeDate(value);return date?`${date.slice(0,4)}-${date.slice(4,6)}-${date.slice(6,8)}`:'';}
  async function fetchMLBSchedule(date){const key=mlbDateParam(date);if(!key)return[];return cacheRequest(mlbScheduleCache,key,()=>jsonFetch(`https://statsapi.mlb.com/api/v1/schedule?sportId=1&date=${key}`).then(data=>(data.dates||[]).flatMap(item=>item.games||[])));}
  function mlbTeamMatches(team,abbr){const code=String(abbr||'').trim().toUpperCase(),names=C.TEAM_ALIASES[code]||[code],values=[team?.abbreviation,team?.teamName,team?.name,team?.shortName,team?.clubName,team?.locationName].filter(Boolean);return values.some(value=>names.some(name=>C.clean(value)===C.clean(name)));}
  function scheduleStartCT(game){return C.gameStartCT({gameDate:game?.gameDate});}
  function selectBoundInstance(games,ticket,leg,event=null){
    const sorted=[...games].sort((a,b)=>new Date(a?.gameDate||0)-new Date(b?.gameDate||0));
    const explicitPk=C.instanceValue(ticket,leg,'gamePk');
    if(explicitPk!==undefined&&explicitPk!==null&&explicitPk!==''){const number=Number(explicitPk);return Number.isFinite(number)?sorted.find(game=>Number(game.gamePk)===number)||null:null;}
    const explicitId=String(C.instanceValue(ticket,leg,'gameId')||'').trim();
    if(explicitId){const direct=sorted.find(game=>String(game?.gamePk||'').trim()===explicitId);if(direct)return direct;const eventId=String(event?.id||'').trim();if(eventId&&eventId===explicitId){const byStart=sorted.find(game=>scheduleStartCT(game)===C.gameStartCT(event));if(byStart)return byStart;}return null;}
    const wantedStart=String(C.instanceValue(ticket,leg,'gameStart')||C.gameStartCT(event)||'').trim();
    if(wantedStart)return sorted.find(game=>scheduleStartCT(game)===wantedStart)||null;
    const rawOrdinal=C.instanceValue(ticket,leg,'gameNumber');
    if(rawOrdinal!==undefined&&rawOrdinal!==null&&rawOrdinal!==''){const ordinal=Number(rawOrdinal);return Number.isInteger(ordinal)&&ordinal>=1&&ordinal<=sorted.length?sorted[ordinal-1]:null;}
    if(sorted.length===1)return sorted[0];
    const reference=C.referenceTime(ticket,leg);if(reference===null)return null;
    return sorted.reduce((best,game)=>{const time=new Date(game?.gameDate||'').getTime();if(!Number.isFinite(time))return best;const distance=Math.abs(time-reference);return !best||distance<best.distance?{game,distance}:best;},null)?.game||null;
  }
  async function resolveMLBGamePk(date,key,event,ticket,leg){const [away,home]=String(key||'').split('@').map(value=>value.trim().toUpperCase());if(!away||!home)return null;const games=(await fetchMLBSchedule(date)).filter(game=>mlbTeamMatches(game.teams?.away?.team,away)&&mlbTeamMatches(game.teams?.home?.team,home));return selectBoundInstance(games,ticket,leg,event)?.gamePk||null;}
  async function fetchMLBFeed(ticket,leg,event){const date=leg?.date||ticket?.date,key=C.legGame(ticket,leg);if(!date||!key)return null;const gamePk=await resolveMLBGamePk(date,key,event,ticket,leg);if(!gamePk)return null;return cacheRequest(mlbFeedCache,String(gamePk),()=>jsonFetch(`https://statsapi.mlb.com/api/v1.1/game/${gamePk}/feed/live`));}

  function personName(row){const athlete=row?.athlete||{};return C.clean(athlete.displayName||athlete.shortName||athlete.fullName||row?.displayName||row?.name);}
  function resolvedPlayerName(rows,playerName){const target=C.clean(playerName);if(!target)return'';const names=[...new Set(rows.map(personName).filter(Boolean))],exact=names.filter(name=>name===target);if(exact.length===1)return exact[0];if(exact.length>1)return'';const partial=names.filter(name=>name.includes(target)||target.includes(name));return partial.length===1?partial[0]:'';}
  function playerStats(summary,teamAbbr,playerName){
    if(!summary?.boxscore)return null;
    const containers=[];
    for(const team of summary.boxscore.players||[])if(C.teamMatches(team.team||{},teamAbbr))containers.push(team);
    for(const team of summary.boxscore.teams||[])if(C.teamMatches(team.team||{},teamAbbr))containers.push(team);
    const allRows=containers.flatMap(container=>(container.statistics||[]).flatMap(group=>group.athletes||[]));
    const selectedName=resolvedPlayerName(allRows,playerName);if(!selectedName)return null;const merged={};
    for(const container of containers){
      for(const group of container.statistics||[]){
        const labels=group.labels||[],names=group.names||[];
        for(const row of group.athletes||[]){if(personName(row)!==selectedName)continue;const stats=row.stats||[];labels.forEach((key,index)=>merged[key]=stats[index]);names.forEach((key,index)=>merged[key]=stats[index]);}
      }
    }
    return Object.keys(merged).length?merged:null;
  }
  function nStat(stats,keys){if(!stats)return null;for(const key of keys){if(stats[key]==null)continue;const raw=String(stats[key]).trim();if(!raw||raw.includes('-'))continue;const value=Number(raw);if(Number.isFinite(value))return value;}return null;}
  function maxKnown(...values){const known=values.filter(value=>value!=null&&Number.isFinite(Number(value))).map(Number);return known.length?Math.max(...known):null;}
  function getHits(summary,team,player){return nStat(playerStats(summary,team,player),['H','hits','Hits']);}
  function getHR(summary,team,player){return nStat(playerStats(summary,team,player),['HR','homeRuns','Home Runs']);}
  function getRuns(summary,team,player){return nStat(playerStats(summary,team,player),['R','runs','Runs']);}
  function getRBI(summary,team,player){return nStat(playerStats(summary,team,player),['RBI','runsBattedIn','Runs Batted In']);}
  function getWalks(summary,team,player){return nStat(playerStats(summary,team,player),['BB','walks','Walks']);}
  function getStolenBases(summary,team,player){return nStat(playerStats(summary,team,player),['SB','stolenBases','Stolen Bases']);}
  function getPoints(summary,team,player){return nStat(playerStats(summary,team,player),['PTS','points','Points']);}
  function getRebounds(summary,team,player){return nStat(playerStats(summary,team,player),['REB','rebounds','Rebounds']);}
  function getAssists(summary,team,player){return nStat(playerStats(summary,team,player),['AST','assists','Assists']);}
  function getBlocks(summary,team,player){return nStat(playerStats(summary,team,player),['BLK','blocks','Blocks']);}
  function getSteals(summary,team,player){return nStat(playerStats(summary,team,player),['STL','steals','Steals']);}
  function getThrees(summary,team,player){const stats=playerStats(summary,team,player),direct=nStat(stats,['3PM','3PTM','FG3M','threePointFieldGoalsMade']);if(direct!=null)return direct;for(const key of ['3PT','3PT FG','3-PT','3 Point']){const raw=String(stats?.[key]??'');if(raw.includes('-')){const value=Number(raw.split('-')[0]);if(Number.isFinite(value))return value;}}return null;}
  function getDoubleCount(summary,team,player){const values=[getPoints(summary,team,player),getRebounds(summary,team,player),getAssists(summary,team,player),getSteals(summary,team,player),getBlocks(summary,team,player)];return values.every(value=>value!=null)?values.filter(value=>value>=10).length:null;}
  function parseIPToOuts(raw){const match=String(raw??'').trim().match(/^(\d+)(?:\.(\d))?$/);if(!match)return null;const innings=Number(match[1]),fraction=Number(match[2]||0);return Number.isInteger(innings)&&[0,1,2].includes(fraction)?innings*3+fraction:null;}
  function getPitcherOuts(summary,team,player){const stats=playerStats(summary,team,player);for(const key of ['IP','inningsPitched','Innings Pitched'])if(stats?.[key]!=null)return parseIPToOuts(stats[key]);return null;}
  function mlbPlayer(feed,teamAbbr,playerName){const target=C.clean(playerName),matches=[];if(!target)return null;for(const side of ['away','home']){const team=feed?.liveData?.boxscore?.teams?.[side];if(!mlbTeamMatches(team?.team,teamAbbr))continue;for(const player of Object.values(team.players||{})){const name=C.clean(player?.person?.fullName||player?.person?.boxscoreName||'');if(name)matches.push({name,player});}}const exact=matches.filter(item=>item.name===target);if(exact.length===1)return exact[0].player;if(exact.length>1)return null;const partial=matches.filter(item=>item.name.includes(target)||target.includes(item.name));return partial.length===1?partial[0].player:null;}
  function mlbBatting(feed,team,player){return mlbPlayer(feed,team,player)?.stats?.batting||null;}
  function mlbPitching(feed,team,player){return mlbPlayer(feed,team,player)?.stats?.pitching||null;}
  function getMLBHits(feed,team,player){const stats=mlbBatting(feed,team,player);return stats?Number(stats.hits??0):null;}
  function getMLBHR(feed,team,player){const stats=mlbBatting(feed,team,player);return stats?Number(stats.homeRuns??0):null;}
  function getMLBRuns(feed,team,player){const stats=mlbBatting(feed,team,player);return stats?Number(stats.runs??0):null;}
  function getMLBRBI(feed,team,player){const stats=mlbBatting(feed,team,player);return stats?Number(stats.rbi??stats.runsBattedIn??0):null;}
  function getMLBWalks(feed,team,player){const stats=mlbBatting(feed,team,player);return stats?Number(stats.baseOnBalls??stats.walks??0):null;}
  function getMLBSB(feed,team,player){const stats=mlbBatting(feed,team,player);return stats?Number(stats.stolenBases??0):null;}
  function getMLBTB(feed,team,player){const stats=mlbBatting(feed,team,player);if(!stats)return null;if(stats.totalBases!=null)return Number(stats.totalBases);const hits=Number(stats.hits||0),doubles=Number(stats.doubles||0),triples=Number(stats.triples||0),homeRuns=Number(stats.homeRuns||0);return Math.max(0,hits-doubles-triples-homeRuns)+doubles*2+triples*3+homeRuns*4;}
  function getMLBKs(feed,team,player){const stats=mlbPitching(feed,team,player);return stats?Number(stats.strikeOuts??stats.strikeouts??stats.so??0):null;}
  function getMLBPitcherOuts(feed,team,player){const stats=mlbPitching(feed,team,player);if(!stats)return null;if(stats.outs!=null)return Number(stats.outs);return parseIPToOuts(stats.inningsPitched);}
  function getTBFromSummary(summary,team,player){const stats=playerStats(summary,team,player),direct=nStat(stats,['TB','totalBases','Total Bases']);if(direct!=null)return direct;const hits=getHits(summary,team,player);if(hits==null)return null;const homeRuns=getHR(summary,team,player)||0,doubles=nStat(stats,['2B','doubles','Doubles'])||0,triples=nStat(stats,['3B','triples','Triples'])||0;return Math.max(0,hits-doubles-triples-homeRuns)+doubles*2+triples*3+homeRuns*4;}
  function baseballStat(kind,summary,feed,team,player){switch(kind){case'hits':return maxKnown(getHits(summary,team,player),getMLBHits(feed,team,player));case'hr':return maxKnown(getHR(summary,team,player),getMLBHR(feed,team,player));case'runs':return maxKnown(getRuns(summary,team,player),getMLBRuns(feed,team,player));case'rbi':return maxKnown(getRBI(summary,team,player),getMLBRBI(feed,team,player));case'walks':return maxKnown(getWalks(summary,team,player),getMLBWalks(feed,team,player));case'sb':return maxKnown(getStolenBases(summary,team,player),getMLBSB(feed,team,player));case'tb':return maxKnown(getTBFromSummary(summary,team,player),getMLBTB(feed,team,player));case'ks':return maxKnown(nStat(playerStats(summary,team,player),['K','SO','Ks','Strikeouts','strikeouts']),getMLBKs(feed,team,player));case'outs':return maxKnown(getPitcherOuts(summary,team,player),getMLBPitcherOuts(feed,team,player));default:return null;}}
  async function loadGameData(ticket,leg,event){
    const league=normalizeLeague(event?.__sport||C.effectiveLeague(ticket,leg)||'mlb'),result={summary:null,mlbFeed:null,errors:[]};
    if(event){try{result.summary=await fetchSummary(event);}catch(error){result.errors.push({source:'summary',message:error.message||String(error)});}}
    if(league==='mlb')try{result.mlbFeed=await fetchMLBFeed(ticket,leg,event);}catch(error){result.errors.push({source:'mlb-feed',message:error.message||String(error)});}
    return result;
  }

  window.ParlayTrackerSources=Object.freeze({resetTrackingCaches,fetchScoreboards,sourceStatusFor,loadGameData,playerStats,nStat,getHits,getHR,getRuns,getRBI,getWalks,getStolenBases,getPoints,getRebounds,getAssists,getBlocks,getSteals,getThrees,getDoubleCount,parseIPToOuts,getPitcherOuts,getMLBTB,getMLBKs,getTBFromSummary,baseballStat});
})();
