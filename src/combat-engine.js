(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.PFCombatEngine=api;
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';

function patrolGoal(stage,{wall=false,compression=0}={}){
  const c=Math.max(0,Math.floor(Number(compression)||0));
  if(wall)return Math.max(2,5-c);
  const base=stage<25?2:stage<100?3:4;
  return Math.max(1,base-c);
}

function advanceAfterVictory(run,{wasWall=false,isWallBoss=()=>false,compression=0,maxStage=10000}={}){
  if(!run||typeof run!=='object')throw new TypeError('run is required');

  const defeatedStage=run.stage;
  const result={
    defeatedStage,
    stageCleared:false,
    stageAdvanced:false,
    operationCompleted:false,
    operationReady:false,
    patrolGoal:0
  };

  if(wasWall&&run.inOperation){
    run.inOperation=false;
    run.operationReady=false;
    run.operationStage=0;
    run.stage=Math.min(maxStage,run.stage+1);
    run.patrolXP=0;
    result.stageCleared=true;
    result.stageAdvanced=true;
    result.operationCompleted=true;
    return result;
  }

  if(isWallBoss(run.stage)&&!run.inOperation){
    const goal=patrolGoal(run.stage,{wall:true,compression});
    result.patrolGoal=goal;
    run.patrolXP=(run.patrolXP||0)+1;
    run.patrolClears=(run.patrolClears||0)+1;
    if(run.patrolXP>=goal){
      run.patrolXP=goal;
      run.operationReady=true;
      result.operationReady=true;
    }
    return result;
  }

  const goal=patrolGoal(run.stage,{wall:false,compression});
  result.patrolGoal=goal;
  run.patrolXP=(run.patrolXP||0)+1;
  run.patrolClears=(run.patrolClears||0)+1;

  if(run.patrolXP>=goal){
    run.patrolXP=0;
    run.stage=Math.min(maxStage,run.stage+1);
    result.stageCleared=true;
    result.stageAdvanced=true;
  }

  return result;
}

function retryCurrentEncounter(run,defaultFight){
  if(!run||typeof run!=='object')throw new TypeError('run is required');
  const stage=run.stage;
  const patrolXP=run.patrolXP||0;

  run.hp=run.maxHp;
  run.overkillCarry=0;
  run.fight={...(defaultFight||{})};

  if(run.inOperation){
    run.operationDamageTaken=(run.operationDamageTaken||0)+1;
  }

  return {
    stage,
    patrolXP,
    inOperation:!!run.inOperation,
    hp:run.hp
  };
}

return {patrolGoal,advanceAfterVictory,retryCurrentEncounter};
});
