/* Computer stellt sich auf den Spieler ein (nur Partien gegen den Computer, nur Eröffnung).
 * Gemerkt wird je Stellung und Buchzug des Computers, wie die Partien für den Spieler ausgingen.
 * Daraus entstehen Faktoren für die Auswahl zwischen geprüften Buchzügen: Linien, in denen der Spieler
 * oft verliert, kommen öfter; Linien, die er sicher gewinnt, seltener. Spielstärke und Rechentiefe bleiben gleich.
 * Kein Lernen der Engine selbst; nichts verlässt das Gerät außer über die normale Fortschrittssicherung im Konto. */
(function(root){
 'use strict';
 const KEY='chess.adapt',MAX_LINES=300,MAX_N=20,MIN_PLIES=8,BOOK_FULL=12;
 const empty=(resetAt=0)=>({v:1,games:0,resetAt,lines:{}});
 const read=()=>{const d=root.Store?.get(KEY,null);return d&&d.v===1&&d.lines&&typeof d.lines==='object'?d:empty();};
 // p = durchschnittliches Ergebnis des Spielers (1 Sieg, 0,5 Remis, 0 Niederlage), c = Vertrauen (ab 4 Partien voll).
 const factor=e=>{const n=Number(e?.n)||0,s=Number(e?.s)||0;if(n<=0)return 1;const p=Math.min(1,Math.max(0,s/n)),c=Math.min(n,4)/4;return Math.min(2,Math.max(0.35,1+2*c*(0.5-p)));};
 const code=(E,m)=>E.sqName(m.f)+E.sqName(m.t)+(m.promo?.toLowerCase()||'');
 // Buchzüge, die der Computer in dieser Partie gespielt hat (nur aus der Eröffnungsphase).
 function lines(plies,computer,bookLevel){
  const E=root.ChessEngine,O=root.ChessOpenings;if(!E||!O||!Array.isArray(plies))return [];
  const out=new Set();
  for(const p of plies){
   if(!p?.S||!p.m||p.S.turn!==computer||p.S.full>BOOK_FULL)continue;
   const u=code(E,p.m);if(O.book(p.S,bookLevel).some(b=>code(E,b.move)===u))out.add(O.key(p.S)+'|'+u);
  }
  return [...out];
 }
 // Nach einer Partie gegen den Computer: score aus Sicht des Spielers.
 function record(plies,computer,bookLevel,score,now=Date.now()){
  if(!Array.isArray(plies)||plies.length<MIN_PLIES||![0,0.5,1].includes(score))return false;
  const found=lines(plies,computer,bookLevel);if(!found.length)return false;
  const d=read();d.games=(Number(d.games)||0)+1;
  for(const k of found){
   const e=d.lines[k]||{n:0,s:0,at:0};
   // Ältere Partien zählen allmählich weniger, damit Fortschritte des Spielers sichtbar werden.
   if(e.n>=MAX_N){e.n*=0.9;e.s*=0.9;}
   e.n=Math.round((e.n+1)*100)/100;e.s=Math.round((e.s+score)*100)/100;e.at=now;d.lines[k]=e;
  }
  const keys=Object.keys(d.lines);
  if(keys.length>MAX_LINES)for(const k of keys.sort((a,b)=>(d.lines[a].at||0)-(d.lines[b].at||0)).slice(0,keys.length-MAX_LINES))delete d.lines[k];
  root.Store.set(KEY,d);return true;
 }
 // Faktoren für den Computer (nur Abweichungen von 1, damit wenig an den Worker geht).
 function prefer(){const d=read(),out={};for(const [k,e] of Object.entries(d.lines)){const f=factor(e);if(Math.abs(f-1)>=0.01)out[k]=Math.round(f*100)/100;}return out;}
 const games=()=>Number(read().games)||0;
 // resetAt verhindert, dass die Kontosicherung vergessene Linien von einem anderen Gerät zurückholt.
 function forget(now=Date.now()){root.Store.set(KEY,empty(now));}
 // Zwei Geräte zusammenführen: je Linie der Stand mit mehr Partien (bei Gleichstand der neuere).
 // Nach „Vergessen“ zählt nur, was danach gespielt wurde.
 function merge(a,b){
  const x=a?.v===1?a:empty(),y=b?.v===1?b:empty(),resetAt=Math.max(Number(x.resetAt)||0,Number(y.resetAt)||0);
  const fresh=d=>(Number(d.resetAt)||0)===resetAt,out={v:1,games:Math.max(...[x,y].filter(fresh).map(d=>Number(d.games)||0)),resetAt,lines:{}};
  const live=d=>Object.fromEntries(Object.entries(d.lines||{}).filter(([,e])=>e&&(Number(e.at)||0)>=resetAt));
  const xl=live(x),yl=live(y);
  for(const k of new Set([...Object.keys(xl),...Object.keys(yl)])){
   const p=xl[k],q=yl[k];out.lines[k]=!p?q:!q?p:(p.n>q.n||(p.n===q.n&&(p.at||0)>=(q.at||0)))?p:q;
  }
  const keys=Object.keys(out.lines);
  if(keys.length>MAX_LINES)for(const k of keys.sort((a,b)=>(out.lines[a].at||0)-(out.lines[b].at||0)).slice(0,keys.length-MAX_LINES))delete out.lines[k];
  return out;
 }
 root.ChessAdapt=Object.freeze({KEY,BOOK_FULL,factor,lines,record,prefer,games,forget,merge});
})(typeof self!=='undefined'?self:window);
