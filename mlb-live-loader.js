/* MLB live runtime bootstrap V26 */
(async()=>{
  'use strict';
  try{
    const response=await fetch('./mlb-live.js?v=26',{cache:'no-store'});
    if(!response.ok)throw new Error('MLB runtime HTTP '+response.status);
    let code=await response.text();

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

    const oldInit="window.addEventListener('load',()=>setTimeout(wireRefresh,0));";
    const newInit="window.__parlayLiveRefresh=()=>{feedCache.clear();document.getElementById('liveRefreshStatus')?.remove();refreshStandaloneLive()};window.addEventListener('parlay:viewchange',()=>setTimeout(wireRefresh,0));if(document.readyState==='loading'){window.addEventListener('load',()=>setTimeout(wireRefresh,0),{once:true})}else{setTimeout(wireRefresh,0)}";
    if(!code.includes(oldInit))throw new Error('MLB runtime initialization marker missing');
    code=code.replace(oldInit,newInit)+'\n//# sourceURL=mlb-live-runtime-v26.js';
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
