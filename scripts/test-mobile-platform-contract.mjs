import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const html=await readFile('app/src/index.template.html','utf8');
const css=await readFile('app/src/styles/app.css','utf8');

assert.match(html,/viewport-fit=cover/,'The canonical viewport must opt into safe-area handling.');
for(const inset of ['safe-area-inset-top','safe-area-inset-right','safe-area-inset-bottom','safe-area-inset-left']){
  assert.ok(css.includes(`env(${inset})`),`Canonical layout is missing ${inset}.`);
}
assert.match(css,/@supports\s*\(\s*-webkit-touch-callout\s*:\s*none\s*\)[\s\S]*?body\s*\{[^}]*background-attachment\s*:\s*scroll/i,'Touch WebKit must not use a fixed body background.');

console.log('Mobile platform contract passed.');
