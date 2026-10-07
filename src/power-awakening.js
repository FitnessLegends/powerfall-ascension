(function(global){
'use strict';

function create(deps){
  const stats={runs:0,recovered:0,lastReason:'boot',lastPending:0,lastResolved:0};
  const ui=deps.ui;

  const run=()=>deps.getRun();
  const meta=()=>deps.getMeta();
  const powers=()=>deps.getPowers();

  function normalize(raw){
    const s=run();
    if(!raw||typeof raw!=='object')return null;
    const source=deps.validRewardSource(raw.source)?raw.source:'milestone';
    const stage=Math.floor(deps.clamp(raw.stage||s.stage||1,1,10000));
    const key=deps.rewardKey(source,stage);
    return {
      id:key,key,source,stage,status:'pending',selectedPowerId:null,
      minRarity:raw.minRarity||'common',
      options:Array.isArray(raw.options)?[...new Set(raw.options)].filter(id=>deps.byId(id)):[],
      rerolled:!!raw.rerolled,
      gambled:!!raw.gambled,
      createdAt:deps.finite(raw.createdAt,Date.now())
    };
  }

  function pending(){
    const s=run();
    if(!Array.isArray(s.awakeningQueue))s.awakeningQueue=[];
    return s.awakeningQueue;
  }

  function current(){return pending()[0]||null}

  function resolvedCount(){
    return Object.values(run().powerRewards||{}).filter(x=>x?.status==='resolved').length;
  }

  function oldResolved(source,stage){
    const s=run();
    const canonical=deps.rewardKey(source,stage);
    const legacy=deps.legacyRewardKey(source,stage);
    return !!(
      s.resolvedPowerChoices?.[canonical]||
      s.resolvedPowerChoices?.[legacy]||
      s.consumedChoices?.includes(canonical)||
      s.consumedChoices?.includes(legacy)||
      s.powerRewards?.[canonical]?.status==='resolved'
    );
  }

  function enqueue(item){
    const s=run();
    const reward=normalize(item);
    if(!reward||oldResolved(reward.source,reward.stage))return null;
    const existing=s.awakeningQueue?.find(x=>x.key===reward.key);
    if(existing)return existing;
    if(!Array.isArray(s.awakeningQueue))s.awakeningQueue=[];
    s.awakeningQueue.push(reward);
    deps.setLegacyQueue(s.awakeningQueue);
    return reward;
  }

  function repair(reason='runtime',legacyQueue=null){
    const s=run();
    stats.runs++;
    stats.lastReason=reason;

    if(!Array.isArray(s.awakeningQueue))s.awakeningQueue=[];
    if(!s.powerRewards||typeof s.powerRewards!=='object'||Array.isArray(s.powerRewards))s.powerRewards={};
    if(!s.resolvedPowerChoices||typeof s.resolvedPowerChoices!=='object')s.resolvedPowerChoices={};
    if(!Array.isArray(s.consumedChoices))s.consumedChoices=[];

    const migrated=[];
    const candidates=[
      ...Object.values(s.powerRewards||{}).filter(x=>x&&x.status==='pending'),
      ...(Array.isArray(legacyQueue)?legacyQueue:[]),
      ...deps.getLegacyQueue()
    ];

    for(const raw of candidates){
      const aw=normalize(raw);
      if(!aw||oldResolved(aw.source,aw.stage))continue;
      if(!s.awakeningQueue.some(x=>x.key===aw.key)){
        s.awakeningQueue.push(aw);
        migrated.push(aw.key);
      }
    }

    for(const [key,r] of Object.entries(s.powerRewards)){
      if(r?.status==='pending')delete s.powerRewards[key];
    }

    s.awakeningQueue=s.awakeningQueue
      .map(normalize)
      .filter(Boolean)
      .filter((r,i,arr)=>arr.findIndex(x=>x.key===r.key)===i)
      .filter(r=>!oldResolved(r.source,r.stage))
      .sort((a,b)=>(a.createdAt||0)-(b.createdAt||0)||a.stage-b.stage);

    deps.setLegacyQueue(s.awakeningQueue);
    ui.locked=false;
    ui.activeChoices=[];

    stats.recovered+=migrated.length;
    stats.lastPending=s.awakeningQueue.length;
    stats.lastResolved=resolvedCount();

    deps.trace('awakening_state_repaired',{
      reason,
      pending:s.awakeningQueue.length,
      migrated
    });

    return {
      pending:s.awakeningQueue.length,
      resolved:stats.lastResolved,
      recovered:migrated.length
    };
  }

  function report(){
    const list=pending();
    const unique=new Set(list.map(x=>x.key)).size===list.length;
    const valid=list.every(x=>x.status==='pending'&&Array.isArray(x.options));
    return {
      ok:unique&&valid,
      pending:list.length,
      resolved:resolvedCount(),
      stale:0,
      repairs:stats.runs,
      recovered:stats.recovered,
      removed:0,
      lastReason:stats.lastReason
    };
  }

  function rarityValue(r){
    return {common:0,rare:1,epic:2,legendary:3,cosmic:4}[r]??0;
  }

  function roll(item){
    const s=run();
    const m=meta();
    const min=rarityValue(item.minRarity||'common');
    const owned=new Set(s.powers);
    const eligible=powers().filter(deps.powerUnlocked);
    const unowned=eligible.filter(p=>!owned.has(p.id));
    const recent=new Set(s.recentPowerOffers||[]);
    const stage=item.stage||s.stage;
    const bias=Math.floor((m.soulTree.rarity_bias||0)/25)+(m.cosmicLaws?.law_mutation||0);
    const weights={
      common:Math.max(8,(stage<80?48:25)-bias*2),
      rare:35+bias,
      epic:(stage<50?8:25)+bias*1.4,
      legendary:(stage<100?1:12)+bias*.7,
      cosmic:(stage<250?0:5)+bias*.3
    };

    function weightedPick(pool,exclude){
      let available=pool.filter(p=>!exclude.has(p.id)&&rarityValue(p.rarity)>=min);
      if(!available.length)available=pool.filter(p=>!exclude.has(p.id));
      if(!available.length)return null;

      const tickets=[];
      for(const p of available){
        let weight=weights[p.rarity]??1;
        if(rarityValue(p.rarity)<min)weight=.1;
        if(recent.has(p.id))weight*=.14;
        if(!owned.has(p.id))weight*=1.35;
        const count=Math.max(1,Math.ceil(weight*(p.weight||1)));
        for(let i=0;i<count;i++)tickets.push(p);
      }
      return tickets[Math.floor(Math.random()*tickets.length)]||available[0];
    }

    const count=Math.min(7,3+(m.soulTree.choice||0));
    const picked=[];
    const used=new Set();

    while(picked.length<count&&used.size<eligible.length){
      let pool=unowned.length?unowned:eligible;
      if(stage>=125&&s.powers.length&&picked.length===count-1&&Math.random()<.35){
        pool=eligible.filter(p=>owned.has(p.id));
      }
      const choice=weightedPick(pool,used)||weightedPick(eligible,used);
      if(!choice)break;
      picked.push(choice);
      used.add(choice.id);
    }

    if(picked.length){
      s.recentPowerOffers=[...(s.recentPowerOffers||[]),...picked.map(p=>p.id)].slice(-12);
    }

    deps.trace('awakening_roll',{
      rewardKey:item.key||null,
      stage,
      eligible:eligible.length,
      unowned:unowned.length,
      offered:picked.map(p=>p.id)
    });

    return picked;
  }

  function guaranteedChoices(item){
    let choices=[];
    try{
      choices=(item?.options||[]).map(deps.byId).filter(Boolean);
    }catch(error){
      deps.trace('awakening_stored_choice_error',{message:error?.message||String(error)});
    }

    if(!choices.length){
      try{choices=roll(item||{}).filter(Boolean)}
      catch(error){deps.trace('awakening_roll_error',{message:error?.message||String(error)})}
    }

    if(!choices.length){
      const starters=['super_strength','iron_skin','regeneration','hyper_speed','flight','laser_vision'];
      choices=starters.map(deps.byId).filter(Boolean).slice(0,3);
      deps.trace('awakening_emergency_pool',{offered:choices.map(p=>p.id)});
    }

    if(!choices.length){
      choices=powers().filter(Boolean).slice(0,3);
      deps.trace('awakening_absolute_fallback',{offered:choices.map(p=>p.id)});
    }

    if(item&&choices.length)item.options=choices.map(p=>p.id);
    return choices;
  }

  function safePreview(power,owned){
    try{return owned?deps.masteryPreview(power):deps.powerPreview(power)}
    catch(error){
      deps.trace('awakening_preview_error',{powerId:power?.id||null,message:error?.message||String(error)});
      return owned?'Duplicate power increases Mastery':'Power effect applies immediately when chosen';
    }
  }

  function render(item){
    ui.activeChoices=guaranteedChoices(item);
    deps.$('powerModalQueue').textContent=pending().length;

    const grid=deps.$('powerChoices');
    grid.innerHTML='';
    grid.classList.remove('input-locked');
    grid.classList.toggle('four',ui.activeChoices.length===4);

    for(const p of ui.activeChoices){
      try{
        const owned=run().powers.includes(p.id);
        const card=document.createElement('button');
        card.type='button';
        card.className='power-choice'+(owned?' mastery-choice':'');
        card.dataset.powerId=p.id;

        const title=owned?'MASTERY · '+p.name:p.name;
        const badge=owned?'mastery':p.rarity;
        const tags=(p.tags||[]).slice(0,3)
          .map(t=>'<span class="power-tag">'+deps.escapeHtml(String(t).toUpperCase())+'</span>')
          .join('');

        card.innerHTML=
          '<div class="choice-identity">'+deps.powerSymbol(p,'choice-symbol')+
          '<div><div class="top"><strong>'+deps.escapeHtml(title)+'</strong>'+
          '<span class="rarity '+deps.escapeHtml(p.rarity||'common')+'">'+deps.escapeHtml(badge||'common')+'</span></div>'+
          '<small class="choice-family">'+deps.escapeHtml(deps.powerTone(p).toUpperCase())+' POWER</small></div></div>'+
          '<div class="power-tags">'+tags+'</div>'+
          '<p>'+deps.escapeHtml(p.desc||'Power mutation')+'</p>'+
          (p.tradeoff&&!owned?'<div class="tradeoff"><b>RISK</b> · '+deps.escapeHtml(p.tradeoff)+'</div>':'')+
          '<small class="power-preview"><b>NOW</b> · '+deps.escapeHtml(safePreview(p,owned))+'</small>';

        let press=null;
        card.addEventListener('pointerdown',ev=>{
          if(ev.pointerType==='mouse'&&ev.button!==0)return;
          if(performance.now()<ui.armedAt){press=null;return}
          press={id:ev.pointerId,x:ev.clientX,y:ev.clientY,moved:false};
        },{passive:true});
        card.addEventListener('pointermove',ev=>{
          if(!press||press.id!==ev.pointerId)return;
          if(Math.hypot(ev.clientX-press.x,ev.clientY-press.y)>9)press.moved=true;
        },{passive:true});
        card.addEventListener('pointercancel',()=>{press=null});
        card.addEventListener('pointerup',ev=>{
          if(ev.pointerType==='mouse'&&ev.button!==0)return;
          const hit=press;press=null;
          if(!hit||hit.id!==ev.pointerId||hit.moved)return;
          ev.preventDefault();
          choose(p.id,item.key);
        },{passive:false});
        card.addEventListener('click',ev=>{
          if(ev.detail===0)choose(p.id,item.key);
        });
        grid.appendChild(card);
      }catch(error){
        deps.trace('awakening_card_render_error',{powerId:p?.id||null,message:error?.message||String(error)});
      }
    }

    if(!grid.children.length){
      const fatal=document.createElement('div');
      fatal.className='power-choice-repair';
      fatal.innerHTML='<strong>POWER POOL ERROR</strong><small>The reward is still safe. Reload this build and the selector will retry.</small>';
      grid.appendChild(fatal);
      deps.trace('awakening_zero_cards',{rewardKey:item?.key||null});
    }

    deps.$('rerollPowerBtn').classList.toggle('hidden',!meta().soulTree.reroll);
    deps.$('rerollPowerBtn').disabled=!!item.rerolled;
    updateGambleButton();
  }

  function open(){
    const item=current();
    deps.trace('awakening_open_request',{key:item?.key||null});
    if(!item){
      deps.showScreen('gameScreen',true);
      deps.updatePowerAlert();
      deps.toast('NO POWER AWAKENING WAITING');
      return;
    }

    deps.closeConflictingUi();
    const banner=deps.$('majorBanner');
    clearTimeout(banner._to);
    banner.classList.add('hidden');
    deps.resetTransientInput();

    ui.locked=false;
    ui.activeChoices=[];
    ui.visible=false;
    ui.decisionPaused=false;
    document.body.classList.remove('power-awakening-open');
    deps.$('powerChoices').classList.remove('input-locked');
    deps.$('powerModal').classList.remove('input-shielded','hidden');

    show();
  }

  function show(){
    const item=current();
    if(!item){
      deps.showScreen('gameScreen',true);
      return;
    }

    const resolved=guaranteedChoices(item);
    ui.activeChoices=resolved;
    deps.trace('awakening_choices_ready',{key:item.key,options:resolved.map(p=>p.id)});

    ui.visible=true;
    document.body.classList.add('power-awakening-open');
    deps.pauseCombat();
    ui.decisionPaused=true;
    ui.armedAt=performance.now()+500;

    deps.$('powerModal').dataset.rarity=
      resolved.reduce((best,p)=>rarityValue(p.rarity)>rarityValue(best)?p.rarity:best,'common');

    deps.$('powerModal').classList.remove('hidden');
    deps.showScreen('powerModal',true);
    render(item);
    deps.updatePowerAlert();
    deps.scheduleSave();
  }

  function hide(){
    if(current())return;
    ui.visible=false;
    ui.decisionPaused=false;
    document.body.classList.remove('power-awakening-open');
    deps.showScreen('gameScreen',true);
    deps.resumeCombat();
  }

  function choose(id,choiceId){
    const s=run();
    const reward=current();
    const power=deps.byId(id);

    deps.trace('awakening_choice_attempt',{
      choiceId,
      powerId:id,
      rewardKey:reward?.key||null
    });

    if(!reward||reward.key!==choiceId||!power||ui.locked||performance.now()<ui.armedAt)return;
    if(!reward.options.includes(id))return;

    ui.locked=true;
    const grid=deps.$('powerChoices');
    grid.classList.add('input-locked');
    grid.querySelectorAll('button').forEach(b=>b.disabled=true);

    const alreadyOwned=s.powers.includes(id);
    if(alreadyOwned){
      deps.applyPowerMastery(power);
    }else{
      s.powers.push(id);
      meta().totalPowersFound++;
      meta().powerUnlocks=Array.from(new Set([...(meta().powerUnlocks||[]),id]));
      deps.applyEffect(s,power.effect);
      deps.applyPermanentMastery(power);
      if(!s.powers.includes(id))s.powers.push(id);
      s.powers=Array.from(new Set(s.powers.filter(pid=>deps.byId(pid))));
    }

    if(!alreadyOwned&&!s.powers.includes(id)){
      ui.locked=false;
      grid.classList.remove('input-locked');
      grid.querySelectorAll('button').forEach(b=>b.disabled=false);
      deps.trace('awakening_choice_failed',{powerId:id,rewardKey:reward?.key||null});
      deps.toast('POWER ACQUISITION FAILED · TRY AGAIN');
      return;
    }

    s.resolvedPowerChoices[reward.key]=id;
    s.resolvedPowerChoices[deps.legacyRewardKey(reward.source,reward.stage)]=id;
    if(!s.consumedChoices.includes(reward.key))s.consumedChoices.push(reward.key);
    s.powerRewards[reward.key]={...reward,status:'resolved',selectedPowerId:id,options:[...reward.options]};
    s.awakeningQueue=s.awakeningQueue.filter(x=>x.key!==reward.key);
    deps.setLegacyQueue(s.awakeningQueue);

    deps.$('powerModal').classList.remove('input-shielded');
    ui.visible=false;
    ui.decisionPaused=false;
    document.body.classList.remove('power-awakening-open');
    deps.showScreen('gameScreen',true);
    ui.locked=false;
    ui.activeChoices=[];
    grid.classList.remove('input-locked');

    deps.checkCombos();
    deps.checkEmergentEvolutions();
    deps.checkIdentityAwakening();

    // Commit state first. Rendering is presentation and must never be able
    // to interrupt a successful acquisition or leave combat paused.
    const saved=deps.saveNow();

    deps.trace('awakening_choice_committed',{
      powerId:id,
      alreadyOwned,
      remaining:s.awakeningQueue.length,
      saved
    });

    try{
      deps.renderAll();
      deps.renderHUD(true);
      deps.renderLoadout();
      deps.updatePowerAlert();
    }catch(error){
      deps.trace('awakening_post_commit_render_failed',{
        powerId:id,
        message:error?.message||String(error),
        name:error?.name||'Error'
      });
      console.error('[Powerfall] awakening post-commit render failed',error)
    }finally{
      deps.toast(power.name+(alreadyOwned?' MASTERY '+(s.powerMastery?.[id]||1):' ACQUIRED · ADDED TO DECK'));
      deps.resumeCombat()
    }

    if(current())setTimeout(open,350);
  }

  function reroll(fromGesture=false){
    const item=current();
    if(!fromGesture||performance.now()<ui.armedAt)return;
    if(ui.locked||!item||item.rerolled||!meta().soulTree.reroll)return;

    item.rerolled=true;
    item.options=roll(item).map(p=>p.id);
    ui.activeChoices=item.options.map(deps.byId).filter(Boolean);
    deps.trace('awakening_rerolled',{key:item.key,options:item.options});
    render(item);
    updateGambleButton();
    deps.saveNow();
  }

  function gamble(fromGesture=false){
    const item=current();
    if(!fromGesture||performance.now()<ui.armedAt)return;
    if(!item||item.status!=='pending'||item.gambled||ui.locked)return;

    item.gambled=true;
    const s=run();
    s.maxHp=Math.max(1,s.maxHp*.85);
    s.hp=Math.min(s.hp,s.maxHp);

    const next=Math.min(4,rarityValue(item.minRarity||'common')+1);
    item.minRarity=['common','rare','epic','legendary','cosmic'][next];
    item.options=roll(item).map(p=>p.id);
    ui.activeChoices=item.options.map(deps.byId).filter(Boolean);

    deps.trace('awakening_risk_mutation',{
      key:item.key,
      minRarity:item.minRarity,
      options:item.options
    });

    render(item);
    updateGambleButton();
    deps.toast('RISK MUTATION: -15% MAX HP / RARITY FLOOR RAISED');
    deps.saveNow();
  }

  function updateGambleButton(){
    const item=current();
    deps.$('gamblePowerBtn').disabled=!item||!!item.gambled||ui.locked;
  }

  function queue(item){
    const s=run();
    if(s.challengeMode==='null_protocol')return null;
    const reward=enqueue(item);
    if(!reward)return null;

    deps.trace('awakening_queued',{
      key:reward.key,
      source:reward.source,
      rewardStage:reward.stage
    });

    deps.setLegacyQueue(pending());
    deps.updatePowerAlert();
    deps.scheduleSave();
    deps.toast('POWER AWAKENING READY');
    return reward;
  }

  return {
    normalize,
    pending,
    current,
    enqueue,
    repair,
    report,
    roll,
    guaranteedChoices,
    render,
    open,
    show,
    hide,
    choose,
    reroll,
    gamble,
    updateGambleButton,
    queue,
    resolvedCount,
    isVisible:()=>ui.visible,
    isPaused:()=>ui.decisionPaused,
    isLocked:()=>ui.locked,
    activeChoices:()=>ui.activeChoices.slice(),
    armedAt:()=>ui.armedAt
  };
}

global.PFAwakening={create};
})(window);
