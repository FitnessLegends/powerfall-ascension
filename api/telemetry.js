export default function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ok:false});
  }

  try{
    const raw=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const event=String(raw.event||'unknown').slice(0,80);
    const session=String(raw.session||'unknown').slice(0,80);
    const data=raw.data&&typeof raw.data==='object'?raw.data:{value:String(raw.data||'')};

    console.log('[PFTELEMETRY]',JSON.stringify({
      ts:Number(raw.ts)||Date.now(),
      session,
      event,
      data
    }));

    return res.status(204).end();
  }catch(error){
    console.error('[PFTELEMETRY_ERROR]',error?.message||String(error));
    return res.status(400).json({ok:false});
  }
}
