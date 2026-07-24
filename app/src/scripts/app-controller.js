(() => {
  'use strict';
  class AppController {
    constructor({storage,builder,sharing,viewer,dashboard,backup}){
      this.storage=storage;this.builder=builder;this.sharing=sharing;this.viewer=viewer;this.dashboard=dashboard;this.backup=backup;this.started=false;this.routeVersion=0;this.$=id=>document.getElementById(id);this.onEvent=this.onEvent.bind(this);this.route=this.route.bind(this);this.onHashChange=this.onHashChange.bind(this);
      this.elementHandlers=[
        ['ticketsTab','click',()=>this.showDashboard()],
        ['builderTab','click',()=>this.builder.restoreDraft()],
        ['newTicketBtn','click',()=>this.builder.resetNew()],
        ['backToTicketsBtn','click',()=>this.showDashboard()],
        ['saveTicketBtn','click',()=>this.builder.save()],
        ['importTicketBtn','click',()=>{this.viewer.deactivate?.();this.dashboard.closeOverlays();this.backup.close?.();this.closeCodeSheet();this.sharing.openImport()}],
        ['codeMenuBtn','click',()=>this.openCodeSheet()],
        ['codeSheetBackdrop','click',()=>this.closeCodeSheet()],
        ['cancelCodeAction','click',()=>this.closeCodeSheet()],
        ['showCodeAction','click',()=>this.showCode()],
        ['copyCodeAction','click',()=>this.copyCurrentCode()],
        ['hideCodeBtn','click',()=>this.$('codePanel').classList.add('hide')]
      ];
      this.eventNames=['show-builder','standalone-opened','standalone-closed','ticket-saved','ticket-imported','edit-ticket','copy-ticket','share-ticket'];
    }
    start(){if(this.started)return this;this.started=true;for(const [id,type,handler] of this.elementHandlers)this.$(id).addEventListener(type,handler);for(const name of this.eventNames)window.addEventListener(`parlay:${name}`,this.onEvent);window.addEventListener('hashchange',this.onHashChange);this.onHashChange();return this}
    stop(){if(!this.started)return;for(const [id,type,handler] of this.elementHandlers)this.$(id).removeEventListener(type,handler);for(const name of this.eventNames)window.removeEventListener(`parlay:${name}`,this.onEvent);window.removeEventListener('hashchange',this.onHashChange);this.routeVersion++;this.closeTransientUi();this.started=false}
    onHashChange(){void this.route().catch(error=>{this.$('previewStatus').textContent=`Navigation failed: ${error?.message||error}`})}
    async route(){const route=++this.routeVersion,params=new URLSearchParams(location.hash.slice(1));if(params.has('share')){this.viewer.deactivate?.();this.showDashboard(false,{deactivateViewer:false,fromRoute:true});if(route!==this.routeVersion)return false;this.sharing.consumeHash();return true}const opened=await this.viewer.enterFromHash();if(route!==this.routeVersion)return false;if(opened)return true;this.viewer.deactivate?.();this.showDashboard(false,{deactivateViewer:false,fromRoute:true});return false}
    closeTransientUi({preserveShare=false,deactivateViewer=true}={}){this.dashboard.closeOverlays();this.backup.close?.();this.closeCodeSheet();if(!preserveShare)this.sharing.close?.();if(deactivateViewer)this.viewer.deactivate?.()}
    showDashboard(capture=true,{preserveShare=false,deactivateViewer=true,fromRoute=false}={}){if(!fromRoute)this.routeVersion++;this.closeTransientUi({preserveShare,deactivateViewer});if(capture)this.builder.captureDraft();this.$('builderView').classList.add('hide');this.$('standaloneView').classList.add('hide');this.$('dashboardView').classList.remove('hide');this.$('appTabs').classList.remove('hide');this.$('ticketsTab').classList.add('active');this.$('builderTab').classList.remove('active');this.dashboard.render();window.scrollTo({top:0,behavior:'smooth'})}
    showBuilder(){this.routeVersion++;this.closeTransientUi();this.$('builderView').classList.remove('hide');this.$('dashboardView').classList.add('hide');this.$('standaloneView').classList.add('hide');this.$('appTabs').classList.remove('hide');this.$('builderTab').classList.add('active');this.$('ticketsTab').classList.remove('active');window.scrollTo({top:0,behavior:'smooth'})}
    showStandalone(){this.closeTransientUi({deactivateViewer:false});this.$('builderView').classList.add('hide');this.$('dashboardView').classList.add('hide');this.$('standaloneView').classList.remove('hide');this.$('appTabs').classList.add('hide');window.scrollTo({top:0})}
    onEvent(event){
      const name=event.type.replace('parlay:',''),id=event.detail?.id;
      if(name==='show-builder'){this.showBuilder();return}
      if(name==='standalone-opened'){this.showStandalone();return}
      if(name==='standalone-closed'){this.showDashboard(false,{deactivateViewer:false});return}
      if(name==='ticket-saved'||name==='ticket-imported'){this.dashboard.render();if(name==='ticket-imported')this.showDashboard(false);return}
      if(name==='edit-ticket'&&id){void Promise.resolve().then(()=>this.builder.loadRecord(id)).catch(error=>{this.$('previewStatus').textContent=error?.message||String(error)});return}
      if(name==='copy-ticket'&&id){void this.copyText(this.builder.codeForRecord(id),'Ticket code copied.');return}
      if(name==='share-ticket'&&id)void this.sharing.share(id);
    }
    openCodeSheet(){this.dashboard.closeOverlays();this.backup.close?.();this.sharing.close?.();this.$('codeSheet').classList.remove('hide');this.$('codeSheetBackdrop').classList.remove('hide');document.body.classList.add('modalOpen')}
    closeCodeSheet(){this.$('codeSheet')?.classList.add('hide');this.$('codeSheetBackdrop')?.classList.add('hide');const share=this.$('ticketShareModal'),shareOpen=Boolean(share&&!share.classList.contains('hide')),filterOpen=Boolean(document.querySelector?.('.sortFilterPanel')),backupOpen=Boolean(this.$('libraryBackupSheet')&&!this.$('libraryBackupSheet').classList.contains('hide'));if(!shareOpen&&!filterOpen&&!backupOpen)document.body?.classList.remove('modalOpen')}
    showCode(){this.$('output').value=this.builder.currentCode();this.$('codePanel').classList.remove('hide');this.closeCodeSheet();requestAnimationFrame(()=>this.$('codePanel').scrollIntoView({behavior:'smooth',block:'start'}))}
    async copyCurrentCode(){await this.copyText(this.builder.currentCode(),'Ticket code copied.');this.closeCodeSheet()}
    async copyText(text,message){try{if(navigator.clipboard&&window.isSecureContext)await navigator.clipboard.writeText(text);else{const area=document.createElement('textarea');area.value=text;area.style.position='fixed';area.style.opacity='0';document.body.appendChild(area);area.select();document.execCommand('copy');area.remove()}this.$('previewStatus').textContent=message}catch{this.$('previewStatus').textContent='Copy failed.'}}
  }
  window.AppController=AppController;
})();