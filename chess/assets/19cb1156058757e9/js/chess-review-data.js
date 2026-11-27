/* Post-game statistics. No changes to evaluation, clock rules or ratings. */
(function(root){
 'use strict';
 const MAX=1200,MAX_DS=2147483646;
 const settings=key=>{if(typeof key!=='string'||!/^\d+(?:\+\d+)?$/.test(key))return null;const [m,s=0]=key.split('+').map(Number);return m>0&&m<=180&&s<=300?{base:m*600,inc:s*10}:null;};
 const valid=n=>Number.isSafeInteger(n)&&n>=0&&n<=MAX_DS;
 function put(out,n){do{const b=n%128;n=Math.floor(n/128);out.push(b+(n?128:0));}while(n);}
 function wire(bytes){let raw='';for(const b of bytes)raw+=String.fromCharCode(b);return 't1:'+btoa(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');}
 function fromHex(hex){if(typeof hex!=='string'||!/^\\x(?:[a-f0-9]{2}){1,24000}$/i.test(hex))return null;return wire(Uint8Array.from(hex.slice(2).match(/../g),b=>parseInt(b,16)));}
 function pack(samples,clockKey){
  const c=settings(clockKey);if(!c||!Array.isArray(samples)||samples.length>MAX||!samples.some(s=>s&&(valid(s.spent)||valid(s.remaining))))return null;
  const prev={w:c.base,b:c.base},out=[];
  for(let i=0;i<samples.length;i++){
   const s=samples[i],side=i%2?'b':'w',spent=valid(s?.spent)?s.spent:null,remaining=valid(s?.remaining)?s.remaining:null;
   if(spent===null&&remaining===null){put(out,0);prev[side]=null;continue;}
   const expected=spent!==null&&prev[side]!==null?prev[side]-spent:null;
   if(expected===null||expected<0||remaining!==null&&remaining!==expected){put(out,1);put(out,spent===null?0:spent+1);put(out,remaining===null?0:remaining+1);prev[side]=remaining===null?null:remaining+c.inc;}
   else{put(out,spent+2);prev[side]=expected+c.inc;}
  }
  return wire(out);
 }
 function decode(value,count,clockKey){
  const c=settings(clockKey);if(!c||!Number.isInteger(count)||count<0||count>MAX||typeof value!=='string'||!/^t1:[A-Za-z0-9_-]{1,32000}$/.test(value))return null;
  try{
   const raw=atob(value.slice(3).replace(/-/g,'+').replace(/_/g,'/')+'==='.slice((value.length-3+3)%4)),out=[],prev={w:c.base,b:c.base};let at=0;
   const read=()=>{let n=0,shift=1;for(let k=0;k<5;k++){if(at>=raw.length)throw Error('short');const b=raw.charCodeAt(at++);n+=(b&127)*shift;if(!(b&128)){if(!Number.isSafeInteger(n)||n>2147483648)throw Error('range');return n;}shift*=128;}throw Error('long');};
   for(let i=0;i<count;i++){
    const code=read(),side=i%2?'b':'w';let spent=null,remaining=null;
    if(code===1){const a=read(),b=read();spent=a?a-1:null;remaining=b?b-1:null;}
    else if(code>=2){spent=code-2;if(prev[side]!==null){remaining=prev[side]-spent;if(remaining<0)throw Error('negative');}}
    if(spent!==null&&!valid(spent)||remaining!==null&&!valid(remaining))throw Error('range');
    out.push(spent===null&&remaining===null?null:{spent,remaining});prev[side]=remaining===null?null:remaining+c.inc;
   }
   if(at!==raw.length)return null;return out.some(Boolean)?out:null;
  }catch(e){return null;}
 }
 function snapshots(samples,clockKey){
  const cfg=settings(clockKey);if(!cfg||!Array.isArray(samples))return [];
  const left={w:cfg.base,b:cfg.base};
  return samples.map((t,i)=>{const side=i%2?'b':'w',other=i%2?'w':'b',baseline=left[side];
   const snapshot=valid(t?.remaining)&&left[other]!==null?{w:(side==='w'?t.remaining:left.w)*100,b:(side==='b'?t.remaining:left.b)*100,inc:cfg.inc*100,turnStart:baseline===null?undefined:baseline*100,last:0}:null;
   left[side]=valid(t?.remaining)?t.remaining+cfg.inc:null;return snapshot;
  });
 }
 const eligible=r=>r&&r.loss!=null&&!r.uncertain&&!r.unavailable&&!['forced','opening'].includes(r.cls);
 function phases(rows,side){
  let endgame=false;const values={Q:9,R:5,B:3,N:3},buckets={opening:[],middle:[],ending:[]};
  for(let i=0;i<rows.length;i++){
   const r=rows[i],s=r.S;
   if(s&&s.b.reduce((sum,p)=>sum+(values[p?.toUpperCase()]||0),0)<=20)endgame=true;
   const phase=endgame?'ending':i<20?'opening':'middle';
   if((r.mover||s?.turn)===side&&eligible(r))buckets[phase].push(r);
  }
  return Object.fromEntries(Object.entries(buckets).map(([phase,list])=>[phase,{count:list.length,accuracy:list.length>=3?Math.round(list.reduce((sum,r)=>sum+(r.accuracy??root.ChessEngine.moveAccuracy(root.ChessEngine.comparisonMetrics(r.evBest,r.evAfter,r.mover).winLoss)),0)/list.length):null}]));
 }
 root.ChessReviewData=Object.freeze({phases,eligible});
 root.ChessTiming=Object.freeze({settings,pack,decode,fromHex,snapshots});
})(typeof window!=='undefined'?window:globalThis);
