import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/invariants.js');
await import('../src/state-store.js');

const {PFInvariants,PFStateStore}=globalThis;

function validRun(){
  return {
    stage:42,
    hp:80,
    maxHp:100,
    coins:100,
    baseDamage:8,
    damageMult:1,
    attackMs:900,
    crit:.1,
    regen:.02,
    enemy:{name:'Test Enemy'},
    enemyHp:50,
    enemyMaxHp:100,
    powers:['super_strength'],
    awakeningQueue:[],
    fight:{resolvingDefeat:0,combo:0}
  };
}

test('valid combat state passes invariants',()=>{
  const issues=PFInvariants.validateRun(validRun(),{
    powerExists:()=>true,
    powerScreenActive:false,
    combatActive:true
  });
  assert.deepEqual(issues,[]);
});

test('zero HP enemy cannot remain active',()=>{
  const run=validRun();
  run.enemyHp=0;
  const issues=PFInvariants.validateRun(run,{powerExists:()=>true});
  assert.ok(issues.some(x=>x.code==='DEAD_ENEMY_STILL_ACTIVE'));
});

test('awakening and live combat conflict is detected',()=>{
  const run=validRun();
  run.awakeningQueue=[{key:'milestone:50',status:'pending',options:['flight']}];
  const issues=PFInvariants.validateRun(run,{
    powerExists:()=>true,
    powerScreenActive:true,
    combatActive:true
  });
  const codes=new Set(issues.map(x=>x.code));
  assert.ok(codes.has('COMBAT_RUNNING_DURING_AWAKENING'));
  assert.ok(codes.has('POWER_SCREEN_COMBAT_CONFLICT'));
});

test('duplicate powers and rewards are rejected',()=>{
  const run=validRun();
  run.powers=['flight','flight'];
  run.awakeningQueue=[
    {key:'milestone:50',status:'pending',options:[]},
    {key:'milestone:50',status:'pending',options:[]}
  ];
  const codes=PFInvariants.validateRun(run,{powerExists:()=>true}).map(x=>x.code);
  assert.ok(codes.includes('DUPLICATE_POWERS'));
  assert.ok(codes.includes('DUPLICATE_AWAKENING_KEYS'));
});

test('state transaction reports invalid post-state',()=>{
  let run=validRun();
  const events=[];
  const store=PFStateStore.create({
    getRun:()=>run,
    setRun:v=>{run=v},
    validate:(r,ctx)=>PFInvariants.validateRun(r,ctx),
    summarize:PFInvariants.summarize,
    context:()=>({powerExists:()=>true}),
    trace:(event,data)=>events.push({event,data})
  });

  store.transaction('break_enemy',()=>{run.enemyHp=0});
  assert.ok(events.some(x=>x.event==='invariant_failed'&&x.data.checkpoint==='break_enemy:after'));
  assert.ok(events.some(x=>x.event==='state_transaction_complete'&&x.data.ok===false));
});
