(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.PFInvariants=api;
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';

const finite=n=>Number.isFinite(Number(n));

function validateRun(run,ctx={}){
  const issues=[];
  const push=(code,details={})=>issues.push({code,severity:details.severity||'error',...details});

  if(!run||typeof run!=='object'){
    push('RUN_MISSING');
    return issues;
  }

  if(!Number.isInteger(run.stage)||run.stage<1||run.stage>10000)push('STAGE_INVALID',{value:run.stage});
  if(!finite(run.hp)||!finite(run.maxHp)||Number(run.maxHp)<=0)push('HP_INVALID',{hp:run.hp,maxHp:run.maxHp});
  else{
    if(Number(run.hp)<0)push('HP_NEGATIVE',{hp:run.hp});
    if(Number(run.hp)>Number(run.maxHp)+1e-9)push('HP_OVER_MAX',{hp:run.hp,maxHp:run.maxHp});
  }

  for(const key of ['coins','baseDamage','damageMult','attackMs','crit','regen']){
    if(!finite(run[key]))push('NON_FINITE_STAT',{key,value:run[key]});
  }

  if(finite(run.attackMs)&&Number(run.attackMs)<100)push('ATTACK_INTERVAL_TOO_LOW',{value:run.attackMs,severity:'warn'});

  if(run.enemy){
    if(!finite(run.enemyHp)||!finite(run.enemyMaxHp)||Number(run.enemyMaxHp)<=0){
      push('ENEMY_HP_INVALID',{enemyHp:run.enemyHp,enemyMaxHp:run.enemyMaxHp});
    }else{
      if(Number(run.enemyHp)>Number(run.enemyMaxHp)+1e-9)push('ENEMY_HP_OVER_MAX',{enemyHp:run.enemyHp,enemyMaxHp:run.enemyMaxHp});
      if(Number(run.enemyHp)<=0&&!run.fight?.resolvingDefeat&&!ctx.allowZeroEnemyHp){
        push('DEAD_ENEMY_STILL_ACTIVE',{enemy:run.enemy?.name||'unknown',enemyHp:run.enemyHp});
      }
    }
  }

  if(!Array.isArray(run.powers))push('POWERS_NOT_ARRAY');
  else{
    const dup=run.powers.filter((id,i,a)=>a.indexOf(id)!==i);
    if(dup.length)push('DUPLICATE_POWERS',{ids:[...new Set(dup)]});
    if(typeof ctx.powerExists==='function'){
      const missing=run.powers.filter(id=>!ctx.powerExists(id));
      if(missing.length)push('UNKNOWN_POWER_IDS',{ids:missing});
    }
  }

  if(!Array.isArray(run.awakeningQueue))push('AWAKENING_QUEUE_NOT_ARRAY');
  else{
    const keys=run.awakeningQueue.map(x=>x?.key).filter(Boolean);
    if(new Set(keys).size!==keys.length)push('DUPLICATE_AWAKENING_KEYS',{keys});
    for(const reward of run.awakeningQueue){
      if(!reward||typeof reward!=='object')push('AWAKENING_INVALID_ENTRY');
      else{
        if(reward.status!=='pending')push('AWAKENING_BAD_STATUS',{key:reward.key,status:reward.status});
        if(!Array.isArray(reward.options))push('AWAKENING_OPTIONS_NOT_ARRAY',{key:reward.key});
      }
    }
  }

  if(ctx.powerScreenActive&&!(run.awakeningQueue?.length>0))push('POWER_SCREEN_WITHOUT_REWARD');
  if((run.awakeningQueue?.length||0)>0&&ctx.combatActive)push('COMBAT_RUNNING_DURING_AWAKENING');
  if(ctx.powerScreenActive&&ctx.combatActive)push('POWER_SCREEN_COMBAT_CONFLICT');

  if(run.inOperation&&!run.operationStage&&run.stage)push('OPERATION_STAGE_MISSING',{stage:run.stage,severity:'warn'});
  if(run.operationReady&&run.inOperation)push('OPERATION_READY_AND_ACTIVE',{severity:'warn'});

  if(run.fight&&typeof run.fight==='object'){
    for(const [key,val] of Object.entries(run.fight)){
      if(typeof val==='number'&&!Number.isFinite(val))push('NON_FINITE_FIGHT_STAT',{key,value:val});
    }
  }

  return issues;
}

function summarize(issues){
  const list=Array.isArray(issues)?issues:[];
  return {
    ok:list.length===0,
    errors:list.filter(x=>x.severity!=='warn').length,
    warnings:list.filter(x=>x.severity==='warn').length,
    codes:[...new Set(list.map(x=>x.code))]
  };
}

return {validateRun,summarize};
});
