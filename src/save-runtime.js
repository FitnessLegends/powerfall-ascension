(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.PFSaveRuntime=api;
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';

function create(deps){
  const timers=deps.timers;
  let lastWriteAt=0;
  let writeCount=0;
  let scheduledCount=0;
  const minScheduledInterval=3000;

  function snapshot(){
    const s=deps.getRun();
    const meta=deps.getMeta();
    deps.syncPowerQueue();
    return JSON.parse(JSON.stringify({
      saveVersion:deps.saveVersion,
      meta,
      run:s,
      powerQueue:Array.isArray(s.awakeningQueue)?s.awakeningQueue:[],
      timestamp:Date.now()
    }));
  }

  function writeNow(){
    clearTimeout(timers.save);
    timers.save=null;
    const snap=snapshot();
    const ok=deps.write(snap);
    lastWriteAt=Date.now();
    writeCount++;

    deps.trace(ok?'save_write_ok':'save_write_failed',{
      stage:snap.run?.stage||0,
      pending:snap.run?.awakeningQueue?.length||0,
      powers:snap.run?.powers?.length||0
    });

    if(!ok)deps.toast('SAVE FAILED — progress is not stored');
    return ok;
  }

  function schedule(delay=500){
    if(timers.save)return false;
    const sinceLast=Date.now()-lastWriteAt;
    const wait=Math.max(delay,minScheduledInterval-sinceLast,0);
    scheduledCount++;
    timers.save=setTimeout(writeNow,wait);
    return true;
  }

  function load(){
    const data=deps.load();
    deps.trace(data?'save_load_ok':'save_load_empty',{
      saveVersion:data?.saveVersion??null,
      stage:data?.run?.stage??null,
      pending:Array.isArray(data?.run?.awakeningQueue)
        ?data.run.awakeningQueue.length
        :Array.isArray(data?.powerQueue)?data.powerQueue.length:0
    });
    return data;
  }

  function startAutosave(ms=10000){
    clearInterval(timers.autosave);
    timers.autosave=setInterval(()=>schedule(),ms);
    deps.trace('autosave_started',{ms});
  }

  function stopAutosave(){
    clearInterval(timers.autosave);
    timers.autosave=null;
    deps.trace('autosave_stopped',{});
  }

  function status(){
    return {
      saveScheduled:!!timers.save,
      autosaveActive:!!timers.autosave,
      saveVersion:deps.saveVersion,
      writeCount,
      scheduledCount,
      msSinceWrite:lastWriteAt?Date.now()-lastWriteAt:null,
      minScheduledInterval
    };
  }

  return {
    snapshot,
    writeNow,
    schedule,
    load,
    startAutosave,
    stopAutosave,
    status
  };
}

return {create};
});
