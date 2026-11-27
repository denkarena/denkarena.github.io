/* Bounded, device-only analysis evidence. Never uploaded or used for ratings.
 * Persist moves/numbers/PVs, never translated explanations or a board snapshot. */
(function(){
 'use strict';
 const E=window.ChessEngine,KEY='chess.analysis.local',MAX=12,BUDGET=500000;
 const code=m=>m&&(E.sqName(m.f)+E.sqName(m.t)+(m.promo?.toLowerCase()||''));
 const move=u=>typeof u==='string'&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u);
 const positive=n=>Number.isSafeInteger(n)&&n>0;
 const labels={forced:['Erzwungener Zug','□'],opening:['Eröffnung','·'],uncertain:['Unsichere Einschätzung','≈'],best:['Empfehlung der Engine','★'],good:['Guter Zug','✓'],ok:['Spielbar','·'],meh:['Ungenau','?!'],bad:['Fehler','??'],miss:['Chance verpasst','⊙']};
 const numeric=['evBest','evPlayed','loss','depth','winBest','winPlayed','winLoss','accuracy','nodes','ms','baseMs','verificationDepth','verificationMs'];
 const boolean=['uncertain','unavailable','mateError','recommendationVerified','sacrificeUnresolved','quietKingUnresolved'];
 const statuses=new Set(['same','verified','similar','unconfirmed','rejected']);
 function hash(text){let a=2166136261,b=2246822519;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
 const owner=()=>hash('owner:'+(window.Cloud?.uid?.()||Store.get('cloud.account',null)?.email||'device'));
 // Stockfish-Analysen tragen engine:'stockfish'; ältere Einträge ohne Angabe stammen von der DenkArena-Engine.
 const SF=()=>window.StockfishAnalysis,engineOf=e=>e?.engine==='stockfish'?'stockfish':'denkarena';
 const name=(v=E.ANALYSIS_VERSION,engine='denkarena')=>engine==='stockfish'?T('Bewertung: {e} · Erklärungen: DenkArena-Analyse {v}',{e:SF()?.NAME||'Stockfish',v}):T('DenkArena-Analyse {v}',{v});
 // Server archive dates/IDs can differ from the live room's local copy.
 // The confirmed full move sequence plus room code is stable across both.
 const gameKey=g=>g&&Array.isArray(g.moves)&&g.moves.length>0&&g.moves.length<=1200&&g.moves.every(move)?JSON.stringify([g.mode,g.code?'room:'+g.code:g.id?'id:'+g.id:Number.isFinite(g.date)?'date:'+g.date:null,g.moves,...(g.initialFen?[g.initialFen]:[])]):null;
 function entries(){const d=Store.get(KEY,null);return d?.format===1&&d.owner===owner()&&Array.isArray(d.entries)?d.entries.filter(e=>e&&typeof e.game==='string'&&Array.isArray(e.rows)&&positive(e.analysisVersion)&&positive(e.engineRevision)).slice(0,MAX):[];}
 function lookup(g){
  const key=gameKey(g),entry=key&&entries().find(e=>e.game===key&&e.rows.length===g.moves.length);
  if(!entry)return {kind:'none',entry:null};
  // Display-version differences always take precedence over internal revisions.
  const revision=engineOf(entry)==='stockfish'?SF()?.REVISION:E.ENGINE_REVISION;
  return {kind:entry.analysisVersion<E.ANALYSIS_VERSION?'older':entry.analysisVersion>E.ANALYSIS_VERSION?'newer':entry.engineRevision!==revision?'engine':'current',entry,engine:engineOf(entry)};
 }
 function save(g,rows,expectedOwner=owner(),engine='denkarena'){
  const game=gameKey(g);if(!game||expectedOwner!==owner()||rows.length!==g.moves.length||rows.some(r=>r.unavailable))return;
  const packed=rows.map(r=>{
   const out={best:code(r.best),pvBest:r.pvBest?.slice(0,20),pvPlayed:r.pvPlayed?.slice(0,20),quality:r.judgement?.cls||r.cls};
   for(const k of numeric)if(Number.isFinite(r[k]))out[k]=r[k];for(const k of boolean)if(typeof r[k]==='boolean')out[k]=r[k];if(statuses.has(r.recommendationStatus))out.recommendationStatus=r.recommendationStatus;if(['win','loss'].includes(r.mateTiming))out.mateTiming=r.mateTiming;return out;
  });
  const stockfish=engine==='stockfish'&&Number.isInteger(SF()?.REVISION),entry={game,analysisVersion:E.ANALYSIS_VERSION,engineRevision:stockfish?SF().REVISION:E.ENGINE_REVISION,...(stockfish?{engine:'stockfish'}:{}),at:Date.now(),rows:packed};
  const list=[entry,...entries().filter(e=>e.game!==game)].slice(0,MAX);
  while(list.length&&JSON.stringify(list).length>BUDGET)list.pop();
  if(list.length)Store.set(KEY,{format:1,owner:expectedOwner,entries:list});
 }
 function restore(entry,plies){
  if(!entry||entry.rows?.length!==plies.length)return null;
  try{return entry.rows.map((r,i)=>{
   if(!r||!labels[r.quality]||!Number.isFinite(r.evBest)||!Number.isFinite(r.evPlayed)||!Number.isInteger(r.depth)||r.depth<0||r.depth>64)throw Error('record');
   const legal=E.legal(plies[i].S),best=legal.find(m=>code(m)===r.best);if(!best)throw Error('best');
   const pv=(line,first)=>{if(!Array.isArray(line)||line.length>20||line.length&&line[0]!==first)throw Error('line');let s=plies[i].S;for(const u of line){const m=E.legal(s).find(m=>code(m)===u);if(!m)throw Error('illegal');s=E.make(s,m);}return line.slice();};
   const out={best,pvBest:pv(r.pvBest,r.best),pvPlayed:pv(r.pvPlayed,code(plies[i].m))};
   for(const k of numeric)if(Number.isFinite(r[k]))out[k]=r[k];for(const k of boolean)if(typeof r[k]==='boolean')out[k]=r[k];if(statuses.has(r.recommendationStatus))out.recommendationStatus=r.recommendationStatus;if(['win','loss'].includes(r.mateTiming))out.mateTiming=r.mateTiming;
   const [key,sym]=labels[r.quality];out.savedQuality={cls:r.quality,label:T(key),sym};return out;
  });}catch(e){return null;}
 }
 // Beleg einer einzelnen Stelle für „Aus Fehlern lernen“: Die Aufgabe behält die Lösung und
 // die Varianten der Engine, die den Fehler gefunden hat, statt sie später neu zu berechnen.
 const proofNumeric=['evBest','evPlayed','loss','depth','winBest','winPlayed','winLoss'];
 function proof(r){
  if(!r?.best||r.uncertain||r.unavailable||!Array.isArray(r.pvBest)||!Array.isArray(r.pvPlayed)||!Number.isFinite(r.evBest)||!Number.isFinite(r.evPlayed))return null;
  const out={pvBest:r.pvBest.slice(0,20),pvPlayed:r.pvPlayed.slice(0,20)};
  for(const k of proofNumeric)if(Number.isFinite(r[k]))out[k]=r[k];
  if(r.mateError===true)out.mateError=true;if(['win','loss'].includes(r.mateTiming))out.mateTiming=r.mateTiming;if(statuses.has(r.recommendationStatus))out.recommendationStatus=r.recommendationStatus;
  return out;
 }
 // Liefert den Vergleich im Format von ChessEngine.compareMove oder null, wenn der Beleg nicht zur Stellung passt.
 function restoreProof(p,S,played,best){
  try{
   if(!p||!played||!best||code(played)===code(best)||!Number.isFinite(p.evBest)||!Number.isFinite(p.evPlayed)||!Number.isFinite(p.winLoss)||!Number.isInteger(p.depth)||p.depth<1||p.depth>64)return null;
   const pv=(line,first)=>{if(!Array.isArray(line)||!line.length||line.length>20||line[0]!==first)throw Error('line');let s=S;for(const u of line){const m=E.legal(s).find(m=>code(m)===u);if(!m)throw Error('illegal');s=E.make(s,m);}return line.slice();};
   const out={best,pvBest:pv(p.pvBest,code(best)),pvPlayed:pv(p.pvPlayed,code(played)),uncertain:false};
   for(const k of proofNumeric)if(Number.isFinite(p[k]))out[k]=p[k];
   if(p.mateError===true)out.mateError=true;if(['win','loss'].includes(p.mateTiming))out.mateTiming=p.mateTiming;if(statuses.has(p.recommendationStatus))out.recommendationStatus=p.recommendationStatus;
   return out;
  }catch(e){return null;}
 }
 window.ChessAnalysis=Object.freeze({KEY,MAX,BUDGET,name,engineOf,owner,lookup,save,restore,proof,restoreProof,clear:()=>Store.del(KEY)});
})();
