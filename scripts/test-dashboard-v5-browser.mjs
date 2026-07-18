import assert from 'node:assert/strict';
import fs from 'node:fs';
import {JSDOM} from 'jsdom';

const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const visible=['1043','1969','2000','1718'];
const stale=['2000','1718','1043','1969'];
const labels={
  '1043':'TB Game 1 Leg',
  '1969':'NYM at PHI Leg',
  '2000':'TEX at ATL DraftKings Leg',
  '1718':'TEX at ATL FanDuel Leg'
};
const cards=visible.map((id,index)=>`<article class="savedTicket" data-ticket-id="${stale[index]}">
  <div class="savedTicketTop"><a class="savedActionView" href="#ticket=${id}">Open Ticket</a></div>
  <button class="ticketExpandBtn" aria-expanded="false">Show Legs</button>
  <input class="ticketSelectBox" type="checkbox">
  <div class="savedTicketDetails hide"></div>
</article>`).join('');
const html=`<!doctype html><body class="ticketSelectMode">
  <button id="ticketsTab">My Tickets</button>
  <button id="toggleAllTicketsBtn">Expand All</button>
  <button id="ticketSelectModeBtn">Cancel</button>
  <button id="deleteSelectedTicketsBtn">Delete Selected</button>
  <section id="ticketList">${cards}</section>
  <section id="standaloneView">
    <article class="liveTicketCard" data-ticket-id="2000"><span class="ticketOutcome">TICKET LIVE</span></article>
    <article class="liveTicketCard" data-ticket-id="1718"><span class="ticketOutcome">TICKET LIVE</span></article>
  </section>
</body>`;
const dom=new JSDOM(html,{url:'https://simonsports.bet/#view=active',runScripts:'outside-only',pretendToBeVisual:true});
const {window}=dom;
window.matchMedia=()=>({matches:false,addEventListener(){},removeEventListener(){}});
window.confirm=()=>true;
window.esc=value=>String(value??'');
window.ParlayTrackerCore={statusObj:(state,value)=>({state,value}),baseGameMeta:()=>'',legGame:(ticket,leg)=>leg.game||ticket.game||''};
window.ParlayTrackerSources={resetTrackingCaches(){},async fetchScoreboards(){return[]}};
window.ParlayTrackerEvaluator={async evaluateRecord(record){return {...record,__evaluated:(record.ticket.legs||[]).map(leg=>({...leg,__live:{state:'live',value:leg.label,valueClass:'valuePending'}}))}};
const records=[
  {id:'2000',status:'active',ticket:{type:'sgp',legs:[{label:labels['2000']}]}},
  {id:'1718',status:'active',ticket:{type:'sgp',legs:[{label:labels['1718']}]}},
  {id:'1043',status:'completed',settledAt:'2026-07-17T19:54:00Z',ticket:{type:'sgp',legs:[{label:labels['1043']}]}},
  {id:'1969',status:'completed',settledAt:'2026-07-17T00:49:00Z',ticket:{type:'sgp',legs:[{label:labels['1969']}]}}
];
window.localStorage.setItem('parlayTracker.savedTickets.v1',JSON.stringify(records));
window.loadSavedTickets=()=>JSON.parse(window.localStorage.getItem('parlayTracker.savedTickets.v1')||'[]');
window.storeSavedTickets=list=>window.localStorage.setItem('parlayTracker.savedTickets.v1',JSON.stringify(list));
window.renderTicketDashboard=()=>{};
window.document.getElementById('ticketSelectModeBtn').addEventListener('click',()=>window.document.body.classList.toggle('ticketSelectMode'));

window.eval(fs.readFileSync('/tmp/simonsports-bet/binding.js','utf8'));
window.document.dispatchEvent(new window.Event('DOMContentLoaded',{bubbles:true}));
await sleep(350);

const rendered=[...window.document.querySelectorAll('#ticketList .savedTicket')];
assert.deepEqual(rendered.map(card=>card.dataset.ticketId),visible,'cards must recover their visible ticket IDs');

rendered[0].querySelector('.ticketExpandBtn').click();
await sleep(50);
assert.match(rendered[0].querySelector('.savedTicketDetails').textContent,/TB Game 1 Leg/);
assert.doesNotMatch(rendered[0].querySelector('.savedTicketDetails').textContent,/TEX at ATL DraftKings Leg/);
rendered[0].querySelector('.ticketExpandBtn').click();
await sleep(30);
assert.equal(rendered[0].querySelector('.savedTicketDetails').classList.contains('hide'),true,'individual collapse should close the tested card');

window.document.getElementById('toggleAllTicketsBtn').click();
await sleep(100);
for(const [index,card] of rendered.entries()){
  assert.equal(card.querySelector('.savedTicketDetails').classList.contains('hide'),false,`card ${visible[index]} should be expanded`);
  assert.match(card.querySelector('.savedTicketDetails').textContent,new RegExp(labels[visible[index]]));
}

const activeCards=[...window.document.querySelectorAll('#standaloneView .liveTicketCard')];
const wrong=window.document.createElement('span');wrong.className='settlementStamp';wrong.textContent='Settled wrong completed ticket';activeCards[0].appendChild(wrong);
await sleep(350);
assert.equal(activeCards[0].querySelector('.settlementStamp'),null,'active ticket must not inherit completed-ticket settlement time');
assert.equal(activeCards[1].querySelector('.settlementStamp'),null,'second active ticket must not inherit completed-ticket settlement time');

const target=rendered[0].querySelector('.ticketSelectBox');
target.checked=true;target.dispatchEvent(new window.Event('change',{bubbles:true}));
window.document.getElementById('deleteSelectedTicketsBtn').click();
await sleep(30);
const remaining=window.loadSavedTickets().map(record=>record.id);
assert.equal(remaining.includes('1043'),false,'selected visible +1043 ticket must be deleted');
assert.equal(remaining.includes('2000'),true,'storage-index +2000 ticket must not be deleted');
assert.equal(window.document.body.classList.contains('ticketSelectMode'),false,'delete must exit Select mode');

console.log('Four-ticket dashboard behavior regression passed.');
