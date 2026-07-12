/* GAME DISPLAY FIXES V50 */
(() => {
  'use strict';
  const MLB_ALIASES={AZ:'ARI',ARI:'ARI',OAK:'ATH',ATH:'ATH',KCR:'KC',KC:'KC',CHW:'CWS',CWS:'CWS',SDP:'SD',SD:'SD',SFG:'SF',SF:'SF',TBR:'TB',TB:'TB',WSN:'WSH',WAS:'WSH',WSH:'WSH'};
  const SHORT_NAMES={MLB:{ARI:'Diamondbacks',ATH:'Athletics',ATL:'Braves',BAL:'Orioles',BOS:'Red Sox',CHC:'Cubs',CWS:'White Sox',CIN:'Reds',CLE:'Guardians',COL:'Rockies',DET:'Tigers',HOU:'Astros',KC:'Royals',LAA:'Angels',LAD:'Dodgers',MIA:'Marlins',MIL:'Brewers',MIN:'Twins',NYM:'Mets',NYY:'Yankees',PHI:'Phillies',PIT:'Pirates',SD:'Padres',SEA:'Mariners',SF:'Giants',STL:'Cardinals',TB:'Rays',TEX:'Rangers',TOR:'Blue Jays',WSH:'Nationals'}};
  const clean=v=>String(v??'').trim();
  const canonCode=(code,l)=>{code=clean(code).toUpperCase();return l==='MLB'?(MLB_ALIASES[code]||code):code};
  const gameKey=(value,l)=>{const parts=clean(value).split('@');return parts.length===2?canonCode(parts[0],l)+'@'+canonCode(parts[1],l):clean(value)};
  const shortName=(code,l)=>SHORT_NAMES[l]?.[canonCode(code,l)]||window.TEAM_NAMES?.[l]?.[canonCode(code,l)]||canonCode(code,l);

  window.gameDisplayName=function(value,l){
    const raw=clean(value),parts=raw.split('@');
    if(parts.length!==2)return raw;
    return `${shortName(parts[0],l)} @ ${shortName(parts[1],l)}`;
  };

  window.prepareGameOption=function(option,l){
    if(!option||!option.value||option.value===window.MAN||option.value==='__manual__')return;
    const original=window.splitGameLabel?window.splitGameLabel(option.textContent):{base:option.textContent,suffix:''};
    option.dataset.compactLabel=(original.base||option.value)+original.suffix;
    option.dataset.fullLabel=window.gameDisplayName(option.value,l)+original.suffix;
  };

  const originalSetPairValue=window.setPairValue;
  if(typeof originalSetPairValue==='function'){
    window.setPairValue=function(sel,input,value){
      const isGame=sel?.matches?.('#ticketGame,.lgame');
      if(isGame&&value){
        const leg=sel.closest('.leg');
        const l=leg&&typeof window.legLeague==='function'?window.legLeague(leg):(typeof window.league==='function'?window.league():'MLB');
        const wanted=gameKey(value,l);
        const match=[...(sel.options||[])].find(o=>o.value&&o.value!=='__manual__'&&gameKey(o.value,l)===wanted);
        if(match)value=match.value;
      }
      return originalSetPairValue.call(this,sel,input,value);
    };
  }

  function refresh(){try{window.refreshReadableOptions?.()}catch{}}
  window.addEventListener('load',()=>setTimeout(refresh,0));
})();