/* The app's unchanged daily generator/solver, kept off the browser UI thread. */
importScripts('core.js');
self.onmessage=({data})=>{
 try{
  const M=self.Metamorph;
  if(data.op==='hint'){
   const p=M.unpack(data.puzzle),r=M.solve(p,data.state,{maxStates:300000,maxMs:1800});
   self.postMessage({op:'hint',path:r.path.length?[r.path[0].at??r.path[0].pos]:[],complete:r.complete});return;
  }
  let p;
  if(data.code){
   if(data.code.length>300)throw Error('invalid');
   p=M.decode(data.code);if(!p||p.coins.length<1||p.coins.length>7||p.cracks.length>2||p.portals.length||p.stamps.length||p.gates.length||p.order)throw Error('invalid');
   const r=M.solve(p,null,{maxStates:300000,maxMs:3000});if(!Number.isFinite(r.len)||!r.complete)throw Error('invalid');p.par=r.len;
  }else{p=M.generate(data.day,M.dailyLevel(data.day));if(!p)throw Error('generation');}
  self.postMessage({op:'load',puzzle:M.pack(p),code:M.encode(p)});
 }catch(e){self.postMessage({op:data.op,error:e.message==='invalid'?'invalid':'generation'});}
};
