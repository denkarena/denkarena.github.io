/* Der Gegner rechnet im Hintergrund, damit Animationen flüssig bleiben */
importScripts('chess-engine.js');
importScripts('../data/chess-openings.js','../chess-computer.js');
self.onmessage = e => {
  if(e.data.op==='position'){
    try{self.postMessage({id:e.data.id,position:self.ChessEngine.analysePosition(e.data.state,e.data.opts)});}
    catch(err){self.postMessage({id:e.data.id,position:{unavailable:true}});}return;
  }
  if(e.data.op==='compare'){
    const {id,state,played,opts}=e.data;let comparison;
    try{comparison=self.ChessEngine.compareMove(state,played,opts);}catch(err){comparison={unavailable:true,uncertain:true,depth:0};}
    self.postMessage({id,comparison});return;
  }
  if(e.data.op==='coach-line'){
    const E=self.ChessEngine,moves=[];let state=e.data.state;
    const code=m=>E.sqName(m.f)+E.sqName(m.t)+(m.promo?.toLowerCase()||'');
    try{
      const prefix=e.data.prefix;
      if(!Array.isArray(prefix)||prefix.length>4)throw Error('prefix');
      for(const u of prefix){const m=E.legal(state).find(m=>code(m)===u);if(!m)throw Error('illegal');moves.push(u);state=E.make(state,m);}
      while(moves.length<4){if(E.status(state,[]).over)break;const m=E.bestMove(state,{maxDepth:4,timeMs:180,noise:0});if(!m)break;moves.push(code(m));state=E.make(state,m);}
    }catch(err){moves.length=0;}
    self.postMessage({moves});return;
  }
  const { id, state, opts,computerLevel } = e.data;
  let move = null;
  try { move = Number.isInteger(computerLevel)?self.ChessComputer.choose(state,computerLevel,opts):self.ChessEngine.bestMove(state, opts); } catch (err) { move = null; }
  self.postMessage({ id, move });
};
