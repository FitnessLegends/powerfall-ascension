import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';

const root=process.cwd();
const failures=[];

function walk(dir){
  if(!fs.existsSync(dir))return [];
  return fs.readdirSync(dir,{withFileTypes:true}).flatMap(entry=>{
    const p=path.join(dir,entry.name);
    return entry.isDirectory()?walk(p):[p];
  });
}

for(const file of [...walk(path.join(root,'src')),...walk(path.join(root,'api'))].filter(x=>x.endsWith('.js'))){
  const r=spawnSync(process.execPath,['--check',file],{encoding:'utf8'});
  if(r.status!==0)failures.push({file:path.relative(root,file),error:r.stderr||r.stdout});
}

const html=fs.readFileSync(path.join(root,'index.html'),'utf8');
const inline=[...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/gi)].map(m=>m[1]).filter(x=>x.trim());
inline.forEach((source,i)=>{
  try{new Function(source)}
  catch(error){failures.push({file:`index.html inline script ${i+1}`,error:error.stack||String(error)})}
});

const required=[
  '/src/data/story.js',
  '/src/data/enemies.js',
  '/src/data/powers.js',
  '/src/data/config.js',
  '/src/telemetry.js',
  '/src/invariants.js',
  '/src/state-store.js',
  '/src/power-awakening.js',
  '/src/combat-engine.js',
  '/src/combat-runtime.js',
  '/src/hud-runtime.js',
  '/src/save-runtime.js',
  '/src/progression-runtime.js'
];
for(const src of required){
  if(!html.includes(src))failures.push({file:'index.html',error:`Missing required runtime: ${src}`});
}

if(failures.length){
  console.error(JSON.stringify(failures,null,2));
  process.exit(1);
}

console.log(`Syntax gate PASS: ${inline.length} inline scripts + runtime files`);
