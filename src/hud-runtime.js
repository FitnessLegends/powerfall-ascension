(function(global){
'use strict';

function create(deps){
  let lastRender=0;

  function updatePowerAlert(){
    const pending=deps.pendingCount();
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

  function renderLoadout(){
    const s=deps.getRun();
    const icons=deps.$('loadoutIcons');
    const powers=s.powers.map(deps.byId).filter(Boolean);

    deps.$('loadoutIdentity').textContent=(s.identityAwakened||deps.identityTitle()).toUpperCase();

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

    deps.$('loadoutMore').textContent=
      powers.length+' POWER'+(powers.length===1?'':'S')+' · TAP DECK';
  }

  function render(force=false){
    const now=performance.now();
    if(!force&&now-lastRender<110)return;
    lastRender=now;

    const s=deps.getRun();
    const meta=deps.getMeta();
    const $=deps.$;

    $('coins').textContent=deps.fmt(s.coins);
    $('souls').textContent=deps.fmt(meta.souls);
    $('stageLabel').textContent='Stage '+s.stage;
    $('worldLabel').textContent=deps.worldFor(s.stage).name;

    const next=deps.nextMilestone(s.stage+1);
    const opBtn=$('operationBtn');
    $('nextMilestoneIcon').textContent=s.operationReady?'OPS':next.icon;
    $('nextMilestoneText').textContent=s.operationReady
      ?'OPERATION '+s.stage+' READY'
      :(next.type==='boss'?'Operation':'Power after clearing Stage')+
        ' '+next.stage+' · '+Math.max(0,next.stage-s.stage)+' to go';
    opBtn.classList.toggle('hidden',!s.operationReady||s.inOperation);

    $('enemyName').textContent=s.enemy?.name||'Enemy';
    $('enemyHpLabel').textContent=s.enemy?.wall?'WALL BOSS':s.enemy?.nemesis?'NEMESIS':s.enemy?.elite?'ELITE CRIMINAL':'CRIMINAL';

    $('bossBanner').classList.toggle('hidden',!s.enemy?.wall);
    if(s.enemy?.wall&&$('bossBanner').dataset.stage!==String(s.stage)){
      $('bossBanner').dataset.stage=String(s.stage);
      deps.showMajorBanner('OPERATION ACTIVE',s.enemy.name||'WALL BOSS','Major threat engaged. Your build is being tested.',2600);
    }
    $('eliteBanner').classList.toggle('hidden',!s.enemy?.elite||s.enemy?.wall);

    const patrolGoal=deps.isWallBoss(s.stage)&&!s.inOperation
      ?Math.max(2,5-(meta.soulTree.patrol_compression||0))
      :s.stage<25?2:s.stage<100?3:4;

    $('encounterChip').textContent=
      s.inOperation&&s.enemy?.wall?'BOSS OPERATION':
      s.operationReady?'OPERATION READY':
      s.enemy?.nemesis?'PERSONAL NEMESIS':
      s.enemy?.elite?'ELITE THREAT':
      'PATROL '+Math.min(patrolGoal,(s.patrolXP||0)+1)+' / '+patrolGoal;

    $('factionChip').textContent=s.enemy?.evolutions?.length
      ?'EVOLVED ×'+s.enemy.evolutions.length
      :(s.enemy?.faction||deps.factionFor(s.stage));

    $('hpText').textContent=deps.fmt(s.hp)+' / '+deps.fmt(s.maxHp);
    $('enemyHpText').textContent=deps.fmt(s.enemyHp)+' / '+deps.fmt(s.enemyMaxHp);
    $('hpBar').style.width=deps.clamp(s.hp/s.maxHp*100,0,100)+'%';
    $('enemyHpBar').style.width=deps.clamp(s.enemyHp/s.enemyMaxHp*100,0,100)+'%';

    $('damageStat').textContent=deps.fmt(deps.totalDamage());
    $('apsStat').textContent=(1000/Math.max(120,s.attackMs)).toFixed(1);
    $('regenStat').textContent=(deps.regenRate()*100).toFixed(1)+'%';
    $('critStat').textContent=Math.round(deps.critChance()*100)+'%';
    $('resistStat').textContent=Math.round(deps.resistance()*100)+'%';

    const field=$('battlefield');
    field.classList.remove(
      'world-city','world-global','world-planetary','world-cosmic',
      'build-rage','build-speed','build-durability','build-regen',
      'build-cosmic','build-fire','build-psychic','build-tech'
    );
    const fam=deps.dominantFamily();
    field.classList.add('build-'+(
      fam==='strength'?'durability':
      fam==='lightning'?'speed':
      fam==='gravity'||fam==='phase'?'psychic':
      fam
    ));
    field.classList.add(deps.worldFor(s.stage).className);

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

    const combo=Math.floor(s.fight.combo||0);
    const breakPct=Math.floor(s.fight.break||0);
    $('comboText').textContent='COMBO x'+combo;
    $('breakText').textContent='BREAK '+breakPct+'%';
    $('breakFill').style.width=breakPct+'%';

    const powerLeft=Math.max(0,s.activeCdUntil-Date.now());
    const active=deps.activeProfile();
    $('autoPowerLabel').textContent=!s.powers.length?'WAITING':powerLeft>0?Math.ceil(powerLeft/1000)+'s':active[0];

    const canFinish=!!s.enemy&&(s.enemy.elite||s.enemy.wall)&&!s.fight.finisher&&s.enemyHp/s.enemyMaxHp<=.15;
    $('finisherBtn').disabled=!canFinish;
    $('finisherBtn').classList.toggle('danger-ready',canFinish);
    $('finisherLabel').textContent=canFinish?'FINISH HIM':'ELITES / BOSSES';
    $('bountyLabel').textContent=deps.bountyStatus().count+' / 3';
    $('rivalBanner').classList.toggle('hidden',!s.enemy?.rival);
    $('ultimateLabel').textContent=Math.floor(s.ultimateCharge||0)+'%';
    $('identityBadge').textContent=(s.identityAwakened||deps.identityTitle()).toUpperCase();

    renderLoadout();
    deps.renderEnvironment();
    updatePowerAlert();
    deps.applyHeroVisuals();
  }

  function snapshot(){
    return {
      lastRender,
      pending:deps.pendingCount(),
      stage:deps.getRun()?.stage||0,
      powerCount:deps.getRun()?.powers?.length||0
    };
  }

  return {render,renderLoadout,updatePowerAlert,snapshot};
}

global.PFHUDRuntime={create};
})(window);
