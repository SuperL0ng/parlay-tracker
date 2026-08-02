import { readdir } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const directory=path.join(root,'app/src/scripts');
for(const name of (await readdir(directory)).filter(name=>name.endsWith('.js')).sort()){
  const file=path.join(directory,name),result=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(result.status!==0)throw new Error(`${name}: ${result.stderr||result.stdout}`);
}
console.log('Source syntax check passed.');
