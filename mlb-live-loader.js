/* MLB live runtime bootstrap V24 */
(async()=>{
  'use strict';
  try{
    const response=await fetch('./mlb-live.js?v=24',{cache:'no-store'});
    if(!response.ok)throw new Error('MLB runtime HTTP '+response.status);
    let code=await response.text();

    const oldStatus="const status=document.createElement('div');status.id='liveRefreshStatus';";
    const newStatus="document.getElementById('liveRefreshStatus')?.remove();const status=document.createElement('div');status.id='liveRefreshStatus';";
    if(code.includes(oldStatus))code=code.replace(oldStatus,newStatus);

    const oldTeam="if(t==='team_total_over'||t==='team_total_under')return overUnder(score,target,t==='team_total_over',final,started);";
    const newTeam="if(t==='team_total_over'||t==='team_total_under'){const r=overUnder(score,target,t==='team_total_over',final,started);r.display=`${score} / ${target}`;return r;}";
    if(code.includes(oldTeam))code=code.replace(oldTeam,newTeam);

    const oldInit="window.addEventListener('load',()=>setTimeout(wireRefresh,0));";
    const newInit="window.__parlayLiveRefresh=()=>{feedCache.clear();document.getElementById('liveRefreshStatus')?.remove();refreshStandaloneLive()};window.addEventListener('parlay:viewchange',()=>setTimeout(wireRefresh,0));if(document.readyState==='loading'){window.addEventListener('load',()=>setTimeout(wireRefresh,0),{once:true})}else{setTimeout(wireRefresh,0)}";
    if(!code.includes(oldInit))throw new Error('MLB runtime initialization marker missing');
    code=code.replace(oldInit,newInit)+'\n//# sourceURL=mlb-live-runtime-v24.js';
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
