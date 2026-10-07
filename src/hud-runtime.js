(function(global){
'use strict';

function create(deps){
  let lastRender=0;
  let lastLoadoutKey='';
  let lastEnvironmentKey='';
  let lastHeroKey='';
  let lastEnemyKey='';
  let lastPending=-1;
  let dirty=true;
  let renderCount=0;
  let skippedHidden=0;
  let loadoutRebuilds=0;
  let totalRenderMs=0;
  let maxRenderMs=0;

  const setText=(id,value)=>{
    const el=deps.$(id);
    if(!el)return;
    const next=String(value);
    if(el.textContent!==next)el.textContent=next
  };
  const setWidth=(id,value)=>{
    const el=deps.$(id);
    if(!el)return;
    const next=value+'%';
    if(el.style.width!==next)el.style.width=next
  };

  function updatePowerAlert(){
    const pending=deps.pendingCount();
    if(pending===lastPending)return;
    lastPending=pending;

    const alert=deps.$('powerAlert');
    const badge=deps.$('powerDockBadge');

    if(alert)alert.classList.add('hidden');
    const legacyBadge=deps.$('powerQueueBadge');
    if(legacyBadge)legacyBadge.textContent=pending;

    if(badge){
      badge.textContent=pending>9?'9+':String(pending);
      badge.classList.toggle('hidden',pending===0);
    }

    deps.$('archiveNavBtn')?.classList.toggle('awakening-waiting',pending>0);
  }

  function loadoutKey(s){
    return [
      s.identityAwakened||deps.identityTitle(),
      ...(s.powers||[])
    ].join('|')
  }

  function renderLoadout(force=false){
    const s=deps.getRun();
    const key=loadoutKey(s);
    if(!force&&key===lastLoadoutKey)return false;
    lastLoadoutKey=key;
    loadoutRebuilds++;

    const icons=deps.$('loadoutIcons');
    const powers=s.powers.map(deps.byId).filter(Boolean);

    setText('loadoutIdentity',(s.identityAwakened||deps.identityTitle()).toUpperCase());

    icons.innerHTML=powers.length
      ?powers.map(p=>
        '<button type="button" class="rack-power" data-rack-power="'+p.id+'" aria-label="'+deps.escapeHtml(p.name)+'">'+
        deps.powerSymbol(p)+
        '<b>'+deps.escapeHtml(p.name)+'</b></button>'
      ).join('')
      :'<i class="loadout-empty">Powers you awaken will appear here</i>';

    icons.querySelectorAll('[data-rack-power]').forEach(b=>{
      b.addEventListener('click',e=>{
        e.stopPropagation();
        deps.showPowerInfo(b.dataset.rackPower);
      });
    });

    setText('loadoutMore',powers.length+' POWER'+(powers.length===1?'':'S')+' · TAP DECK');
    return true
  }

  function environmentKey(s,meta,fam){
    return [
      s.stage,
      meta.reputation||0,
      fam,
      s.enemy?.wall?1:0,
      s.fight?.bossPhase||0,
      s.bloodFurnace?1:0,
      (s.powers||[]).join(','),
      Object.values(s.powerEvolutions||{}).join(','),
      (s.combos||[]).join(',')
    ].join('|')
  }

  function heroKey(s){
    return [
      (s.visual||[]).join(','),
      s.attackMs<700?1:0,
      s.armor>=.15?1:0,
      s.powers?.length||0,
      s.combos?.length||0,
      s.identityKey||''
    ].join('|')
  }

  function enemyKey(s){
    return [
      s.enemy?.name||'',
      s.enemy?.elite?1:0,
      s.enemy?.wall?1:0,
      s.enemy?.nemesis?1:0,
      s.enemy?.counterFamily||'',
      s.enemy?.trait||''
    ].join('|')
  }

  function render(force=false){
    if(!deps.isGameVisible()){
      dirty=true;
      skippedHidden++;
      return false
    }

    const now=performance.now();
    if(!force&&!dirty&&now-lastRender<160)return false;
    lastRender=now;
    dirty=false;
    const started=performance.now();

    const s=deps.getRun();
    const meta=deps.getMeta();
    const $=deps.$;

    setText('coins',deps.fmt(s.coins));
    setText('souls',deps.fmt(meta.souls));
    setText('stageLabel','Stage '+s.stage);
    setText('worldLabel',deps.worldFor(s.stage).name);

    const next=deps.nextMilestone(s.stage+1);
    const opBtn=$('operationBtn');
    setText('nextMilestoneIcon',s.operationReady?'OPS':next.icon);
    setText('nextMilestoneText',s.operationReady
      ?'OPERATION '+s.stage+' READY'
      :(next.type==='boss'?'Operation':'Power after clearing Stage')+
        ' '+next.stage+' · '+Math.max(0,next.stage-s.stage)+' to go');
    opBtn.classList.toggle('hidden',!s.operationReady||s.inOperation);

    setText('enemyName',s.enemy?.name||'Enemy');
    setText('enemyHpLabel',s.enemy?.wall?'WALL BOSS':s.enemy?.nemesis?'NEMESIS':s.enemy?.elite?'ELITE CRIMINAL':'CRIMINAL');

    $('bossBanner').classList.toggle('hidden',!s.enemy?.wall);
    if(s.enemy?.wall&&$('bossBanner').dataset.stage!==String(s.stage)){
      $('bossBanner').dataset.stage=String(s.stage);
      deps.showMajorBanner('OPERATION ACTIVE',s.enemy.name||'WALL BOSS','Major threat engaged. Your build is being tested.',2600);
    }
    $('eliteBanner').classList.toggle('hidden',!s.enemy?.elite||s.enemy?.wall);

    const patrolGoal=deps.isWallBoss(s.stage)&&!s.inOperation
      ?Math.max(2,5-(meta.soulTree.patrol_compression||0))
      :s.stage<25?2:s.stage<100?3:4;

    setText('encounterChip',
      s.inOperation&&s.enemy?.wall?'BOSS OPERATION':
      s.operationReady?'OPERATION READY':
      s.enemy?.nemesis?'PERSONAL NEMESIS':
      s.enemy?.elite?'ELITE THREAT':
      'PATROL '+Math.min(patrolGoal,(s.patrolXP||0)+1)+' / '+patrolGoal);

    setText('factionChip',s.enemy?.evolutions?.length
      ?'EVOLVED ×'+s.enemy.evolutions.length
      :(s.enemy?.faction||deps.factionFor(s.stage)));

    setText('hpText',deps.fmt(s.hp)+' / '+deps.fmt(s.maxHp));
    setText('enemyHpText',deps.fmt(s.enemyHp)+' / '+deps.fmt(s.enemyMaxHp));
    setWidth('hpBar',deps.clamp(s.hp/s.maxHp*100,0,100));
    setWidth('enemyHpBar',deps.clamp(s.enemyHp/s.enemyMaxHp*100,0,100));

    setText('damageStat',deps.fmt(deps.totalDamage()));
    setText('apsStat',(1000/Math.max(120,s.attackMs)).toFixed(1));
    setText('regenStat',(deps.regenRate()*100).toFixed(1)+'%');
    setText('critStat',Math.round(deps.critChance()*100)+'%');
    setText('resistStat',Math.round(deps.resistance()*100)+'%');

    const fam=deps.dominantFamily();
    const envKey=environmentKey(s,meta,fam);
    if(force||envKey!==lastEnvironmentKey){
      lastEnvironmentKey=envKey;
      const field=$('battlefield');
      field.classList.remove(
        'world-city','world-global','world-planetary','world-cosmic',
        'build-rage','build-speed','build-durability','build-regen',
        'build-cosmic','build-fire','build-psychic','build-tech'
      );
      field.classList.add('build-'+(
        fam==='strength'?'durability':
        fam==='lightning'?'speed':
        fam==='gravity'||fam==='phase'?'psychic':
        fam
      ));
      field.classList.add(deps.worldFor(s.stage).className);
      deps.renderEnvironment();
    }

    const hKey=heroKey(s);
    if(force||hKey!==lastHeroKey){
      lastHeroKey=hKey;
      const hero=$('heroFighter');
      for(const cls of [
        'identity-storm','identity-fire','identity-titan','identity-void',
        'identity-blood','identity-tech','identity-phase','identity-gravity'
      ])hero.classList.remove(cls);

      const ik=s.identityKey||'';
      if(ik.includes('storm'))hero.classList.add('identity-storm');
      if(ik.includes('solar')||ik.includes('burning')||ik==='the_inferno')hero.classList.add('identity-fire');
      if(ik.includes('colossus')||ik==='the_titan')hero.classList.add('identity-titan');
      if(ik.includes('void')||ik==='the_ascendant')hero.classList.add('identity-void');
      if(ik.includes('blood')||ik==='the_undying')hero.classList.add('identity-blood');
      if(ik.includes('arc')||ik==='the_machine')hero.classList.add('identity-tech');
      if(ik.includes('ghost')||ik==='the_phantom')hero.classList.add('identity-phase');
      if(ik.includes('horizon')||ik==='the_singularity')hero.classList.add('identity-gravity');
      deps.applyHeroVisuals();
    }

    const eKey=enemyKey(s);
    if(force||eKey!==lastEnemyKey){
      lastEnemyKey=eKey;
      const enemy=$('enemyFighter');
      enemy.className='fighter enemy info-tap idle';
      if(s.enemy?.elite)enemy.classList.add('elite');
      if(s.enemy?.wall)enemy.classList.add('wall');
      if(s.enemy?.nemesis)enemy.classList.add('nemesis');
      if(s.enemy?.counterFamily)enemy.classList.add('counter-enemy');

      const type=(s.enemy?.trait||'').toLowerCase();
      for(const cls of ['brawler','speed','tech','tank','psychic','phase','energy','regen']){
        if(type.includes(cls))enemy.classList.add(cls);
      }
    }

    const combo=Math.floor(s.fight.combo||0);
    const breakPct=Math.floor(s.fight.break||0);
    setText('comboText','COMBO x'+combo);
    setText('breakText','BREAK '+breakPct+'%');
    setWidth('breakFill',breakPct);

    const powerLeft=Math.max(0,s.activeCdUntil-Date.now());
    const active=deps.activeProfile();
    setText('autoPowerLabel',!s.powers.length?'WAITING':powerLeft>0?Math.ceil(powerLeft/1000)+'s':active[0]);

    const canFinish=!!s.enemy&&(s.enemy.elite||s.enemy.wall)&&!s.fight.finisher&&s.enemyHp/s.enemyMaxHp<=.15;
    $('finisherBtn').disabled=!canFinish;
    $('finisherBtn').classList.toggle('danger-ready',canFinish);
    setText('finisherLabel',canFinish?'FINISH HIM':'ELITES / BOSSES');
    setText('bountyLabel',deps.bountyStatus().count+' / 3');
    $('rivalBanner').classList.toggle('hidden',!s.enemy?.rival);
    setText('ultimateLabel',Math.floor(s.ultimateCharge||0)+'%');
    setText('identityBadge',(s.identityAwakened||deps.identityTitle()).toUpperCase());

    renderLoadout(force);
    updatePowerAlert();

    const duration=performance.now()-started;
    renderCount++;
    totalRenderMs+=duration;
    maxRenderMs=Math.max(maxRenderMs,duration);
    return true
  }

  function invalidate(){
    dirty=true;
    lastEnvironmentKey='';
    lastHeroKey='';
    lastEnemyKey='';
    lastLoadoutKey='';
  }

  function snapshot(){
    return {
      lastRender,
      pending:deps.pendingCount(),
      stage:deps.getRun()?.stage||0,
      powerCount:deps.getRun()?.powers?.length||0,
      renderCount,
      skippedHidden,
      loadoutRebuilds,
      avgRenderMs:renderCount?Number((totalRenderMs/renderCount).toFixed(2)):0,
      maxRenderMs:Number(maxRenderMs.toFixed(2)),
      dirty
    };
  }

  return {render,renderLoadout,updatePowerAlert,invalidate,snapshot};
}

global.PFHUDRuntime={create};
})(window);
