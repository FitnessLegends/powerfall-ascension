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

await import('../src/combat-engine.js');
const {PFCombatEngine}=globalThis;

for(const compression of [0,1,2,3]){
  const run={
    stage:1,
    triggeredMilestones:[],
    awakeningQueue:[],
    patrolXP:0,
    patrolClears:0,
    inOperation:false,
    operationReady:false,
    operationStage:0
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

  const wallSet=new Set(Array.from(config.wallBosses).map(Number));
  let victories=0;

  while(run.stage<=650){
    if(++victories>10000)throw new Error('progression simulation failed to converge');

    // Once patrols expose an Operation, the next simulated victory is the
    // Operation boss itself.
    if(run.operationReady&&!run.inOperation){
      run.inOperation=true;
      run.operationStage=run.stage;
    }

    const defeatedStage=run.stage;
    const wasWall=wallSet.has(run.stage)&&run.inOperation;
    const progress=PFCombatEngine.advanceAfterVictory(run,{
      wasWall,
      isWallBoss:stage=>wallSet.has(stage),
      compression,
      maxStage:10000
    });

    if(progress.stageCleared){
      runtime.checkPowerMilestone(defeatedStage);
    }

    // A pending awakening is validated then immediately consumed so the
    // simulation can continue to later milestones.
    while(run.awakeningQueue.length){
      const reward=run.awakeningQueue.shift();
      assert.equal(reward.status,'pending');
      assert.equal(reward.source,'milestone');
      assert.equal(reward.stage,defeatedStage);
      assert.ok(['common','rare','epic'].includes(reward.minRarity));
    }

    const issues=[];
    if(run.stage<1||run.stage>10000)issues.push('stage');
    if(run.patrolXP<0)issues.push('patrolXP');
    if(run.inOperation&&run.operationStage!==run.stage)issues.push('operationStage');
    assert.deepEqual(issues,[],`progression invariant failed at stage ${run.stage}`);
  }

  const expected=Array.from(config.powerMilestones).filter(x=>x<=650).map(Number);
  assert.deepEqual([...run.triggeredMilestones],expected);
  assert.deepEqual(queued.map(x=>x.stage),expected);
  assert.equal(runtime.worldFor(1).name,'City');
  assert.equal(runtime.worldFor(101).name,'Global Crisis');
  assert.equal(runtime.worldFor(251).name,'Planetary');
  assert.equal(runtime.worldFor(501).name,'Cosmic');
  assert.ok(victories>650,'simulation must include multi-enemy patrols');
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

console.log('Simulation PASS: live patrol/Operation rules through Stage 650 + 10,000 deterministic state/save transitions');
