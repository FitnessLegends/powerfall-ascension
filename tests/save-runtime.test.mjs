import test from 'node:test';
import assert from 'node:assert/strict';

await import('../src/save-runtime.js');
const {PFSaveRuntime}=globalThis;

function makeRuntime(){
  const timers={save:null,autosave:null};
  let writes=0;
  const traces=[];
  const run={stage:20,powers:['flight'],awakeningQueue:[]};
  const meta={souls:0};

  const runtime=PFSaveRuntime.create({
    timers,
    saveVersion:3,
    getRun:()=>run,
    getMeta:()=>meta,
    syncPowerQueue:()=>{},
    write:()=>{writes++;return true},
    load:()=>null,
    toast:()=>{},
    trace:(event,data)=>traces.push({event,data})
  });

  return {runtime,timers,getWrites:()=>writes,traces};
}

test('scheduled saves coalesce instead of rescheduling every kill',()=>{
  const originalSetTimeout=globalThis.setTimeout;
  const originalClearTimeout=globalThis.clearTimeout;
  const scheduled=[];

  globalThis.setTimeout=(fn,delay)=>{
    const id=scheduled.length+1;
    scheduled.push({id,fn,delay});
    return id
  };
  globalThis.clearTimeout=()=>{};

  try{
    const {runtime,timers}=makeRuntime();
    assert.equal(runtime.schedule(),true);
    assert.equal(runtime.schedule(),false);
    assert.equal(scheduled.length,1);
    assert.equal(timers.save,1);
  }finally{
    globalThis.setTimeout=originalSetTimeout;
    globalThis.clearTimeout=originalClearTimeout;
  }
});

test('scheduled saves respect a minimum interval after an immediate write',()=>{
  const originalSetTimeout=globalThis.setTimeout;
  const originalClearTimeout=globalThis.clearTimeout;
  let capturedDelay=null;

  globalThis.setTimeout=(fn,delay)=>{
    capturedDelay=delay;
    return 1
  };
  globalThis.clearTimeout=()=>{};

  try{
    const {runtime,getWrites}=makeRuntime();
    assert.equal(runtime.writeNow(),true);
    assert.equal(getWrites(),1);
    assert.equal(runtime.schedule(0),true);
    assert.ok(capturedDelay>=2900,'scheduled save should be throttled after a recent write');
  }finally{
    globalThis.setTimeout=originalSetTimeout;
    globalThis.clearTimeout=originalClearTimeout;
  }
});
