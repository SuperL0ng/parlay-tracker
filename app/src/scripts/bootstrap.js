(() => {
  'use strict';
  const STATE_KEY='__parlayBootstrapState';
  const state=window[STATE_KEY]||{promise:null};
  if(!window[STATE_KEY])Object.defineProperty(window,STATE_KEY,{value:state,configurable:true});
  const requiredGlobals=['ParlayStorage','ParlayTrackerSources','ParlayTrackerEvaluator','ParlaySettlementService','TrackerService','BuilderController','SharingController','TicketViewController','DashboardController','BackupController','SportsbookController','AppController'];
  function dependency(name){const value=window[name];if(!value)throw new Error(`Missing application dependency: ${name}`);return value}
  function element(id){const value=document.getElementById(id);if(!value)throw new Error(`Missing application element: ${id}`);return value}
  async function create(){
    requiredGlobals.forEach(dependency);
    const storage=window.ParlayStorage;
    const tracker=new window.TrackerService({storage,sources:window.ParlayTrackerSources,evaluator:window.ParlayTrackerEvaluator,settlement:window.ParlaySettlementService});
    const builder=new window.BuilderController({storage});
    const sharing=new window.SharingController({storage});
    const viewer=new window.TicketViewController({storage,tracker});
    const dashboard=new window.DashboardController({storage,tracker,root:element('ticketList'),status:element('dashboardStatus')});
    const backup=new window.BackupController({storage});
    const sportsbook=new window.SportsbookController({storage,builder});
    const app=new window.AppController({storage,builder,sharing,viewer,dashboard,backup}),started=[];
    try{
      await Promise.resolve(builder.start());started.push(builder);
      await Promise.resolve(sportsbook.start());started.push(sportsbook);
      await Promise.resolve(sharing.start());started.push(sharing);
      await Promise.resolve(viewer.start());started.push(viewer);
      await Promise.resolve(dashboard.start());started.push(dashboard);
      await Promise.resolve(backup.start());started.push(backup);
      await Promise.resolve(app.start());started.push(app);
    }catch(error){for(const controller of started.reverse())try{await Promise.resolve(controller.stop?.())}catch{}throw error}
    const instance=Object.freeze({storage,tracker,builder,sportsbook,sharing,viewer,dashboard,backup,app});window.parlayApp=instance;window.dispatchEvent(new CustomEvent('parlay:app-ready'));return instance;
  }
  async function start(){if(window.parlayApp)return window.parlayApp;if(state.promise)return state.promise;state.promise=create();try{return await state.promise}catch(error){state.promise=null;throw error}}
  async function stop(){if(state.promise&&!window.parlayApp)try{await state.promise}catch{}const current=window.parlayApp;if(!current){state.promise=null;return}for(const name of ['app','backup','dashboard','viewer','sharing','sportsbook','builder'])try{await Promise.resolve(current[name]?.stop?.())}catch{}try{delete window.parlayApp}catch{window.parlayApp=undefined}state.promise=null;window.dispatchEvent(new CustomEvent('parlay:app-stopped'))}
  function autoStart(){void start().catch(error=>{console.error('Parlay Tracker failed to start.',error);window.dispatchEvent(new CustomEvent('parlay:app-error',{detail:{message:error?.message||String(error)}}))})}
  window.ParlayBootstrap=Object.freeze({start,stop});
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',autoStart,{once:true});else autoStart();
})();