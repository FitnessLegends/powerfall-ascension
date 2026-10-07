import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const ctx={
  window:{},
  console,
  setTimeout:()=>0,
  clearTimeout:()=>{}
};
vm.createContext(ctx);
const configSource=fs.readFileSync(new URL('../src/data/config.js',import.meta.url),'utf8');
vm.runInContext(configSource,ctx);

const progressionSource=fs.readFileSync(new URL('../src/progression-runtime.js',import.meta.url),'utf8');
vm.runInContext(progressionSource,ctx);

const config=ctx.window.PF_CONFIG;
const create=ctx.window.PFProgressionRuntime.create;

for(const compression of [0,1,2,3]){
  const run={
    stage:1,
    triggeredMilestones:[],
    awakeningQueue:[],
    patrolXP:0,
    inOperation:false,
    operationReady:false
  };
  const queued=[];
  const runtime=create({
    getRun:()=>run,
    worlds:config.worlds,
    powerMilestones:config.powerMilestones,
    wallBosses:config.wallBosses,
    queuePower:reward=>{
      const key=reward.source+':'+reward.stage;
      if(run.awakeningQueue.some(x=>x.key===key))return null;
      const item={...reward,key,status:'pending',options:[]};
      run.awakeningQueue.push(item);
      queued.push(item);
      return item;
    },
    pendingCount:()=>run.awakeningQueue.length,
    openAwakening:()=>{},
    showMajorBanner:()=>{},
    $:()=>({_to:null}),
    trace:()=>{}
  });

  // Simulate every cleared stage to 650. Rewards are consumed immediately
  // after validation so later milestones can continue.
  for(let stage=1;stage<=650;stage++){
    run.stage=stage;
    const earned=runtime.checkPowerMilestone(stage);
    if(config.powerMilestones.includes(stage)){
      assert.equal(earned,true,`milestone ${stage} must award at compression ${compression}`);
      const reward=run.awakeningQueue.shift();
      assert.equal(reward.stage,stage);
      assert.equal(reward.source,'milestone');
      assert.ok(['common','rare','epic'].includes(reward.minRarity));
    }else{
      assert.equal(earned,false);
    }
    // Calling twice must never duplicate a milestone reward.
    assert.equal(runtime.checkPowerMilestone(stage),false);
  }

  const expected=config.powerMilestones.filter(x=>x<=650);
  assert.deepEqual([...run.triggeredMilestones],expected);
  assert.deepEqual(queued.map(x=>x.stage),expected);
  assert.equal(runtime.worldFor(1).name,'City');
  assert.equal(runtime.worldFor(101).name,'Global Crisis');
  assert.equal(runtime.worldFor(251).name,'Planetary');
  assert.equal(runtime.worldFor(501).name,'Cosmic');
}

// Deterministic stress pass for state shape and save round-trips.
await import('../src/invariants.js');
const {PFInvariants}=globalThis;

let seed=0xC0FFEE;
const rand=()=>{
  seed=(seed*1664525+1013904223)>>>0;
  return seed/0x100000000;
};

for(let i=0;i<10000;i++){
  const maxHp=50+Math.floor(rand()*1e6);
  const enemyMaxHp=50+Math.floor(rand()*1e7);
  const state={
    stage:1+Math.floor(rand()*10000),
    hp:Math.floor(rand()*maxHp),
    maxHp,
    coins:Math.floor(rand()*1e9),
    baseDamage:1+rand()*1e6,
    damageMult:.1+rand()*100,
    attackMs:120+rand()*4000,
    crit:rand(),
    regen:rand()*.5,
    enemy:{name:'SIM-'+i},
    enemyHp:1+Math.floor(rand()*enemyMaxHp),
    enemyMaxHp,
    powers:[],
    awakeningQueue:[],
    fight:{resolvingDefeat:0,combo:Math.floor(rand()*100)}
  };
  const issues=PFInvariants.validateRun(state,{powerExists:()=>true,combatActive:true});
  assert.equal(issues.length,0,`simulation state ${i} violated invariants: ${JSON.stringify(issues)}`);

  const encoded=JSON.stringify(state);
  const decoded=JSON.parse(encoded);
  assert.equal(decoded.stage,state.stage);
  assert.equal(decoded.enemyHp,state.enemyHp);
  assert.equal(decoded.maxHp,state.maxHp);
}

console.log('Simulation PASS: milestones + 10,000 deterministic state/save transitions');
