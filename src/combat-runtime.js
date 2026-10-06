(function(global){
'use strict';

function create(deps){
  const timers=deps.timers;

  function updatePlayerTimer(){
    clearInterval(timers.attack);
    timers.attack=null;
    if(deps.shouldPauseCombat())return;
    const ms=Math.max(40,Number(deps.playerAttackMs())||1000);
    timers.attack=setInterval(()=>deps.playerAttack(false),ms);
    deps.trace('combat_player_timer_started',{ms});
  }

  function updateEnemyTimer(){
    clearInterval(timers.enemy);
    timers.enemy=null;
    if(deps.shouldPauseCombat())return;
    const ms=Math.max(380,Number(deps.enemyAttackMs())||1000);
    timers.enemy=setInterval(()=>deps.enemyAttack(),ms);
    deps.trace('combat_enemy_timer_started',{ms});
  }

  function clear(){
    clearInterval(timers.attack);
    clearInterval(timers.enemy);
    clearTimeout(timers.telegraph);
    timers.attack=null;
    timers.enemy=null;
    timers.telegraph=null;
    deps.trace('combat_timers_cleared',{});
  }

  function start(){
    if(deps.shouldPauseCombat()){
      clear();
      deps.trace('combat_start_blocked',{reason:deps.pauseReason()});
      return false;
    }
    updatePlayerTimer();
    updateEnemyTimer();
    return true;
  }

  function snapshot(){
    return {
      attack:!!timers.attack,
      enemy:!!timers.enemy,
      telegraph:!!timers.telegraph,
      paused:deps.shouldPauseCombat(),
      reason:deps.pauseReason()
    };
  }

  return {
    updatePlayerTimer,
    updateEnemyTimer,
    clear,
    start,
    snapshot
  };
}

global.PFCombatRuntime={create};
})(window);
