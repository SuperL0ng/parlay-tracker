(() => {
  'use strict';
  class AppController {
    constructor({storage,builder,sharing,viewer,dashboard}){this.storage=storage;this.builder=builder;this.sharing=sharing;this.viewer=viewer;this.dashboard=dashboard;this.$=id=>document.getElementById(id);this.onEvent=this.onEvent.bind(this);this.route=this.route.bind(this)}
    start(){
      this.$('ticketsTab').addEventListener('click',()=>this.showDashboard());
      this.$('builderTab').addEventListener('click',()=>this.builder.restoreDraft());
      this.$('newTicketBtn').addEventListener('click',()=>this.builder.resetNew());
      this.$('backToTicketsBtn').addEventListener('click',()=>this.showDashboard());
      this.$('saveTicketBtn').addEventListener('click',()=>this.builder.save());
      this.$('importTicketBtn').addEventListener('click',()=>this.sharing.openImport());
      this.$('codeMenuBtn').addEventListener('click',()=>this.openCodeSheet());
      this.$('codeSheetBackdrop').addEventListener('click',()=>this.closeCodeSheet());
      this.$('cancelCodeAction').addEventListener('click',()=>this.closeCodeSheet());
      this.$('showCodeAction').addEventListener('click',()=>this.showCode());
      this.$('copyCodeAction').addEventListener('click',()=>this.copyCurrentCode());
      this.$('hideCodeBtn').addEventListener('click',()=>this.$('codePanel').classList.add('hide'));
      for(const name of ['show-builder','standalone-opened','standalone-closed','ticket-saved','ticket-imported','edit-ticket','copy-ticket','share-ticket'])window.addEventListener(`parlay:${name}`,this.onEvent);
      window.addEventListener('hashchange',this.route);this.route();
    }
    async route(){if(this.sharing.consumeHash(),await this.viewer.enterFromHash())return;this.showDashboard(false)}
    showDashboard(capture=true){this.dashboard.closeOverlays();if(capture)this.builder.captureDraft();this.$('builderView').classList.add('hide');this.$('standaloneView').classList.add('hide');this.$('dashboardView').classList.remove('hide');this.$('appTabs').classList.remove('hide');this.$('ticketsTab').classList.add('active');this.$('builderTab').classList.remove('active');this.dashboard.render();window.scrollTo({top:0,behavior:'smooth'})}
    showBuilder(){this.dashboard.closeOverlays();this.$('builderView').classList.remove('hide');this.$('dashboardView').classList.add('hide');this.$('standaloneView').classList.add('hide');this.$('appTabs').classList.remove('hide');this.$('builderTab').classList.add('active');this.$('ticketsTab').classList.remove('active');window.scrollTo({top:0,behavior:'smooth'})}
    showStandalone(){this.dashboard.closeOverlays();this.$('builderView').classList.add('hide');this.$('dashboardView').classList.add('hide');this.$('standaloneView').classList.remove('hide');this.$('appTabs').classList.add('hide');window.scrollTo({top:0})}
    onEvent(event){
      const name=event.type.replace('parlay:',''),id=event.detail?.id;
      if(name==='show-builder'){this.showBuilder();return}
      if(name==='standalone-opened'){this.showStandalone();return}
      if(name==='standalone-closed'){this.showDashboard(false);return}
      if(name==='ticket-saved'||name==='ticket-imported'){this.dashboard.render();if(name==='ticket-imported')this.showDashboard(false);return}
      if(name==='edit-ticket'&&id){this.builder.loadRecord(id);return}
      if(name==='copy-ticket'&&id){this.copyText(this.builder.codeForRecord(id),'Ticket code copied.');return}
      if(name==='share-ticket'&&id)this.sharing.share(id);
    }
    openCodeSheet(){this.$('codeSheet').classList.remove('hide');this.$('codeSheetBackdrop').classList.remove('hide');document.body.classList.add('modalOpen')}
    closeCodeSheet(){this.$('codeSheet').classList.add('hide');this.$('codeSheetBackdrop').classList.add('hide');if(this.$('ticketShareModal').classList.contains('hide'))document.body.classList.remove('modalOpen')}
    showCode(){this.$('output').value=this.builder.currentCode();this.$('codePanel').classList.remove('hide');this.closeCodeSheet();requestAnimationFrame(()=>this.$('codePanel').scrollIntoView({behavior:'smooth',block:'start'}))}
    async copyCurrentCode(){await this.copyText(this.builder.currentCode(),'Ticket code copied.');this.closeCodeSheet()}
    async copyText(text,message){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}this.$('previewStatus').textContent=message}catch{this.$('previewStatus').textContent='Copy failed.'}}
  }
  window.AppController=AppController;
})();
