import { test, expect } from '@playwright/test';

const KEY='parlayTracker.savedTickets.v1';
const ticketA={title:'+250',date:'20260718',type:'sgp',league:'MLB',game:'ATL@STL',legs:[{type:'team_moneyline',team:'ATL',target:1,label:'ATL moneyline'}]};
const ticketB={title:'-110',date:'20260718',type:'straight',league:'MLB',game:'LAD@SF',legs:[{type:'team_moneyline',team:'LAD',target:1,label:'Dodgers moneyline'}]};
const records=[
  {id:'legacy-a',sportsbook:'DraftKings',savedAt:'2026-07-18T15:00:00.000Z',createdAt:'2026-07-18T15:00:00.000Z',customMetadata:{source:'legacy'},canonical:ticketA},
  {id:'legacy-b',sportsbook:'',status:'active',savedAt:'2026-07-18T16:00:00.000Z',createdAt:'2026-07-18T16:00:00.000Z',ticket:ticketB}
];

async function openApp(page,seed=records){
  await page.addInitScript(({key,value})=>localStorage.setItem(key,JSON.stringify(value)),{key:KEY,value:seed});
  await page.goto('/');
  await page.waitForFunction(()=>Boolean(window.parlayApp?.app?.started));
  await page.evaluate(()=>{window.parlayApp.tracker.refresh=async()=>({skipped:true})});
}

function legacyShareCode(ticket){
  return `PT1.${Buffer.from(JSON.stringify({v:1,sportsbook:'DraftKings',ticket})).toString('base64url')}`;
}

async function samePageHash(page,hash){
  await page.evaluate(value=>{location.hash=value},hash);
}

test('legacy saved-ticket records normalize without losing data',async({page})=>{
  await openApp(page);
  const stored=await page.evaluate(key=>JSON.parse(localStorage.getItem(key)),KEY);
  expect(stored).toHaveLength(2);
  expect(stored[0].id).toBe('legacy-a');
  expect(stored[0].ticket).toEqual(ticketA);
  expect(stored[0].canonical).toEqual(ticketA);
  expect(stored[0].status).toBe('active');
  expect(stored[0].customMetadata).toEqual({source:'legacy'});
  expect(stored[1].ticket).toEqual(ticketB);
  expect(stored[1].canonical).toEqual(ticketB);
  await expect(page.locator('[data-ticket-id="legacy-a"] h3')).toHaveText('+250');
  await expect(page.locator('[data-ticket-id="legacy-b"] h3')).toHaveText('-110');
});

test('legacy shared links remain importable and do not restore sportsbook identity',async({page})=>{
  await openApp(page);
  await samePageHash(page,`share=${encodeURIComponent(legacyShareCode(ticketA))}`);
  await expect(page.locator('#ticketShareModal')).toBeVisible();
  await expect(page.locator('#ticketShareTitle')).toHaveText('SHARED TICKET');
  await expect(page.locator('#ticketImportSportsbook')).toHaveValue('');
  await expect(page.locator('.sharePreviewTitle')).toHaveText('+250');
  const packaged=await page.evaluate(()=>{
    const record=window.parlayApp.storage.find('legacy-a');
    const url=window.parlayApp.sharing.shareUrl(record);
    const code=new URL(url).hash.slice('#share='.length);
    const raw=decodeURIComponent(code).slice(4).replace(/-/g,'+').replace(/_/g,'/');
    const binary=atob(raw+'='.repeat((4-raw.length%4)%4));
    return JSON.parse(new TextDecoder().decode(Uint8Array.from(binary,char=>char.charCodeAt(0))));
  });
  expect(packaged.v).toBe(1);
  expect(packaged.ticket).toEqual(ticketA);
  expect(packaged).not.toHaveProperty('sportsbook');
});

test('ticket and active-view links navigate in the same page while remaining real links',async({page})=>{
  await openApp(page);
  const view=page.locator('[data-ticket-id="legacy-a"] .savedActions a');
  const active=page.locator('#viewActiveBtn');
  expect.soft(await view.getAttribute('href')).toBe('#ticket=legacy-a');
  expect.soft(await view.getAttribute('target')).toBeNull();
  expect.soft(await active.getAttribute('href')).toBe('#view=active');
  expect.soft(await active.getAttribute('target')).toBeNull();
  const popupPromise=page.waitForEvent('popup',{timeout:800}).catch(()=>null);
  await view.click();
  const popup=await popupPromise;
  expect.soft(popup).toBeNull();
  if(popup)await popup.close();
  if(!popup)await expect(page.locator('#standaloneView')).toBeVisible();
});

