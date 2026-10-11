import type {Request,Response,NextFunction} from 'express';
type Bucket={start:number;count:number};
const buckets=new Map<string,Bucket>();
/** Conservative per-process defense in depth. Edge/WAF rate limiting remains required. */
export function securityRateLimit() {
 return (req:Request,res:Response,next:NextFunction) => {
  const path=req.path;
  const login=req.method==='POST' && path==='/auth/login';
  const privatePdf=req.method==='GET' && /^\/contracts\/[^/]+\/revisions\/[^/]+\/pdf$/.test(path);
  const mutating=['POST','PUT','PATCH','DELETE'].includes(req.method);
  if (!login && !privatePdf && !mutating) {next();return;}
  const max=login?20:privatePdf?50:300, windowMs=login?15*60_000:60_000;
  const ip=req.ip || req.socket.remoteAddress || 'unknown';
  const key=`${ip}:${login?'login':privatePdf?'pdf':'write'}`;
  const now=Date.now(), old=buckets.get(key);
  const current=old && now-old.start<windowMs ? old : {start:now,count:0};
  current.count++;
  buckets.set(key,current);
  if (buckets.size>10000) for (const [key,value] of buckets) {
    if (now-value.start>15*60_000) buckets.delete(key);
  }
  if(current.count>max) {
    res.setHeader('Retry-After',String(Math.ceil((windowMs-(now-current.start))/1000)));
    res.status(429).json({statusCode:429,message:'Too many requests'});return;
  }
  next();
 };
}
