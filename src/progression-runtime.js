(function(global){
'use strict';

function create(deps){
  function worldFor(stage){
    return [...deps.worlds].reverse().find(w=>stage>=w.min)||deps.worlds[0];
  }

  function nextMilestone(stage){
    const events=[];
    deps.powerMilestones.forEach(x=>{
      if(x>=stage)events.push({stage:x,type:'power',icon:'DNA'});
    });
    deps.wallBosses.forEach(x=>{
      if(x>=stage)events.push({stage:x,type:'boss',icon:'BOS'});
    });
    events.sort((a,b)=>a.stage-b.stage||(a.type==='boss'?-1:1));
    return events[0]||{stage:stage+100,type:'unknown',icon:'?'};
  }

  function checkPowerMilestone(clearedStage){
    const s=deps.getRun();
    if(!deps.powerMilestones.includes(clearedStage))return false;
    if(s.triggeredMilestones.includes(clearedStage))return false;

    s.triggeredMilestones.push(clearedStage);

    const reward=deps.queuePower({
      source:'milestone',
      stage:clearedStage,
      minRarity:clearedStage>=350?'epic':clearedStage>=125?'rare':'common'
    });

    deps.trace('progression_power_milestone',{
      clearedStage,
      queued:!!reward
    });

    return !!reward;
  }

  function presentPendingPowerAfterClear(clearedStage){
    if(!deps.pendingCount())return false;

    const banner=deps.$('majorBanner');
    clearTimeout(banner._to);
    deps.showMajorBanner(
      'POWER',
      'STAGE '+clearedStage+' COMPLETE',
      'POWER AWAKENING READY',
      950
    );

    setTimeout(()=>{
      if(deps.pendingCount())deps.openAwakening();
    },1050);

    deps.trace('progression_reward_presented',{
      clearedStage,
      pending:deps.pendingCount()
    });

    return true;
  }

  function snapshot(){
    const s=deps.getRun();
    const next=nextMilestone((s.stage||1)+1);
    return {
      stage:s.stage||1,
      world:worldFor(s.stage||1).name,
      nextMilestone:next,
      pending:deps.pendingCount()
    };
  }

  return {
    worldFor,
    nextMilestone,
    checkPowerMilestone,
    presentPendingPowerAfterClear,
    snapshot
  };
}

global.PFProgressionRuntime={create};
})(window);
