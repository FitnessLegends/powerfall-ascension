(function(global){
  'use strict';

  const SESSION_KEY='pf_debug_session';
  const session=sessionStorage.getItem(SESSION_KEY)||('pf-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));
  sessionStorage.setItem(SESSION_KEY,session);

  const buffer=[];
  const outbox=[];
  let flushTimer=null;
  let lastSignature='';
  let lastSentAt=0;
  let sentBatches=0;
  let sentEvents=0;

  const criticalEvents=new Set([
    'js_error',
    'unhandled_rejection',
    'invariant_failed',
    'save_write_failed',
    'enemy_hp_zero',
    'enemy_defeat_start',
    'enemy_defeat_resolved',
    'awakening_choice_failed',
    'awakening_post_commit_render_failed',
    'combat_render_failed',
    'render_after_spawn_failed'
  ]);

  function safe(value){
    try{return JSON.parse(JSON.stringify(value))}
    catch{return String(value)}
  }

  function scheduleFlush(delay=1400){
    if(flushTimer)return;
    flushTimer=setTimeout(()=>{
      flushTimer=null;
      flush()
    },delay)
  }

  function flush(){
    if(!outbox.length)return Promise.resolve(false);

    const events=outbox.splice(0,Math.min(40,outbox.length));
    sentBatches++;
    sentEvents+=events.length;

    try{
      return fetch('/api/telemetry',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify({events}),
        keepalive:true
      }).catch(()=>{
        // Put the batch back once. Local breadcrumbs still remain available
        // even if remote telemetry is unavailable.
        if(outbox.length<80)outbox.unshift(...events.slice(-20));
        return false
      })
    }catch{
      return Promise.resolve(false)
    }
  }

  function emit(event,data={}){
    const payload={
      ts:Date.now(),
      session,
      event:String(event||'unknown').slice(0,80),
      data:safe(data)
    };

    buffer.push(payload);
    if(buffer.length>120)buffer.shift();

    if(global.PF_DEBUG_CONSOLE)console.info('[PFTRACE]',payload);

    const signature=payload.event+'|'+JSON.stringify(payload.data);
    const now=Date.now();
    if(signature===lastSignature&&now-lastSentAt<750)return payload;
    lastSignature=signature;
    lastSentAt=now;

    outbox.push(payload);
    if(outbox.length>80)outbox.splice(0,outbox.length-80);

    if(criticalEvents.has(payload.event)||outbox.length>=20)scheduleFlush(80);
    else scheduleFlush();

    return payload;
  }

  function breadcrumbs(limit=8){
    return buffer
      .filter(x=>x.event!=='js_error'&&x.event!=='unhandled_rejection')
      .slice(-limit)
      .map(x=>({ts:x.ts,event:x.event,data:x.data}))
  }

  global.PFTelemetry={
    emit,
    session,
    dump:()=>buffer.slice(),
    clear:()=>{buffer.length=0},
    breadcrumbs:()=>breadcrumbs(12),
    flush,
    status:()=>({
      buffered:buffer.length,
      queued:outbox.length,
      sentBatches,
      sentEvents
    })
  };

  global.addEventListener('pagehide',()=>{
    if(outbox.length)flush()
  });

  global.addEventListener('error',e=>{
    const err=e.error;
    emit('js_error',{
      message:e.message||err?.message||'unknown',
      name:err?.name||'Error',
      file:(e.filename||'').split('/').pop(),
      line:e.lineno||0,
      column:e.colno||0,
      stack:String(err?.stack||'').slice(0,2400),
      breadcrumbs:breadcrumbs()
    });
    flush()
  });

  global.addEventListener('unhandledrejection',e=>{
    const reason=e.reason;
    emit('unhandled_rejection',{
      message:reason?.message||String(reason||'unknown'),
      name:reason?.name||'UnhandledRejection',
      stack:String(reason?.stack||'').slice(0,2400),
      breadcrumbs:breadcrumbs()
    });
    flush()
  });
})(window);
