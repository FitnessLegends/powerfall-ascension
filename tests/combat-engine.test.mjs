import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/combat-engine.js');
const {PFCombatEngine}=globalThis;

function runAt(stage=1){
  return {
    stage,
    patrolXP:0,
    patrolClears:0,
    operationReady:false,
    operationStage:0,
    inOperation:false,
    hp:25,
    maxHp:100,
    overkillCarry:999,
    fight:{combo:7},
    operationDamageTaken:0
  };
}

test('early patrol advances after two victories',()=>{
  const run=runAt(1);
  let r=PFCombatEngine.advanceAfterVictory(run,{compression:0,isWallBoss:()=>false});
  assert.equal(r.stageAdvanced,false);
  assert.equal(run.stage,1);
  assert.equal(run.patrolXP,1);

  r=PFCombatEngine.advanceAfterVictory(run,{compression:0,isWallBoss:()=>false});
  assert.equal(r.stageAdvanced,true);
  assert.equal(run.stage,2);
  assert.equal(run.patrolXP,0);
});

test('patrol compression reduces goal but never below one',()=>{
  assert.equal(PFCombatEngine.patrolGoal(10,{compression:3}),1);
  assert.equal(PFCombatEngine.patrolGoal(120,{compression:3}),1);
  assert.equal(PFCombatEngine.patrolGoal(75,{wall:true,compression:99}),2);
});

test('wall stage becomes operation-ready without advancing',()=>{
  const run=runAt(75);
  const wall=stage=>stage===75;
  for(let i=0;i<4;i++){
    const r=PFCombatEngine.advanceAfterVictory(run,{compression:1,isWallBoss:wall});
    if(i<3)assert.equal(r.operationReady,false);
  }
  assert.equal(run.stage,75);
  assert.equal(run.operationReady,true);
  assert.equal(run.patrolXP,4);
});

test('operation victory advances exactly one stage and resets operation state',()=>{
  const run=runAt(75);
  run.inOperation=true;
  run.operationReady=true;
  run.operationStage=75;
  run.patrolXP=4;

  const r=PFCombatEngine.advanceAfterVictory(run,{wasWall:true,isWallBoss:x=>x===75});
  assert.equal(r.operationCompleted,true);
  assert.equal(r.stageAdvanced,true);
  assert.equal(run.stage,76);
  assert.equal(run.patrolXP,0);
  assert.equal(run.inOperation,false);
  assert.equal(run.operationReady,false);
  assert.equal(run.operationStage,0);
});

test('death retry preserves exact stage and patrol progress',()=>{
  const run=runAt(42);
  run.patrolXP=2;
  run.inOperation=true;
  run.operationDamageTaken=4;

  const result=PFCombatEngine.retryCurrentEncounter(run,{hits:0,combo:0});
  assert.equal(run.stage,42);
  assert.equal(run.patrolXP,2);
  assert.equal(run.hp,100);
  assert.equal(run.overkillCarry,0);
  assert.equal(run.operationDamageTaken,5);
  assert.deepEqual(run.fight,{hits:0,combo:0});
  assert.equal(result.stage,42);
  assert.equal(result.patrolXP,2);
});
