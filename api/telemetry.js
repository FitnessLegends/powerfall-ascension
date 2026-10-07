export default function handler(req,res){
  if(req.method!=='POST'){
    res.setHeader('Allow','POST');
    return res.status(405).json({ok:false});
  }

  try{
    const raw=typeof req.body==='string'?JSON.parse(req.body||'{}'):(req.body||{});
    const source=Array.isArray(raw.events)?raw.events:[raw];
    const events=source.slice(0,50);

    for(const item of events){
      const event=String(item?.event||'unknown').slice(0,80);
      const session=String(item?.session||'unknown').slice(0,80);
      const data=item?.data&&typeof item.data==='object'
        ?item.data
        :{value:String(item?.data||'')};

      console.log('[PFTELEMETRY]',JSON.stringify({
        ts:Number(item?.ts)||Date.now(),
        session,
        event,
        data
      }));
    }

    return res.status(204).end();
  }catch(error){
    console.error('[PFTELEMETRY_ERROR]',error?.message||String(error));
    return res.status(400).json({ok:false});
  }
}
