/* PARLAY TRACKER CORE — canonical MLB/NBA/WNBA tracking primitives */
(() => {
  'use strict';

  const TZ = 'America/Chicago';
  const TEAM_ALIASES = {
    ATH:['ATH','Athletics','Oakland Athletics',"A's"],ARI:['ARI','Arizona Diamondbacks','Diamondbacks'],ATL:['ATL','Atlanta Braves','Braves','Atlanta Hawks','Hawks','Atlanta Dream','Dream'],BAL:['BAL','Baltimore Orioles','Orioles'],BOS:['BOS','Boston Red Sox','Red Sox','Boston Celtics','Celtics'],CHC:['CHC','Chicago Cubs','Cubs'],CWS:['CWS','CHW','Chicago White Sox','White Sox'],CIN:['CIN','Cincinnati Reds','Reds'],CLE:['CLE','Cleveland Guardians','Guardians','Cleveland Cavaliers','Cavaliers'],COL:['COL','Colorado Rockies','Rockies'],DET:['DET','Detroit Tigers','Tigers','Detroit Pistons','Pistons'],HOU:['HOU','Houston Astros','Astros','Houston Rockets','Rockets'],KC:['KC','KCR','Kansas City Royals','Royals'],LAA:['LAA','Los Angeles Angels','Angels'],LAD:['LAD','Los Angeles Dodgers','Dodgers'],MIA:['MIA','Miami Marlins','Marlins','Miami Heat','Heat'],MIL:['MIL','Milwaukee Brewers','Brewers','Milwaukee Bucks','Bucks'],MIN:['MIN','Minnesota Twins','Twins','Minnesota Timberwolves','Timberwolves','Minnesota Lynx','Lynx'],NYM:['NYM','New York Mets','Mets'],NYY:['NYY','New York Yankees','Yankees'],PHI:['PHI','Philadelphia Phillies','Phillies','Philadelphia 76ers','76ers','Sixers'],PIT:['PIT','Pittsburgh Pirates','Pirates'],SD:['SD','SDP','San Diego Padres','Padres'],SEA:['SEA','Seattle Mariners','Mariners','Seattle Storm','Storm'],SF:['SF','SFG','San Francisco Giants','Giants'],STL:['STL','St. Louis Cardinals','Saint Louis Cardinals','Cardinals'],TB:['TB','TBR','Tampa Bay Rays','Rays'],TEX:['TEX','Texas Rangers','Rangers'],TOR:['TOR','Toronto Blue Jays','Blue Jays','Toronto Raptors','Raptors'],WSH:['WSH','Washington Nationals','Nationals','Washington Wizards','Wizards','Washington Mystics','Mystics'],
    BKN:['BKN','Brooklyn Nets','Nets'],CHA:['CHA','Charlotte Hornets','Hornets'],CHI:['CHI','Chicago Bulls','Bulls','Chicago Sky','Sky','Chicago'],DAL:['DAL','Dallas Mavericks','Mavericks','Mavs','Dallas Wings','Wings'],DEN:['DEN','Denver Nuggets','Nuggets'],GS:['GS','GSW','GSV','Golden State Warriors','Warriors','Golden State Valkyries','Valkyries','Golden State'],IND:['IND','Indiana Pacers','Pacers','Indiana Fever','Fever'],LAC:['LAC','LA Clippers','Los Angeles Clippers','Clippers'],LAL:['LAL','Los Angeles Lakers','Lakers'],MEM:['MEM','Memphis Grizzlies','Grizzlies'],NOP:['NOP','New Orleans Pelicans','Pelicans'],NYK:['NYK','New York Knicks','Knicks'],OKC:['OKC','Oklahoma City Thunder','Thunder','Oklahoma City'],ORL:['ORL','Orlando Magic','Magic'],PHX:['PHX','Phoenix Suns','Suns','Phoenix Mercury','Mercury'],POR:['POR','Portland Trail Blazers','Trail Blazers','Blazers'],SAC:['SAC','Sacramento Kings','Kings'],SA:['SA','SAS','San Antonio Spurs','Spurs','San Antonio'],UTA:['UTA','UTAH','Utah Jazz','Jazz'],
    CON:['CON','CONN','Connecticut Sun','Sun','Connecticut'],LA:['LA','LAS','LA Sparks','Los Angeles Sparks','Sparks','Los Angeles'],LV:['LV','LVA','Las Vegas Aces','Aces','Las Vegas'],NY:['NY','NYL','New York Liberty','Liberty','New York']
  };

  function clean(value) {
    return String(value ?? '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-z0-9 ]/g,'').replace(/\s+/g,' ').trim();
  }
  function normalizeCode(value) { return String(value ?? '').trim().toUpperCase(); }
  function comps(game) { return game?.competitions?.[0]?.competitors || []; }
  function teamMatches(teamObj, abbreviation) {
    const code = normalizeCode(abbreviation);
    if (!code) return false;
    const names = TEAM_ALIASES[code] || [code];
    const values = [teamObj?.abbreviation,teamObj?.shortDisplayName,teamObj?.displayName,teamObj?.name,teamObj?.location].filter(Boolean);
    return values.some(value => names.some(name => clean(value) === clean(name)));
  }
  function findTeam(game, abbreviation) { return comps(game).find(candidate => teamMatches(candidate.team,abbreviation)) || null; }
  function numeric(value) { const number=Number(value); return Number.isFinite(number)?number:null; }
  function score(game, abbreviation) { const team=findTeam(game,abbreviation); return team?numeric(team.score):null; }
  function isSuspended(game) {
    const type=game?.status?.type||{};
    return [type.name,type.description,type.detail,type.shortDetail,type.state].map(value=>String(value??'').toLowerCase()).join(' ').includes('suspended');
  }
  function isFinal(game) { if(isSuspended(game))return false;const type=game?.status?.type;return Boolean(type?.completed||type?.state==='post'); }
  function isLive(game) { return game?.status?.type?.state==='in'; }
  function hasStarted(game) { const state=game?.status?.type?.state;return state==='in'||state==='post'; }
  function outsDots(game) {
    const detailText=game?.status?.type?.shortDetail||game?.status?.type?.detail||'';
    if(/^(End|Mid)/i.test(detailText.trim()))return'';
    const raw=game?.competitions?.[0]?.situation?.outs;if(raw==null)return'';
    return ['○○','●○','●●'][Number(raw)]||'';
  }
  function detail(game) {
    const raw=game?.status?.type?.shortDetail||game?.status?.type?.detail||'';
    const base=raw.replace(/\bTop\s+/i,'↑ ').replace(/\bBot(?:tom)?\s+/i,'↓ ').replace(/\s+/g,' ').trim();
    const outs=outsDots(game);return outs?`${base} ${outs}`:base;
  }
  function scheduledCT(game) {
    const date=new Date(game?.date);if(Number.isNaN(date.getTime()))return'';
    return date.toLocaleTimeString('en-US',{hour:'numeric',minute:'2-digit',timeZone:TZ}).replace(' ','')+' CT';
  }
  function dateParts(raw) {
    const date=new Date(raw||'');if(Number.isNaN(date.getTime()))return null;
    const parts={};new Intl.DateTimeFormat('en-US',{timeZone:TZ,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(date).forEach(part=>{if(part.type!=='literal')parts[part.type]=part.value});
    return parts;
  }
  function gameDateCT(game) { const parts=dateParts(game?.date||game?.gameDate);return parts?`${parts.year}${parts.month}${parts.day}`:''; }
  function gameStartCT(game) { const parts=dateParts(game?.date||game?.gameDate);return parts?`${parts.year}${parts.month}${parts.day}T${parts.hour}${parts.minute}`:''; }
  function legGame(ticket,leg) { return String(leg?.game||ticket?.game||'').trim(); }
  function effectiveLeague(ticket,leg) { return String(leg?.league||ticket?.league||'').trim().toLowerCase(); }
  function gameId(game) { return String(game?.id||game?.uid||game?.gamePk||'').trim(); }
  function instanceValue(ticket,leg,name) { const legValue=leg?.[name],ticketValue=ticket?.[name];return legValue!==undefined&&legValue!==null&&legValue!==''?legValue:ticketValue; }
  function referenceTime(ticket,leg) { const raw=instanceValue(ticket,leg,'gameSavedAt')||ticket?.__recordReferenceTime||'';const value=new Date(raw).getTime();return Number.isFinite(value)?value:null; }
  function nearestByTime(matches,time) { return matches.reduce((best,item)=>{const value=new Date(item?.date||item?.gameDate||'').getTime();if(!Number.isFinite(value))return best;const distance=Math.abs(value-time);return !best||distance<best.distance?{item,distance}:best},null)?.item||null; }
  function parseGameKey(key) {
    const parts=String(key||'').split('@').map(value=>normalizeCode(value));
    return parts.length===2&&parts.every(Boolean)?parts:null;
  }
  function findGame(games,key,ticket=null,leg=null) {
    const teams=parseGameKey(key);if(!teams)return null;const [away,home]=teams;
    let matches=(Array.isArray(games)?games:[]).filter(game=>findTeam(game,away)&&findTeam(game,home));
    const league=effectiveLeague(ticket,leg);if(league)matches=matches.filter(game=>!game?.__sport||String(game.__sport).toLowerCase()===league);
    const date=String(leg?.date||ticket?.date||'').replace(/\D/g,'').slice(0,8);
    if(date){matches=matches.filter(game=>gameDateCT(game)===date);if(!matches.length)return null;}
    if(!matches.length)return null;
    matches=[...matches].sort((a,b)=>new Date(a?.date||a?.gameDate||0)-new Date(b?.date||b?.gameDate||0));
    const wantedId=String(instanceValue(ticket,leg,'gameId')||'').trim();
    if(wantedId)return matches.find(game=>gameId(game)===wantedId)||null;
    const wantedStart=String(instanceValue(ticket,leg,'gameStart')||'').trim();
    if(wantedStart)return matches.find(game=>gameStartCT(game)===wantedStart)||null;
    const rawOrdinal=instanceValue(ticket,leg,'gameNumber');
    if(rawOrdinal!==undefined&&rawOrdinal!==null&&rawOrdinal!==''){
      const ordinal=Number(rawOrdinal);return Number.isInteger(ordinal)&&ordinal>=1&&ordinal<=matches.length?matches[ordinal-1]:null;
    }
    if(matches.length===1)return matches[0];
    const reference=referenceTime(ticket,leg);if(reference!==null)return nearestByTime(matches,reference);
    const started=matches.filter(hasStarted);return started.length===1?started[0]:null;
  }
  function baseGameMeta(game) { return hasStarted(game)?detail(game):scheduledCT(game); }
  function legMeta(ticket,leg,game) { const meta=baseGameMeta(game);if(ticket?.type==='sgp')return meta;const key=legGame(ticket,leg);return key?`${key} - ${meta}`:meta; }
  function total(game) { const values=comps(game).map(team=>numeric(team.score));return values.length&&values.every(value=>value!==null)?values.reduce((sum,value)=>sum+value,0):null; }
  function opponentAbbr(gameKey,team) { const teams=parseGameKey(gameKey);if(!teams)return'';const selected=normalizeCode(team);return selected===teams[0]?teams[1]:selected===teams[1]?teams[0]:''; }
  function linescore(game,abbreviation) { const team=findTeam(game,abbreviation);if(!team)return null;return (team.linescores||[]).map(item=>numeric(item.value??item.displayValue??0)).filter(value=>value!==null); }
  function periodScore(game,abbreviation,count) { const values=linescore(game,abbreviation);return values===null?null:values.slice(0,count).reduce((sum,value)=>sum+value,0); }
  function f5Score(game,abbreviation) { return periodScore(game,abbreviation,5); }
  function f5Complete(game) { if(isFinal(game))return true;if(isSuspended(game))return false;const period=Number(game?.status?.period||0),text=detail(game);return period>=6||/^End\s+5/i.test(text); }
  function h1Score(game,abbreviation) { return periodScore(game,abbreviation,2); }
  function h1Complete(game) { if(isFinal(game))return true;if(isSuspended(game))return false;const period=Number(game?.status?.period||0),text=detail(game);return period>=3||/half(?:time|\s*time)/i.test(text); }
  function fmtRecord(value,line) { const current=value==null?'—':value;const display=typeof line==='number'&&line%1===0.5?Math.ceil(line):line;return `${current}/${display}`; }
  function statusObj(state,value='',valueClass='') { return {state,value,valueClass}; }
  function gameScoreValue(game,away,home) { const awayScore=score(game,away),homeScore=score(game,home);return `${awayScore??'—'}-${homeScore??'—'}`; }
  function marginForPick(game,key,team,spread=0) { const mine=score(game,team),opponent=opponentAbbr(key,team),theirs=opponent?score(game,opponent):null;return mine===null||theirs===null?null:mine+Number(spread||0)-theirs; }
  function f5MarginForPick(game,key,team,spread=0) { const mine=f5Score(game,team),opponent=opponentAbbr(key,team),theirs=opponent?f5Score(game,opponent):null;return mine===null||theirs===null?null:mine+Number(spread||0)-theirs; }
  function h1MarginForPick(game,key,team,spread=0) { const mine=h1Score(game,team),opponent=opponentAbbr(key,team),theirs=opponent?h1Score(game,opponent):null;return mine===null||theirs===null?null:mine+Number(spread||0)-theirs; }
  function trendClass(game,margin) { if(!Number.isFinite(margin))return'valuePending';if(margin===0)return'valueTie';const scale=game?.__sport==='mlb'?2:5,magnitude=Math.abs(margin);if(margin>0)return magnitude<scale?'valueAhead1':magnitude<scale*2?'valueAhead2':'valueAhead3';return magnitude<scale?'valueBehind1':magnitude<scale*2?'valueBehind2':'valueBehind3'; }
  function ticketState(states) {
    const values=(states||[]).map(item=>typeof item==='string'?item:item?.state||'pending');
    if(values.includes('loss'))return'loss';
    if(values.includes('suspended'))return'suspended';
    if(values.includes('unavailable'))return'unavailable';
    if(values.length&&values.every(value=>value==='push'))return'push';
    if(values.length&&values.every(value=>value==='win'||value==='push'))return'win';
    if(values.includes('live'))return'live';
    return'pending';
  }

  window.ParlayTrackerCore=Object.freeze({TZ,TEAM_ALIASES,clean,comps,teamMatches,findTeam,score,isSuspended,isFinal,isLive,hasStarted,outsDots,detail,scheduledCT,gameDateCT,legGame,effectiveLeague,gameId,gameStartCT,instanceValue,referenceTime,findGame,baseGameMeta,legMeta,total,opponentAbbr,linescore,f5Score,f5Complete,h1Score,h1Complete,fmtRecord,statusObj,gameScoreValue,marginForPick,f5MarginForPick,h1MarginForPick,trendClass,ticketState});
})();
