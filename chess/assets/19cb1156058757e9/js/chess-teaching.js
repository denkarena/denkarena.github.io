/* Post-game teaching only. Every endpoint is counted on a legally replayed
 * board; finite examples are never presented as inevitable game outcomes. */
(function(){
 'use strict';
 const E=window.ChessEngine,C=window.ChessCoach,V={P:100,N:320,B:330,R:500,Q:900,K:0},types=['Q','R','B','N','P'];
 const code=m=>m&&(E.sqName(m.f)+E.sqName(m.t)+(m.promo?.toLowerCase()||''));
 const opp=s=>s==='w'?'b':'w',colour=p=>E.isW(p)?'w':'b',fact=(type,key,args={},extra={})=>({type,key,args,verified:true,...extra});
 const text=(f,side,perspective=null)=>C.renderFact(f,side,perspective),esc=s=>UI.esc(s),words=s=>String(s).trim().split(/\s+/u).filter(Boolean).length;
 const part=p=>T({P:'den Bauern',N:'den Springer',B:'den Läufer',R:'den Turm',Q:'die Dame',K:'den König'}[p]);
 const plain={
  'Die Suche bevorzugt den gespielten Zug {b}.':'{b} passt hier.',
  'Die Suche bewertet beide Züge ähnlich gut; sie bevorzugt {b} knapp.':'Beide Züge sind ähnlich gut. {b} war etwas besser.',
  'Die Suche bewertet {m} schlechter als {b}.':'{b} war besser.',
  'Die Einschätzung ist unsicher. Die Suche bevorzugt {b}.':'Diese Stellung lässt sich noch nicht sicher beurteilen.',
  '{side} lässt Matt im nächsten Zug zu. Die Suche empfiehlt {b}.':'{side} lässt Matt im nächsten Zug zu. Besser war {b}.',
  '{side} lässt Matt in {n} Zügen zu. Die Suche empfiehlt {b}.':'{side} lässt Matt in {n} Zügen zu. Besser war {b}.',
  '{side} konnte mit {b} sofort mattsetzen.':'{side} konnte mit {b} sofort mattsetzen.',
  '{side} konnte mit {b} in {n} Zügen mattsetzen.':'{side} konnte mit {b} in {n} Zügen mattsetzen.',
  '{side} gewinnt mit {b} in dieser Folge Material.':'{side} konnte Material gewinnen: {b}.',
  '{b} beginnt die in der Suche nachgewiesene Mattfolge.':'Mit {b} beginnt die Mattfolge.',
  '{b} vermeidet die gezeigte Mattfolge.':'{b} verhindert dieses Matt.',
  '{b} wehrt die belegte Drohung {m} ab.':'{b} wehrt die Drohung {m} ab.',
  'Nach {b} ist die Materialbilanz der gezeigten Folge günstiger.':'Der Abtausch mit {b} ist günstiger.',
  'Mit {b} gewinnt {side} in der gezeigten Folge Material.':'Mit {b} gewinnt {side} Material.',
  'Bis zum {n}. Zug lag die Suchbewertung im ausgeglichenen Bereich.':'Bis zum {n}. Zug war die Stellung ausgeglichen.',
  '{m} entfernt den Verteidiger auf {d}; in der gezeigten Folge gewinnt {side} danach {p} auf {s}.':'{m} beseitigt den Verteidiger auf {d}. Danach kann {side} {p} auf {s} gewinnen.',
  'Die Engine zieht {b} knapp vor. {m} ist deshalb kein echter Fehler.':'Beide Züge sind ähnlich gut. {b} war etwas besser.',
  'Die Bewertung ist bei kurzer Suche nicht stabil. Daraus lässt sich kein sicherer Fehler ableiten.':'Diese Stellung lässt sich noch nicht sicher beurteilen.',
  'Nach dem Fehler von {other} zeigt die geprüfte Fortsetzung mit {b} einen Materialgewinn für {side}.':'Nach dem Fehler von {other} konnte {side} mit {b} Material gewinnen.',
  'Die Stellung war bereits schlechter. Der zusätzliche Materialverlust ist in der gezeigten Folge nachgewiesen.':'Die Stellung war schon vorher schlechter.'
 };
 const personalKeys={
  '{side} verliert {p}.':'Du verlierst {p}.','{side} gewinnt {p}.':'Du gewinnst {p}.',
  '{side} verliert {p} für {q}.':'Du verlierst {p} für {q}.','{side} gewinnt {p} für {q}.':'Du gewinnst {p} für {q}.','{side} tauscht {p} gegen {q}.':'Du tauschst {p} gegen {q}.',
  '{side} verliert {p}. Besser war {b}.':'Du verlierst {p}. Besser war {b}.',
  '{side} verliert {p} für {q}. Besser war {b}.':'Du verlierst {p} für {q}. Besser war {b}.',
  '{side} verliert Material. Besser war {b}.':'Du verlierst Material. Besser war {b}.',
  '{side} lässt Matt im nächsten Zug zu. Besser war {b}.':'Damit lässt du Matt im nächsten Zug zu. Besser war {b}.',
  '{side} lässt Matt in {n} Zügen zu. Besser war {b}.':'Damit lässt du Matt in {n} Zügen zu. Besser war {b}.',
  '{side} konnte mit {b} sofort mattsetzen.':'Hier konntest du mit {b} sofort mattsetzen.',
  '{side} konnte mit {b} in {n} Zügen mattsetzen.':'Hier konntest du mit {b} in {n} Zügen mattsetzen.',
  '{side} konnte Material gewinnen: {b}.':'Hier konntest du Material gewinnen: {b}.',
  '{side} konnte {p} gewinnen: {b}.':'Hier konntest du {p} gewinnen: {b}.',
  'Mit {b} rettet {side} {p} auf {s}.':'Mit {b} rettest du {p} auf {s}.',
  'Mit {b} behält {side} {p}.':'Mit {b} behältst du {p}.',
  'Mit {b} vermeidet {side} den Materialverlust.':'Mit {b} vermeidest du den Materialverlust.',
  'Mit {b} gewinnt {side} Material.':'Mit {b} gewinnst du Material.',
  'Mit {b} verliert {side} kein Material.':'Mit {b} verlierst du kein Material.',
  'Mit {b} schlägt {side} {p} auf {s}.':'Mit {b} schlägst du {p} auf {s}.',
  'Mit {b} schlägt {side} {p} auf {s} und wehrt die Drohung ab.':'Mit {b} schlägst du {p} auf {s} und wehrst die Drohung ab.'
 };
 function piecePhrase(p,form='subject',start=false){
  const subject={P:'Der Bauer',N:'Der Springer',B:'Der Läufer',R:'Der Turm',Q:'Die Dame',K:'Der König'},object={P:'den Bauern',N:'den Springer',B:'den Läufer',R:'den Turm',Q:'die Dame',K:'den König'},code=p?.toUpperCase();if(!subject[code])return null;
  const value=T((form==='object'?object:subject)[code]);return start?value:value[0].toLocaleLowerCase(window.DA_LANG||'de')+value.slice(1);
 }
 function reword(f,key){
  const args={...f.args};let next=plain[key]||key;
  if(f.movingPiece){const p=piecePhrase(f.movingPiece),capital=piecePhrase(f.movingPiece,'subject',true);
   if(key.includes('kommt die Figur von')){next='Mit {b} kommt {p} von {f} ins Spiel.';args.p=p;}
   else if(key==='Von {s} aus kontrolliert die Figur das Feld {t} im Zentrum.'){next='{p} auf {s} kontrolliert das Feld {t} im Zentrum.';args.p=window.DA_LANG==='tr'?p:capital;}
   else if(key==='Von {s} aus kontrolliert die Figur die Felder {t} im Zentrum.'){next='{p} auf {s} kontrolliert die Felder {t} im Zentrum.';args.p=window.DA_LANG==='tr'?p:capital;}
   else if(key==='Die Figur zieht von {f} nach {t}.'){next='{p} zieht von {f} nach {t}.';args.p=capital;}
   else if(key.includes('zieht die angegriffene Figur von')){next='Mit {b} zieht {p} von {f} nach {t} und entgeht dem Angriff.';args.p=p;}
   else if(key.includes('Nach einem Schlag dort kann die Figur von')){next='Mit {b} ist {s} gedeckt: Nach einem Schlag dort kann {p} auf {f} zurückschlagen.';args.p=p;}
  }
  if(f.linePiece&&key.includes('öffnet {side} die Linie für die Figur')){next='Mit {b} bekommt {p} auf {s} eine freie Linie nach {t}.';args.p=piecePhrase(f.linePiece);}
  if(['fork','double-attack'].includes(f.type)&&f.targets?.length>=2){
   const [a,b]=f.targets;args.p=piecePhrase(a.piece,'object');args.q=piecePhrase(b.piece,'object');args.idea=T(f.type==='double-attack'?'ein Doppelangriff':f.check?'eine Gabel mit Schach':'eine Gabel');
   next=key.startsWith('Eine Möglichkeit nach {played}')?'Nach {played} ist {m} möglich. Dabei entsteht {idea} gegen {p} auf {s} und {q} auf {t}.':key.startsWith('Nach {played}')?'Nach {played} folgt {m}. Dabei entsteht {idea} gegen {p} auf {s} und {q} auf {t}.':key.startsWith('Nach {reply}')?'Nach {reply} folgt {m}. Dabei entsteht {idea} gegen {p} auf {s} und {q} auf {t}.':'Mit {m} entsteht {idea} gegen {p} auf {s} und {q} auf {t}.';
  }
  if(f.capturedCode&&key.includes('schlägt {side} die Figur')){next='Mit {b} schlägt {side} {p} auf {s}.';args.p=piecePhrase(f.capturedCode,'object');}
  if(f.trappedPiece){next='{p} auf {s} ist gefangen: Jede legale Antwort lässt einen unmittelbaren Materialverlust zu.';args.p=piecePhrase(f.trappedPiece,'subject',window.DA_LANG!=='tr');}
  if(f.overloadPiece){next='Überlastung: Der Verteidiger auf {d} deckt zwei Ziele. Nach {r} bleibt {p} auf {s} ohne diesen Schutz.';args.p=piecePhrase(f.overloadPiece);}
  if(['discovered-check','discovered-attack'].includes(f.type)&&f.targets?.[0]){next=f.type==='discovered-check'?'Mit {m} entsteht ein Abzugsschach: {p} auf {f} greift jetzt {q} auf {t} an.':'Mit {m} entsteht ein Abzugsangriff: {p} auf {f} greift jetzt {q} auf {t} an.';args.p=piecePhrase(f.attackerPiece||f.args?.attackerPiece,'subject',(window.DA_LANG||'de')==='de')||args.p;args.q=piecePhrase(f.targets[0].piece,'object');}
  if(f.type==='skewer'&&f.targets?.length>=2){next='Spieß: {p} auf {s} wird angegriffen, dahinter steht {q} auf {t}.';args.p=piecePhrase(f.targets[0].piece,'subject',(window.DA_LANG||'de')==='de');args.q=piecePhrase(f.targets[1].piece);}
  return {key:next,args};
 }
 function personal(key){return personalKeys[key]||null;}
 function inventory(s){const out={w:{},b:{}};for(const p of s.b)if(p){const side=colour(p),k=p.toUpperCase();out[side][k]=(out[side][k]||0)+1;}return out;}
 const amounts=['','einen','zwei','drei','vier','fünf','sechs','sieben','acht','neun','zehn','elf','zwölf','dreizehn','vierzehn','fünfzehn','sechzehn'];
 function quantity(p,n){if(!Number.isInteger(n)||n<1||n>16)return null;const noun={P:'Bauern',N:'Springer',B:'Läufer',R:'Türme',Q:'Damen'}[p],one={P:'einen Bauern',N:'einen Springer',B:'einen Läufer',R:'einen Turm',Q:'eine Dame'}[p];return T(n===1?one:amounts[n]+' '+noun);}
 function pieces(counts){const list=types.filter(p=>counts[p]>0).map(p=>quantity(p,counts[p]));return list.length<2?list[0]||'':T('{a} und {b}',{a:list.slice(0,-1).join(', '),b:list.at(-1)});}
 function score(s,side){return s.b.reduce((v,p)=>v+(p?(colour(p)===side?1:-1)*(V[p.toUpperCase()]||0):0),0);}
 function reply(s,last){
  if(!last?.cap)return {move:null};const before=score(s,s.turn),choices=[],work={nodes:0};
  for(const m of E.legal(s).filter(m=>m.cap&&m.t===last.t)){const value=C.exchange(E.make(s,m),m.t,s.turn==='w',6,work);if(!Number.isFinite(value))return {unknown:true};if(value>=before)choices.push({m,value});}
  choices.sort((a,b)=>b.value-a.value||(V[a.m.p.toUpperCase()]||0)-(V[b.m.p.toUpperCase()]||0));return {move:choices[0]?.m||null};
 }
 function line(s,pv,options={}){
  const initial=inventory(s),lost={w:{},b:{}},promotions={w:{},b:{}},steps=[];let state=s;
  if(!Array.isArray(pv)||!pv.length||pv.length>20)return {valid:false,steps};
  const moves=pv.slice();let extra=0,unknown=false;
  for(let i=0;i<moves.length;i++){const u=moves[i],m=E.legal(state).find(m=>code(m)===u);if(!m)return {valid:false,steps:[]};const before=state;
   if(m.cap){const side=colour(m.cap),p=m.cap.toUpperCase();lost[side][p]=(lost[side][p]||0)+1;}
   if(m.promo){const side=colour(m.p),p=m.promo.toUpperCase();promotions[side].P=(promotions[side].P||0)-1;promotions[side][p]=(promotions[side][p]||0)+1;}
   state=E.make(state,m);steps.push({before,move:m,after:state,san:E.toSAN(before,m)});
   if(options.extend!==false&&i===moves.length-1){const next=reply(state,m);unknown=!!next.unknown;if(next.move&&extra<4&&moves.length<20){moves.push(code(next.move));extra++;}}
  }
  const end=inventory(state);if(initial.w.K!==1||initial.b.K!==1||end.w.K!==1||end.b.K!==1)return {valid:false,steps:[]};for(const side of ['w','b'])for(const p of [...types,'K'])if((initial[side][p]||0)-(lost[side][p]||0)+(promotions[side][p]||0)!==(end[side][p]||0))return {valid:false,steps:[]};
  const side=s.turn,other=opp(side),plus={},minus={};for(const p of types){const a=lost[other][p]||0,b=lost[side][p]||0;if(a>b)plus[p]=a-b;if(b>a)minus[p]=b-a;}
  // Steht am Ende ein Bauer kurz vor der Umwandlung (freies Feld oder Schlag auf der letzten Reihe), ist die Materialbilanz
  // noch nicht endgültig: sonst hieße es etwa „Weiß verliert einen Läufer“, obwohl Weiß im nächsten Zug eine Dame bekommt.
  const promotes=st=>st.b.some((p,q)=>{if(p!=='P'&&p!=='p')return false;const w=p==='P';if((q>>3)!==(w?1:6))return false;const t=q+(w?-8:8),f=q&7,enemy=x=>x&&E.isW(x)!==w;return !st.b[t]||(f>0&&enemy(st.b[t-1]))||(f<7&&enemy(st.b[t+1]));});
  const mated=E.inCheck(state)&&!E.legal(state).length,remaining=reply(state,steps.at(-1).move),settled=!unknown&&!remaining.unknown&&!remaining.move&&(mated||!promotes(state));
  const amount=a=>Object.entries(a).reduce((n,[p,k])=>n+V[p]*k,0),net=amount(lost[other])-amount(lost[side])+amount(promotions[side])-amount(promotions[other]);
  const gain=pieces(plus),loss=pieces(minus),promoted=Object.values(promotions).some(a=>Object.values(a).some(n=>n>0));
  const balance=!settled?null:mated?fact('endpoint-mate','{side} ist matt.',{},{actorTurn:state.turn,personalKey:'Du bist matt.'}):promoted?fact('endpoint-promotion','Ein Bauer wird umgewandelt.'):gain&&loss?(Math.abs(net)<100?fact('endpoint-material','{side} tauscht {p} gegen {q}.',{p:loss,q:gain}):fact('endpoint-material',net>0?'{side} gewinnt {p} für {q}.':'{side} verliert {p} für {q}.',{p:net>0?gain:loss,q:net>0?loss:gain})):loss?fact('endpoint-material','{side} verliert {p}.',{p:loss}):gain?fact('endpoint-material','{side} gewinnt {p}.',{p:gain}):fact('endpoint-material','Kein Materialverlust.');
  return {valid:true,steps,end:state,lost,promotions,balance,settled,net,mated,matedSide:mated?state.turn:null,initial,extra};
 }
 // A defender is established by a legal hypothetical capture and recapture,
 // not by an untested ray (which could belong to a pinned piece).
 function recaptures(s,move){if(!move?.cap)return [];const after=E.make(s,move);return E.legal(after).filter(m=>m.cap&&m.t===move.t);}
 // Track the actual captured piece back through the legal example, including
 // castling. A promoted pawn must not be called a knight on its starting square.
 function origin(s,model,target){
  if(!model.valid)return null;const ids=s.b.map((p,i)=>p&&colour(p)===s.turn?i:null),found=[];
  for(const st of model.steps){const m=st.move,at=m.ep?m.t+(E.isW(m.p)?8:-8):m.t;
   if(m.cap){if(colour(m.cap)===s.turn&&m.cap.toUpperCase()===target.piece&&E.sqName(at)===target.square)found.push(ids[at]);ids[at]=null;}
   const id=ids[m.f];ids[m.f]=null;ids[m.t]=id;
   if(m.p.toUpperCase()==='K'&&Math.abs(m.t-m.f)===2){const f=m.t>m.f?m.f+3:m.f-4,t=m.t>m.f?m.f+1:m.f-1;ids[t]=ids[f];ids[f]=null;}
  }
  const unique=[...new Set(found)];return unique.length===1&&unique[0]!==null&&s.b[unique[0]]?.toUpperCase()===target.piece?E.sqName(unique[0]):null;
 }
 function motifs(s,model){
  if(!model.valid)return [];const result=[],steps=model.steps,side=s.turn;
  for(let i=0;i+2<steps.length;i++){
   const [a,b,c]=steps.slice(i,i+3);if(a.before.turn!==side||c.before.turn!==side||!c.move.cap||model.net<200)continue;
   const hypothetical=E.legal(a.before).find(m=>m.f===c.move.f&&m.t===c.move.t&&m.cap===c.move.cap);
   const defenders=hypothetical?recaptures(a.before,hypothetical):[];
   if(a.move.cap&&defenders.some(m=>m.f===a.move.t))result.push(fact('remove-defender','{m} entfernt den Verteidiger auf {d}; in der gezeigten Folge gewinnt {side} danach {p} auf {s}.',{m:a.san,d:E.sqName(a.move.t),p:part(c.move.cap.toUpperCase()),s:E.sqName(c.move.t)},{line:steps.slice(i,i+3).map(st=>code(st.move))}));
   if(a.move.cap&&b.move.cap&&b.move.t===a.move.t&&hypothetical&&defenders.length===1&&defenders[0].f===b.move.f&&recaptures(a.before,a.move).length===1&&!recaptures(c.before,c.move).some(m=>m.f===b.move.t)&&V[a.move.cap.toUpperCase()]>=300&&V[c.move.cap.toUpperCase()]>=300)
    result.push(fact('overload','Überlastung: Der Verteidiger auf {d} deckt zwei Ziele. In dieser Folge bleibt nach {r} die Figur auf {s} ohne diesen Schutz.',{d:E.sqName(b.move.f),r:b.san,s:E.sqName(c.move.t)},{overloadPiece:c.move.cap,line:steps.slice(i,i+3).map(st=>code(st.move))}));
   if(i>0&&steps[i-1].move.cap&&E.inCheck(a.after)&&a.move.t!==steps[i-1].move.t&&c.move.cap&&c.move.t===steps[i-1].move.t)
    result.push(fact('intermezzo','{m} ist ein Zwischenzug mit Schach. In dieser Folge kommt erst nach {r} der Rückschlag {c}.',{m:a.san,r:b.san,c:c.san},{line:steps.slice(i-1,i+3).map(st=>code(st.move))}));
   if(a.after.b[c.move.t]===c.move.cap){const trapped=C.trapped(a.after,c.move.t);if(trapped)result.push(trapped);}
  }
  // Existing legal PV motifs cover skewers and discovered checks. Reuse their
  // witnesses rather than adding a second geometric detector.
  for(const f of C.inspectLine(s,steps.map(st=>code(st.move)),s.turn==='w','best').facts)if(['skewer','discovered-check'].includes(f.type)&&f.owner==='self'&&model.net>=200)result.push(f);
  return result.slice(0,2);
 }
 function inspect(s,played,best,comparison={},reason){
  if(!reason)reason=C.rationale(s,played,best,comparison);const checked=(pv,move)=>pv?.[0]===code(move)?line(s,pv):{valid:false,steps:[]},actual=checked(comparison.pvPlayed||reason.description.bad?.moves.map(m=>m.uci),played),recommended=checked(comparison.pvBest||reason.description.good?.moves.map(m=>m.uci),best);
  const b=E.toSAN(s,best),m=played?E.toSAN(s,played):b,same=code(played)===code(best),reliable=!comparison.uncertain&&!comparison.unavailable&&Number.isFinite(comparison.evBest)&&Number.isFinite(comparison.evPlayed);
  const facts=reason.facts||[],matePlayed=facts.find(f=>f.type==='mate'&&f.phase==='played'&&f.owner==='opponent'&&f.forced),mateBest=facts.find(f=>f.type==='mate'&&f.phase==='best'&&f.owner==='self'&&f.forced),savedMaterial=reliable?C.materialLoss(s,comparison):null;
  let short,why=null,concrete=false;
  if(comparison.mateTiming&&!comparison.mateError)short=reason.context[0]||fact('summary-preference','{b} passt hier.',{b});
  else if(reliable&&same){const defence=C.goodDefence(s,best);short=defence||fact('summary-preference','Die Suche bevorzugt den gespielten Zug {b}.',{b});concrete=!!defence;}
  else if(reliable&&!comparison.mateError&&comparison.winLoss<5)short=fact('summary-close','Die Suche bewertet beide Züge ähnlich gut; sie bevorzugt {b} knapp.',{b});
  else if(reliable&&matePlayed){short=fact('summary-mate',matePlayed.mateIn===1?'{side} lässt Matt im nächsten Zug zu. Die Suche empfiehlt {b}.':'{side} lässt Matt in {n} Zügen zu. Die Suche empfiehlt {b}.',{n:matePlayed.mateIn,b});concrete=true;}
  // Endet die gezeigte Folge nach dem Partiezug im Matt und meldet die Engine ein Matt, ist das wichtiger als der Materialverlust.
  else if(reliable&&actual.valid&&actual.mated&&actual.matedSide===s.turn&&comparison.evPlayed*(s.turn==='w'?1:-1)<=-E.MATE+1000){const n=actual.steps.filter((_,i)=>i%2===1).length;short=fact('summary-mate',n===1?'{side} lässt Matt im nächsten Zug zu. Die Suche empfiehlt {b}.':'{side} lässt Matt in {n} Zügen zu. Die Suche empfiehlt {b}.',{n,b});concrete=true;}
  else if(reliable&&mateBest){short=fact('summary-mate',mateBest.mateIn===1?'{side} konnte mit {b} sofort mattsetzen.':'{side} konnte mit {b} in {n} Zügen mattsetzen.',{b,n:mateBest.mateIn});concrete=true;}
  else if(reliable&&actual.valid&&actual.settled&&actual.net<=-200){
   short=actual.balance&&actual.balance.type==='endpoint-material'?{...actual.balance,type:'summary-material',key:actual.balance.key+' Besser war {b}.',args:{...actual.balance.args,b}}:fact('summary-material','{side} verliert Material. Besser war {b}.',{b});concrete=true;
  }else if(reliable&&recommended.valid&&recommended.settled&&recommended.net>=200){short=recommended.balance?.args?.p?fact('summary-gain','{side} konnte {p} gewinnen: {b}.',{b,p:recommended.balance.args.p}):fact('summary-gain','{side} gewinnt mit {b} in dieser Folge Material.',{b});concrete=true;}
  else short=fact('summary-preference',reliable?(same?'Die Suche bevorzugt den gespielten Zug {b}.':'Die Suche bewertet {m} schlechter als {b}.'):'Die Einschätzung ist unsicher. Die Suche bevorzugt {b}.',{b,m});
  if(reliable&&mateBest)why=fact('reason-mate','{b} beginnt die in der Suche nachgewiesene Mattfolge.',{b});
  else if(reliable&&matePlayed&&recommended.valid&&comparison.evBest*(s.turn==='w'?1:-1)>-E.MATE+1000)why=fact('reason-defence','{b} vermeidet die gezeigte Mattfolge.',{b});
  else if(reliable&&reason.description.evidence?.overlooked){const t=reason.description.evidence.overlooked,pass={...s,turn:opp(s.turn),ep:-1,h1:undefined,h2:undefined},move=E.legal(pass).find(m=>code(m)===t.move);if(move)why=fact('reason-defence','{b} wehrt die belegte Drohung {m} ab.',{b,m:E.toSAN(pass,move)});}
  else if(savedMaterial?.targets?.length===1&&recommended.settled){const t=savedMaterial.targets[0],start=origin(s,actual,t);
   if(start){const prior=C.threatNow(s,opp(s.turn)),threatened=prior?.targets?.some(t=>t.square===start)||prior?.move?.slice(2,4)===start,kept=!(recommended.lost[s.turn][t.piece]>0);why=fact('reason-rescue',kept?(threatened?'Mit {b} rettet {side} {p} auf {s}.':'Mit {b} behält {side} {p}.'):'Mit {b} vermeidet {side} den Materialverlust.',{b,p:part(t.piece),s:start},{originalSquare:start,captureSquare:t.square});}}
  else if(reliable&&recommended.valid&&actual.valid&&recommended.settled&&actual.settled&&recommended.net-actual.net>=100){
   if(best.cap&&recommended.steps[1]?.move.cap&&recommended.steps[1].move.t===best.t)why=fact('reason-material','Der Abtausch mit {b} ist günstiger.',{b});
   else if(actual.net<0&&recommended.net>=0)why=fact('reason-material','Mit {b} verliert {side} kein Material.',{b});
  }
  else if(reliable&&recommended.valid&&recommended.settled&&recommended.net>=200)why=fact('reason-gain','Mit {b} gewinnt {side} in der gezeigten Folge Material.',{b});
  if(!why&&reliable)why=reason.description.evidence?.defence?.[0]||reason.why.find(f=>/verhinder|entgeh|entzieh|angegriffene Figur|gedeckt|deckt|Schach ab/.test(f.key))||null;
  // Without a tactical consequence or reason, name one checkable positional fact instead of a bare preference.
  const position=!concrete&&!why&&reliable&&!same&&!comparison.mateError&&!comparison.mateTiming&&comparison.winLoss>=5?C.positionalReason(s,played,best,actual,recommended):null;
  if(position)why=position;
  const extra=reliable?motifs(s,recommended):[];
  const suppressBalances=actual.settled&&recommended.settled&&recommended.net<actual.net&&!mateBest&&!(actual.mated&&actual.matedSide===s.turn);
  if(suppressBalances){short=fact('summary-preference','{b} war besser.',{b});concrete=false;if(why&&['reason-material','reason-rescue','reason-gain'].includes(why.type))why=null;}
  if(comparison.opportunity?.verified)short={...short,precedingBlunder:true};
  const balances=[{key:'Gespielter Zug',value:actual},{key:'Empfehlung der Engine',value:recommended}];
  return {short,why,concrete,whyConcrete:!!why,position,actual,recommended,motifs:extra,balances,reason,suppressBalances};
 }
 function speechActs(f,side){
  const k=f.key||'',a=f.args||{},m=a.b||a.m||f.move,actor=f.actorTurn||side,ids=[];if(!m)return ids;
  if(/verhinder|vermeidet die gezeigte Mattfolge/.test(k)&&/Matt/.test(k))ids.push(actor+'|'+m+'|mate-defence');
  if(/mattsetzen|setzt.*matt|beginnt die Mattfolge/.test(k))ids.push(actor+'|'+m+'|mate-attack');
  if(/wehr.*Drohung|Drohung.* ab/.test(k))ids.push(actor+'|'+m+'|threat-defence');
  if(f.type==='capture'||/Mit \{b\} schläg/.test(k))ids.push(actor+'|'+m+'|capture');
  if(/Mit \{b\} greif/.test(k))ids.push(actor+'|'+m+'|attack');
  if(['fork','double-attack','skewer','discovered-check','discovered-attack'].includes(f.type))ids.push(actor+'|'+m+'|'+f.type);
  if(/gewinnen|gewinnt/.test(k))ids.push(actor+'|'+m+'|gain');
  if(/bevorzug|bewertet|war (?:etwas )?besser|knappe Präferenz/.test(k))ids.push(actor+'|'+m+'|preference');
  if(/kommt.*ins Spiel/.test(k))ids.push(actor+'|'+m+'|development');return ids;
 }
 function distinct(short,details,side){
  const head=new Set(speechActs(short,side)),rows=details.map(f=>({f,ids:speechActs(f,side)}));
  return rows.filter((r,i)=>!r.ids.length||!r.ids.every(id=>head.has(id))&&!rows.some((other,j)=>i!==j&&r.ids.every(id=>other.ids.includes(id))&&(other.ids.length>r.ids.length||other.ids.length===r.ids.length&&j<i))).map(r=>r.f);
 }
 function detailContent(short,details,side,perspective){const head=text(short,side,perspective),seen=new Set(),unique=distinct(short,details,side).map(f=>({text:text(f,side,perspective),type:f.type})).filter(t=>{if(t.text===head||seen.has(t.text))return false;seen.add(t.text);return true;});return {head,body:unique.map(t=>t.text).join(' '),html:unique.map(t=>t.type==='instruction'?`<span class="coach-principle">${esc(t.text)}</span>`:esc(t.text)).join(' ')};}
 function copy(short,details,side,reservedWords=0,perspective=null){
  const {head,body,html}=detailContent(short,details,side,perspective),collapsed=words(head+' '+body)>60;
  return `<div class="coach-copy"><strong class="coach-summary">${esc(head)}</strong>${body?(collapsed||words(head+' '+body)+reservedWords>60?`<details class="coach-more"><summary>${esc(T('Mehr erklären'))}</summary><div>${html}</div></details>`:`<span class="coach-details">${html}</span>`):''}</div>`;
 }
 function balancesHTML(model,side,perspective=null){return model.suppressBalances?'':`<span class="coach-balances">${model.balances.filter(l=>l.value.settled&&l.value.balance).map(l=>`<span>${esc(T('Ergebnis: {result}',{result:text(l.value.balance,side,perspective)}))}</span>`).join('')}</span>`;}
 function explanation(s,played,best,comparison,reason,legacyLines,note,idea,perspective=null){
  const model=inspect(s,played,best,comparison,reason),details=[...(model.why?[model.why]:[]),...reason.flow.filter(f=>!(model.position&&f.type==='preference')),...model.motifs,...(idea?[{type:'instruction',key:idea}]:[])],content=detailContent(model.short,details,s.turn,perspective);
  const rows=model.balances.filter(l=>l.value.valid).map(l=>`<span><b>${esc(T(l.key))}</b> ${esc(l.value.steps.map(st=>st.san).join(' → '))}${!model.suppressBalances&&l.value.settled&&l.value.balance?`<small class="coach-balance">${esc(T('Ergebnis: {result}',{result:text(l.value.balance,s.turn,perspective)}))}</small>`:''}</span>`).join(''),lines=`<span class="coach-lines">${rows}</span>`,noteText=T(reason.facts.some(f=>f.type==='mate'&&f.forced)?'Das Matt ist erzwungen.':'Die Zugfolgen sind Beispiele.');
  const long=words(content.head+' '+content.body+' '+lines.replace(/<[^>]*>/g,' ')+' '+noteText)>60;
  return long?copy(model.short,[],s.turn,0,perspective)+`<details class="coach-more"><summary>${esc(T('Mehr erklären'))}</summary><div>${content.html}${lines}</div></details><span class="coach-note">${esc(noteText)}</span>`:copy(model.short,details,s.turn,0,perspective)+lines+`<span class="coach-note">${esc(noteText)}</span>`;
 }
 function stepCopy(facts,side,model,reservedWords=0,perspective=null){return copy(model?.short||facts[0]||fact('instruction','Sieh dir diese Fortsetzung Zug für Zug an.'),model?[...(model.why?[model.why]:[]),...facts,...model.motifs]:facts.slice(1),side,reservedWords,perspective);}
 function critical(s,played,comparison){
  if(!played||comparison.uncertain||comparison.unavailable)return null;
  return C.goodDefence(s,played);
 }
 function course(rows){
  const safe=r=>!r.uncertain&&!r.unavailable&&Number.isFinite(r.evAfter),out=[];let balanced=0;for(const r of rows){if(!safe(r)||Math.abs(r.evAfter)>80)break;balanced++;}
  if(balanced>=6)out.push(fact('course','Bis zum {n}. Zug lag die Suchbewertung im ausgeglichenen Bereich.',{n:Math.floor(balanced/2)}));
  const turning=rows.filter(r=>safe(r)&&['bad','miss'].includes(r.cls)&&r.best).sort((a,b)=>(b.winLoss||0)-(a.winLoss||0)).slice(0,2).sort((a,b)=>a.i-b.i);
  for(const r of turning){const model=inspect(r.S,r.m,r.best,r),label=r.S.full+(r.S.turn==='b'?'… ':'. ')+r.san,spoken=text(model.short,r.S.turn),first=spoken.match(/^.*?[.!?](?:\s|$)/)?.[0]?.trim()||spoken;out.push(fact('course','Wendepunkt bei {m}: {reason}',{m:label,reason:first}));}
  return out.slice(0,3);
 }
 // Ziel der ganzen Folge, nur aus Dingen, die auf dem nachgespielten Brett sicher feststehen. Sonst kein Ziel.
 const center=sq=>Math.max(Math.abs((sq&7)-3.5),Math.abs((sq>>3)-3.5));
 function passed(b,sq){const p=b[sq];if(p!=='P'&&p!=='p')return false;const w=p==='P',f=sq&7,r=sq>>3;return !b.some((x,q)=>x===(w?'p':'P')&&Math.abs((q&7)-f)<=1&&(w?(q>>3)<r:(q>>3)>r));}
 function endgame(b){let q=0,n=0;for(const p of b){if(!p)continue;const t=p.toUpperCase();if(t==='Q')q++;if('RBNQ'.includes(t))n+=V[t];}return q===0&&n<=2700;}
 function goal(s,model){
  if(!model?.valid||!model.steps?.length)return null;
  const steps=model.steps,side=s.turn,g=(key,actor,args={},personalKey)=>fact('goal',key,args,{actorTurn:actor,personalKey});
  if(model.mated)return g('Ziel der Folge: {side} setzt matt.',opp(model.matedSide),{},'Ziel der Folge: Du setzt matt.');
  for(const c of [side,opp(side)])if(Object.entries(model.promotions[c]).some(([p,n])=>p!=='P'&&n>0))return g('Ziel der Folge: {side} wandelt einen Bauern um.',c,{},'Ziel der Folge: Du wandelst einen Bauern um.');
  const end=model.end.b;
  for(const c of [side,opp(side)]){const w=c==='w';if(end.some((p,q)=>p===(w?'P':'p')&&(q>>3)===(w?1:6)&&passed(end,q)&&!end[q+(w?-8:8)]&&steps.some(st=>st.move.t===q&&st.move.p===p&&!st.move.promo)))return g('Ziel der Folge: {side} bringt einen Bauern bis kurz vor die Umwandlung.',c,{},'Ziel der Folge: Du bringst einen Bauern bis kurz vor die Umwandlung.');}
  const bal=model.balance;
  if(model.settled&&bal&&bal.args?.p&&Math.abs(model.net)>=(bal.args.q?200:100)){
   const win=model.net>0?side:opp(side);
   return bal.args.q?g('Ziel der Folge: {side} gewinnt {p} für {q}.',win,{p:bal.args.p,q:bal.args.q},'Ziel der Folge: Du gewinnst {p} für {q}.'):g('Ziel der Folge: {side} gewinnt {p}.',win,{p:bal.args.p},'Ziel der Folge: Du gewinnst {p}.');
  }
  for(const c of [side,opp(side)]){const files={};for(const st of steps)if(colour(st.move.p)===c&&st.move.p.toUpperCase()==='P'&&!st.move.cap&&passed(st.after.b,st.move.t))files[st.move.t&7]=(files[st.move.t&7]||0)+1;
   const f=Object.keys(files).find(f=>files[f]>=2);if(f!==undefined)return g('Ziel der Folge: {side} schiebt den Freibauern auf der {f}-Linie nach vorn.',c,{f:'abcdefgh'[f]},'Ziel der Folge: Du schiebst den Freibauern auf der {f}-Linie nach vorn.');}
  for(const c of [side,opp(side)])if(steps.filter(st=>colour(st.move.p)===c&&E.inCheck(st.after)).length>=3)return g('Ziel der Folge: {side} greift den König an.',c,{},'Ziel der Folge: Du greifst den König an.');
  const worth=(b,c)=>b.reduce((n,p)=>n+(p&&colour(p)===c?V[p.toUpperCase()]:0),0),lead=(b,c)=>worth(b,c)-worth(b,opp(c));
  if(model.settled&&steps.filter(st=>st.move.cap).length>=4&&Math.abs(model.net)<100)for(const c of [side,opp(side)])if(lead(s.b,c)>=200&&lead(end,c)>=200)return g('Ziel der Folge: {side} tauscht Figuren ab und behält den Materialvorteil.',c,{},'Ziel der Folge: Du tauschst Figuren ab und behältst den Materialvorteil.');
  if(endgame(end))for(const c of [side,opp(side)]){const ks=steps.filter(st=>colour(st.move.p)===c&&st.move.p.toUpperCase()==='K');if(ks.length>=2&&center(ks.at(-1).move.t)<center(ks[0].move.f))return g('Ziel der Folge: {side} bringt im Endspiel den König ins Spiel.',c,{},'Ziel der Folge: Du bringst im Endspiel den König ins Spiel.');}
  return null;
 }
 window.ChessTeaching=Object.freeze({goal,passed,endgame,line,origin,inspect,motifs,copy,explanation,balancesHTML,stepCopy,critical,course,words,reword,personal,quantity,piecePhrase,speechActs,distinct});
})();
