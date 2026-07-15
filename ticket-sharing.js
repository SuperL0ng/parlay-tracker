/* TICKET_SHARING_V43 */
(() => {
  'use strict';

  const KEY='parlayTracker.savedTickets.v1';
  const SHARE_PREFIX='PT1.';
  const clean=v=>String(v??'').trim();
  const clone=v=>JSON.parse(JSON.stringify(v));
  const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));

  function load(){try{const x=JSON.parse(localStorage.getItem(KEY)||'[]');return Array.isArray(x)?x:[]}catch{return[]}}
  function store(x){localStorage.setItem(KEY,JSON.stringify(x))}
  function makeId(){return globalThis.crypto?.randomUUID?.()||('ticket-'+Date.now()+'-'+Math.random().toString(36).slice(2,8))}

  class TicketParser{
    constructor(text){
      this.s=String(text??'').replace(/[“”]/g,'"').replace(/[‘’]/g,"'");
      this.i=0;
    }
    error(message){throw new Error(`${message} near character ${this.i+1}`)}
    ws(){while(this.i<this.s.length&&/\s/.test(this.s[this.i]))this.i++}
    peek(){this.ws();return this.s[this.i]}
    take(ch){this.ws();if(this.s[this.i]!==ch)this.error(`Expected ${ch}`);this.i++}
    parse(){
      this.ws();
      const value=this.value();
      this.ws();
      if(this.s[this.i]===','){this.i++;this.ws()}
      if(this.i!==this.s.length)this.error('Unexpected text');
      return value;
    }
    value(){
      this.ws();
      const c=this.s[this.i];
      if(c==='{')return this.object();
      if(c==='[')return this.array();
      if(c==='"'||c==="'")return this.string();
      if(c==='-'||/[0-9]/.test(c||''))return this.number();
      const word=this.identifier();
      if(word==='true')return true;
      if(word==='false')return false;
      if(word==='null')return null;
      this.error(`Unsupported value ${word||''}`);
    }
    identifier(){
      this.ws();
      const m=this.s.slice(this.i).match(/^[A-Za-z_$][A-Za-z0-9_$]*/);
      if(!m)return'';
      this.i+=m[0].length;
      return m[0];
    }
    key(){
      this.ws();
      const c=this.s[this.i];
      if(c==='"'||c==="'")return this.string();
      const id=this.identifier();
      if(!id)this.error('Expected property name');
      return id;
    }
    string(){
      this.ws();
      const q=this.s[this.i++];
      let out='';
      while(this.i<this.s.length){
        const c=this.s[this.i++];
        if(c===q)return out;
        if(c==='\\'){
          if(this.i>=this.s.length)this.error('Unfinished escape');
          const e=this.s[this.i++];
          const map={n:'\n',r:'\r',t:'\t',b:'\b',f:'\f',v:'\v','0':'\0'};
          if(e==='u'){
            const hex=this.s.slice(this.i,this.i+4);
            if(!/^[0-9a-fA-F]{4}$/.test(hex))this.error('Invalid Unicode escape');
            out+=String.fromCharCode(parseInt(hex,16));this.i+=4;
          }else if(e==='x'){
            const hex=this.s.slice(this.i,this.i+2);
            if(!/^[0-9a-fA-F]{2}$/.test(hex))this.error('Invalid hex escape');
            out+=String.fromCharCode(parseInt(hex,16));this.i+=2;
          }else out+=Object.prototype.hasOwnProperty.call(map,e)?map[e]:e;
        }else out+=c;
      }
      this.error('Unterminated string');
    }
    number(){
      this.ws();
      const m=this.s.slice(this.i).match(/^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:[eE][+-]?\d+)?/);
      if(!m)this.error('Invalid number');
      this.i+=m[0].length;
      return Number(m[0]);
    }
    object(){
      const out={};this.take('{');this.ws();
      if(this.peek()==='}'){this.i++;return out}
      while(true){
        const k=this.key();this.take(':');out[k]=this.value();this.ws();
        if(this.s[this.i]==='}'){this.i++;return out}
        if(this.s[this.i]!==',')this.error('Expected comma or }');
        this.i++;this.ws();
        if(this.s[this.i]==='}'){this.i++;return out}
      }
    }
    array(){
      const out=[];this.take('[');this.ws();
      if(this.peek()===']'){this.i++;return out}
      while(true){
        out.push(this.value());this.ws();
        if(this.s[this.i]===']'){this.i++;return out}
        if(this.s[this.i]!==',')this.error('Expected comma or ]');
        this.i++;this.ws();
        if(this.s[this.i]===']'){this.i++;return out}
      }
    }
  }

  function parseScriptableCode(text){
    let value=new TicketParser(text).parse();
    if(Array.isArray(value)){
      const tickets=value.filter(Boolean);
      if(tickets.length!==1)throw new Error('Paste exactly one ticket at a time.');
      value=tickets[0];
    }
    if(!value||typeof value!=='object'||Array.isArray(value))throw new Error('The code must contain one ticket object.');
    if(!clean(value.title))throw new Error('Ticket title/odds are missing.');
    if(!clean(value.date))throw new Error('Ticket date is missing.');
    if(!clean(value.type))throw new Error('Ticket type is missing.');
    if(!Array.isArray(value.legs)||!value.legs.length)throw new Error('Ticket legs are missing.');
    return clone(value);
  }

  function bytesToB64(bytes){
    let binary='';
    for(let i=0;i<bytes.length;i+=0x8000)binary+=String.fromCharCode(...bytes.subarray(i,i+0x8000));
    return btoa(binary).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
  }
  function b64ToBytes(text){
    const base=text.replace(/-/g,'+').replace(/_/g,'/');
    const binary=atob(base+'='.repeat((4-base.length%4)%4));
    return Uint8Array.from(binary,c=>c.charCodeAt(0));
  }
  function encodePackage(pkg){return SHARE_PREFIX+bytesToB64(new TextEncoder().encode(JSON.stringify(pkg)))}
  function decodePackage(code){
    const raw=clean(code);
    if(!raw.startsWith(SHARE_PREFIX))throw new Error('Unsupported share-code version.');
    const pkg=JSON.parse(new TextDecoder().decode(b64ToBytes(raw.slice(SHARE_PREFIX.length))));
    if(pkg?.v!==1||!pkg.ticket)throw new Error('Invalid shared ticket.');
    return {sportsbook:clean(pkg.sportsbook)||'Other',ticket:parseScriptableCode(JSON.stringify(pkg.ticket))};
  }
  function shareUrl(record){
    const pkg={v:1,sportsbook:record.sportsbook||'Other',ticket:clone(record.canonical||record.ticket)};
    return location.href.split('#')[0]+'#share='+encodeURIComponent(encodePackage(pkg));
  }

  function addCss(){
    if(document.getElementById('ticketSharingCss'))return;
    const style=document.createElement('style');style.id='ticketSharingCss';style.textContent=`
      .shareModalBackdrop{position:fixed;inset:0;z-index:180;background:rgba(7,11,17,.58);backdrop-filter:blur(3px);-webkit-backdrop-filter:blur(3px)}
      .shareModal{position:fixed;z-index:190;left:12px;right:12px;top:50%;transform:translateY(-50%);max-width:620px;margin:auto;max-height:88vh;overflow:auto;padding:15px;border-radius:14px;border:1px solid rgba(255,255,255,.88);background:linear-gradient(180deg,#f7f9fc,#cbd3de 66%,#9ca7b6);box-shadow:0 18px 45px rgba(0,0,0,.38)}
      .shareModal h2{margin:0 0 5px;font-size:16px;letter-spacing:.08em}.shareModal p{margin:0 0 10px;color:#596372;font-size:12px;line-height:1.4}
      .shareModal textarea{min-height:210px;white-space:pre-wrap}.sharePreview{margin:11px 0;padding:11px;border-radius:10px;background:rgba(255,255,255,.62);box-shadow:inset 0 1px 4px rgba(0,0,0,.15)}
      .sharePreviewTop{display:flex;justify-content:space-between;gap:8px;align-items:center}.sharePreviewTitle{font-size:18px;font-weight:900}.sharePreviewMeta{margin:7px 0;color:#637080;font-size:11px;text-transform:uppercase}.sharePreviewLeg{padding:7px 0;border-top:1px solid rgba(0,0,0,.09);font-size:12px}
      .shareModalActions{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:12px}.shareModalStatus{min-height:18px;margin-top:8px;font-size:12px;font-weight:800;color:#8b3200;white-space:pre-line}
      .dashboardImportBtn{white-space:nowrap}
      body.ticketShareModalOpen{overflow:hidden}
    `;document.head.appendChild(style);
  }

  function ensureModal(){
    addCss();
    if(document.getElementById('ticketShareBackdrop'))return;
    const wrap=document.createElement('div');wrap.innerHTML=`
      <div id="ticketShareBackdrop" class="shareModalBackdrop hide"></div>
      <section id="ticketShareModal" class="shareModal hide" role="dialog" aria-modal="true" aria-labelledby="ticketShareTitle">
        <h2 id="ticketShareTitle">IMPORT TICKET CODE</h2>
        <p id="ticketShareHelp">Paste the same ticket object used by the Scriptable trackers.</p>
        <textarea id="ticketShareInput" spellcheck="false" autocapitalize="off" autocomplete="off" placeholder='{title:"+870",date:"20260711",type:"sgp",game:"ATL@STL",legs:[...]}'></textarea>
        <div id="ticketSharePreview" class="sharePreview hide"></div>
        <div id="ticketShareStatus" class="shareModalStatus"></div>
        <div class="shareModalActions">
          <button id="ticketSharePrimary" type="button">Preview Ticket</button>
          <button id="ticketShareCancel" class="ghost" type="button">Cancel</button>
        </div>
      </section>`;
    document.body.append(...wrap.children);
    document.getElementById('ticketShareBackdrop').addEventListener('click',closeModal);
    document.getElementById('ticketShareCancel').addEventListener('click',closeModal);
    document.getElementById('ticketSharePrimary').addEventListener('click',primaryAction);
  }

  let pending=null;
  function openModal(ticketPackage=null){
    ensureModal();pending=null;
    const title=document.getElementById('ticketShareTitle'),help=document.getElementById('ticketShareHelp'),input=document.getElementById('ticketShareInput'),preview=document.getElementById('ticketSharePreview'),status=document.getElementById('ticketShareStatus'),primary=document.getElementById('ticketSharePrimary');
    title.textContent=ticketPackage?'SHARED TICKET':'IMPORT TICKET CODE';
    help.textContent=ticketPackage?'Review the shared ticket before saving it to this device.':'Paste the same ticket object used by the Scriptable trackers.';
    input.value='';input.classList.toggle('hide',Boolean(ticketPackage));preview.classList.add('hide');preview.innerHTML='';status.textContent='';primary.textContent=ticketPackage?'Save Ticket':'Preview Ticket';
    if(ticketPackage){pending=ticketPackage;showPreview(ticketPackage)}
    document.getElementById('ticketShareBackdrop').classList.remove('hide');document.getElementById('ticketShareModal').classList.remove('hide');document.body.classList.add('ticketShareModalOpen');
    if(!ticketPackage)setTimeout(()=>input.focus(),50);
  }
  function closeModal(){
    document.getElementById('ticketShareBackdrop')?.classList.add('hide');document.getElementById('ticketShareModal')?.classList.add('hide');document.body.classList.remove('ticketShareModalOpen');pending=null;
  }
  function showPreview(pkg){
    const t=pkg.ticket||{},box=document.getElementById('ticketSharePreview');
    box.innerHTML=`<div class="sharePreviewTop"><span class="bookBadge">${esc(pkg.sportsbook||'Other')}</span><span class="sharePreviewTitle">${esc(t.title||'Untitled')}</span></div><div class="sharePreviewMeta">${esc([t.type?.toUpperCase(),t.game,t.date,`${t.legs?.length||0} legs`].filter(Boolean).join(' · '))}</div>${(t.legs||[]).map(l=>`<div class="sharePreviewLeg">${esc(l.label||l.type||'Untitled leg')}</div>`).join('')}`;
    box.classList.remove('hide');document.getElementById('ticketSharePrimary').textContent='Save Ticket';
  }
  function parseInput(){
    const text=clean(document.getElementById('ticketShareInput').value);
    const selectedSportsbook=clean(document.getElementById('ticketImportSportsbook')?.value);
    if(!text)throw new Error('Paste a ticket code first.');
    if(text.startsWith('http://')||text.startsWith('https://')){
      const u=new URL(text),p=new URLSearchParams(u.hash.slice(1)),code=p.get('share');
      if(!code)throw new Error('That link does not contain a shared ticket.');
      const pkg=decodePackage(code);
      if(selectedSportsbook)pkg.sportsbook=selectedSportsbook;
      return pkg;
    }
    if(text.startsWith(SHARE_PREFIX)){
      const pkg=decodePackage(text);
      if(selectedSportsbook)pkg.sportsbook=selectedSportsbook;
      return pkg;
    }
    return {sportsbook:selectedSportsbook||'Other',ticket:parseScriptableCode(text)};
  }
  function primaryAction(){
    const status=document.getElementById('ticketShareStatus');status.textContent='';
    try{
      if(!pending){pending=parseInput();showPreview(pending);return}
      const now=new Date().toISOString(),ticket=clone(pending.ticket),record={id:makeId(),sportsbook:pending.sportsbook||'Other',status:'active',createdAt:now,updatedAt:now,ticket,canonical:clone(ticket)};
      const list=load();list.push(record);store(list);closeModal();
      if(typeof window.renderTicketDashboard==='function')window.renderTicketDashboard();
      if(typeof window.showDashboard==='function')window.showDashboard();
      alert('Ticket saved to My Tickets.');
    }catch(e){status.textContent=e?.message||String(e)}
  }

  async function shareTicket(id){
    const record=load().find(r=>r.id===id);if(!record)return;
    const url=shareUrl(record),title=`${record.sportsbook||'Parlay Tracker'} ${record.ticket?.title||'Ticket'}`,text=`${title}\nOpen this ticket in Parlay Tracker:`;
    try{
      if(navigator.share){await navigator.share({title,text,url});return}
      await navigator.clipboard.writeText(url);alert('Share link copied.');
    }catch(e){if(e?.name!=='AbortError'){try{await navigator.clipboard.writeText(url);alert('Share link copied.')}catch{alert(url)}}}
  }

  function decorateDashboard(){
    let shareAdded=false;
    const actions=document.querySelector('.dashboardActions');
    if(actions&&!document.getElementById('importTicketCodeBtn')){
      const b=document.createElement('button');b.id='importTicketCodeBtn';b.type='button';b.className='ghost dashboardImportBtn';b.textContent='Import Code';b.addEventListener('click',()=>openModal());actions.insertBefore(b,actions.firstChild);
    }
    document.querySelectorAll('.savedTicket').forEach((card,index)=>{
      const record=load()[index],actionsBox=card.querySelector('.savedActions');
      if(!record||!actionsBox||actionsBox.querySelector('.shareTicketBtn'))return;
      const b=document.createElement('button');b.type='button';b.className='ghost shareTicketBtn';b.textContent='Share';b.addEventListener('click',()=>shareTicket(record.id));
      const copy=[...actionsBox.querySelectorAll('button')].find(x=>/copy code/i.test(x.textContent));
      if(copy)copy.insertAdjacentElement('afterend',b);else actionsBox.appendChild(b);
      shareAdded=true;
    });
    if(shareAdded)document.dispatchEvent(new Event('parlay:dashboard-refreshed'));
  }

  function installDashboardHook(){
    const original=window.renderTicketDashboard;
    if(typeof original==='function'&&!original.__sharingWrapped){
      const wrapped=function(...args){const out=original.apply(this,args);requestAnimationFrame(decorateDashboard);return out};
      wrapped.__sharingWrapped=true;window.renderTicketDashboard=wrapped;
    }
    decorateDashboard();
  }

  function consumeShareHash(){
    const params=new URLSearchParams(location.hash.slice(1)),code=params.get('share');if(!code)return;
    try{
      const pkg=decodePackage(code);
      history.replaceState(null,'',location.href.split('#')[0]);
      setTimeout(()=>openModal(pkg),80);
    }catch(e){history.replaceState(null,'',location.href.split('#')[0]);setTimeout(()=>{openModal();document.getElementById('ticketShareStatus').textContent=e?.message||String(e)},80)}
  }

  window.openTicketCodeImport=()=>openModal();
  window.shareSavedTicket=shareTicket;
  function start(){ensureModal();installDashboardHook();consumeShareHash()}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',start,{once:true});else start();
  window.addEventListener('load',()=>{installDashboardHook();consumeShareHash()});
  window.addEventListener('hashchange',consumeShareHash);
})();
