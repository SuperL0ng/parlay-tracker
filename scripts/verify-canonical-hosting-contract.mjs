#!/usr/bin/env node
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const read=(...parts)=>readFileSync(join(root,...parts),'utf8');
const config=JSON.parse(read('app','config','builds.json'));
const template=read('app','src','index.template.html');
const scripts=[...template.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(match=>match[1]);
const sharedStyles=['app.css','dashboard.css'];
const forbidden=[
  'raw.githubusercontent.com/SuperL0ng/parlay-tracker/',
  'document.write(',
  'document.open(',
  'show-legs-label-fix.js',
  'ticket-dashboard-details-v54.js',
  'dashboard-layout-v56.js',
  'dashboard-refresh-v58.js',
  'dashboard-polish-v63.js',
  'dashboard-more-actions-v64.js',
  'dashboard-sort-filter-v78.js'
];

assert.deepEqual(Object.keys(config).sort(),['gold','silver'],'Exactly gold and silver builds must be configured');
for(const [name,build] of Object.entries(config)){
  const directory=join(root,'build',name);
  const index=read('build',name,'index.html');
  const cname=read('build',name,'CNAME').trim();
  const identity=JSON.parse(read('build',name,'BUILD.json'));
  assert.equal(cname,build.domain,`${name}: CNAME must match its configured domain`);
  assert.deepEqual(identity,{build:name,domain:build.domain,source:'canonical-app'},`${name}: BUILD identity must be canonical and exact`);
  assert.match(index,new RegExp(`<html lang="en" data-build="${name}" data-theme="${build.themeName}">`),`${name}: build and theme identity must be rendered`);
  assert.ok(index.includes(`<link rel="canonical" href="${build.canonicalUrl}">`),`${name}: canonical URL must match configuration`);
  assert.ok(index.includes(`<meta property="og:url" content="${build.canonicalUrl}">`),`${name}: social URL must match configuration`);
  assert.ok(index.includes(`<meta property="og:image" content="${build.canonicalUrl}${build.shareImage}">`),`${name}: share image URL must match configuration`);
  assert.ok(index.includes(`<link rel="manifest" href="./${build.manifest}">`),`${name}: manifest reference must match configuration`);
  assert.ok(index.includes(`<link rel="icon" href="./${build.icon}"`),`${name}: favicon reference must match configuration`);
  assert.ok(index.includes(`<link rel="apple-touch-icon" sizes="180x180" href="./${build.touchIcon}">`),`${name}: touch icon reference must match configuration`);
  for(const needle of forbidden)assert.equal(index.includes(needle),false,`${name}: forbidden historical dependency ${needle}`);
  const references=[...index.matchAll(/(?:src|href)="\.\/([^"?#]+)(?:[?#][^"]*)?"/g)].map(match=>match[1]);
  for(const reference of references)assert.ok(existsSync(join(directory,reference)),`${name}: missing referenced build file ${reference}`);
  const manifest=JSON.parse(read('build',name,build.manifest));
  for(const icon of manifest.icons||[]){const relative=String(icon.src||'').replace(/^\.\//,'').replace(/^\//,'');assert.ok(existsSync(join(directory,relative)),`${name}: manifest references missing icon ${relative}`)}
  assert.deepEqual([...index.matchAll(/<script\s+src="\.\/([^"]+)"/g)].map(match=>match[1]),scripts,`${name}: generated script order must equal the canonical template`);
}

for(const file of [...scripts,...sharedStyles]){
  const gold=read('build','gold',file),silver=read('build','silver',file);
  assert.equal(gold,silver,`Gold and silver must share identical application source: ${file}`);
}
assert.notEqual(read('build','gold','theme.css'),read('build','silver','theme.css'),'Gold and silver theme tokens must remain distinct');
assert.notEqual(read('build','gold','index.html'),read('build','silver','index.html'),'Gold and silver identity HTML must remain distinct');

console.log('Canonical gold/silver hosting contract passed.');