test('adversarial action-menu navigation never leaves or stacks dashboard overlays',async({page})=>{
  await openApp(page);
  await page.locator('[data-ticket-id="legacy-a"] [data-ticket-action="menu"]').click();
  await expect(page.locator('.savedActionsMenu')).toHaveCount(1);
  await samePageHash(page,'ticket=legacy-a');
  await expect(page.locator('#standaloneView')).toBeVisible();
  await expect(page.locator('.savedActionsMenu')).toHaveCount(0);
  await page.locator('[data-view-action="close"]').click();
  await expect(page.locator('#dashboardView')).toBeVisible();
  await page.locator('[data-ticket-id="legacy-b"] [data-ticket-action="menu"]').click();
  await expect(page.locator('.savedActionsMenu')).toHaveCount(1);
  await expect(page.locator('.savedActionsMenu')).toHaveAttribute('data-action-menu-for','legacy-b');
  await samePageHash(page,'ticket=legacy-b');
  await expect(page.locator('#standaloneView')).toBeVisible();
  await expect(page.locator('.savedActionsMenu')).toHaveCount(0);
  await expect(page.locator('body')).not.toHaveClass(/modalOpen/);
});

test('an open ticket view reacts to cross-tab storage edits and deletion',async({page})=>{
  await openApp(page);
  await samePageHash(page,'ticket=legacy-a');
  await expect(page.locator('#standaloneView .title')).toHaveText('+250');
  await page.evaluate(({key})=>{
    const list=JSON.parse(localStorage.getItem(key));
    const record=list.find(item=>item.id==='legacy-a');
    record.ticket.title='+999';record.canonical.title='+999';
    const raw=JSON.stringify(list);localStorage.setItem(key,raw);
    window.dispatchEvent(new StorageEvent('storage',{key,newValue:raw}));
  },{key:KEY});
  await expect.soft(page.locator('#standaloneView .title')).toHaveText('+999');
  await page.evaluate(({key})=>{
    const list=JSON.parse(localStorage.getItem(key)).filter(item=>item.id!=='legacy-a');
    const raw=JSON.stringify(list);localStorage.setItem(key,raw);
    window.dispatchEvent(new StorageEvent('storage',{key,newValue:raw}));
  },{key:KEY});
  await expect.soft(page.locator('#standaloneView .emptyState')).toHaveText('Ticket not found on this device.');
});

test('import modal owns focus, closes with Escape, and restores the trigger',async({page})=>{
  await openApp(page);
  const trigger=page.locator('#importTicketBtn');
  await trigger.click();
  await expect(page.locator('#ticketShareModal')).toBeVisible();
  await expect.soft(page.locator('#ticketShareInput')).toBeFocused();
  await expect(page.locator('body')).toHaveClass(/modalOpen/);
  await page.keyboard.press('Escape');
  await expect(page.locator('#ticketShareModal')).toBeHidden();
  await expect(page.locator('body')).not.toHaveClass(/modalOpen/);
  await expect.soft(trigger).toBeFocused();
});

test('phone and tablet layouts contain dashboard controls and overlays horizontally',async({page})=>{
  await openApp(page);
  const horizontalViolations=async selector=>page.evaluate(sel=>{
    const width=document.documentElement.clientWidth;
    return [...document.querySelectorAll(sel)].filter(node=>{
      const style=getComputedStyle(node),rect=node.getBoundingClientRect();
      return style.display!=='none'&&style.visibility!=='hidden'&&rect.width>0&&(rect.left<-.5||rect.right>width+.5);
    }).map(node=>({tag:node.tagName,id:node.id,className:node.className,left:node.getBoundingClientRect().left,right:node.getBoundingClientRect().right,width}));
  },selector);
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=document.documentElement.clientWidth+1)).toBe(true);
  expect(await horizontalViolations('header,main,nav,button,a,input,select,textarea,.savedTicket')).toEqual([]);
  await page.locator('[data-ticket-id="legacy-a"] [data-ticket-action="menu"]').click();
  expect(await horizontalViolations('.savedActionsMenu,.savedActionsMenu button')).toEqual([]);
  await page.keyboard.press('Escape');
  await page.locator('[data-dashboard-action="sort-filter"]').click();
  expect(await horizontalViolations('.sortFilterPanel,.sortFilterPanel select,.sortFilterPanel button')).toEqual([]);
  await page.keyboard.press('Escape');
});
