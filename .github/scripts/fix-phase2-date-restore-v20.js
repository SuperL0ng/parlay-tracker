const fs=require('fs');
const path='index.html';
let s=fs.readFileSync(path,'utf8');
const old="return /^\\\\d{8}$/.test(v)?v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6):v";
const next="return /^\\d{8}$/.test(v)?v.slice(0,4)+'-'+v.slice(4,6)+'-'+v.slice(6):v";
if(!s.includes(old))throw new Error('date restore pattern not found');
s=s.replace(old,next);
fs.writeFileSync(path,s);
console.log('Saved-ticket date restore corrected.');
