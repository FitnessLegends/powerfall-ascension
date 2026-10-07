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

const architectureRules=[
  {
    name:'combat attack interval must stay in combat-runtime',
    test:()=>!/timers\.attack\s*=\s*setInterval/.test(html),
    error:'index.html creates a combat attack interval directly'
  },
  {
    name:'combat enemy interval must stay in combat-runtime',
    test:()=>!/timers\.enemy\s*=\s*setInterval/.test(html),
    error:'index.html creates a combat enemy interval directly'
  },
  {
    name:'power catalogue must stay extracted',
    test:()=>!html.includes('window.PF_POWERS=['),
    error:'Power catalogue was reintroduced into index.html'
  },
  {
    name:'enemy catalogue must stay extracted',
    test:()=>!html.includes('window.PF_ENEMIES={'),
    error:'Enemy catalogue was reintroduced into index.html'
  },
  {
    name:'config must stay extracted',
    test:()=>!html.includes('window.PF_CONFIG = {'),
    error:'PF_CONFIG was reintroduced into index.html'
  },
  {
    name:'story catalogue must stay extracted',
    test:()=>!html.includes('window.PF_STORY={'),
    error:'Story data was reintroduced into index.html'
  },
  {
    name:'unsafe multi-token environment cleanup must not return',
    test:()=>!html.includes("classList.remove(x.cls,x.weather)"),
    error:'Unsafe Safari classList.remove(x.cls,x.weather) pattern reintroduced'
  },
  {
    name:'enemy defeat must use transaction bridge',
    test:()=>html.includes("stateStore.transaction('enemy_defeated'"),
    error:'Enemy defeat bypasses the state transaction bridge'
  },
  {
    name:'player defeat must use transaction bridge',
    test:()=>html.includes("stateStore.transaction('player_defeat'"),
    error:'Player defeat bypasses the state transaction bridge'
  },
  {
    name:'power choice must use transaction bridge',
    test:()=>html.includes("stateStore.transaction('power_choice'"),
    error:'Power choice bypasses the state transaction bridge'
  },
  {
    name:'enemy spawn must not redraw the entire app',
    test:()=>{
      const start=html.indexOf('function spawnEnemy(){');
      const end=html.indexOf('\nfunction playerAttack(',start);
      const body=html.slice(start,end);
      return start>=0&&end>start&&!body.includes('renderAll()')
    },
    error:'spawnEnemy() reintroduced renderAll() into the combat hot path'
  }
];

for(const rule of architectureRules){
  if(!rule.test())failures.push({file:'architecture',error:rule.error});
}


// Known semantic regressions that syntax parsing alone cannot catch.
const semanticGuards=[
  {
    name:'Plasma Blast crit declaration order',
    pass:()=>{
      const start=html.indexOf('function playerAttack(');
      const end=html.indexOf('\nfunction ',start+20);
      const body=html.slice(start,end);
      return body.indexOf('const crit=')>=0&&body.indexOf('const crit=')<body.indexOf('s.plasmaBlast&&crit')
    }
  }
];
for(const guard of semanticGuards){
  if(!guard.pass())failures.push({file:'index.html',error:'Semantic guard failed: '+guard.name});
}

if(failures.length){
  console.error(JSON.stringify(failures,null,2));
  process.exit(1);
}

console.log(`Syntax + architecture gate PASS: ${inline.length} inline scripts + runtime files + ${architectureRules.length} ownership rules`);
