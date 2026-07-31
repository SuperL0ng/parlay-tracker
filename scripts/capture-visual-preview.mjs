import { chromium } from '@playwright/test';
import { spawn } from 'node:child_process';
import { mkdir } from 'node:fs/promises';

const PORT=4181;
const baseURL=`http://127.0.0.1:${PORT}`;
const output='visual-preview';
const tickets=[
  {
    id:'preview-won',status:'completed',sportsbook:'DraftKings',savedAt:'2026-07-18T18:30:00Z',settledAt:'2026-07-18T21:44:00Z',liveOutcome:'PENDING',
    ticket:{title:'+735',type:'sgp',league:'MLB',game:'TEX@ATL',legs:[
      {label:'Jim Jarvis 1+ H',player:'Jim Jarvis',target:1},{label:'Brewer Hicklen 1+ H',player:'Brewer Hicklen',target:1},
      {label:'Matt Olson 2+ H+BB+SB',player:'Matt Olson',target:2},{label:'Michael Harris II 2+ H+R+RBI',player:'Michael Harris II',target:2}
    ]},
    legSettlements:[
      {index:0,status:'WIN',actualValue:2},{index:1,status:'WIN',actualValue:1},
      {index:2,status:'WIN',actualValue:4},{index:3,status:'WIN',actualValue:6}
    ]
  },
  {
    id:'preview-live',status:'active',sportsbook:'FanDuel',savedAt:'2026-07-19T17:05:00Z',liveOutcome:'LIVE',
    ticket:{title:'+410',type:'parlay',league:'MLB',legs:[
      {label:'ATL Moneyline',game:'ATL@STL',team:'ATL'},{label:'LAD +1.5',game:'LAD@SF',team:'LAD'}
    ]},
    trackerSnapshot:{outcome:'LIVE',updatedAt:'2026-07-19T19:40:00Z',legs:[
      {label:'ATL Moneyline',game:'ATL@STL',team:'ATL',state:'live',value:'3-2',actualValue:'3-2',valueClass:'valueAhead1',gameMeta:'↑ 7th ●●'},
      {label:'LAD +1.5',game:'LAD@SF',team:'LAD',state:'pending',value:'',actualValue:'',valueClass:'valuePending',gameMeta:'7:10PM CT'}
    ]}
  },
  {
    id:'preview-straight',status:'active',sportsbook:'BetMGM',savedAt:'2026-07-20T01:12:00Z',liveOutcome:'PENDING',
    ticket:{title:'-110',type:'straight',league:'MLB',game:'TB@BOS',legs:[{label:'Rays +1.5',game:'TB@BOS',team:'TB'}]}
  }
];

await mkdir(output,{recursive:true});
const server=spawn('python3',['-m','http.server',String(PORT),'--directory','build/gold'],{stdio:'ignore'});
const stop=()=>{if(!server.killed)server.kill('SIGTERM')};
process.on('exit',stop);process.on('SIGINT',()=>{stop();process.exit(130)});

try{
  await new Promise((resolve,reject)=>{const deadline=Date.now()+15000;const check=async()=>{try{const response=await fetch(baseURL);if(response.ok)return resolve()}catch{}if(Date.now()>deadline)return reject(new Error('Preview server did not start'));setTimeout(check,200)};check()});
  const browser=await chromium.launch();
  const context=await browser.newContext({viewport:{width:390,height:844},deviceScaleFactor:1});
  const page=await context.newPage();
  await page.addInitScript(records=>localStorage.setItem('parlayTracker.savedTickets.v1',JSON.stringify(records)),tickets);
  await page.goto(baseURL,{waitUntil:'networkidle'});
  const collapsedVisible=await page.locator('.ticketDetails').evaluateAll(nodes=>nodes.filter(node=>getComputedStyle(node).display!=='none').length);
  if(collapsedVisible!==0)throw new Error(`Collapsed preview exposed ${collapsedVisible} ticket detail panel(s)`);
  await page.screenshot({path:`${output}/01-dashboard-collapsed.png`,fullPage:true});
  await page.getByRole('button',{name:'Expand All'}).click();
  const expandedVisible=await page.locator('.ticketDetails').evaluateAll(nodes=>nodes.filter(node=>getComputedStyle(node).display!=='none').length);
  if(expandedVisible!==tickets.length)throw new Error(`Expand All exposed ${expandedVisible} of ${tickets.length} ticket detail panels`);
  await page.screenshot({path:`${output}/02-dashboard-expanded.png`,fullPage:true});
  await page.getByRole('button',{name:'Select'}).click();
  const selectionVisible=await page.locator('.ticketDetails').evaluateAll(nodes=>nodes.filter(node=>getComputedStyle(node).display!=='none').length);
  if(selectionVisible!==0)throw new Error(`Selection mode exposed ${selectionVisible} ticket detail panel(s)`);
  await page.screenshot({path:`${output}/03-dashboard-selection.png`,fullPage:true});
  await page.getByRole('button',{name:'Cancel'}).click();
  await page.locator('a[href="#ticket=preview-won"]').click();
  await page.waitForTimeout(250);
  await page.screenshot({path:`${output}/04-ticket-view-won.png`,fullPage:true});
  await browser.close();
} finally {stop()}

console.log('Captured controlled Gold visual preview.');
