/* Partie-Analyse mit Stockfish.
 * Stockfish (GPLv3) liegt unverändert in www/stockfish/ und läuft als eigenes Programm in einem
 * Web Worker. Diese Datei enthält keinen Stockfish-Code: Sie schickt nur UCI-Textbefehle
 * („position …“, „go …“) und liest die Textantworten („info …“, „bestmove …“).
 * Ergebnis je Zug im selben Format wie ChessEngine.compareMove, damit Einstufung und
 * Erklärungen von DenkArena unverändert darauf aufbauen. */
(function(root){
 'use strict';
 const E=root.ChessEngine;
 const FILE='assets/19cb1156058757e9/stockfish/stockfish-19-lite-single.js',NAME='Stockfish 19',REVISION=5;
 // Die Suche endet am Knotenlimit oder, auf langsameren Geräten, früher am Zeitlimit.
 const NODES=250000,MAX_MS=4000,START_MS=15000,PV=20;
 // Endet eine Suche mitten in einer neuen Variante, wird die angefangene Tiefe bis zu so oft zu Ende gerechnet.
 const RETRIES=2,MAX_DEPTH=245;
 const code=m=>E.sqName(m.f)+E.sqName(m.t)+(m.promo?.toLowerCase()||'');
 let factory=()=>new Worker(FILE),engine=null,starting=null,listener=null,queue=Promise.resolve(),failed=false;

 function reset(){try{engine?.terminate?.();}catch(e){/* schon beendet */}engine=null;starting=null;listener=null;}
 // Antwortzeilen an den gerade wartenden Auftrag weitergeben
 function attach(w){w.onmessage=e=>{if(engine!==w)return;const text=typeof e?.data==='string'?e.data:'';for(const line of text.split('\n'))if(line&&listener)listener(line.trim());};w.onerror=e=>{e?.preventDefault?.();if(engine!==w)return;const l=listener;reset();l?.('__error__');};}
 function waitFor(command,word){
  return new Promise(resolve=>{
   const done=ok=>{clearTimeout(timer);listener=null;resolve(ok);};
   const timer=setTimeout(()=>done(false),START_MS);
   listener=line=>{if(line===word)done(true);else if(line==='__error__')done(false);};
   try{engine.postMessage(command);}catch(e){done(false);}
  });
 }
 // Startet Stockfish einmal. false: nicht verfügbar (z. B. sehr alte WebView ohne WebAssembly).
 function ready(){
  if(engine&&!starting)return Promise.resolve(true);
  if(starting)return starting;
  if(failed||typeof WebAssembly!=='object')return Promise.resolve(false);
  starting=(async()=>{
   try{
    engine=factory();attach(engine);
    if(await waitFor('uci','uciok')){
     engine.postMessage('setoption name Hash value 16');
     if(await waitFor('isready','readyok')){starting=null;return true;}
    }
   }catch(e){/* Worker konnte nicht gestartet werden */}
   reset();failed=true;return false;
  })();
  return starting;
 }
 // Aufträge nacheinander: Stockfish rechnet immer nur eine Stellung.
 function run(job){const next=queue.then(job,job);queue=next.catch(()=>null);return next;}

 function parseInfo(line){
  const t=line.split(/\s+/);if(t[0]!=='info')return null;
  const out={multipv:1,bound:false};
  for(let i=1;i<t.length;i++){
   const k=t[i];
   if(k==='depth')out.depth=+t[++i];
   else if(k==='multipv')out.multipv=+t[++i];
   else if(k==='nodes')out.nodes=+t[++i];
   else if(k==='time')out.time=+t[++i];
   else if(k==='score'){const type=t[++i],value=+t[++i];if((type==='cp'||type==='mate')&&Number.isFinite(value))out.score={type,value};}
   else if(k==='lowerbound'||k==='upperbound')out.bound=true;
   else if(k==='pv'){out.pv=t.slice(i+1);break;}
  }
  return out.score&&Number.isInteger(out.depth)&&out.pv?.length?out:null;
 }
 // UCI-Bewertung (aus Sicht der Seite am Zug) → DenkArena-Wert aus Sicht von Weiß.
 // Matt in n Zügen = n eigene Züge, also 2n−1 Halbzüge (wie E.MATE − Halbzüge).
 function whiteScore(score,turn){
  const side=score.type==='cp'?score.value:score.value>0?E.MATE-(2*score.value-1):score.value<0?-(E.MATE-2*-score.value):-E.MATE;
  return turn==='w'?side:-side;
 }
 function search(command,control,depth=0){
  return run(()=>new Promise(resolve=>{
   if(!engine||control.cancelled){resolve(null);return;}
   let exact=null;const started=Date.now();
   const stop=()=>{try{engine?.postMessage('stop');}catch(e){/* Worker bereits beendet */}};
   const stopTimer=setTimeout(stop,MAX_MS+1500);
   const killTimer=setTimeout(()=>{reset();done(null);},MAX_MS+5000);
   const done=r=>{clearTimeout(stopTimer);clearTimeout(killTimer);control.stop=null;listener=null;resolve(r);};
   control.stop=stop;
   listener=line=>{
    if(line==='__error__')return done(null);
    if(line.startsWith('info ')){const i=parseInfo(line);if(i&&i.multipv===1&&!i.bound)exact=i;}
    else if(line.startsWith('bestmove'))done(exact&&{info:exact,complete:exact.pv[0]===line.split(/\s+/)[1],ms:Date.now()-started});
   };
   try{engine.postMessage(command);engine.postMessage(`go ${depth?`depth ${depth} `:''}nodes ${NODES} movetime ${MAX_MS}`);}
   catch(e){reset();done(null);}
  }));
 }
 function line(S,moves){
  const out=[];let s=S;
  for(const u of moves||[]){if(out.length>=PV)break;const m=E.legal(s).find(m=>code(m)===u);if(!m)break;out.push(u);s=E.make(s,m);}
  return out;
 }

 // Eine Analyse-Sitzung für eine Partie. Jede Stellung wird genau einmal gerechnet
 // (vor und nach jedem Zug); die Stellung nach Zug i ist die Stellung vor Zug i+1.
 function session(plies){
  const states=plies.map(p=>p.S);if(plies.length)states.push(E.make(plies.at(-1).S,plies.at(-1).m));
  const keys=states.map(s=>E.key(s)),moves=plies.map(p=>code(p.m)),start=plies.length?E.toFEN(plies[0].S):null;
  const cache=new Map(),control={cancelled:false,stop:null};let fresh=true;
  function position(k){
   if(cache.has(k))return cache.get(k);
   const job=(async()=>{
    const S=states[k],end=E.status(S,keys.slice(0,k+1));
    if(end.over)return {terminal:true,best:null,pv:[],depth:0,nodes:0,ms:0,score:end.result==='w'?E.MATE:end.result==='b'?-E.MATE:0};
    if(control.cancelled||!await ready())return null;
    if(fresh){
     fresh=false;
     const ok=await run(async()=>{
      if(!engine||control.cancelled)return false;
      try{engine.postMessage('ucinewgame');if(await waitFor('isready','readyok'))return true;}
      catch(e){/* Worker konnte nicht antworten */}
      reset();return false;
     });
     if(!ok)return null;
    }
    const command=`position fen ${start}${k?' moves '+moves.slice(0,k).join(' '):''}`;
    let r=await search(command,control);
    // Der letzte genaue Wert gehört dann zu einem anderen Zug als dem gemeldeten besten Zug.
    // Dieselbe Stellung wird mit vorhandenem Suchspeicher bis zum Ende der angefangenen Tiefe weitergerechnet.
    for(let extra=0;r&&!r.complete&&extra<RETRIES;extra++){
     const again=await search(command,control,Math.min(MAX_DEPTH,r.info.depth+1));
     if(!again){if(!engine||control.cancelled)return null;break;}
     r=again.complete||again.info.depth>=r.info.depth?{...again,ms:r.ms+again.ms}:{...r,ms:r.ms+again.ms};
    }
    if(!r)return null;
    const pv=line(S,r.info.pv);
    if(!pv.length)return null;
    // Bei Matt meldet Stockfish die volle Suchtiefe (bis 245); gespeichert werden höchstens 64.
    return {terminal:false,best:pv[0],complete:r.complete,pv,depth:Math.min(64,r.info.depth),nodes:r.info.nodes||0,ms:r.ms,score:whiteScore(r.info.score,S.turn)};
   })();
   cache.set(k,job);return job;
  }
  async function compare(i){
   const unavailable={unavailable:true,uncertain:true,depth:0,engine:'stockfish'};
   const S=plies[i]?.S,m=plies[i]?.m;if(!S||!m)return unavailable;
   const a=await position(i);
   if(!a||a.terminal||control.cancelled)return unavailable;
   const b=await position(i+1);
   if(!b||control.cancelled)return unavailable;
   const turn=S.turn,sign=turn==='w'?1:-1,legal=E.legal(S),played=code(m),actual=legal.find(x=>code(x)===played),best=legal.find(x=>code(x)===a.best);
   if(!actual||!best)return unavailable;
   const clip=n=>Math.max(-1500,Math.min(1500,n)),base={engine:'stockfish',depth:a.depth,nodes:a.nodes,ms:a.ms,uncertain:false};
   const pvPlayed=line(S,[played,...b.pv]),evPlayed=b.score;
   // Ein Zug, der sofort matt setzt, ist immer ein bester Zug, auch wenn Stockfish ein anderes Matt nennt.
   if(b.terminal&&evPlayed*sign===E.MATE){const ev=sign*(E.MATE-1);return {...base,...E.comparisonMetrics(ev,ev,turn),best:actual,evBest:ev,evPlayed:ev,loss:0,pvBest:[played],pvPlayed:[played],recommendationStatus:'same',recommendationVerified:false};}
   // Bricht die Suche während einer neuen Variante ab, bleibt der letzte genaue Wert im Graphen.
   // Zugqualität und Empfehlung warten auf eine vollständige Vergleichsgrundlage.
   if(!a.complete||!b.terminal&&!b.complete)
    return {...base,uncertain:true,best:actual,evBest:evPlayed,evPlayed,loss:0,pvBest:pvPlayed.slice(),pvPlayed,recommendationStatus:'unconfirmed',recommendationVerified:false};
   if(played===a.best)return {...base,...E.comparisonMetrics(a.score,a.score,turn),best:actual,evBest:a.score,evPlayed:a.score,loss:0,pvBest:a.pv.slice(),pvPlayed:a.pv.slice(),recommendationStatus:'same',recommendationVerified:false};
   // Beide Stellungen sind getrennt gerechnet: Ist der Partiezug mindestens so gut, gibt es keinen Verlust.
   // Führt der Partiezug mindestens so schnell zum Matt wie der genannte Zug, ist auch er ein bester Zug.
   if(a.score*sign>E.MATE-1000&&evPlayed*sign>=a.score*sign)
    return {...base,...E.comparisonMetrics(evPlayed,evPlayed,turn),best:actual,evBest:evPlayed,evPlayed,loss:0,pvBest:pvPlayed.slice(),pvPlayed,recommendationStatus:'same',recommendationVerified:false};
   const evBest=evPlayed*sign>=a.score*sign?evPlayed:a.score,metrics=E.comparisonMetrics(evBest,evPlayed,turn),loss=Math.max(0,clip(evBest*sign)-clip(evPlayed*sign));
   // Wie bei der DenkArena-Engine: winzige Unterschiede ergeben keinen „besseren Zug“.
   if(evBest===evPlayed||!metrics.mateError&&!metrics.mateTiming&&metrics.winLoss<5&&loss<80)
    return {...base,...metrics,best:actual,evBest,evPlayed,loss,pvBest:pvPlayed.slice(),pvPlayed,recommendationStatus:'similar',recommendationVerified:false};
   return {...base,...metrics,best,evBest,evPlayed,loss,pvBest:a.pv.slice(),pvPlayed,recommendationStatus:'verified',recommendationVerified:true};
  }
  return {ready,compare,cancel(){control.cancelled=true;control.stop?.();}};
 }

 // Zug für die Meisterstufen gegen den Computer: Stockfish mit begrenzter Spielstärke
 // (UCI-Optionen UCI_LimitStrength und UCI_Elo, Stockfish selbst bleibt unverändert).
 // Danach wird die Begrenzung wieder aufgehoben, damit Analysen mit voller Stärke rechnen.
 // Ergebnis: Zug als UCI-Text oder null (Stockfish nicht verfügbar oder keine Antwort).
 async function play(startFen,moves,elo,ms=1000){
  if(!await ready())return null;
  return run(()=>new Promise(resolve=>{
   if(!engine){resolve(null);return;}
   const killTimer=setTimeout(()=>{reset();done(null);},ms+8000);
   const done=u=>{clearTimeout(killTimer);listener=null;try{engine?.postMessage('setoption name UCI_LimitStrength value false');}catch(e){/* Worker bereits beendet */}resolve(u);};
   listener=line=>{if(line==='__error__')return done(null);if(line.startsWith('bestmove')){const u=line.split(/\s+/)[1];done(u&&/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u)?u:null);}};
   try{
    engine.postMessage('setoption name UCI_LimitStrength value true');engine.postMessage('setoption name UCI_Elo value '+Math.round(elo));
    engine.postMessage(`position fen ${startFen}${moves?.length?' moves '+moves.join(' '):''}`);engine.postMessage('go movetime '+Math.round(ms));
   }catch(e){reset();done(null);}
  }));
 }

 root.StockfishAnalysis=Object.freeze({NAME,REVISION,FILE,NODES,ready,session,play,available:()=>!failed&&typeof WebAssembly==='object',
  // nur für Tests: eigenen Worker-Ersatz einsetzen
  _setFactory(f){reset();failed=false;factory=f;},_parseInfo:parseInfo,_whiteScore:whiteScore});
})(typeof self!=='undefined'?self:window);
