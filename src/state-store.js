(function(root,factory){
  const api=factory();
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  if(root)root.PFStateStore=api;
})(typeof window!=='undefined'?window:globalThis,function(){
'use strict';

function create(deps){
  let txDepth=0;
  let txId=0;

  function checkpoint(label,extra={}){
    const run=deps.getRun();
    const issues=deps.validate(run,deps.context());
    const summary=deps.summarize(issues);

    if(!summary.ok){
      deps.trace('invariant_failed',{
        checkpoint:label,
        summary,
        issues:issues.slice(0,12),
        ...extra
      });
    }else if(extra.alwaysTrace){
      deps.trace('invariant_passed',{checkpoint:label,...extra});
    }

    return {issues,summary};
  }

  function transaction(label,mutator,options={}){
    const id=++txId;
    const outer=txDepth===0;
    txDepth++;

    if(outer&&!options.skipBefore)checkpoint(label+':before');

    let result;
    try{
      result=mutator();
    }catch(error){
      deps.trace('state_transaction_error',{
        id,label,
        message:error?.message||String(error),
        name:error?.name||'Error',
        stack:String(error?.stack||'').slice(0,1800)
      });
      throw error;
    }finally{
      txDepth--;
    }

    if(outer){
      const after=checkpoint(label+':after');
      deps.trace('state_transaction_complete',{
        id,label,
        ok:after.summary.ok,
        codes:after.summary.codes
      });
    }

    if(options.save)deps.save?.();
    if(options.render)deps.render?.();
    return result;
  }

  function replaceRun(next,label='replace_run'){
    deps.setRun(next);
    return checkpoint(label);
  }

  return {
    transaction,
    checkpoint,
    replaceRun,
    depth:()=>txDepth
  };
}

return {create};
});
