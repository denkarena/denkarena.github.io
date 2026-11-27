/* Was der Trainer über dich weiß. Nur auf diesem Gerät: die Schlüssel liegen außerhalb von Progress.SYNC.
 * Je Partie gegen den Computer nur Zählwerte: wie viele Drohungen welcher Art du ohne Hilfe gesehen oder übersehen hast.
 * Dazu höchstens 40 Stellungen, in denen der Trainer dich vor einem Fehler angehalten hat (Stellung und geplanter Zug),
 * damit er sie wiedererkennt. Keine Namen, ganzen Partien oder Punkte. Zusammen mit dem Fehlerprofil und den gespeicherten
 * Fehlern aus Analysen ergibt das deine typischen Muster. */
(function(){
 'use strict';
 const KEY='chess.trainer.local',SPOTS='chess.trainer.spots.local',MAX=30,SPOT_MAX=40,WINDOW=10,KINDS=['fork','pin','mate','threat'];
 const profile=()=>window.ChessErrorProfile;
 // Art einer erkannten Drohung (ChessCoach.threatNow) in den Begriffen des Fehlerprofils
 const kindOf=t=>!t?null:t.kind==='mate'?'mate':['fork','double-attack'].includes(t.kind)?'fork':t.kind==='pin'?'pin':'threat';
 const owner=()=>profile()?.owner?.()||'device';
 const count=o=>KINDS.reduce((n,k)=>n+(Number(o?.[k])||0),0);
 function all(){
  const data=Store.get(KEY,null);if(data?.version!==1||data.owner!==owner()||!Array.isArray(data.games))return [];
  return data.games.filter(g=>g&&typeof g.key==='string'&&Number.isFinite(g.date)&&g.seen&&g.missed).slice(0,MAX);
 }
 // log: {seen:{fork:n,…},missed:{…}}; eine erneute Speicherung derselben Partie ersetzt die frühere
 function record(game,side,log){
  const key=profile()?.gameKey(game,side);if(!key||!log)return null;
  const clean=o=>Object.fromEntries(KINDS.map(k=>[k,Math.max(0,Math.min(99,Math.round(Number(o?.[k])||0)))]).filter(([,n])=>n>0));
  const entry={key,date:Number(game.date)||Date.now(),seen:clean(log.seen),missed:clean(log.missed)},games=all().filter(g=>g.key!==key);
  games.push(entry);games.sort((a,b)=>b.date-a.date||a.key.localeCompare(b.key));
  Store.set(KEY,{version:1,owner:owner(),games:games.slice(0,MAX)});
  return entry;
 }
 // In wie vielen deiner letzten Partien (Trainer und analysierte Partien zusammen) war diese Art der Fehler?
 // except: die laufende Partie zählt nicht mit
 function weakness(kind,except){
  if(!KINDS.includes(kind))return {n:0,k:0};
  const games=new Map();
  for(const g of all())if(g.key!==except)games.set(g.key,{date:g.date,hit:(g.missed[kind]||0)>0});
  for(const g of profile()?.all?.()||[])if(g.key!==except){const hit=g.events.some(e=>e.kind===kind),old=games.get(g.key);games.set(g.key,{date:Math.max(g.date,old?.date||0),hit:hit||!!old?.hit});}
  const recent=[...games.values()].sort((a,b)=>b.date-a.date).slice(0,WINDOW);
  return {n:recent.filter(g=>g.hit).length,k:recent.length};
 }
 // Wie ging es mit dieser Art zuletzt aus (neueste Partie, in der sie vorkam)? 'missed' | 'seen' | null
 function last(kind,except){
  const out=[];
  for(const g of all())if(g.key!==except){const v=(g.missed[kind]||0)>0?'missed':(g.seen[kind]||0)>0?'seen':null;if(v)out.push({date:g.date,v});}
  for(const g of profile()?.all?.()||[])if(g.key!==except&&g.events.some(e=>e.kind===kind))out.push({date:g.date,v:'missed'});
  out.sort((a,b)=>b.date-a.date);return out[0]?.v||null;
 }
 const games=()=>all().length;
 const position=fen=>String(fen).trim().split(/\s+/).slice(0,4).join(' ');
 const move=/^[a-h][1-8][a-h][1-8][qrbn]?$/;
 function spots(){
  const d=Store.get(SPOTS,null);if(d?.version!==1||d.owner!==owner()||!Array.isArray(d.list))return [];
  return d.list.filter(x=>x&&typeof x.pos==='string'&&move.test(x.m)&&Number.isFinite(x.at)).slice(0,SPOT_MAX);
 }
 // Stellung, in der der Trainer dich angehalten hat oder in der du einen Fehler gespielt und zurückgenommen hast (undone; pos = die ersten vier FEN-Felder)
 function spot(e){
  if(!e||!move.test(e.m))return;
  const pos=position(e.fen),list=spots().filter(x=>!(x.pos===pos&&x.m===e.m));
  list.unshift({pos,m:e.m,san:String(e.san||'').slice(0,12),at:Number(e.at)||Date.now(),key:String(e.key||''),...(e.undone?{u:1}:{})});
  Store.set(SPOTS,{version:1,owner:owner(),list:list.slice(0,SPOT_MAX)});
 }
 // Wiedersehen: ein früherer Fehler in genau dieser Stellung, nicht aus der laufenden Partie.
 // Gespielte Fehler aus Analysen (ChessMistakes) gehen vor Stellungen, in denen der Trainer angehalten hat; sonst der neueste.
 function memory(fen,exceptKey,exceptId){
  const pos=position(fen),out=[];
  for(const m of Object.values(window.ChessMistakes?.all?.()||{}))if(m?.fen&&m.explainable!==false&&move.test(m.played||'')&&position(m.fen)===pos&&!(exceptId&&m.source?.id===exceptId))
   out.push({kind:'played',m:m.played,san:m.san||'',best:move.test(m.best||'')?m.best:null,at:Number(m.source?.date)||Number(m.at)||0});
  for(const x of spots())if(x.pos===pos&&x.key!==exceptKey)out.push({kind:x.u===1?'undone':'stopped',m:x.m,san:x.san,best:null,at:x.at});
  out.sort((a,b)=>(a.kind==='played'?0:1)-(b.kind==='played'?0:1)||b.at-a.at);
  return out[0]||null;
 }
 // Anteil erkannter Drohungen: letzte 5 Trainer-Partien gegen die 5 davor (je mindestens 4 Drohungen)
 function progress(){
  const list=all(),part=a=>{const s=a.reduce((n,g)=>n+count(g.seen),0),m=a.reduce((n,g)=>n+count(g.missed),0);return s+m>=4?Math.round(100*s/(s+m)):null;};
  if(list.length<10)return null;
  const now=part(list.slice(0,5)),before=part(list.slice(5,10));
  return now==null||before==null?null:{now,before};
 }
 // Woran als Nächstes arbeiten: was in dieser Partie am häufigsten übersehen wurde, sonst dein häufigstes Muster (mind. 2 Partien)
 function focus(log,except){
  const here=KINDS.map(k=>[k,Number(log?.missed?.[k])||0]).filter(([,n])=>n>0).sort((a,b)=>b[1]-a[1]);
  if(here.length)return here[0][0];
  const mine=KINDS.map(k=>[k,weakness(k,except).n]).filter(([,n])=>n>=2).sort((a,b)=>b[1]-a[1]);
  return mine.length?mine[0][0]:null;
 }
 window.ChessTrainer=Object.freeze({KEY,SPOTS,MAX,SPOT_MAX,KINDS,kindOf,all,record,weakness,last,games,progress,focus,spots,spot,memory,position});
})();
