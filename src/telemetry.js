(function(global){
  'use strict';

  const SESSION_KEY='pf_debug_session';
  const session=sessionStorage.getItem(SESSION_KEY)||('pf-'+Date.now().toString(36)+'-'+Math.random().toString(36).slice(2,8));
  sessionStorage.setItem(SESSION_KEY,session);

  const buffer=[];
  let lastSignature='';
  let lastSentAt=0;

  function safe(value){
    try{return JSON.parse(JSON.stringify(value))}
    catch{return String(value)}
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
    console.info('[PFTRACE]',payload);

    const signature=payload.event+'|'+JSON.stringify(payload.data);
    const now=Date.now();
    if(signature===lastSignature&&now-lastSentAt<750)return payload;
    lastSignature=signature;
    lastSentAt=now;

    try{
      fetch('/api/telemetry',{
        method:'POST',
        headers:{'content-type':'application/json'},
        body:JSON.stringify(payload),
        keepalive:true
      }).catch(()=>{});
    }catch{}
    return payload;
  }

  global.PFTelemetry={
    emit,
    session,
    dump:()=>buffer.slice(),
    clear:()=>{buffer.length=0},
    breadcrumbs:()=>breadcrumbs(12)
  };

  function breadcrumbs(limit=8){
    return buffer
      .filter(x=>x.event!=='js_error'&&x.event!=='unhandled_rejection')
      .slice(-limit)
      .map(x=>({ts:x.ts,event:x.event,data:x.data}))
  }

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
    })
  });

  global.addEventListener('unhandledrejection',e=>{
    const reason=e.reason;
    emit('unhandled_rejection',{
      message:reason?.message||String(reason||'unknown'),
      name:reason?.name||'UnhandledRejection',
      stack:String(reason?.stack||'').slice(0,2400),
      breadcrumbs:breadcrumbs()
    })
  });
})(window);
