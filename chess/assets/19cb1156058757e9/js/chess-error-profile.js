/* Personal training patterns. Local only: this key is outside Progress.SYNC.
 * No names, full games, points, telemetry or new reward counters. */
(function(){
 'use strict';
 const KEY='chess.errorProfile.local',MAX=30,MIN=5,TARGET=3;
 const labels={hanging:'Figur eingestellt',fork:'Gabel übersehen',pin:'Fesselung übersehen',mate:'Matt übersehen',exchange:'Abtausch verrechnet',miss:'Chance verpasst',threat:'Drohung übersehen'};
 const valid=kind=>Object.prototype.hasOwnProperty.call(labels,kind);
 const E=()=>window.ChessEngine;
 const position=fen=>String(fen).trim().split(/\s+/).slice(0,4).join(' ');
 const uci=m=>m&&(E().sqName(m.f)+E().sqName(m.t)+(m.promo?.toLowerCase()||''));
 function hash(text){let a=2166136261,b=2246822519;for(let i=0;i<text.length;i++){a=Math.imul(a^text.charCodeAt(i),16777619);b=Math.imul(b^text.charCodeAt(i),3266489917);}return (a>>>0).toString(16).padStart(8,'0')+(b>>>0).toString(16).padStart(8,'0');}
 const owner=()=>{const email=Store.get('cloud.account',null)?.email;return email?hash('account:'+email.trim().toLowerCase()):'device';};
 function gameKey(game,side){
  if(!['w','b'].includes(side))return null;
  const identity=game?.code&&Number.isFinite(game.date)?'online:'+game.code+':'+game.date:game?.id?'id:'+game.id:game?.date&&Array.isArray(game.moves)?'moves:'+game.date+':'+game.moves.join(' '):null;
  return identity?hash(identity+'|'+side):null;
 }
 function kindOf(row){
  if(!row||!['bad','miss'].includes(row.cls)||row.uncertain||row.unavailable||row.mateTiming&&!row.mateError||!row.S||!row.m||!row.best||row.depth<3&&!row.certifiedTrap||E().legal(row.S).length<=1)return null;
  const metrics=E().comparisonMetrics(row.evBest,row.evPlayed,row.S.turn),chanceLoss=row.winLoss??metrics.winLoss;
  if(!(row.mateError??metrics.mateError)&&chanceLoss<20&&!(chanceLoss>=10&&ChessCoach.materialLoss(row.S,row)))return null;
  if(row.opportunity?.verified&&row.cls==='miss')return 'miss';
  const description=row.coachDescription||(row.coachDescription=ChessCoach.describe(row.S,row.m,row.best,row)),model=description.evidence;
  if(!model)return null;
  if(model.overlooked)return 'threat';
  const bad=model.bad.facts.filter(f=>f.verified&&f.phase==='played'&&f.owner==='opponent'),good=model.good.facts.filter(f=>f.verified&&f.phase==='best'&&f.owner==='self');
  if([...bad,...good].some(f=>f.type==='mate'&&f.forced))return 'mate';
  const loss=bad.some(f=>f.type==='material'&&f.net<=-200),gain=good.some(f=>f.type==='material'&&f.net>=200);
  const firstLoss=bad.filter(f=>f.type==='material'&&f.net<=-200).reduce((n,f)=>Math.min(n,f.ply),Infinity);
  if(loss&&bad.some(f=>['fork','double-attack'].includes(f.type)&&!f.conditional&&f.ply<=firstLoss))return 'fork';
  if(loss&&bad.some(f=>f.type==='pin'&&f.ply<=firstLoss))return 'pin';
  if(row.m.cap&&loss&&bad.some(f=>f.type==='defended-target'))return 'exchange';
  if(!row.m.cap&&bad.some(f=>f.type==='material'&&f.ply===1&&f.net<=-200&&f.targets?.some(t=>'NBRQ'.includes(t.piece))))return 'hanging';
  if(gain&&good.some(f=>['fork','double-attack'].includes(f.type)&&!f.conditional))return 'fork';
  if(gain&&good.some(f=>f.type==='pin'))return 'pin';
  return null; // Do not invent a category for an unexplained numerical error.
 }
 function kindsOf(row){
  const primary=kindOf(row);if(!primary)return [];
  const threat=row.coachDescription?.evidence?.overlooked,specific=primary==='threat'&&threat?{fork:'fork',pin:'pin',mate:'mate'}[threat.kind]:null;
  return [...new Set([primary,...(specific?[specific]:[])])];
 }
 function all(){
  const data=Store.get(KEY,null);if(data?.version!==1||data.owner!==owner()||!Array.isArray(data.games))return [];
  return data.games.filter(g=>g&&typeof g.key==='string'&&Number.isFinite(g.date)&&Array.isArray(g.events)).slice(0,MAX);
 }
 function record(game,side,rows){
  if(!['solo','online'].includes(game?.mode)||!Array.isArray(rows)||!rows.length)return;
  const key=gameKey(game,side);if(!key)return;
  const events=[];
  for(const row of rows){if((row.mover||row.S?.turn)!==side)continue;for(const kind of kindsOf(row))events.push({position:position(E().toFEN(row.S)),played:uci(row.m),kind});}
  const entry={key,date:Number(game.date)||Date.now(),events:events.slice(0,300)},games=all().filter(g=>g.key!==key);
  games.push(entry);games.sort((a,b)=>b.date-a.date||a.key.localeCompare(b.key));
  Store.set(KEY,{version:1,owner:owner(),games:games.slice(0,MAX)});
 }
 function summary(){
  const games=all(),total=games.length;
  const counts=Object.keys(labels).map(kind=>({kind,count:games.filter(g=>g.events.some(e=>e.kind===kind)).length,total})).filter(x=>x.count>0).sort((a,b)=>b.count-a.count||Object.keys(labels).indexOf(a.kind)-Object.keys(labels).indexOf(b.kind));
  return {total,visible:total>=MIN,top:counts.slice(0,3)};
 }
 function entries(kind){
  if(!valid(kind)||!window.ChessMistakes)return [];
  const games=all(),out=new Map();
  for(const group of ChessMistakes.groups())for(const item of group.entries){const m=item.entry;if(m.explainable===false)continue;
   const key=gameKey(m.source,m.fen.split(' ')[1]),p=position(m.fen);
   if(!games.some(g=>g.key===key&&g.events.some(e=>e.kind===kind&&e.position===p&&e.played===m.played)))continue;
   if(!out.has(p))out.set(p,m);
  }
  return [...out.values()].sort((a,b)=>Number(!!a.fixed||a.dueAt>Date.now())-Number(!!b.fixed||b.dueAt>Date.now())||(b.at||0)-(a.at||0));
 }
 function pool(kind){
  if(!valid(kind))return [];
  const own=entries(kind),seen=new Set(Object.values(window.ChessMistakes?.all()||{}).map(m=>position(m.fen))),extra=[];
  for(const p of window.CHESS_TRAINING_THEMES||[]){
   if(own.length+extra.length>=TARGET)break;
   if(p.kind!==kind||seen.has(position(p.fen)))continue;
   seen.add(position(p.fen));extra.push({...p,supplemental:true,at:0});
  }
  // Gerade geübte Stellungen ans Ende, damit sie nach Zurück und erneutem Öffnen nicht sofort wieder erscheinen.
 const recent=m=>!!window.ChessMistakes?.recentlyPracticed?.(m),list=[...own,...extra];
 return [...list.filter(m=>!recent(m)),...list.filter(recent)];
 }
 window.ChessErrorProfile=Object.freeze({KEY,MAX,MIN,TARGET,owner,valid,label:kind=>T(labels[kind]||'Aus Fehlern lernen'),position,kindOf,kindsOf,gameKey,record,all,summary,entries,pool});
})();
