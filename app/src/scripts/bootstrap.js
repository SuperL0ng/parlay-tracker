(() => {
  'use strict';
  async function start(){
    const storage=window.ParlayStorage;
    const tracker=new window.TrackerService({storage,sources:window.ParlayTrackerSources,evaluator:window.ParlayTrackerEvaluator,settlement:window.ParlaySettlementService});
    const builder=new window.BuilderController({storage});
    const sharing=new window.SharingController({storage});
    const viewer=new window.TicketViewController({storage,tracker});
    const dashboard=new window.DashboardController({storage,tracker,root:document.getElementById('ticketList'),status:document.getElementById('dashboardStatus')});
    const app=new window.AppController({storage,builder,sharing,viewer,dashboard});
    builder.start();sharing.start();viewer.start();dashboard.start();app.start();
    window.parlayApp=Object.freeze({storage,tracker,builder,sharing,viewer,dashboard,app});
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
})();
