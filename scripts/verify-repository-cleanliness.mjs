#!/usr/bin/env node
import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { readFileSync, readdirSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(...parts)=>readFileSync(join(root,...parts),'utf8');
const tracked=execFileSync('git',['ls-files'],{cwd:root,encoding:'utf8'}).trim().split(/\r?\n/).filter(Boolean);
const config=JSON.parse(read('app','config','builds.json'));
const assets=new Set();
for(const build of Object.values(config)){
  for(const value of [build.icon,build.touchIcon,build.shareImage,build.logo,...(build.extraAssets||[]),...(build.manifestIcons||[]).map(icon=>icon.src)])assets.add(value);
}
const allowedRoot=new Set(['.gitignore','README.md','package.json','package-lock.json','playwright.config.mjs',...assets]);
const allowedTrees=['app/','architecture/','docs/','scripts/','tests/'];
for(const path of tracked){
  if(!path.includes('/'))assert.ok(allowedRoot.has(path),'Unexpected tracked root file: '+path);
  else assert.ok(allowedTrees.some(prefix=>path.startsWith(prefix)),'Unexpected tracked tree: '+path);
}
assert.deepEqual(tracked.filter(path=>!path.includes('/')).sort(),[...allowedRoot].sort(),'Tracked root must contain only canonical metadata and required build assets');
assert.equal(tracked.some(path=>path.startsWith('.github/')),false,'Historical GitHub patch or verification machinery remains tracked');
assert.equal(tracked.some(path=>path.startsWith('png-icon-control/')),false,'Historical icon test deployment remains tracked');
const bannedNames=['show-legs-label-fix.js','ticket-dashboard-details-v54.js','dashboard-layout-v56.js','dashboard-refresh-v58.js','dashboard-polish-v63.js','dashboard-more-actions-v64.js','dashboard-sort-filter-v78.js','mlb-live-loader.js','navigation-links-v24.js','ticket-sharing.js','library-backup.js','test-doubleheader-game-binding.mjs','test-ticket-id-binding-regression.mjs','verify-hosting-contract.mjs'];
for(const name of bannedNames)assert.equal(tracked.some(path=>path.endsWith(name)),false,'Retired file remains tracked: '+name);
const template=read('app','src','index.template.html');
const scriptRefs=[...template.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(match=>match[1]);
const styleRefs=[...template.matchAll(/<link\s+rel="stylesheet"\s+href="\.\/([^"]+)"/g)].map(match=>match[1]);
const scriptFiles=readdirSync(join(root,'app','src','scripts')).filter(name=>name.endsWith('.js')).sort();
assert.deepEqual([...scriptRefs].sort(),scriptFiles,'Every canonical script must be referenced exactly once and no extra runtime script may exist');
assert.equal(new Set(scriptRefs).size,scriptRefs.length,'Canonical template contains a duplicate script reference');
assert.deepEqual(styleRefs.sort(),['app.css','dashboard.css','theme.css'].sort(),'Canonical template stylesheet set changed');
assert.deepEqual(readdirSync(join(root,'app','src','styles')).filter(name=>name.endsWith('.css')).sort(),['app.css','dashboard.css'],'Exactly one application stylesheet and one dashboard stylesheet must exist');
const source=[template,...scriptFiles.map(name=>read('app','src','scripts',name)),read('app','src','styles','app.css'),read('app','src','styles','dashboard.css')].join('\n');
for(const needle of ['document.write(','document.open(','MutationObserver','renderTicketDashboard','show-legs-label-fix.js','raw.githubusercontent.com/SuperL0ng/parlay-tracker/'])assert.equal(source.includes(needle),false,'Forbidden canonical runtime dependency: '+needle);
const packageData=JSON.parse(read('package.json'));
assert.equal(packageData.scripts['verify:cleanliness'],'node scripts/verify-repository-cleanliness.mjs','Repository cleanliness verifier must remain permanent');
assert.ok(packageData.scripts.test.includes('npm run verify:cleanliness'),'Integrated test pipeline must enforce repository cleanliness');
console.log('Repository cleanliness verification passed.');
