import { readFile, readdir } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const sourceRoot=path.join(root,'app/src');
const sourceHtml=await readFile(path.join(sourceRoot,'index.template.html'),'utf8');
const sourceFiles=(await readdir(path.join(sourceRoot,'scripts'))).filter(name=>name.endsWith('.js')).sort();
const sourceText=(await Promise.all(sourceFiles.map(name=>readFile(path.join(sourceRoot,'scripts',name),'utf8')))).join('\n');
const forbidden=['show-legs-label-fix.js','ticket-dashboard-details-v54.js','dashboard-layout-v56.js','dashboard-refresh-v58.js','dashboard-polish-v63.js','dashboard-more-actions-v64.js','dashboard-sort-filter-v78.js','document.write(','document.open(','raw.githubusercontent.com/SuperL0ng/parlay-tracker/','MutationObserver','__sharingWrapped','__doubleheaderWrapped','installDashboardHook','installDashboardOverrides','scheduleScan','decorateDashboard','repairDashboard'];
for(const needle of forbidden)if(`${sourceHtml}\n${sourceText}`.includes(needle))throw new Error(`Forbidden architecture dependency: ${needle}`);
if(sourceFiles.filter(name=>name==='dashboard-controller.js').length!==1)throw new Error('Source dashboard controller count is not one.');
if((sourceHtml.match(/dashboard-controller\.js/g)||[]).length!==1)throw new Error('HTML dashboard controller reference count is not one.');
if((sourceHtml.match(/dashboard\.css/g)||[]).length!==1)throw new Error('HTML dashboard stylesheet reference count is not one.');
if(!sourceText.includes('parlayTracker.savedTickets.v1'))throw new Error('localStorage key changed.');
if(!sourceText.includes('recordsForRender()'))throw new Error('Sort-before-render owner missing.');
if(!sourceText.includes('article.dataset.ticketId=id'))throw new Error('Stable dashboard ticket ID binding missing.');
if(!sourceText.includes('this.storage.find(id)'))throw new Error('Stable ticket lookup by ID missing.');
if(!sourceText.includes('ParlaySettlementService'))throw new Error('Settlement service missing.');
if(!sourceText.includes('SharingController'))throw new Error('Sharing controller missing.');
if(sourceText.includes('{v:1,sportsbook'))throw new Error('Shared packages must not include sportsbook.');
const builds=['gold','silver'];
for(const build of builds){const directory=path.join(root,'build',build),html=await readFile(path.join(directory,'index.html'),'utf8'),scripts=[...html.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(match=>match[1]),styles=[...html.matchAll(/<link\s+rel="stylesheet"\s+href="\.\/([^"]+)"/g)].map(match=>match[1]);if(scripts.filter(name=>name==='dashboard-controller.js').length!==1)throw new Error(`${build}: dashboard controller count is not one.`);if(styles.filter(name=>name==='dashboard.css').length!==1)throw new Error(`${build}: dashboard stylesheet count is not one.`);for(const needle of forbidden)if(html.includes(needle))throw new Error(`${build}: forbidden dependency ${needle}`)}
const generatedScripts=[...sourceHtml.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(match=>match[1]);
for(const name of generatedScripts){const gold=await readFile(path.join(root,'build/gold',name),'utf8'),silver=await readFile(path.join(root,'build/silver',name),'utf8');if(gold!==silver)throw new Error(`Gold and silver ${name} differ.`)}
for(const name of ['app.css','dashboard.css']){const gold=await readFile(path.join(root,'build/gold',name),'utf8'),silver=await readFile(path.join(root,'build/silver',name),'utf8');if(gold!==silver)throw new Error(`Gold and silver ${name} differ.`)}
console.log('Architecture verification passed.');
