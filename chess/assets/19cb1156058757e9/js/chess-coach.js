/* Concrete, engine-checked observations for completed games and private training.
 * No live-game evaluation, background jobs, invented strategic labels or rewards. */
(function () {
  'use strict';
  const E = window.ChessEngine;
  const uci = m => m && E.sqName(m.f) + E.sqName(m.t) + (m.promo ? m.promo.toLowerCase() : '');
  // In prose, piece names are lowercase outside German; menu labels stay unchanged.
  const piece = p => {const name=({ K:T('König'), Q:T('Dame'), R:T('Turm'), B:T('Läufer'), N:T('Springer'), P:T('Bauer') })[p.toUpperCase()];return (window.DA_LANG||'de')==='de'?name:name.toLocaleLowerCase(window.DA_LANG);};
  const capturedPiece=p=>({K:T('den König'),Q:T('die Dame'),R:T('den Turm'),B:T('den Läufer'),N:T('den Springer'),P:T('den Bauern')})[p.toUpperCase()];
  // Polish fork targets follow «na» and need the accusative, not the label form.
  const forkPiece=p=>window.DA_LANG==='pl'?capturedPiece(p):piece(p);
  // Describe both sides neutrally. A replay alternates actors; it must never
  // turn the opponent into the reader when stepping through a continuation.
  const neutralFacts={
  "Mit {b} schlägst du {p} auf {s}.": "Mit {b} schlägt {side} {p} auf {s}.",
  "Mit {b} greifst du {p} auf {s} an.": "Mit {b} greift {side} {p} auf {s} an.",
  "Mit {b} rochierst du: König und Turm wechseln gemeinsam ihre Felder.": "Mit {b} rochiert {side}: König und Turm wechseln gemeinsam ihre Felder.",
  "Mit {b} wandelst du deinen Bauern um: {p}.": "Mit {b} wandelt {side} den Bauern um: {p}.",
  "Mit {b} setzt du sofort matt.": "Mit {b} setzt {side} sofort matt.",
  "Mit {b} verhinderst du dieses unmittelbare Matt.": "Mit {b} verhindert {side} dieses unmittelbare Matt.",
  "Auf diesem Feld kannst du danach nicht sofort zurückschlagen.": "Auf diesem Feld kann {side} danach nicht sofort zurückschlagen.",
  "Mit {b} greifst du zwei Figuren gleichzeitig an: {p} auf {s} und {q} auf {t}.": "Mit {b} greift {side} gleichzeitig zwei Figuren an: {p} auf {s} und {q} auf {t}.",
  "Schlägt der Gegner deine Figur mit {r}, folgt {m}: Schachmatt.": "Schlägt {other} die Figur mit {r}, folgt {m}: Schachmatt.",
  "Mit {b} schlägst du die Figur auf {s} ({p}).": "Mit {b} schlägt {side} die Figur auf {s} ({p}).",
  "Beachte die mögliche Antwort {r}: Auch deine schlagende Figur kann geschlagen werden.": "Nach der möglichen Antwort {r} kann auch die schlagende Figur verloren gehen.",
  "Mit {b} gibst du Schach. Der Gegner muss zuerst das Schach abwehren.": "Mit {b} gibt {side} Schach. {other} muss das Schach abwehren.",
  "Mit {m} setzt du in {n} Zügen matt: {line}.": "Mit {m} setzt {side} in {n} Zügen matt: {line}.",
  "Nach {m} setzt der Gegner in {n} Zügen matt: {line}.": "Nach {m} setzt {other} in {n} Zügen matt: {line}.",
  "{b} deckt {s} und verhindert die Gabel; deine Figur ({p}) steht dann auf {f}.": "{b} deckt {s} und verhindert die Gabel; die Figur von {side} ({p}) steht dann auf {f}.",
  "Mit {b} entgehst du dieser Gabel; {p} steht danach auf {s}.": "Mit {b} entgeht {side} dieser Gabel; {p} steht danach auf {s}.",
  "Mit {b} öffnest du die Linie für die Figur auf {s}. Sie erreicht jetzt {t}.": "Mit {b} öffnet {side} die Linie für die Figur auf {s}. Sie erreicht jetzt {t}.",
  "Die Suche hat ein kurzes Matt mit {b} gefunden; dein Zug wird weiterhin klar auf Gewinn bewertet.": "Die Suche hat ein kurzes Matt mit {b} gefunden; der Partiezug bleibt klar auf Gewinn bewertet.",
  "Hier siehst du deinen Partiezug und eine mögliche Antwort des Gegners.": "Hier stehen der Partiezug und eine mögliche Antwort.",
  "Mit {b} schlägst du auf {t} mit der Figur von {f}; deine wertvollere Figur bleibt auf {s}.": "Mit {b} schlägt {side} auf {t} mit der Figur von {f}; die wertvollere Figur bleibt auf {s}.",
  "Mit {b} schlägst du auf {t} mit der Figur von {f}. Deine wertvollere Figur bleibt auf {s}.": "Mit {b} schlägt {side} auf {t} mit der Figur von {f}; die wertvollere Figur bleibt auf {s}.",
  "Mit {b} schlägst du mit der Figur von {f}; deine wertvollere Figur bleibt auf {s} und deckt {t}.": "Mit {b} schlägt {side} mit der Figur von {f}; die wertvollere Figur bleibt auf {s} und deckt {t}.",
  "Mit {b} schlägst du mit der Figur von {f}. Deine wertvollere Figur bleibt auf {s} und deckt {t}.": "Mit {b} schlägt {side} mit der Figur von {f}; die wertvollere Figur bleibt auf {s} und deckt {t}."
};
  neutralFacts['Nach {m} kann der Gegner schlagen: {p} auf {s} ({r}).']='Nach {m} kann {other} schlagen: {p} auf {s} ({r}).';

  neutralFacts['Nach {m} kann der Gegner schlagen: {p} auf {s} ({r}).']='Nach {m} kann {other} {p} auf {s} schlagen ({r}).';
  neutralFacts['Ein Rückschlag auf {s} ist möglich; der Abtausch bleibt in der kurzen Prüfung günstig.']='{other} kann auf {s} zurückschlagen, trotzdem gewinnt {side} bei diesem Tausch Material.';
  neutralFacts['Der Gegner kann auf {s} zurückschlagen.']='{other} kann auf {s} zurückschlagen.';
  neutralFacts['{b} deckt {s} und verhindert die Gabel; deine Figur ({p}) steht dann auf {f}.']='{b} deckt {s} und verhindert die Gabel. Danach steht {p} auf {f}.';
  neutralFacts['Mit {b} entgehst du dieser Gabel; {p} steht danach auf {s}.']='Mit {b} entgeht {side} dieser Gabel. Danach steht {p} auf {s}.';
  neutralFacts['Die Suche hat ein kurzes Matt mit {b} gefunden; dein Zug wird weiterhin klar auf Gewinn bewertet.']='Mit {b} wäre es schneller matt gewesen. Der Partiezug gewinnt trotzdem klar.';
  neutralFacts['Die Suche bewertet die Stellung schon vor dem Zug als klar verloren; daraus wird hier kein neuer Fehler.']='Die Stellung war schon vor dem Zug klar verloren; deshalb zählt dieser Zug nicht als neuer Fehler.';
  neutralFacts['Die Suche bewertet beide Züge ähnlich gut. {b} ist eine knappe Präferenz, kein nachgewiesener Fehler von {m}.']='Die Engine zieht {b} knapp vor. {m} ist deshalb kein echter Fehler.';
  neutralFacts['Der Partiezug {m} ist hier kein nachgewiesener Fehler; die Engine bevorzugt {b} knapp.']='Die Engine zieht {b} knapp vor. {m} ist deshalb kein echter Fehler.';
  const subjectPiece=p=>({K:T('Der König'),Q:T('Die Dame'),R:T('Der Turm'),B:T('Der Läufer'),N:T('Der Springer'),P:T('Der Bauer')})[p.toUpperCase()];
  const capital=text=>text?text[0].toLocaleUpperCase(window.DA_LANG||'de')+text.slice(1):text;
  const labelPiece=p=>capital(piece(p));
  const actorName=side=>(window.DA_LANG||'de')==='de'?T(side==='w'?'Weiß':'Schwarz'):T(side==='w'?'die weißen Figuren':'die schwarzen Figuren');
  const fieldList=fields=>fields.length<2?fields[0]||'':T('{a} und {b}',{a:fields.slice(0,-1).join(', '),b:fields.at(-1)});
  function colouredPiece(p,side){
    const white=side==='w';
    return ({K:white?T('der weiße König'):T('der schwarze König'),Q:white?T('die weiße Dame'):T('die schwarze Dame'),R:white?T('der weiße Turm'):T('der schwarze Turm'),B:white?T('der weiße Läufer'):T('der schwarze Läufer'),N:white?T('der weiße Springer'):T('der schwarze Springer'),P:white?T('der weiße Bauer'):T('der schwarze Bauer')})[p.toUpperCase()];
  }
  function renderFact(f,turn,perspective=null){
    const originalKey=f.key;
    let key=neutralFacts[f.key]||f.key;
    const neutralKey=key;
    if(window.ChessTeaching){const plain=ChessTeaching.reword(f,key);f={...f,...plain,args:{...f.args,...plain.args}};key=f.key;}
    if(['w','b'].includes(perspective)&&(f.actorTurn||turn)===perspective){key=f.personalKey||window.ChessTeaching?.personal(key)||(key===neutralKey&&neutralFacts[originalKey]&&/\bdu\b|dein/i.test(originalKey)&&!/Suche|nachgewiesen|gezeigte|geprüfte/.test(originalKey)?originalKey:key);}
    const lang=window.DA_LANG||'de',subject=f.subjectCode?.toUpperCase();
    if(f.key==='{p} auf {s} kann nicht sofort zurückgeschlagen werden.'&&((['fr','pt','it'].includes(lang)&&'QR'.includes(subject))||(lang==='pl'&&subject==='R')))key='{p} auf {s} kann nicht unmittelbar zurückgeschlagen werden.';
    // Side names need articles/plural agreement in several languages. They are
    // sentence fragments here, independent of the capitalized colour UI labels.
    const side=actorName(f.actorTurn||turn),other=actorName((f.actorTurn||turn)==='w'?'b':'w');
    const args={...f.args,side,other};
    if(f.type==='missed-chance'){
      if(lang==='fr')args.other=other.replace(/^les /,'des ');
      if(lang==='pt')args.other=other.replace(/^as /,'das ');
      if(lang==='it')args.other=other.replace(/^il /,'del ');
      if(lang==='pl')args.other=other==='białe'?'białych':'czarnych';
    }
    if(f.pieceCode)args.p=colouredPiece(f.pieceCode,turn);
    if(f.key.includes('ist an den König')&&!T(key).startsWith('{p}')&&args.p)args.p=args.p[0].toLocaleLowerCase(lang)+args.p.slice(1);
    let text=T(key,args);
    if(f.precedingBlunder)text=T('{other} hat gerade einen Fehler gemacht. {text}',{other,text});
    for(const name of [side,other]){
      if(text.startsWith(name))text=capital(text);
      for(const stop of ['. ','! ','? '])text=text.split(stop+name).join(stop+capital(name));
    }
    return text;
  }
  const mate = s => E.inCheck(s) && !E.legal(s).length;
  function notation(){
    const letters=E.notationLetters(),esc=s=>UI.esc(s),row=(code,text)=>`<dt><code>${esc(code)}</code></dt><dd>${esc(text)}</dd>`;
    return `<details class="coach-notation"><summary>${esc(T('Zugschreibweise verstehen'))}</summary><div class="coach-notation-body"><p class="coach-notation-current" hidden></p><p>${esc(T('Der Figurenbuchstabe nennt die Figur. Kleine Buchstaben a–h und Zahlen 1–8 nennen die Felder.'))}</p><dl class="coach-notation-pieces">${['K','Q','R','B','N'].map(p=>row(letters[p],piece(p))).join('')}</dl><p>${esc(T('Bauernzüge haben keinen Figurenbuchstaben: e4 heißt Bauer nach e4.'))}</p><dl>${row(letters.N+'c3',T('Springer nach c3.'))}${row('dxc4',T('Bauer von der d-Linie schlägt auf c4.'))}${row(letters.Q+'xc4',T('Dame schlägt auf c4.'))}${row('e8='+letters.Q,T('Bauer zieht nach e8 und wird zur Dame umgewandelt.'))}</dl><p>${esc(T('Kleine Buchstaben wie d nennen Linien. Große Buchstaben wie {q} nennen Figuren.',{q:letters.Q}))}</p><p>${esc(T('x = schlagen · + = Schach · # = Schachmatt'))}</p><p>${esc(T('O-O = kurze Rochade · O-O-O = lange Rochade'))}</p><p>${esc(T('Zusätzliche Buchstaben oder Zahlen zeigen, welche von zwei gleichen Figuren zieht.'))}</p></div></details>`;
  }
  function notationMove(s,m){
    if(!m)return '';
    const san=E.toSAN(s,m),words=[san,T('{p}: {f} → {t}',{p:labelPiece(m.p),f:E.sqName(m.f),t:E.sqName(m.t)})];
    if(m.cap)words.push(renderFact({key:'Mit {b} schlägst du {p} auf {s}.',args:{b:san,p:capturedPiece(m.cap),s:E.sqName(m.ep?m.t+(E.isW(m.p)?8:-8):m.t)}},s.turn));
    if(m.castle)words.push(renderFact({key:'Mit {b} rochierst du: König und Turm wechseln gemeinsam ihre Felder.',args:{b:san}},s.turn));
    if(m.promo)words.push(renderFact({key:'Mit {b} wandelst du deinen Bauern um: {p}.',args:{b:san,p:piece(m.promo)}},s.turn));
    return words.join(' · ');
  }
  function branch(s, move, pv) {
    if (!move) return null;
    if(Array.isArray(pv)){
      let state=s;const moves=[],states=[s],legalMoves=[];
      // Fail closed on an invalid/stale line. Never repair it with another search.
      for(const code of pv.slice(0,20)){
        const m=E.legal(state).find(m=>uci(m)===code);if(!m||(!moves.length&&code!==uci(move)))break;
        moves.push({uci:code,san:E.toSAN(state,m)});legalMoves.push(m);state=E.make(state,m);states.push(state);
      }
      if(!moves.length){moves.push({uci:uci(move),san:E.toSAN(s,move)});legalMoves.push(move);states.push(E.make(s,move));}
      return {after:states[1],reply:legalMoves[1]||null,end:states[2]||states[1],moves,fromComparison:true};
    }
    const after = E.make(s, move), moves = [{ uci:uci(move), san:E.toSAN(s,move) }];
    const reply = E.legal(after).length ? E.bestMove(after,{maxDepth:3,timeMs:160,noise:0}) : null;
    if (reply) moves.push({uci:uci(reply),san:E.toSAN(after,reply)});
    return { after, reply, end:reply ? E.make(after,reply) : after, moves };
  }
  function describe(s, played, best, comparison={}) {
    const good = branch(s,best,comparison.pvBest), bad = branch(s,played,comparison.pvPlayed), facts = [];
    const add = (key,args={}) => facts.push({key,args,capturedCode:best?.cap});
    if (!good) return {facts,good,bad};
    const b = E.toSAN(s,best), m = played ? E.toSAN(s,played) : '';
    if (mate(good.after)) add('Mit {b} setzt du sofort matt.',{b});
    else if (!E.inCheck(good.after)&&!E.legal(good.after).length) add('Mit {b} entsteht Patt: Der König steht nicht im Schach, aber es gibt keinen legalen Zug. Die Partie ist remis.',{b});
    else if (bad?.reply && mate(bad.end)) {
      add('Nach {m} folgt {r}: Schachmatt.',{m,r:bad.moves[1].san});
      const immediateMate = E.legal(good.after).some(r=>mate(E.make(good.after,r)));
      if (!immediateMate) add('Mit {b} verhinderst du dieses unmittelbare Matt.',{b});
    } else if (bad?.reply?.cap) {
      const r = bad.reply, square=E.sqName(r.ep?r.t+(r.p===r.p.toUpperCase()?8:-8):r.t);
      add('Nach {m} kann der Gegner schlagen: {p} auf {s} ({r}).',{m,p:capturedPiece(r.cap),s:square,r:bad.moves[1].san});
      const recapture=E.legal(bad.end).find(x=>x.cap&&x.t===r.t);
      if (!recapture) add('Auf diesem Feld kannst du danach nicht sofort zurückschlagen.');
      else add('Prüfe auch den möglichen Gegenschlag: {r}.',{r:E.toSAN(bad.end,recapture)});
    }
    if(!mate(good.after)){
      const ownTurn={...good.after,turn:s.turn,ep:-1,h1:undefined,h2:undefined};
      const valuable=tacticalTargets(good.after,best.t).map(t=>({t,cap:good.after.b[t]}));
      valuable.sort((a,b)=>({K:1000,Q:9,R:5,B:3,N:3}[b.cap.toUpperCase()]-{K:1000,Q:9,R:5,B:3,N:3}[a.cap.toUpperCase()]));
      if(valuable.length>=2){const [x,y]=valuable;add('Mit {b} greifst du zwei Figuren gleichzeitig an: {p} auf {s} und {q} auf {t}.',{b,p:piece(x.cap),s:E.sqName(x.t),q:piece(y.cap),t:E.sqName(y.t)});}
      for(const capture of E.legal(good.after).filter(m=>m.cap&&m.t===best.t)){
        const next=E.make(good.after,capture),finish=E.legal(next).find(m=>mate(E.make(next,m)));
        if(finish){add('Schlägt der Gegner deine Figur mit {r}, folgt {m}: Schachmatt.',{r:E.toSAN(good.after,capture),m:E.toSAN(next,finish)});break;}
      }
    }
    if (facts.length < 2 && !mate(good.after)) {
      if (best.cap) {
        add('Mit {b} schlägst du die Figur auf {s} ({p}).',{b,p:piece(best.cap),s:E.sqName(best.ep?best.t+(best.p===best.p.toUpperCase()?8:-8):best.t)});
        const recapture=E.legal(good.after).find(x=>x.cap&&x.t===best.t);
        if(recapture && facts.length<3) add('Beachte die mögliche Antwort {r}: Auch deine schlagende Figur kann geschlagen werden.',{r:E.toSAN(good.after,recapture)});
      } else if (best.promo) add('Mit {b} wandelst du deinen Bauern um: {p}.',{b,p:piece(best.promo)});
      else if (best.castle) add('Mit {b} rochierst du: König und Turm wechseln gemeinsam ihre Felder.',{b});
      else if (E.inCheck(good.after)) add('Mit {b} gibst du Schach. Der Gegner muss zuerst das Schach abwehren.',{b});
    }
    const extra=motifs(s,best,good.after);
    for(const f of extra.facts)if(facts.length<3)facts.push(f);
    if(!facts.length) add('Für diese Stellung kann die App keinen einfachen taktischen Grund sicher benennen. Vergleiche die beiden Fortsetzungen.');
    const tactical=evidence(s,played,best,comparison);
    return {facts,good,bad,evidence:tactical};
  }
  const worth=p=>({P:100,N:320,B:330,R:500,Q:900,K:0})[p?.toUpperCase()]||0;
  const asTurn=(s,white)=>({...s,turn:white?'w':'b',ep:-1,h1:undefined,h2:undefined});
  const material=(s,white)=>s.b.reduce((n,p)=>n+(p?(E.isW(p)===white?1:-1)*worth(p):0),0);
  // Control is checked with the own king still safe, so a pinned piece does not
  // acquire a fictional attack just because its geometric move reaches a square.
  function controls(s,from,to){
    const p=s.b[from];if(!p||from===to||!attackSources(s.b,to,E.isW(p)).includes(from))return false;
    const b=s.b.slice();b[from]=null;b[to]=p;
    return !E.inCheck({...s,b,turn:E.isW(p)?'w':'b',kw:p==='K'?to:s.kw,kb:p==='k'?to:s.kb});
  }
  // Facts describe legal board relations or a finite, replayed line. Only a
  // mate score AND a matching terminal position establish a forced mate here.
  const fact=(type,key,args={},extra={})=>({type,key,args,...extra});
  const target=(s,sq)=>({piece:s.b[sq]?.toUpperCase(),square:E.sqName(sq)});
  function tacticalTargets(s,from){
    const p=s.b[from];if(!p)return [];
    return s.b.flatMap((q,sq)=>q&&E.isW(q)!==E.isW(p)&&'KQRBN'.includes(q.toUpperCase())&&controls(s,from,sq)?[sq]:[])
      .sort((a,b)=>(s.b[b].toUpperCase()==='K'?100000:worth(s.b[b]))-(s.b[a].toUpperCase()==='K'?100000:worth(s.b[a])));
  }
  function verifiedLine(s,pv){
    const steps=[];let state=s;
    for(const code of (pv||[]).slice(0,20)){
      const move=E.legal(state).find(m=>uci(m)===code);if(!move)break;
      const after=E.make(state,move);steps.push({before:state,move,after,san:E.toSAN(state,move)});state=after;
    }
    return steps;
  }
  // Short exchange calculation: both sides may decline unless in check with
  // no other legal evasion. Pinned recaptures are excluded by E.legal().
  function exchange(s,square,white,depth=5,work={nodes:0}){
    if(++work.nodes>512)return NaN;
    const moves=E.legal(s),captures=moves.filter(m=>m.cap&&m.t===square),value=material(s,white);
    if(!depth||!captures.length)return value;
    const scores=captures.map(m=>exchange(E.make(s,m),square,white,depth-1,work));
    if(!E.inCheck(s)||moves.some(m=>!captures.includes(m)))scores.push(value);
    return (s.turn===(white?'w':'b')?Math.max:Math.min)(...scores);
  }
  function moveMotifs(before,move,after){
    // Checkmate ends the game: a fork, pin or skewer on the mating move is not the point.
    if(mate(after))return [];
    const out=[],white=E.isW(move.p),targets=tacticalTargets(after,move.t),san=E.toSAN(before,move);
    if(targets.length>=2){
      const [a,b]=targets,checked=targets.some(sq=>after.b[sq].toUpperCase()==='K'),type=move.p.toUpperCase()==='N'?'fork':'double-attack';
      out.push(fact(type,'{m}: {idea} gegen {p} auf {s} und {q} auf {t}.',
        {m:san,idea:checked?T('Gabel mit Schach'):type==='fork'?T('Gabel'):T('Doppelangriff'),p:forkPiece(after.b[a]),s:E.sqName(a),q:forkPiece(after.b[b]),t:E.sqName(b)},
        {move:uci(move),from:E.sqName(move.t),targets:[target(after,a),target(after,b)],check:checked}));
    }
    // A discovered attack needs an actual legal attack by the uncovered piece.
    if(move.p.toUpperCase()!=='K')for(let sq=0;sq<64;sq++){
      const q=after.b[sq];if(!q||E.isW(q)===white||!'KQRBN'.includes(q.toUpperCase()))continue;
      const from=attackSources(after.b,sq,white).find(from=>from!==move.t&&before.b[from]===after.b[from]&&!controls(before,from,sq)&&controls(after,from,sq));
      if(from!==undefined)out.push(fact(q.toUpperCase()==='K'?'discovered-check':'discovered-attack',
        'Mit {m}: {idea}, denn {p} auf {f} greift {q} auf {t} an.',
        {m:san,idea:q.toUpperCase()==='K'?T('Abzugsschach'):T('Abzugsangriff'),p:piece(after.b[from]),f:E.sqName(from),q:piece(q),t:E.sqName(sq)},
        {move:uci(move),from:E.sqName(from),attackerPiece:after.b[from],targets:[target(after,sq)]}));
    }
    if('BRQ'.includes(move.p.toUpperCase()))for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const diagonal=dx&&dy;if(move.p.toUpperCase()==='B'&&!diagonal||move.p.toUpperCase()==='R'&&diagonal)continue;
      const occupied=[];let x=(move.t&7)+dx,y=(move.t>>3)+dy;
      while(x>=0&&x<8&&y>=0&&y<8&&occupied.length<2){const sq=y*8+x;if(after.b[sq])occupied.push(sq);x+=dx;y+=dy;}
      if(occupied.length!==2||occupied.some(sq=>E.isW(after.b[sq])===white))continue;
      const [front,back]=occupied,frontValue=after.b[front].toUpperCase()==='K'?100000:worth(after.b[front]),backValue=after.b[back].toUpperCase()==='K'?100000:worth(after.b[back]);
      if(after.b[back].toUpperCase()!=='P'&&frontValue>backValue&&controls(after,move.t,front))out.push(fact('skewer',
        '{m} bildet einen Spieß: {p} auf {s} wird angegriffen, dahinter steht {q} auf {t}.',
        {m:san,p:piece(after.b[front]),s:E.sqName(front),q:piece(after.b[back]),t:E.sqName(back)},
        {move:uci(move),from:E.sqName(move.t),targets:[target(after,front),target(after,back)]}));
      if(after.b[back].toUpperCase()==='K'&&controls(after,move.t,front))out.push(fact('pin',
        '{p} auf {s} ist an den König auf {k} gefesselt: Die Figur darf die Angriffslinie nicht freigeben.',
        {p:subjectPiece(after.b[front]),s:E.sqName(front),k:E.sqName(back)},
        {move:uci(move),from:E.sqName(move.t),targets:[target(after,front),target(after,back)]}));
    }
    return out;
  }
  function lineEvidence(s,pv,white,phase,score){
    const steps=verifiedLine(s,pv),facts=[],base=material(s,white),moments=[];
    const owner=white?'w':'b',limit=E.MATE-1000;
    for(const [i,st] of steps.entries()){
      const own=E.isW(st.move.p)===white;
      for(const f of moveMotifs(st.before,st.move,st.after)){
        // A pin is a winning tactic only when the replayed line really wins
        // its pinned target; geometric pins alone stay in the board tutorial.
        if(f.type==='pin'&&!steps.slice(i+1).some(next=>next.move.cap&&E.sqName(next.move.t)===f.args.s&&exchange(next.after,next.move.t,white)-base>=200))continue;
        facts.push({...f,phase,ply:i,previous:steps[i-1]?.san,owner:own?'self':'opponent',line:steps.map(x=>uci(x.move)),verified:true});
      }
      if(st.move.cap||st.move.promo){
        const delta=exchange(st.after,st.move.t,white)-base;
        const permanent=steps.slice(i).every(next=>Math.sign(delta)*(material(next.after,white)-base)>=200);
        if(Math.abs(delta)>=200&&permanent||st.move.promo){
          moments.push({ply:i,type:st.move.promo?'promotion':'material',net:delta,move:uci(st.move),verified:true,scope:'line'});
          if(st.move.cap)facts.push(fact('material',
            'In dieser Folge schlägt {m} {p} auf {s}; der unmittelbare Gegenschlag gleicht den Materialgewinn nicht aus.',
            {m:st.san,p:capturedPiece(st.move.cap),s:E.sqName(st.move.ep?st.move.t+(E.isW(st.move.p)?8:-8):st.move.t)},
            {phase,ply:i,owner:own?'self':'opponent',net:delta,targets:[{piece:st.move.cap.toUpperCase(),square:E.sqName(st.move.t)}],verified:true,scope:'line'}));
        }
      }
    }
    const last=steps.at(-1),winning=last&&mate(last.after)&&last.after.turn!==owner;
    const losing=last&&mate(last.after)&&last.after.turn===owner;
    const signed=Number.isFinite(score)?score*(white?1:-1):null;
    if(last&&E.MATE-Math.abs(signed)===steps.length&&(winning&&signed>=limit||losing&&signed<=-limit)){
      const first=losing?1:0,mateSteps=steps.slice(first),n=Math.ceil(mateSteps.length/2),line=mateSteps.map(st=>st.san).join(' ');
      const root=steps[0].san,key=losing?'Nach {m} setzt der Gegner in {n} Zügen matt: {line}.':'Mit {m} setzt du in {n} Zügen matt: {line}.';
      const king=last.after.turn==='w'?last.after.kw:last.after.kb,forward=(last.after.turn==='w'?-1:1),front=[-1,0,1].map(dx=>[(king&7)+dx,(king>>3)+forward]).filter(([x,y])=>x>=0&&x<8&&y>=0&&y<8);
      const backRank=[0,7].includes(king>>3)&&'RQ'.includes(last.move.p.toUpperCase())&&(last.move.t>>3)===(king>>3)&&front.every(([x,y])=>last.after.b[y*8+x]&&E.isW(last.after.b[y*8+x])===(last.after.turn==='w'));
      facts.unshift(fact('mate',key,{m:root,n,line},{phase,owner:winning?'self':'opponent',mateIn:n,forced:true,verified:true,ply:steps.length-1,line:mateSteps.map(st=>uci(st.move)),king:E.sqName(king),backRank}));
      moments.unshift({type:'mate',ply:steps.length-1,verified:true});
    }
    return {facts,steps,moment:moments[0]||null};
  }
  function materialLoss(s,comparison){
    if(!s||comparison.uncertain||comparison.unavailable||!Array.isArray(comparison.pvPlayed)||!Array.isArray(comparison.pvBest))return null;
    const metrics=E.comparisonMetrics(comparison.evBest,comparison.evPlayed,s.turn);
    // This is a conservative tie-break for a roughly balanced position, not
    // another absolute material threshold in an already lopsided game.
    if(Math.abs(comparison.evBest)>100||metrics.winBest<=10||metrics.winBest>=90)return null;
    const white=s.turn==='w',actual=lineEvidence(s,comparison.pvPlayed,white,'played',comparison.evPlayed),best=lineEvidence(s,comparison.pvBest,white,'best',comparison.evBest);
    const moved=actual.steps[0]?.move;
    // The root piece can be lost before the LAST capture of a longer exchange.
    // Track that actual piece through legal steps instead of comparing only the
    // last capture square with its original destination.
    let rootAt=moved?.t,rootLost=false;
    for(const st of actual.steps.slice(1)){const m=st.move,own=E.isW(m.p)===white,capture=m.ep?m.t+(E.isW(m.p)?8:-8):m.t;if(!own&&m.cap&&capture===rootAt){rootLost=true;break;}if(own&&m.f===rootAt)rootAt=m.t;}
    const lost=actual.facts.find(f=>f.type==='material'&&f.owner==='opponent'&&f.verified&&f.targets?.some(t=>'NBRQ'.includes(t.piece))&&(f.net<=-320||f.net<=-200&&rootLost));
    if(!lost)return null;
    const otherLoss=Math.min(0,...best.facts.filter(f=>f.type==='material'&&f.owner==='opponent').map(f=>f.net));
    return otherLoss-lost.net>=200?{netLoss:-lost.net,bestLoss:-otherLoss,targets:lost.targets,scope:'verified-line'}:null;
  }
  function missedChance(s,played,comparison,previous){
    if(!s||!played||!comparison.best||comparison.uncertain||comparison.unavailable||comparison.mateTiming||!previous?.S||previous.uncertain||previous.unavailable)return null;
    if(!(comparison.depth>=3)||!(previous.depth>=3)||!Number.isFinite(comparison.evBest)||!Number.isFinite(comparison.evPlayed)||!Array.isArray(comparison.pvBest)||!Array.isArray(comparison.pvPlayed))return null;
    if((previous.judgement?.cls||previous.cls)!=='bad'||previous.S?.turn===s.turn||!previous.m)return null;
    if(E.toFEN(E.make(previous.S,previous.m))!==E.toFEN(s)||E.legal(s).length<=1||uci(played)===uci(comparison.best))return null;
    const metrics=E.comparisonMetrics(comparison.evBest,comparison.evPlayed,s.turn);
    const white=s.turn==='w',good=lineEvidence(s,comparison.pvBest,white,'best',comparison.evBest),actual=lineEvidence(s,comparison.pvPlayed,white,'played',comparison.evPlayed);
    if(!good.steps.length||!actual.steps.length||good.steps.length!==comparison.pvBest?.length||actual.steps.length!==comparison.pvPlayed?.length||uci(good.steps[0].move)!==uci(comparison.best)||uci(actual.steps[0].move)!==uci(played))return null;
    // Missing a gain and actively losing one's own material are different.
    // Do not turn a dubious capture, a forced mate against us, or an unsettled
    // exchange into an encouraging opportunity label.
    const gain=good.facts.find(f=>f.type==='material'&&f.owner==='self'&&f.net>=320),mateFact=good.facts.find(f=>f.type==='mate'&&f.owner==='self'&&f.forced);
    const bestGain=Math.max(0,...good.facts.filter(f=>f.type==='material'&&f.owner==='self').map(f=>f.net));
    const playedGain=Math.max(0,...actual.facts.filter(f=>f.type==='material'&&f.owner==='self').map(f=>f.net));
    if(metrics.winBest<70&&!gain)return null;
    if(metrics.winLoss<20&&!(gain&&playedGain<bestGain/2&&metrics.winPlayed<70))return null;
    if(!defenseState(s,played,comparison).safe||forcedMateTwo(E.make(s,played)))return null;
    const last=actual.steps.at(-1),settled=exchange(last.after,last.move.t,white)-material(s,white);
    if(!Number.isFinite(settled)||settled<0)return null;
    // A mate score without a matching legal terminal PV is insufficient for
    // a missed-mate claim. It can still be a numerically verified advantage.
    const kind=mateFact?'mate':gain?'material':'advantage';
    return {kind,previousFen:E.toFEN(previous.S),previousMove:uci(previous.m),best:uci(comparison.best),played:uci(played),net:bestGain,mateIn:mateFact?.mateIn||null,line:comparison.pvBest.slice(),target:gain?.targets?.[0]||null,verified:true};
  }
  async function restoreChance(s,played,comparison,context){
    if(!context?.fen||!context.move||!played)return null;
    try{
      const S=E.fromFEN(context.fen),m=E.legal(S).find(m=>uci(m)===context.move);if(!m)return null;
      if(E.toFEN(E.make(S,m))!==E.toFEN(s))return null;
      const previous={S,m,...await compare(S,m)};
      // Revalidate the saved preceding blunder, rather than trusting an old
      // label after an engine update or when the same position is reused.
      const metrics=E.comparisonMetrics(previous.evBest,previous.evPlayed,S.turn),loss=previous.winLoss??metrics.winLoss;
      previous.cls=!previous.uncertain&&!previous.unavailable&&!previous.mateTiming&&E.legal(S).length>1&&(previous.mateError||loss>=20||loss>=10&&materialLoss(S,previous))?'bad':'other';
      return missedChance(s,played,comparison,previous);
    }catch(e){return null;}
  }
  function opportunityFact(s,best,chance){
    const args={b:E.toSAN(s,best)},extra={verified:true,kind:chance.kind,line:chance.line};
    if(chance.kind==='mate')return fact('missed-chance',chance.mateIn===1?'Nach dem Fehler von {other} hätte {side} mit {b} sofort mattsetzen können.':'Nach dem Fehler von {other} hätte {side} mit {b} in {n} Zügen mattsetzen können: {line}.',{...args,n:chance.mateIn,line:verifiedLine(s,chance.line).map(st=>st.san).join(' ')},extra);
    if(chance.kind==='material'){
      if(best.cap&&chance.target?.square===E.sqName(best.t))return fact('missed-chance','Nach dem Fehler von {other} hätte {side} mit {b} {p} auf {s} gewinnen können.',{...args,p:capturedPiece(best.cap),s:E.sqName(best.t)},extra);
      return fact('missed-chance','Nach dem Fehler von {other} zeigt die geprüfte Fortsetzung mit {b} einen Materialgewinn für {side}.',args,extra);
    }
    return fact('missed-chance','Nach dem Fehler von {other} bewertet die Engine {b} für {side} deutlich besser als {m}.',{...args,m:E.toSAN(s,E.legal(s).find(m=>uci(m)===chance.played))},extra);
  }
  function checkingCombination(state,prefix){
    if(E.status(state,[]).over)return null;
    // A small legal pattern check, not another evaluation search: check plus
    // queen attack, a queen capture, then a checking knight fork of that queen.
    // This is an explicitly conditional supplement, never a replacement PV.
    for(const m of E.legal(state)){
      const a=E.make(state,m);if(!E.inCheck(a))continue;
      const targets=tacticalTargets(a,m.t);if(!targets.some(t=>a.b[t].toUpperCase()==='Q')||!targets.some(t=>a.b[t].toUpperCase()==='K'))continue;
      for(const r of E.legal(a).filter(r=>r.cap&&r.t===m.t&&r.p.toUpperCase()==='Q')){
        const b=E.make(a,r);
        for(const n of E.legal(b).filter(n=>n.p.toUpperCase()==='N')){
          const c=E.make(b,n);if(!E.inCheck(c))continue;
          const fork=tacticalTargets(c,n.t);
          if(fork.includes(r.t)&&fork.some(t=>c.b[t].toUpperCase()==='K'))return [...prefix,uci(m),uci(r),uci(n)];
        }
      }
    }
    return null;
  }
  const overlookedCache=new Map();
  // Bounded proof of one concrete threat, not a null-move engine evaluation.
  // Every legal defence must still allow mate or a settled minor-piece gain.
  // A refutation witness is distinct from an exhausted/unknown calculation.
  function threatProbe(s,m,work,quietMate=false){
    const white=s.turn==='w',base=material(s,white),a=E.make(s,m),motif=moveMotifs(s,m,a).find(f=>['fork','double-attack','pin'].includes(f.type));
    if(mate(a))return {danger:true,kind:'mate',mateIn:1,line:[uci(m)]};
    if(E.status(a,[]).over)return {danger:false,refutation:[]};
    if(!m.cap&&!motif&&!E.inCheck(a)&&!quietMate)return {unknown:true};
    const checking=E.inCheck(a)||quietMate,targets=(motif?.targets||[]).filter(t=>t.piece!=='K'),plies=E.legal(a);
    let allMate=checking,allGain=true,mateLine=null,gainLine=null,refutation=null,minGain=Infinity;
    for(const reply of plies){
      if(++work.nodes>work.limit||Date.now()>work.deadline)return {unknown:true};
      const b=E.make(a,reply);if(mate(b))return {danger:false,refutation:[uci(m),uci(reply)]};
      const L=E.legal(b);let finish=null;
      if(checking)for(const next of L){if(++work.nodes>work.limit||Date.now()>work.deadline)return {unknown:true};if(mate(E.make(b,next))){finish=next;break;}}
      if(!finish)allMate=false;else mateLine||=[uci(m),uci(reply),uci(finish)];
      let value=-Infinity,unknown=false,bestCapture=null;
      if(m.cap){const n=exchange(b,m.t,white)-base;if(Number.isFinite(n))value=n;else unknown=true;}
      const squares=targets.map(t=>t.square===E.sqName(reply.f)?reply.t:('abcdefgh'.indexOf(t.square[0])+(8-Number(t.square[1]))*8));
      for(const capture of L.filter(c=>c.cap&&(squares.includes(c.t)||m.cap&&c.t===m.t))){
        if(++work.nodes>work.limit||Date.now()>work.deadline)return {unknown:true};
        const n=exchange(E.make(b,capture),capture.t,white)-base;
        if(!Number.isFinite(n)){unknown=true;continue;}if(n>value){value=n;bestCapture=capture;}
      }
      if(value>=320){minGain=Math.min(minGain,value);gainLine||=[uci(m),uci(reply),...(bestCapture?[uci(bestCapture)]:[])];}
      else if(!finish){if(unknown)return {unknown:true};allGain=false;refutation||=[uci(m),uci(reply)];}
    }
    if(allMate&&mateLine)return {danger:true,kind:'mate',mateIn:2,line:mateLine};
    if(allGain&&gainLine)return {danger:true,kind:motif?.type||'material',net:minGain,line:gainLine,targets:(motif?.targets||[]).map(t=>({...t}))};
    return refutation?{danger:false,refutation}:{unknown:true};
  }
  function overlookedThreat(s,played,best,comparison={}){
    const certificate=comparison.certifiedTrap&&played&&window.ChessOpenings?.certificate?.(s,played);
    const certified=certificate&&certificate.certifiedTrap===comparison.certifiedTrap&&uci(certificate.best)===uci(best)&&certificate.evBest===comparison.evBest&&certificate.evPlayed===comparison.evPlayed&&JSON.stringify(certificate.pvBest)===JSON.stringify(comparison.pvBest)&&JSON.stringify(certificate.pvPlayed)===JSON.stringify(comparison.pvPlayed);
    if(!played||!best||uci(played)===uci(best)||comparison.uncertain||comparison.unavailable||comparison.opportunity||comparison.mateTiming||!(comparison.depth>=3||certified)||!Number.isFinite(comparison.evBest)||!Number.isFinite(comparison.evPlayed))return null;
    const metrics=E.comparisonMetrics(comparison.evBest,comparison.evPlayed,s.turn),loss=comparison.winLoss??metrics.winLoss;
    if(comparison.cls!=='bad'&&!metrics.mateError&&loss<20&&!materialLoss(s,comparison))return null;
    const key=JSON.stringify([E.toFEN(s),uci(played),uci(best),comparison.evBest,comparison.evPlayed,comparison.pvBest,comparison.pvPlayed]);
    if(overlookedCache.has(key))return overlookedCache.get(key);
    const done=value=>{if(overlookedCache.size>=128)overlookedCache.delete(overlookedCache.keys().next().value);overlookedCache.set(key,value);return value;};
    const before=asTurn(s,s.turn!=='w'),actual=E.make(s,played),defended=E.make(s,best);
    // A checked king cannot pass. En-passant rights are deliberately cleared.
    if(E.inCheck(s)||E.inCheck(before)||E.legal(s).length<=1||E.status(actual,[]).over||E.status(defended,[]).over)return done(null);
    const actualSteps=verifiedLine(s,comparison.pvPlayed),bestSteps=verifiedLine(s,comparison.pvBest);
    if(actualSteps.length!==comparison.pvPlayed?.length||bestSteps.length!==comparison.pvBest?.length||!actualSteps.length||!bestSteps.length||uci(actualSteps[0].move)!==uci(played)||uci(bestSteps[0].move)!==uci(best))return done(null);
    if(!defenseState(s,best,{...comparison,pvPlayed:comparison.pvBest,evPlayed:comparison.evBest}).safe)return done(null);
    // The real searched reply is preferred. Other legal checking/capturing
    // candidates are considered only while the shared work budget remains.
    const legal=E.legal(before),searched=actualSteps[1]?.move,ordered=[...legal.filter(m=>uci(m)===uci(searched)),...legal.filter(m=>uci(m)!==uci(searched)&&(m.cap||E.inCheck(E.make(before,m))||moveMotifs(before,m,E.make(before,m)).some(f=>['fork','double-attack','pin'].includes(f.type))))],work={nodes:0,limit:4000,deadline:Date.now()+150},quietMate=comparison.evPlayed*(s.turn==='w'?1:-1)<=-E.MATE+1000;
    for(const candidate of ordered){
      const real=E.legal(actual).find(m=>uci(m)===uci(candidate));if(!real)continue;
      const prior=threatProbe(before,candidate,work,quietMate);if(!prior.danger)continue;
      const remaining=threatProbe(actual,real,work,quietMate);if(!remaining.danger)continue;
      const attempt=E.legal(defended).find(m=>uci(m)===uci(candidate)),answer=attempt?threatProbe(defended,attempt,work,quietMate):{danger:false,refutation:[]};
      if(answer.danger!==false||!Array.isArray(answer.refutation))continue;
      const defence=[uci(best),...answer.refutation],result={verified:true,move:uci(candidate),from:candidate.f,to:candidate.t,piece:candidate.p,kind:prior.kind,mateIn:prior.mateIn||null,targets:prior.targets||[],beforeLine:prior.line,playedLine:[uci(played),...remaining.line],defence,work:work.nodes};
      return done(result);
    }
    return done(null);
  }
  function overlookedFact(s,threat){
    const before=asTurn(s,s.turn!=='w'),move=E.legal(before).find(m=>uci(m)===threat.move),args={m:E.toSAN(before,move),side:actorName(s.turn),other:actorName(before.turn)},extra={verified:true,threat};
    if(threat.kind==='mate')return fact('overlooked-threat',threat.mateIn===1?'{side} hat die Drohung {m} übersehen: Matt im nächsten Zug.':'{side} hat die Drohung {m} übersehen: Matt in {n} Zügen.',{...args,n:threat.mateIn},extra);
    if(['fork','double-attack'].includes(threat.kind)){
      const [p,q]=threat.targets;
      const label=T(threat.kind==='fork'?'Gabel':'Doppelangriff'),idea=(window.DA_LANG||'de')==='de'?label:label.toLocaleLowerCase(window.DA_LANG);
      return fact('overlooked-threat','{side} hat die Drohung {m} übersehen: {idea} gegen {p} auf {s} und {q} auf {t}.',{...args,idea,p:forkPiece(p.piece),s:p.square,q:forkPiece(q.piece),t:q.square},extra);
    }
    if(threat.kind==='pin')return fact('overlooked-threat','{side} hat die Drohung {m} übersehen: eine Fesselung mit Materialgewinn.',args,extra);
    if(move.cap)return fact('overlooked-threat','{side} hat die Drohung {m} übersehen: {other} kann {p} auf {s} gewinnen.',{...args,p:capturedPiece(move.cap),s:E.sqName(move.t)},extra);
    return fact('overlooked-threat','{side} hat die Drohung {m} übersehen: {other} kann damit Material gewinnen.',args,extra);
  }
  const currentThreatCache=new Map(),defenceCache=new Map();
  function threatNow(state,attacker=state.turn==='w'?'b':'w'){
    if(E.inCheck(state)||E.status(state,[]).over)return null;
    const cacheKey=E.toFEN(state)+'|'+attacker;if(currentThreatCache.has(cacheKey))return currentThreatCache.get(cacheKey);
    const s=asTurn(state,attacker==='w'),work={nodes:0,limit:1200,deadline:Date.now()+28};let found=null;
    if(!E.inCheck(s)){
      const moves=E.legal(s).filter(m=>m.cap||E.inCheck(E.make(s,m))).sort((a,b)=>Number(E.inCheck(E.make(s,b)))-Number(E.inCheck(E.make(s,a))));
      // unter den nachgewiesenen Drohungen die stärkste (Matt vor Material, dann größter sicherer Gewinn), solange das Budget reicht
      let bestScore=-Infinity;
      for(const m of moves){if(++work.nodes>work.limit||Date.now()>work.deadline)break;const p=threatProbe(s,m,work,true);if(!p.danger)continue;
        const score=p.kind==='mate'?1e6-(p.mateIn||1):Number(p.net)||0;if(score<=bestScore)continue;
        const san=E.toSAN(s,m),args={m:san,n:p.mateIn},targets=p.targets||[];let key;
        if(p.kind==='mate')key=p.mateIn===1?'{side} droht mit {m} im nächsten Zug mattzusetzen.':'{side} droht mit {m} Matt in {n} Zügen.';
        else if(['fork','double-attack'].includes(p.kind)&&targets.length>=2){const [a,b]=targets;Object.assign(args,{idea:T(p.kind==='fork'?'Gabel':'Doppelangriff'),p:forkPiece(a.piece),s:a.square,q:forkPiece(b.piece),t:b.square});key='{side} droht {m}: {idea} gegen {p} auf {s} und {q} auf {t}.';}
        else if(p.kind==='pin')key='{side} droht {m}: eine Fesselung mit Materialgewinn.';
        // „die Dame gewinnen“ nur, wenn der sichere Gewinn auch so groß ist; sonst (Abtausch mit Rest) allgemein Material
        else if(m.cap&&Number(p.net)>=worth(m.cap)-50){Object.assign(args,{p:capturedPiece(m.cap),s:E.sqName(m.t)});key='{side} droht mit {m}, {p} auf {s} zu gewinnen.';}
        else if(m.cap)key='{side} droht mit {m}, Material zu gewinnen.';
        if(key){if(args.idea&&(window.DA_LANG||'de')!=='de')args.idea=args.idea.toLocaleLowerCase(window.DA_LANG);found={...p,move:uci(m),from:m.f,to:m.t,attacker,verified:true,fact:fact('current-threat',key,args,{actorTurn:attacker,verified:true})};bestScore=score;}
      }
    }
    if(currentThreatCache.size>=192)currentThreatCache.delete(currentThreatCache.keys().next().value);currentThreatCache.set(cacheKey,found);return found;
  }
  function goodDefence(s,m){
    const after=E.make(s,m);if(E.inCheck(s)&&!E.inCheck(asTurn(after,s.turn==='w')))return fact('critical-defence','Der Zug wehrt das Schach ab.',{},{verified:true});
    const key=E.toFEN(s)+'|'+uci(m);if(defenceCache.has(key))return defenceCache.get(key);
    const prior=threatNow(s,s.turn==='w'?'b':'w');let result=null;
    if(prior&&!E.inCheck(after)){
      const attack=E.legal(after).find(m=>uci(m)===prior.move),work={nodes:0,limit:1200,deadline:Date.now()+28},answer=attack?threatProbe(after,attack,work,true):{danger:false};
      if(answer.danger===false)result=fact('critical-defence','Dieser Zug wehrt die Drohung {m} ab.',{m:prior.fact.args.m},{threat:prior,verified:true});
    }
    if(defenceCache.size>=192)defenceCache.delete(defenceCache.keys().next().value);defenceCache.set(key,result);return result;
  }
  function trapped(state,square){
    const p=state.b[square];if(!p||!'NBRQ'.includes(p.toUpperCase())||colourOf(p)!==state.turn)return null;
    const replies=E.legal(state),deadline=Date.now()+28;if(!replies.length)return null;
    for(const m of replies){if(Date.now()>deadline)return null;const after=E.make(state,m),at=m.f===square?m.t:square;if(after.b[at]!==p)return null;
      let safe=false;for(const c of E.legal(after).filter(c=>c.cap&&c.t===at)){const taken=E.make(after,c),answers=E.legal(taken);if(answers.some(r=>r.cap&&r.t===at))continue;let poisoned=false;for(const r of answers){if(Date.now()>deadline)return null;if(mate(E.make(taken,r))){poisoned=true;break;}}if(!poisoned){safe=true;break;}}if(!safe)return null;
    }
    return fact('trapped-piece','In dieser kurzen Prüfung ist die Figur auf {s} gefangen: Jede legale Antwort lässt ihren unmittelbaren Verlust zu.',{s:E.sqName(square)},{verified:true,replies:replies.length,trappedPiece:p});
  }
  function colourOf(p){return E.isW(p)?'w':'b';}
  function evidence(s,played,best,comparison={}){
    const white=s.turn==='w',good=lineEvidence(s,comparison.pvBest,white,'best',comparison.evBest),bad=lineEvidence(s,comparison.pvPlayed,white,'played',comparison.evPlayed),threats=[],defence=[],alternatives=[];
    if(bad.steps.length&&!bad.facts.some(f=>f.type==='double-attack'&&f.owner==='opponent'&&f.targets.some(t=>t.piece==='Q'))){
      const supplement=checkingCombination(bad.steps[0].after,[uci(played)]);
      if(supplement){const alternate=lineEvidence(s,supplement,white,'played');
        const facts=alternate.facts.filter(f=>f.owner==='opponent'&&['fork','double-attack'].includes(f.type)).map(f=>({...f,source:'alternative',conditional:true}));
        if(facts.length>=2){bad.facts.push(...facts);alternatives.push({key:'Weitere taktische Möglichkeit',moves:supplement,facts});}
      }
    }
    // A null move is only a geometric preview when neither king is checked.
    // We test the real PV reply on the previous board, with en passant cleared;
    // no turn skipping is ever presented as an actual game continuation.
    const nullState=asTurn(s,!white),reply=bad.steps[1]?.move;
    if(played?.cap&&reply?.cap&&reply.t===played.t&&s.b[reply.f]===reply.p&&controls(s,reply.f,played.t)){
      bad.facts.push(fact('defended-target','{q} auf {f} deckt {p} auf {s}; nach {m} schlägt {r} dort {lost}.',
        {q:(window.DA_LANG==='tr'?piece(reply.p):subjectPiece(reply.p)),f:E.sqName(reply.f),p:capturedPiece(played.cap),s:E.sqName(played.t),m:E.toSAN(s,played),r:bad.steps[1].san,lost:capturedPiece(reply.cap)},
        {phase:'played',verified:true,owner:'opponent',defender:target(s,reply.f),defended:{piece:played.cap.toUpperCase(),square:E.sqName(played.t)},lost:{piece:reply.cap.toUpperCase(),square:E.sqName(played.t)}}));
    }
    if(reply&&!E.inCheck(s)&&!E.inCheck(nullState)){
      const candidate=E.legal(nullState).find(m=>uci(m)===uci(reply));
      if(candidate){const after=E.make(nullState,candidate),fork=moveMotifs(nullState,candidate,after).find(f=>['fork','double-attack'].includes(f.type));
        if(fork){
          threats.push(fact('threat','{side} droht {m}: {idea} gegen {p} auf {s} und {q} auf {t}.',
            {...fork.args,side:T(white?'Schwarz':'Weiß')},{motif:fork.type,actorTurn:nullState.turn,move:uci(candidate),targets:fork.targets,verified:true,hypothetical:true}));
          const bestAfter=E.make(s,best),attempt=E.legal(bestAfter).find(m=>uci(m)===uci(candidate));
          if(attempt){const attacked=E.make(bestAfter,attempt),capture=E.legal(attacked).find(m=>m.f===best.t&&m.t===attempt.t&&m.cap);
            if(capture)defence.push(fact('defence','{b} deckt {s} und verhindert die Gabel; deine Figur ({p}) steht dann auf {f}.',
              {b:E.toSAN(s,best),p:piece(best.p),f:E.sqName(best.t),s:E.sqName(candidate.t)},
              {verified:true,move:uci(best),square:E.sqName(candidate.t),witness:[uci(best),uci(attempt),uci(capture)],pieceCode:best.p,motif:fork.type}));
            else if(tacticalTargets(attacked,attempt.t).length<2)defence.push(fact('defence','Mit {b} entgehst du dieser Gabel; {p} steht danach auf {s}.',
              {b:E.toSAN(s,best),p:piece(best.p),s:E.sqName(best.t)},
              {verified:true,move:uci(best),witness:[uci(best),uci(attempt)],pieceCode:best.p,motif:fork.type}));
          }
        }
      }
    }
    const overlooked=overlookedThreat(s,played,best,comparison);
    return {good,bad,threats,defence,alternatives,overlooked,facts:[...bad.facts,...good.facts,...threats,...defence]};
  }
  function relevantTactics(line,owner){
    const firstPly=owner==='self'?0:1;
    const candidates=line.facts.filter(f=>f.owner===owner&&['fork','double-attack','skewer','pin','discovered-check','discovered-attack'].includes(f.type));
    const first=candidates.find(f=>!line.moment?f.ply<=firstPly:line.moment.type!=='material'||f.ply<=line.moment.ply);if(!first)return [];
    // Include a subsequent checking fork only when it explains the same queen
    // attack, not an unrelated motif several moves later in the line.
    const follow=first.check&&first.targets?.some(t=>t.piece==='Q')&&candidates.find(f=>f.ply>first.ply&&f.type==='fork'&&f.check&&f.targets?.some(t=>t.piece==='Q')&&JSON.stringify(f.line)===JSON.stringify(first.line));
    const initial=first.phase==='played'&&first.ply===1?{...first,key:first.conditional?'Eine Möglichkeit nach {played} ist {m}: {idea} gegen {p} auf {s} und {q} auf {t}.':'Nach {played} folgt {m}: {idea} gegen {p} auf {s} und {q} auf {t}.',args:{...first.args,played:line.steps[0].san}}:first;
    // Only the double-attack schema has these arguments; other motifs retain
    // their own wording and verifiable source/target fields.
    const head=['fork','double-attack'].includes(first.type)?initial:first;
    return follow?[head,{...follow,key:'Nach {reply} folgt {m}: {idea} gegen {p} auf {s} und {q} auf {t}.',args:{...follow.args,reply:follow.previous}}]:[head];
  }
  function purpose(s,move,description){
    const after=E.make(s,move),white=E.isW(move.p),own=asTurn(after,white),type=move.p.toUpperCase(),facts=[],arrows=[];
    const add=(key,args={},extra={})=>facts.push({key,args,movingPiece:move.p,move:uci(move),...extra});
    if(mate(after))return {facts:[{key:'Mit {b} setzt du sofort matt.',args:{b:E.toSAN(s,move)}}],arrows};
    if(!E.inCheck(after)&&!E.legal(after).length)return {facts:[{key:'Mit {b} entsteht Patt: Der König steht nicht im Schach, aber es gibt keinen legalen Zug. Die Partie ist remis.',args:{b:E.toSAN(s,move)}}],arrows};
    const proven=description?.evidence,forced=proven?.good.facts.find(f=>f.type==='mate'&&f.owner==='self');
    if(forced)return {facts:[forced],arrows};
    if(move.promo)return {facts:[{key:'Mit {b} wandelst du deinen Bauern um: {p}.',args:{b:E.toSAN(s,move),p:piece(move.promo)}}],arrows};
    const ownTactics=proven?relevantTactics(proven.good,'self'):[];
    // A concrete capture outranks development. Its exchange value is checked,
    // but a bare capture is never advertised as a guaranteed material win.
    if(move.cap&&(worth(move.cap)>=200&&exchange(after,move.t,white)>material(s,white)||!ownTactics.length)){
      const reply=E.legal(after).find(m=>m.cap&&m.t===move.t),net=exchange(after,move.t,white)-material(s,white);
      const capture=fact('capture','Mit {b} schlägst du {p} auf {s}.',
        {b:E.toSAN(s,move),p:capturedPiece(move.cap),s:E.sqName(move.ep?move.t+(white?8:-8):move.t)},
        {verified:true,targets:[{piece:move.cap.toUpperCase(),square:E.sqName(move.ep?move.t+(white?8:-8):move.t)}],net,safety:!reply?'undefended':net>0?'underdefended':'exchange'});
      // Ein Schlag mit möglichem Rückschlag ist ein Tausch: das ausdrücklich sagen, damit er nicht wie ein Figurengewinn oder -verlust wirkt.
      const trade=net>0?fact('exchange',reply?'Ein Rückschlag auf {s} ist möglich; der Abtausch bleibt in der kurzen Prüfung günstig.':'{p} auf {s} kann nicht sofort zurückgeschlagen werden.',{p:subjectPiece(move.p),s:E.sqName(move.t)},{verified:true,net,subjectCode:move.p})
        :reply?fact('exchange','Der Gegner kann auf {s} zurückschlagen.',{s:E.sqName(move.t)},{verified:true,net,subjectCode:move.p}):null;
      return {facts:[capture,...(trade?[trade]:[])],arrows};
    }
    if(ownTactics.length)return {facts:ownTactics.slice(0,2),arrows};
    if(proven?.defence.length)return {facts:proven.defence.slice(0,1),arrows};
    const tactical=description?.facts.filter(f=>f.key.startsWith('Mit {b} setzt')||f.key.startsWith('Mit {b} verhinderst')||f.key.startsWith('Mit {b} greifst')||f.key.startsWith('Schlägt der Gegner'))||[];
    if(tactical.length)return {facts:tactical.slice(0,2),arrows};
    const extra=motifs(s,move,after);
    const important=extra.facts.filter(f=>!f.key.includes('verlässt das Startfeld')&&!f.key.startsWith('Der Bauer auf')&&!f.key.startsWith('Der Turm steht'));
    if(important.length)return {facts:important.slice(0,2),arrows:extra.arrows};
    const targets=[...new Map(E.legal(own).filter(m=>m.f===move.t&&m.cap&&m.cap.toUpperCase()!=='K').map(m=>[m.t,m])).values()].sort((a,b)=>worth(b.cap)-worth(a.cap));
    const newAttack=targets.find(m=>!controls(s,move.f,m.t)&&(worth(m.p)<=worth(m.cap)||!E.legal(E.make(own,m)).some(reply=>reply.cap&&reply.t===m.t)));
    if(newAttack&&!mate(after)){
      add('Mit {b} greifst du {p} auf {s} an.',{b:E.toSAN(s,move),p:capturedPiece(newAttack.cap),s:E.sqName(newAttack.t)});
      arrows.push({from:move.t,to:newAttack.t,kind:'attack'});
    }
    if(!facts.length){
      const enemyBefore=asTurn(s,!white);
      const newlyCovered=E.legal(after).filter(m=>m.cap&&m.cap.toUpperCase()!=='K'&&m.t!==move.t&&controls(after,move.t,m.t)).sort((a,b)=>worth(b.cap)-worth(a.cap));
      for(const attack of newlyCovered){
        const old=E.legal(enemyBefore).find(m=>m.f===attack.f&&m.t===attack.t&&m.cap);
        if(!old)continue;
        const beforeEnd=E.make(enemyBefore,old),afterEnd=E.make(after,attack);
        if(!E.legal(beforeEnd).some(m=>m.cap&&m.t===old.t)&&E.legal(afterEnd).some(m=>m.f===move.t&&m.cap&&m.t===attack.t)){
          add('Mit {b} ist {s} gedeckt: Nach einem Schlag dort kann die Figur von {f} zurückschlagen.',{b:E.toSAN(s,move),s:E.sqName(attack.t),f:E.sqName(move.t)});arrows.push({from:move.t,to:attack.t,kind:'control'});break;
        }
      }
    }
    const centre=[27,28,35,36].filter(sq=>controls(after,move.t,sq));
    if('NB'.includes(type)&&(move.f>>3)===(white?7:0)&&(move.t>>3)!==(white?7:0))
      add('Mit {b} kommt die Figur von {f} ins Spiel. Sie bleibt nicht auf der Grundreihe stehen.',{b:E.toSAN(s,move),f:E.sqName(move.f)});
    if(centre.length&&facts.length<2){
      if(centre.length===1)add('Von {s} aus kontrolliert die Figur das Feld {t} im Zentrum.',{s:E.sqName(move.t),t:E.sqName(centre[0])});
      else add('Von {s} aus kontrolliert die Figur die Felder {t} im Zentrum.',{s:E.sqName(move.t),t:fieldList(centre.map(E.sqName))});
      for(const to of centre.slice(0,2))arrows.push({from:move.t,to,kind:'control'});
    }
    if(!facts.length&&move.castle)add('Die Rochade bringt den König aus dem Zentrum und den Turm näher an die Mitte. Sie garantiert aber keinen sicheren König.');
    if(!facts.length){
      const enemyBefore=asTurn(s,!white),threat=E.legal(enemyBefore).some(m=>m.cap&&m.t===move.f);
      if(threat&&!E.legal(after).some(m=>m.cap&&m.t===move.t))add('Mit {b} zieht die angegriffene Figur von {f} nach {t}. Dort kann sie nicht sofort geschlagen werden.',{b:E.toSAN(s,move),f:E.sqName(move.f),t:E.sqName(move.t)});
    }
    if(type!=='K'&&facts.length<2){
      const previously=E.legal(asTurn(s,white)),now=E.legal(own);
      for(let from=0;from<64;from++){
        const p=after.b[from];if(from===move.t||!p||s.b[from]!==p||E.isW(p)!==white||!'BRQ'.includes(p.toUpperCase()))continue;
        const covered=after.b.flatMap((q,t)=>q&&E.isW(q)===white&&t!==from&&controls(after,from,t)&&!controls(s,from,t)&&attackSources(after.b,t,!white).length?[{t}]:[]);
        const fresh=[...now.filter(m=>m.f===from&&m.cap&&!previously.some(old=>old.f===from&&old.t===m.t)),...covered].sort((a,b)=>Number([27,28,35,36].includes(b.t))-Number([27,28,35,36].includes(a.t)));
        if(fresh.length){add('Mit {b} öffnest du die Linie für die Figur auf {s}. Sie erreicht jetzt {t}.',{b:E.toSAN(s,move),s:E.sqName(from),t:E.sqName(fresh[0].t)},{linePiece:p});arrows.push({from,to:fresh[0].t,kind:'control'});break;}
      }
    }
    if(!facts.length&&extra.facts.length)facts.push(...extra.facts.slice(0,2));
    if(!facts.length&&move.cap)add('Mit {b} schlägst du die Figur auf {s} ({p}).',{b:E.toSAN(s,move),s:E.sqName(move.ep?move.t+(white?8:-8):move.t),p:piece(move.cap)},{capturedCode:move.cap});
    return {facts:facts.slice(0,2),arrows:arrows.slice(0,2)};
  }
  function rationale(s,played,best,comparison={},description){
    const source=description||describe(s,played,best,comparison),d={...source,good:source.good&&{...source.good,moves:source.good.moves.slice()},bad:source.bad&&{...source.bad,moves:source.bad.moves.slice()}},same=uci(played)===uci(best),near=!same&&!comparison.mateError&&!comparison.mateTiming&&!comparison.uncertain&&(Number.isFinite(comparison.winLoss)?comparison.winLoss<5:Number.isFinite(comparison.loss)&&comparison.loss<50);
    const context=[],difference=[],good=purpose(s,best,d),b=E.toSAN(s,best),m=played?E.toSAN(s,played):'';
    if(comparison.opportunity?.verified)context.push(opportunityFact(s,best,comparison.opportunity));
    else if(comparison.uncertain)context.push({key:'Die Bewertung ist bei kurzer Suche nicht stabil. Daraus lässt sich kein sicherer Fehler ableiten.'});
    else if(comparison.mateTiming==='win')context.push({key:'Die Suche hat ein kurzes Matt mit {b} gefunden; dein Zug wird weiterhin klar auf Gewinn bewertet.',args:{b}});
    else if(comparison.mateTiming==='loss')context.push({key:'Die Suche bewertet die Stellung schon vor dem Zug als klar verloren; daraus wird hier kein neuer Fehler.'});
    else if(near)context.push({key:d.evidence?.threats.length&&d.evidence?.defence.length?'Der Partiezug {m} ist hier kein nachgewiesener Fehler; die Engine bevorzugt {b} knapp.':'Die Suche bewertet beide Züge ähnlich gut. {b} ist eine knappe Präferenz, kein nachgewiesener Fehler von {m}.',args:{b,m}});
    else if(same)context.push({key:'Der gespielte Zug entspricht der Empfehlung.'});
    if(!near&&!same&&d.bad?.reply){
      const reply=d.bad.reply,end=d.bad.end;
      const mateFact=d.facts.find(f=>f.key.startsWith('Nach {m} folgt'));
      if(mateFact)difference.push(mateFact);
      else if(reply.cap){
        const recaptures=E.legal(end).filter(x=>x.cap&&x.t===reply.t).sort((a,b)=>worth(a.p)-worth(b.p)),recapture=recaptures[0];
        const settled=recapture?E.make(end,recapture):end,loss=material(s,E.isW(best.p))-material(settled,E.isW(best.p));
        const captureFact=d.facts.find(f=>f.key.startsWith('Nach {m} kann'));if(captureFact)difference.push({...captureFact,type:'capture-against',owner:'opponent',targets:[{piece:reply.cap.toUpperCase(),square:E.sqName(reply.t)}]});
        if(recapture&&loss>=100&&worth(reply.cap)>worth(recapture.cap)){
          difference.push({type:'exchange-loss',move:uci(recapture),net:-loss,key:'Auch nach {r} bleibt Material verloren: {p} gegen {q}. Der Gegenschlag gleicht den Verlust nicht aus.',args:{r:E.toSAN(end,recapture),p:piece(reply.cap),q:piece(recapture.cap)}});
          if(!d.bad.fromComparison&&d.bad.moves.length===2)d.bad.moves.push({uci:uci(recapture),san:E.toSAN(end,recapture)});
          if(best.cap&&played?.cap&&best.t===played.t&&worth(played.p)>worth(best.p)&&d.good.after.b[played.f]===played.p){
            const covered=controls(d.good.after,played.f,best.t);
            good.facts.unshift({key:covered?'Mit {b} schlägst du mit der Figur von {f}. Deine wertvollere Figur bleibt auf {s} und deckt {t}.':'Mit {b} schlägst du auf {t} mit der Figur von {f}. Deine wertvollere Figur bleibt auf {s}.',args:{b,t:E.sqName(best.t),f:E.sqName(best.f),s:E.sqName(played.f)}});
            if(covered)good.arrows.unshift({from:played.f,to:best.t,kind:'control'});
          }
        }else if(!recapture&&loss>=100)difference.push({key:'Auf diesem Feld kannst du danach nicht sofort zurückschlagen.'});
        else if(recapture)difference.push({key:'Prüfe auch den möglichen Gegenschlag: {r}.',args:{r:E.toSAN(end,recapture)}});
      }
    }
    const model=d.evidence;
    if(model&&(!same||model.alternatives.length)){
      const mateFact=model.bad.facts.find(f=>f.type==='mate'&&f.owner==='opponent');
      const tactics=relevantTactics(model.bad,'opponent');
      if(mateFact&&mateFact.mateIn>1){difference.length=0;difference.push(mateFact);}
      else if(mateFact?.backRank){difference.length=0;difference.push({...mateFact,key:'Nach {m} folgt {r}: Grundreihenmatt.',args:{m,r:d.bad.moves[1].san}});}
      else if(model.threats.length&&model.defence.length){difference.length=0;difference.push(...model.threats.slice(0,1));}
      else if(tactics.length){difference.length=0;difference.push(...tactics.slice(0,2));}
      else if(model.threats.length){difference.length=0;difference.push(...model.threats.slice(0,1));}
      const covered=model.bad.facts.find(f=>f.type==='defended-target');
      if(covered&&!mateFact&&!tactics.length){if(difference.length)difference[0]=covered;else difference.push(covered);}
      if(model.defence.length){good.facts.length=0;good.facts.push(...model.defence);}
    }
    // In a mate context, opening principles do not explain the decisive result.
    const mateContext=!!comparison.mateTiming||[comparison.evBest,comparison.evPlayed].some(v=>Number.isFinite(v)&&Math.abs(v)>=E.MATE-1000);
    if(mateContext)good.facts=good.facts.filter(f=>!(/im Zentrum|ins Spiel|Startfeld|Grundreihe stehen|öffnest du die Linie|Die Rochade bringt|Der Bauer auf|Der Turm steht/.test(f.key)));
    if(good.facts.some(f=>f.key.includes('Deine wertvollere Figur bleibt')))good.facts=good.facts.filter(f=>f.type!=='capture');
    if(!good.facts.length&&!mateContext)good.facts.push(fact('preference','Die Engine bevorzugt {b}, einen einzelnen taktischen Grund findet sie nicht.',{b}));
    const overlooked=model?.overlooked,notice=overlooked&&overlookedFact(s,overlooked);
    if(notice){
      context.unshift(notice);
      if(!model.defence.length&&!good.facts.some(f=>/verhinder|entgeh/.test(f.key)))good.facts.unshift(fact('defence','Mit {b} wehrt {side} diese Drohung ab.',{b,side:actorName(s.turn)},{verified:true,witness:overlooked.defence}));
    }
    const defence=good.facts.find(f=>f.key==='Mit {b} wehrt {side} diese Drohung ab.'),capture=good.facts.find(f=>f.type==='capture'&&f.key==='Mit {b} schlägst du {p} auf {s}.');
    if(defence&&capture&&defence.args.b===capture.args.b){
      const combined={...capture,key:'Mit {b} schlägt {side} {p} auf {s} und wehrt die Drohung ab.',components:[capture,defence]};
      good.facts=[combined,...good.facts.filter(f=>f!==capture&&f!==defence)];
    }
    const why=good.facts.slice(0,2),diff=difference.slice(0,2);
    // Decisive consequences first; optional context never displaces the reason.
    const chance=comparison.opportunity,opportunityWhy=chance?why.filter(f=>!(chance.kind==='mate'&&(f.type==='mate'||/setzt.*matt/.test(f.key)))&&!(chance.kind==='material'&&best.cap&&f.type==='capture')):why;
    const ordered=notice?[notice,...why]:chance?.verified?[...context,...opportunityWhy]:comparison.uncertain?[...context,...diff.slice(0,1),...why.slice(0,1)]:same?[...context,...diff,...why]:comparison.mateTiming?[...context,...why.slice(0,1),...diff.slice(0,1)]:near&&model?.threats.length&&model?.defence.length?[...diff.slice(0,1),...why.slice(0,1),...context]:near?[...context,...why]:[...diff,...why,...context],flow=[];let sentences=0;
    for(let f of ordered){
      if(f.key==='Mit {b} kommt die Figur von {f} ins Spiel. Sie bleibt nicht auf der Grundreihe stehen.')f={...f,key:'Mit {b} kommt die Figur von {f} ins Spiel.'};
      if(f.key==='Auch nach {r} bleibt Material verloren: {p} gegen {q}. Der Gegenschlag gleicht den Verlust nicht aus.')f={...f,key:'Auch nach {r} bleibt Material verloren: {p} gegen {q}, der Gegenschlag gleicht den Verlust nicht aus.'};
      if(f.key==='Mit {b} schlägst du mit der Figur von {f}. Deine wertvollere Figur bleibt auf {s} und deckt {t}.')f={...f,key:'Mit {b} schlägst du mit der Figur von {f}; deine wertvollere Figur bleibt auf {s} und deckt {t}.'};
      if(f.key==='Mit {b} schlägst du auf {t} mit der Figur von {f}. Deine wertvollere Figur bleibt auf {s}.')f={...f,key:'Mit {b} schlägst du auf {t} mit der Figur von {f}; deine wertvollere Figur bleibt auf {s}.'};
      const n=(f.key.match(/[.!?](?:\s|$)/g)||[]).length||1;if(sentences+n>3)continue;flow.push(f);sentences+=n;
    }
    return {context,why,difference:diff,flow,facts:[...(model?.facts||[]),...diff,...why,...context].map(f=>({...f,type:f.type||'observation',args:f.args||{}})),moments:{played:model?.bad.moment,best:model?.good.moment},arrows:good.arrows,description:d,near,same};
  }
  // Positional reasons for a move without a tactical consequence. Each sentence states one fact
  // that can be checked on the board or in the displayed line; it is never a claim about the cause.
  function positionalReason(s,played,best,actual,recommended){
    if(!played||!best||uci(played)===uci(best))return null;
    const white=s.turn==='w',after=E.make(s,played),m=E.toSAN(s,played),b=E.toSAN(s,best),type=played.p.toUpperCase(),home=white?7:0;
    const mine=p=>p&&E.isW(p)===white,row=q=>q>>3,file=q=>q&7,letter=q=>'abcdefgh'[q&7];
    const quiet=!played.cap&&!played.promo&&!E.inCheck(after),enemyQueen=s.b.includes(white?'q':'Q');
    const rights=x=>white?(x.castle.K||x.castle.Q):(x.castle.k||x.castle.q);
    const minorsAtHome=x=>[1,2,5,6].filter(f=>{const q=x.b[home*8+f];return q&&mine(q)&&'NB'.includes(q.toUpperCase());}).length;
    const passed=(x,sq)=>{const pawn=x.b[sq];if(!pawn||pawn.toUpperCase()!=='P')return false;const w=E.isW(pawn),enemy=w?'p':'P';
      for(let f=Math.max(0,file(sq)-1);f<=Math.min(7,file(sq)+1);f++)for(let r=w?row(sq)-1:row(sq)+1;r>=0&&r<8;r+=w?-1:1)if(x.b[r*8+f]===enemy)return false;return true;};
    const pawnsOnFile=(x,f)=>{let n=0;for(let r=0;r<8;r++)if(x.b[r*8+f]===(white?'P':'p'))n++;return n;};
    const position=(key,args={},extra={})=>fact('position',key,args,{verified:true,positional:true,...extra});
    // The king gives up castling while the opponent still has a queen.
    if(enemyQueen&&rights(s)&&!rights(after)&&!played.castle&&(best.castle||rights(E.make(s,best))))return position('Nach {m} darf der König nicht mehr rochieren.',{m},{reason:'castling'});
    // A pawn in front of the castled king leaves its place.
    const king=white?s.kw:s.kb;
    if(enemyQueen&&type==='P'&&quiet&&!rights(s)&&row(king)===home&&(file(king)>=5||file(king)<=2)&&Math.abs(file(played.f)-file(king))<=1&&row(played.f)===home+(white?-1:1)
      &&!(best.p===played.p&&Math.abs(file(best.f)-file(king))<=1&&row(best.f)===row(played.f)))return position('{m} zieht einen Bauern vor dem eigenen König weg. Der König auf {k} hat danach weniger Schutz.',{m,k:E.sqName(king)},{reason:'shelter'});
    // The reply attacks the piece that has just moved and it has to move again in the displayed line.
    const steps=actual?.valid?actual.steps:[];
    if(quiet&&type!=='P'&&type!=='K'&&steps.length>=3){
      const reply=steps[1].move,again=steps[2].move;
      if(!reply.cap&&worth(reply.p)<worth(played.p)&&again.f===played.t&&E.legal(asTurn(steps[1].after,!white)).some(x=>x.f===reply.t&&x.t===played.t&&x.cap))
        return position('Nach {m} greift {r} {p} auf {s} an. Das kostet einen weiteren Zug.',{m,r:steps[1].san,p:capturedPiece(played.p),s:E.sqName(played.t)},{reason:'tempo',line:steps.slice(0,3).map(x=>uci(x.move))});
    }
    // A knight on the edge of the board.
    if(type==='N'&&quiet&&(file(played.t)===0||file(played.t)===7)&&!(best.p===played.p&&best.f===played.f&&(file(best.t)===0||file(best.t)===7))){
      const safe=E.legal(asTurn(after,white)).filter(x=>x.f===played.t&&!E.legal(asTurn(E.make(asTurn(after,white),x),!white)).some(y=>y.t===x.t&&y.cap&&worth(y.p)<=320)).length;
      if(safe<=3)return position(safe>=2?'Am Rand steht der Springer auf {s} schlecht: Von dort hat er nur {n} sichere Felder.':'Am Rand steht der Springer auf {s} schlecht: Von dort hat er kaum sichere Felder.',{s:E.sqName(played.t),n:safe},{reason:'rim'});
    }
    // A pawn takes the natural square of a knight that is still at home.
    if(type==='P'&&quiet&&row(played.t)===home+(white?-2:2)&&[2,5].includes(file(played.t))){
      const knight=home*8+(file(played.t)===2?1:6),q=after.b[knight];
      if(q&&mine(q)&&q.toUpperCase()==='N')return position('Der Bauer auf {s} nimmt dem Springer auf {f} sein natürliches Feld.',{s:E.sqName(played.t),f:E.sqName(knight)},{reason:'knight-square'});
    }
    // Opening: the queen comes out early, or a developed piece moves again, while minor pieces wait at home.
    const waiting=minorsAtHome(after);
    if(s.full<=12&&quiet&&waiting>=2&&!best.castle&&!(best.p===played.p&&best.f===played.f)){
      if(type==='Q'&&row(played.f)===home)return position('Die Dame kommt mit {m} früh ins Spiel. Auf der Grundreihe stehen noch {n} Leichtfiguren.',{m,n:waiting},{reason:'early-queen'});
      if('NBQ'.includes(type)&&row(played.f)!==home)return position('{m} zieht eine schon entwickelte Figur noch einmal. Auf der Grundreihe stehen noch {n} Leichtfiguren.',{m,n:waiting},{reason:'moved-twice'});
    }
    // Doubled pawns at the end of the displayed line, not before and not after the recommendation.
    if(actual?.valid&&actual.steps.length&&recommended?.valid&&actual.settled&&Math.abs(actual.net)<100)for(let f=0;f<8;f++)
      if(pawnsOnFile(actual.end,f)>=2&&pawnsOnFile(s,f)<2&&pawnsOnFile(recommended.end,f)<2)return position('Nach {m} kann ein Doppelbauer auf der {f}-Linie entstehen.',{m,f:'abcdefgh'[f]},{reason:'doubled',line:actual.steps.map(x=>uci(x.move))});
    // The recommendation advances a passed pawn or puts a rook on an open file.
    if(best.p.toUpperCase()==='P'&&!best.cap&&passed(s,best.f)&&!(type==='P'&&passed(s,played.f)))return position('Mit {b} rückt der Freibauer weiter vor.',{b},{reason:'passed'});
    const open=(x,f)=>{for(let r=0;r<8;r++){const q=x.b[r*8+f];if(q&&q.toUpperCase()==='P')return false;}return true;};
    if(best.p.toUpperCase()==='R'&&!best.cap&&file(best.f)!==file(best.t)&&open(s,file(best.t))&&!open(s,file(best.f))&&!(type==='R'&&open(s,file(played.t))))return position('Mit {b} besetzt der Turm die offene {f}-Linie.',{b,f:letter(best.t)},{reason:'open-file'});
    return null;
  }
  function explain(s,played,best,description,comparison={},options={}) {
    const reason=rationale(s,played,best,comparison,description),d=reason.description,text=reason.flow.map(f=>UI.esc(renderFact(f,s.turn))).join(' ');
    const line=(label,b)=>b?`<span><b>${UI.esc(label)}</b> ${UI.esc(b.moves.map(x=>x.san).join(' → '))}</span>`:'';
    const note=reason.facts.some(f=>f.type==='mate'&&f.forced)?T('Das Matt ist in der Suche nachgewiesen. Andere gezeigte Fortsetzungen sind Beispiele.'):T('Die Fortsetzungen sind Beispiele, keine erzwungene Zugfolge.');
    if(window.ChessTeaching)return ChessTeaching.explanation(s,played,best,comparison,reason,null,null,options.idea,options.perspective);
    return `${text}<span class="coach-lines">${line(T('Gespielter Zug'),d.bad)}${line(T('Empfehlung der Engine'),d.good)}</span><span class="coach-note">${note}</span>`;
  }
  // Training admits only short, verifiable tactical ideas. A check or a
  // capture alone is not an explanation of why a move is an improvement.
  const mateTwoCache=new Map();
  const comparisons=new Map();
  function remember(s,played,result){
    if(!played||!result?.best||result.uncertain||result.depth<3||!Array.isArray(result.pvBest)||!Array.isArray(result.pvPlayed)||result.pvPlayed[0]!==uci(played))return;
    const key=E.toFEN(s)+'|'+uci(played);
    if(comparisons.size>=64)comparisons.delete(comparisons.keys().next().value);
    // Search evidence is reusable; a preceding opponent blunder is contextual.
    const {opportunity,judgement,previous,coachDescription,opening,time,...searchResult}=result;
    comparisons.set(key,{...searchResult,pvBest:result.pvBest.slice(),pvPlayed:result.pvPlayed.slice()});
  }
  function compare(s,played){
    const certificate=window.ChessOpenings?.certificate?.(s,played);if(certificate)return Promise.resolve(certificate);
    const key=E.toFEN(s)+'|'+uci(played),cached=comparisons.get(key);
    if(cached)return Promise.resolve(cached);
    return new Promise(resolve=>{
      let worker,timer,done=false;
      const finish=r=>{if(done)return;done=true;clearTimeout(timer);worker?.terminate();remember(s,played,r);resolve(r||{unavailable:true,uncertain:true});};
      const local=()=>setTimeout(()=>{try{finish(E.compareMove(s,played,{maxDepth:6,timeMs:900}));}catch(e){finish(null);}},0);
      try{worker=new Worker('assets/19cb1156058757e9/js/games/chess-worker.js');worker.onmessage=e=>finish(e.data.comparison);worker.onerror=()=>finish(null);timer=setTimeout(()=>finish(null),5000);worker.postMessage({op:'compare',id:1,state:s,played,opts:{maxDepth:6,timeMs:900}});}catch(e){local();}
    });
  }
  function materialThreats(state,white,baseline){
    let loss=0,unknown=false;const targets=[];
    for(const m of E.legal(state).filter(m=>m.cap&&m.cap.toUpperCase()!=='K')){
      const settled=exchange(E.make(state,m),m.t,white);
      if(!Number.isFinite(settled)){unknown=true;continue;}
      const drop=baseline-settled;if(drop>=200){loss=Math.max(loss,drop);targets.push({square:E.sqName(m.t),piece:m.cap.toUpperCase(),move:uci(m)});}
    }
    return {loss,unknown,targets};
  }
  function defenseState(s,move,comparison){
    const white=s.turn==='w',after=E.make(s,move),direct=materialThreats(after,white,material(s,white));
    const pv=comparison?.pvPlayed?.[0]===uci(move)?lineEvidence(s,comparison.pvPlayed,white,'played',comparison.evPlayed):null;
    const later=pv?.facts.some(f=>f.type==='material'&&f.owner==='opponent'&&f.net<=-200)||false;
    const mated=E.legal(after).some(m=>mate(E.make(after,m)))||comparison?.evPlayed*(white?1:-1)<=-E.MATE+1000;
    return {safe:!direct.loss&&!direct.unknown&&!later&&!mated,direct,later,mated};
  }
  function forcedMateTwo(s){
    const key=E.toFEN(s);if(mateTwoCache.has(key))return mateTwoCache.get(key);
    let line=null,work=0;
    if(s.half<100)outer:for(const first of E.legal(s)){
      const a=E.make(s,first);if(!E.inCheck(a)||a.half>=100)continue;
      const replies=E.legal(a);if(!replies.length){line=[uci(first)];break;}
      let example;
      for(const reply of replies){
        const b=E.make(a,reply);let finish=null;
        for(const m of E.legal(b)){if(++work>3000)break outer;if(b.half<100&&mate(E.make(b,m))){finish=m;break;}}
        if(!finish){example=null;break;}example||=[uci(first),uci(reply),uci(finish)];
      }
      if(example){line=example;break;}
    }
    if(mateTwoCache.size>=128)mateTwoCache.delete(mateTwoCache.keys().next().value);
    mateTwoCache.set(key,line);return line;
  }
  // Highlight tactical sacrifices only when accepting the offer has a short,
  // independently verified consequence. The move's ordinary grade is separate.
  function strongSacrifice(s, played, comparison) {
    if (!played || !['best','good'].includes(comparison.cls) || comparison.uncertain ||
        comparison.unavailable || comparison.sacrificeUnresolved ||
        ['unconfirmed','rejected'].includes(comparison.recommendationStatus)) return null;
    const white = s.turn === 'w';
    if (!Number.isFinite(comparison.evPlayed) || comparison.evPlayed * (white ? 1 : -1) < 0) return null;

    const offered = E.make(s, played);
    const baseline = material(s, white);
    const oldTargets = new Set(E.legal(asTurn(s, !white)).filter(m => m.cap).map(m => m.t));
    for (const reply of E.legal(offered)) {
      const victim = offered.b[reply.t];
      if (!reply.cap || !victim || !'NBRQ'.includes(victim.toUpperCase())) continue;
      if (reply.t !== played.t && oldTargets.has(reply.t)) continue;
      const accepted = E.make(offered, reply);
      if (material(accepted, white) > baseline - 300 ||
          !(exchange(accepted, reply.t, white) <= baseline - 300)) continue;

      const finish = E.legal(accepted).find(m => mate(E.make(accepted, m)));
      const line = finish ? [uci(finish)] : forcedMateTwo(accepted);
      if (line) return { capture: E.toSAN(offered, reply), moves: line.length === 1 ? 1 : 2 };
    }
    return null;
  }

  function lesson(s,played,move,comparison={}){
    if(!move||E.legal(s).length<=1)return null;
    if(['similar','rejected','unconfirmed'].includes(comparison.recommendationStatus))return null;
    if(comparison.mateTiming&&!comparison.mateError)return null;
    if(comparison.opportunity?.verified){
      const base=lesson(s,played,move,{...comparison,opportunity:null})||{kind:'opportunity',move:uci(move)};
      return {...base,opportunity:true,question:'Der Gegner hat gerade einen Fehler gemacht. Wie nutzt du ihn?',idea:'Prüfe Schachgebote, Schlagzüge und direkte Drohungen. Suche die Fortsetzung, die den Vorteil festhält.'};
    }
    remember(s,played,comparison);
    const after=E.make(s,move),replies=E.legal(after);
    const findMate=state=>E.legal(state).find(m=>mate(E.make(state,m)));
    const ownTurn={...after,turn:s.turn,ep:-1,h1:undefined,h2:undefined};
    const targets=tacticalTargets(after,move.t).map(t=>({t,cap:after.b[t]}));
    const captures=replies.filter(m=>m.cap&&m.t===move.t);
    let trap=null;
    for(const capture of captures){const next=E.make(after,capture),finish=findMate(next);if(finish){trap=[uci(move),uci(capture),uci(finish)];break;}}
    const base={move:uci(move),trap};
    if(mate(after))return {...base,kind:'mate',question:'Wie setzt du in einem Zug matt?',idea:'Suche einen Zug, der Schach gibt und dem König kein legales Entkommen lässt.'};
    const proved=lineEvidence(s,comparison.pvBest,s.turn==='w','best',comparison.evBest).facts.find(f=>f.type==='mate'&&f.owner==='self'&&f.mateIn>=2&&f.mateIn<=3);
    if(proved)return {...base,kind:'mateN',trap:null,mateIn:proved.mateIn,line:comparison.pvBest.slice(),question:'Wie setzt du in {n} Zügen matt?',args:{n:proved.mateIn},idea:'Suche den Beginn der erzwungenen Mattfolge. Prüfe dabei auch die Abwehrzüge des Gegners.'};
    if(replies.length&&replies.every(reply=>!!findMate(E.make(after,reply))))return {...base,kind:'mateN',trap:null,mateIn:2,line:[uci(move),uci(replies[0]),uci(findMate(E.make(after,replies[0])))],question:'Wie setzt du in {n} Zügen matt?',args:{n:2},idea:'Suche den Beginn der erzwungenen Mattfolge. Prüfe dabei auch die Abwehrzüge des Gegners.'};
    const overlooked=played&&overlookedThreat(s,played,move,comparison);
    if(overlooked){
      const counter=targets.length>=2&&(!captures.length||trap),kind=overlooked.kind==='mate'?'defendMate':counter?(move.p.toUpperCase()==='N'?'fork':'doubleAttack'):move.f===overlooked.to&&overlooked.kind==='material'?'rescue':'defendThreat';
      return {...base,kind,question:'Welche Drohung musst du hier abwehren?',idea:'Prüfe, was der Gegner bereits vor deinem Zug drohte. Suche eine Abwehr, die auch nach seiner Antwort hält.',threat:overlooked};
    }
    const danger=played&&findMate(E.make(s,played));
    if(danger&&!replies.some(m=>mate(E.make(after,m))))return {...base,kind:'defendMate',question:'Wie verhinderst du den Mattangriff?',idea:'Dein Partiezug ermöglicht Matt. Suche einen Zug, der den Angriff abwehrt.'};
    if(targets.length>=2&&(!captures.length||trap))return {...base,kind:move.p.toUpperCase()==='N'?'fork':'doubleAttack',question:'Wie kannst du zwei Figuren gleichzeitig angreifen?',idea:'Suche nach einer Gabel: Eine Figur greift zwei gegnerische Figuren zugleich an.'};
    if(played&&uci(played)!==uci(move)){
      const actual=E.make(s,played);
      if(forcedMateTwo(actual)&&!forcedMateTwo(after))return {...base,kind:'defendMate',question:'Wie verhinderst du den Mattangriff?',idea:'Der Materialgewinn hilft nicht, wenn danach Matt folgt. Suche zuerst eine Abwehr.'};
      const white=s.turn==='w',prior=materialThreats(asTurn(s,!white),white,material(s,white)),lost=defenseState(s,played,comparison),safe=defenseState(s,move,comparison.pvBest?{...comparison,pvPlayed:comparison.pvBest,evPlayed:comparison.evBest}:undefined);
      if(safe.safe&&prior.targets.some(t=>t.square===E.sqName(move.f)))return {...base,kind:'rescue',question:'Wie bringst du die angegriffene Figur in Sicherheit?',idea:'Prüfe die Angriffe und die möglichen Rückschläge. Suche einen Zug, mit dem deine Figur nicht verloren geht.',targets:prior.targets};
      if(safe.safe&&(lost.direct.loss>=200||lost.later))return {...base,kind:'avoidLoss',question:'Wie spielst du hier weiter, ohne Material zu verlieren?',idea:'Prüfe die Schlagzüge des Gegners, bevor du ziehst. Ein Tausch gleichwertiger Figuren ist dabei kein Verlust.',targets:lost.direct.targets};
    }
    const tactical=lineEvidence(s,comparison.pvBest,s.turn==='w','best',comparison.evBest);
    const root=tactical.facts.find(f=>f.ply===0&&f.owner==='self'&&['skewer','pin','double-attack'].includes(f.type));
    if(root&&tactical.moment?.net>=200)return {...base,kind:root.type==='double-attack'?'doubleAttack':root.type,question:'Wie gewinnst du mit einer Taktik Material?',idea:'Prüfe die angegriffenen Figuren und die Abwehr. Der Materialgewinn muss auch nach einem Rückschlag bestehen bleiben.',line:comparison.pvBest.slice(),motif:root.type};
    if(trap)return {...base,kind:'trap',question:'Wie stellst du eine Mattfalle?',idea:'Manchmal darf eine angegriffene Figur stehen bleiben: Wer sie schlägt, ermöglicht ein Matt.'};
    const values={P:100,N:320,B:330,R:500,Q:900,K:0},sign=s.turn==='w'?1:-1;
    const ownMaterial=state=>state.b.reduce((sum,p)=>sum+(p?(E.isW(p)?1:-1)*values[p.toUpperCase()]:0),0)*sign;
    const before=ownMaterial(s),gain=replies.length?Math.min(...replies.map(r=>ownMaterial(E.make(after,r))-before)):0;
    if(gain>=100&&!findMate(after)){
      if(move.promo)return {...base,kind:'promotion',question:'Wie kannst du deinen Bauern umwandeln?',idea:'Suche einen sicheren Weg auf die letzte Reihe. Dort wird dein Bauer zu einer stärkeren Figur.'};
      if(move.cap)return {...base,kind:'material',question:'Wie kannst du Material gewinnen?',idea:'Suche eine Schlagmöglichkeit, bei der ein direkter Gegenschlag den Gewinn nicht aufhebt.'};
    }
    const proof=played&&window.ChessOpenings?.certificate?.(s,played),defence=window.ChessOpenings?.trapDefence?.(s,move);
    if(proof&&(proof.mateError||proof.winLoss>=20)&&defence)return {...base,kind:'openingTrap',question:'Wie wehrst du diese Eröffnungsfalle ab?',idea:'Vergleiche die Abwehr mit der geprüften Fortsetzung nach deinem Partiezug.'};
    return null;
  }
  function assess(s,move,reference,options={}){
    const known=window.ChessOpenings?.trapDefence?.(s,reference);if(known){
      if(known.safe.includes(uci(move)))return {ok:true};
      const proof=window.ChessOpenings.certificate(s,move);
      // A mate-defence exercise also accepts a sound escape that is a little
      // below the preferred repertoire move. Do not demand one exact move.
      if(options.lesson?.kind==='defendMate'&&proof&&!proof.mateError&&proof.winLoss<10&&defenseState(s,move,proof).safe&&!forcedMateTwo(E.make(s,move)))return {ok:true};
      if(proof&&(proof.mateError||proof.winLoss>=20))return {ok:false};return {ok:false,uncertain:true};
    }
    if(mate(E.make(s,reference)))return {ok:mate(E.make(s,move)),score:mate(E.make(s,move))?E.MATE:null,baseline:E.MATE};
    let r;try{r=options.comparison||E.compareMove(s,move,{maxDepth:6,timeMs:900});}catch(e){return {ok:false,unavailable:true,uncertain:true};}
    if(r.unavailable||r.uncertain||!r.best)return {...r,ok:false};
    const sign=s.turn==='w'?1:-1,kind=options.lesson?.kind;
    let ok=!r.mateError&&r.winLoss<5;
    if(kind==='mateN'||kind==='mate')ok=r.evPlayed*sign>=E.MATE-1000;
    if(kind==='defendThreat'||kind==='avoidLoss'||kind==='rescue')ok=defenseState(s,move,r).safe&&!r.mateError;
    if(kind==='defendMate')ok=defenseState(s,move,r).safe&&!r.mateError&&!forcedMateTwo(E.make(s,move));
    if(options.lesson?.threat)ok=defenseState(s,move,r).safe&&!r.mateError&&!forcedMateTwo(E.make(s,move));
    return {...r,ok,score:r.evPlayed*sign,baseline:r.evBest*sign};
  }
  async function assessMove(s,move,reference,options={}){
    if(window.ChessOpenings?.trapDefence?.(s,reference))return assess(s,move,reference,options);
    // Ein mitgegebener Vergleich (z. B. von Stockfish) hat Vorrang vor der eigenen Schnellprüfung.
    return assess(s,move,reference,{...options,comparison:options.comparison||await compare(s,move)});
  }
  function lines(s,played,move,description,comparison={}){
    const d=description||describe(s,played,move,comparison),out=[];
    const direct=d.facts.filter(f=>f.key.startsWith('Mit {b}'));
    const overview=d.facts.some(f=>f.key.startsWith('Mit {b} verhinderst'))?d.facts.slice(0,2):direct.slice(0,2);
    if(d.good)out.push({key:'Empfohlene Fortsetzung',moves:d.good.moves.map(m=>m.uci),overview:overview.length?overview:d.facts.slice(0,2),firstNotes:direct.slice(0,1)});
    if(d.bad){const bad=d.facts.filter(f=>f.key.startsWith('Nach {m}'));out.push({key:'Nach deinem Partiezug',moves:d.bad.moves.map(m=>m.uci),overview:bad.length?bad.slice(0,2):[{key:'Hier siehst du deinen Partiezug und eine mögliche Antwort des Gegners.'}]});}
    const l=lesson(s,played,move,comparison);
    // A legal conditional capture is useful teaching material, explicitly
    // separate from the principal variation used for the evaluation.
    if(l?.trap){
      const steps=verifiedLine(s,l.trap),fork=moveMotifs(s,move,E.make(s,move)).filter(f=>['fork','double-attack'].includes(f.type));
      out.push({key:'Wenn die Figur geschlagen wird',moves:l.trap,
        overview:[...fork,{key:'Schlägt der Gegner deine Figur mit {r}, folgt {m}: Schachmatt.',args:{r:steps[1].san,m:steps[2].san}}],firstNotes:fork});
    }
    for(const line of d.evidence?.alternatives||[])out.push({...line,overview:[{key:'Diese geprüfte Möglichkeit ist eine Ergänzung, nicht die bewertete Hauptvariante.'}]});
    if(d.evidence?.overlooked)for(const line of out){line.initialThreat=d.evidence.overlooked;line.overview=[overlookedFact(s,line.initialThreat),...(line.overview||[])].slice(0,3);}
    return out;
  }
  // Ruhige Züge, die sonst nur beschrieben würden: Freibauer, König im Endspiel, Turm auf der siebten Reihe.
  function quietPurpose(state,move,after){
    const T8=window.ChessTeaching;if(!T8?.passed)return null;
    const type=move.p.toUpperCase(),white=E.isW(move.p),b=after.b,dist=(a,c)=>Math.max(Math.abs((a&7)-(c&7)),Math.abs((a>>3)-(c>>3)));
    if(type==='P'&&T8.passed(b,move.t)){const left=white?(move.t>>3):7-(move.t>>3),goal=E.sqName((move.t&7)+(white?0:56));
      return left<=1?{key:'Der Freibauer steht jetzt direkt vor der Umwandlung auf {s}.',args:{s:goal}}:{key:'Der Freibauer rückt vor: Bis zur Umwandlung auf {s} fehlen noch {n} Felder.',args:{s:goal,n:left}};}
    // Bauernzug, der ein Feld deckt, auf das eine gegnerische Leichtfigur oder die Dame sonst ziehen könnte
    if(type==='P'&&!move.promo){const f=move.t&7,ahead=move.t+(white?-8:8),covered=[f>0?ahead-1:-1,f<7?ahead+1:-1].filter(q=>q>=0&&q<64&&(!b[q]||E.isW(b[q])!==white));
      const denied=covered.find(q=>E.legal(after).some(m=>m.t===q&&'NBQ'.includes(m.p.toUpperCase())));
      if(denied!==undefined)return {key:'Der Bauer auf {s} hält gegnerische Figuren von {t} fern.',args:{s:E.sqName(move.t),t:E.sqName(denied)}};}
    if(type==='K'&&T8.endgame(b)){
      const runners=b.map((p,q)=>p&&p.toUpperCase()==='P'&&T8.passed(b,q)?q:-1).filter(q=>q>=0),near=runners.filter(q=>dist(move.t,q)<dist(move.f,q)&&dist(move.t,q)<=2).sort((a,c)=>dist(move.t,a)-dist(move.t,c))[0];
      if(near!==undefined)return E.isW(b[near])===white?{key:'Der König begleitet den eigenen Freibauern auf {s}.',args:{s:E.sqName(near)}}:{key:'Der König läuft dem gegnerischen Freibauern auf {s} entgegen.',args:{s:E.sqName(near)}};
      const c=q=>Math.max(Math.abs((q&7)-3.5),Math.abs((q>>3)-3.5));if(c(move.t)<c(move.f))return {key:'Im Endspiel wird der König aktiv: Er geht in Richtung Mitte.'};
    }
    if(type==='R'&&(move.t>>3)===(white?1:6)&&(move.f>>3)!==(move.t>>3)){
      // nur Bauern, die der Turm auf der Reihe wirklich sieht (keine Figur dazwischen)
      const row=white?1:6,seesPawn=dir=>{for(let x=(move.t&7)+dir;x>=0&&x<8;x+=dir){const p=b[row*8+x];if(p)return p===(white?'p':'P');}return false;},pawns=seesPawn(-1)||seesPawn(1),
        // König auf der Grundreihe „festgehalten“ nur, wenn der Turm jedes freie Feld davor auf der Reihe wirklich sieht
        // (eigene Figuren des Königs sperren ohnehin); eine gegnerische Figur dort könnte er schlagen
        rx=move.t&7,sees=x=>{if(x===rx)return false;for(let y=rx+Math.sign(x-rx);y!==x;y+=Math.sign(x-rx))if(b[row*8+y])return false;return true;},
        ksq=white?after.kb:after.kw,kx=ksq&7,front=[kx-1,kx,kx+1].filter(x=>x>=0&&x<8),
        king=ksq>>3===(white?0:7)&&front.some(x=>!b[row*8+x])&&front.every(x=>{const q=b[row*8+x];return q?E.isW(q)!==white&&x!==rx:sees(x);});
      if(pawns||king)return {key:pawns?'Der Turm dringt auf die siebte Reihe ein und greift dort die Bauern an.':'Der Turm dringt auf die siebte Reihe ein und hält den König auf der Grundreihe fest.'};
    }
    return null;
  }
  function moveNotes(state,move,after,next){
    if(mate(after))return [{key:'Das ist Schachmatt. Der König steht im Schach und hat keine legale Abwehr.'}];
    if(!E.inCheck(after)&&!E.legal(after).length)return [{key:'Mit {b} entsteht Patt: Der König steht nicht im Schach, aber es gibt keinen legalen Zug. Die Partie ist remis.',args:{b:E.toSAN(state,move)}}];
    const notes=[];
    if(move.cap){const sq=move.ep?move.t+(E.isW(move.p)?8:-8):move.t;notes.push({key:'Mit {b} schlägst du {p} auf {s}.',args:{b:E.toSAN(state,move),p:capturedPiece(move.cap),s:E.sqName(sq)}});
      // Kann sofort zurückgeschlagen werden, ist es ein Tausch und kein reiner Figurenverlust: das dazusagen.
      if(E.legal(after).some(m=>m.cap&&m.t===move.t)){const white=E.isW(move.p),net=exchange(after,move.t,white)-material(state,white);
        notes.push(net>=100?{type:'exchange',key:'Ein Rückschlag auf {s} ist möglich; der Abtausch bleibt in der kurzen Prüfung günstig.',args:{s:E.sqName(move.t)}}:{key:'Der Gegner kann auf {s} zurückschlagen.',args:{s:E.sqName(move.t)},recapture:true});}}
    else if(E.inCheck(after))notes.push({key:'Mit {b} gibst du Schach. Der Gegner muss zuerst das Schach abwehren.',args:{b:E.toSAN(state,move)}});
    else notes.push(quietPurpose(state,move,after)||{key:'Die Figur zieht von {f} nach {t}.',args:{f:E.sqName(move.f),t:E.sqName(move.t)},movingPiece:move.p,move:uci(move)});
    if(next){const m=E.legal(after).find(m=>uci(m)===next);if(m&&mate(E.make(after,m)))notes.push({key:'Dieser Zug ermöglicht {m}: Schachmatt.',args:{m:E.toSAN(after,m)}});}
    return notes;
  }
  // Geometric attacks also include empty squares and pinned pieces (king safety).
  // For escape squares, inspect the board AFTER the hypothetical king capture:
  // otherwise a captured checker or a ray hidden by the king gives false results.
  function attackSources(b,to,white){
    const out=[],tx=to&7,ty=to>>3;
    for(let from=0;from<64;from++){
      const p=b[from];if(!p||E.isW(p)!==white||from===to)continue;
      const dx=tx-(from&7),dy=ty-(from>>3),ax=Math.abs(dx),ay=Math.abs(dy),type=p.toUpperCase();
      if(type==='P'){if(ax===1&&dy===(white?-1:1))out.push(from);continue;}
      if(type==='N'){if(ax*ay===2)out.push(from);continue;}
      if(type==='K'){if(Math.max(ax,ay)===1)out.push(from);continue;}
      if(!((type==='B'||type==='Q')&&ax===ay||(type==='R'||type==='Q')&&(!dx||!dy)))continue;
      const sx=Math.sign(dx),sy=Math.sign(dy);let x=(from&7)+sx,y=(from>>3)+sy;
      while(x!==tx||y!==ty){if(b[y*8+x])break;x+=sx;y+=sy;}
      if(x===tx&&y===ty)out.push(from);
    }
    return out;
  }
  // These observations describe board geometry, not a player's intention or
  // a guaranteed engine plan. Every claimed mate threat is legally replayed.
  function motifs(before,move,after){
    const facts=[],arrows=[],white=E.isW(move.p),king=white?after.kb:after.kw;
    const add=(key,args)=>facts.push({key,args});
    const p=after.b[move.t],type=p.toUpperCase(),own={...after,turn:white?'w':'b',ep:-1,h1:undefined,h2:undefined};
    if(E.inCheck(before)&&!E.inCheck(own)){
      const checks=attackSources(before.b,white?before.kw:before.kb,!white);
      if(type!=='K'&&checks.some(sq=>after.b[sq]===before.b[sq]))
        add('Die Figur auf {s} unterbricht die Angriffslinie auf den König. Das Schach ist abgewehrt.',{s:E.sqName(move.t)});
      else add('Der Zug wehrt das Schach ab.',{});
    }
    if('BRQ'.includes(type)){
      const dx=(king&7)-(move.t&7),dy=(king>>3)-(move.t>>3),ax=Math.abs(dx),ay=Math.abs(dy);
      if(((type==='B'||type==='Q')&&ax===ay||(type==='R'||type==='Q')&&(!dx||!dy))&&(dx||dy)){
        const step=Math.sign(dy)*8+Math.sign(dx),between=[];
        for(let sq=move.t+step;sq!==king;sq+=step)if(after.b[sq])between.push(sq);
        if(between.length===1&&E.isW(after.b[between[0]])!==white){const sq=between[0];
          add('{p} auf {s} ist an den König auf {k} gefesselt: Die Figur darf die Angriffslinie nicht freigeben.',{p:subjectPiece(after.b[sq]),s:E.sqName(sq),k:E.sqName(king)});
          arrows.push({from:move.t,to:sq,kind:'attack'});
        }
      }
    }
    if(type!=='K')for(let target=0;target<64;target++){
      const enemy=after.b[target];if(!enemy||E.isW(enemy)===white||!'KQRkqr'.includes(enemy))continue;
      const previous=attackSources(before.b,target,white),source=attackSources(after.b,target,white).find(from=>from!==move.t&&before.b[from]===after.b[from]&&!previous.includes(from));
      if(source!==undefined&&(enemy.toUpperCase()==='K'||E.legal(own).some(m=>m.f===source&&m.t===target))){add('Der Zug öffnet die Linie: {p} auf {f} greift jetzt {q} auf {t} an.',{p:piece(after.b[source]),f:E.sqName(source),q:piece(enemy),t:E.sqName(target)});arrows.push({from:source,to:target,kind:enemy.toUpperCase()==='K'?'check':'attack'});break;}
    }
    if(!E.inCheck(after)&&!E.inCheck(own)&&!E.status(after,[]).over){
      const threat=E.legal(own).find(m=>mate(E.make(own,m)));
      if(threat)add('Ohne Abwehr droht {m}: Schachmatt.',{m:E.toSAN(own,threat)});
    }
    const home=white?7:0;
    if(!facts.length&&'NB'.includes(type)&&(move.f>>3)===home&&(move.t>>3)!==home)
      add('{p} verlässt das Startfeld {f} und wird auf {t} entwickelt.',{p:subjectPiece(p),f:E.sqName(move.f),t:E.sqName(move.t)});
    if(!facts.length&&type==='P'){
      const without={...own,b:after.b.slice()};without.b[move.t]=null;
      if(!E.inCheck(without)){
        const centre=[27,28,35,36].filter(sq=>attackSources(after.b,sq,white).includes(move.t));
        if(centre.length===1)add('Der Bauer auf {s} kontrolliert das Feld {t} im Zentrum.',{s:E.sqName(move.t),t:E.sqName(centre[0])});
        else if(centre.length)add('Der Bauer auf {s} kontrolliert {t} im Zentrum.',{s:E.sqName(move.t),t:fieldList(centre.map(E.sqName))});
      }
    }
    if(!facts.length&&type==='R'&&(move.f&7)!==(move.t&7)&&!after.b.some((p,sq)=>p&&p.toUpperCase()==='P'&&(sq&7)===(move.t&7)))
      add('Der Turm steht auf der offenen {f}-Linie: Dort steht kein Bauer mehr.',{f:E.sqName(move.t)[0]});
    return {facts,arrows};
  }
  function visuals(before,move,after){
    const arrows=[{from:move.f,to:move.t,kind:'move',knight:move.p.toUpperCase()==='N'}],escapes=[];
    if(move.castle){const rook=move.t>move.f?[move.f+3,move.f+1]:[move.f-4,move.f-1];arrows.push({from:rook[0],to:rook[1],kind:'move'});}
    const checked=E.inCheck(after),mated=checked&&!E.legal(after).length,king=after.turn==='w'?after.kw:after.kb;
    if(checked){
      const attackers=attackSources(after.b,king,after.turn!=='w');
      for(const from of attackers)arrows.push({from,to:king,kind:'check',knight:after.b[from].toUpperCase()==='N'});
      if(mated){
        for(let dy=-1;dy<=1;dy++)for(let dx=-1;dx<=1;dx++){
          if(!dx&&!dy)continue;
          const x=(king&7)+dx,y=(king>>3)+dy;if(x<0||x>7||y<0||y>7)continue;
          const sq=y*8+x,p=after.b[sq];
          if(p&&E.isW(p)===(after.turn==='w')){escapes.push({sq,kind:'blocked'});continue;}
          const b=after.b.slice();b[king]=null;b[sq]=after.turn==='w'?'K':'k';
          const sources=attackSources(b,sq,after.turn!=='w');
          if(sources.length)escapes.push({sq,kind:'unsafe',sources});
          // Show why capturing the checking piece fails, rather than drawing
          // every control ray across the board at once.
          if(attackers.includes(sq)&&sources.length)arrows.push({from:sources[0],to:sq,kind:'defend',knight:after.b[sources[0]].toUpperCase()==='N'});
        }
      }
    }
    if(!mated){
      const ownTurn={...after,turn:before.turn,ep:-1,h1:undefined,h2:undefined};
      const targets=tacticalTargets(after,move.t).map(t=>({t,cap:after.b[t]}));
      for(const m of targets.filter(m=>m.cap.toUpperCase()!=='K').sort((a,b)=>worth(b.cap)-worth(a.cap)).slice(0,checked?1:2))arrows.push({from:move.t,to:m.t,kind:'attack',knight:move.p.toUpperCase()==='N'});
    }
    return {arrows,escapes,checked,mated,king};
  }
  function visualMarkup(guide,flipped){
    const xy=sq=>flipped?[7-(sq&7)+.5,7-(sq>>3)+.5]:[(sq&7)+.5,(sq>>3)+.5];
    const paths=guide.arrows.map(a=>{
      const [x,y]=xy(a.from),[tx,ty]=xy(a.to),dx=tx-x,dy=ty-y;
      // Only the played knight move bends; attack lines show the relation
      // between pieces directly. Keep both arrow ends clear of the piece faces.
      const bend=a.knight&&a.kind==='move'?(Math.abs(dx)>Math.abs(dy)?[tx,y]:[x,ty]):null;
      const bx=bend?.[0]??x,by=bend?.[1]??y,len=Math.hypot(tx-bx,ty-by),end=[tx-(tx-bx)/len*.34,ty-(ty-by)/len*.34];
      const first=bend||[tx,ty],firstLen=Math.hypot(first[0]-x,first[1]-y),origin=[x+(first[0]-x)/firstLen*.32,y+(first[1]-y)/firstLen*.32];
      let d=`M ${origin[0]} ${origin[1]}`;
      if(bend){const r=.16,ix=bx-Math.sign(bx-x)*r,iy=by-Math.sign(by-y)*r,ox=bx+Math.sign(tx-bx)*r,oy=by+Math.sign(ty-by)*r;d+=` L ${ix} ${iy} Q ${bx} ${by} ${ox} ${oy}`;}
      d+=` L ${end[0]} ${end[1]}`;
      return `<g class="coach-arrow coach-arrow-${a.kind}${a.kind==='defend'?' coach-mate-detail':''}" data-from="${E.sqName(a.from)}" data-to="${E.sqName(a.to)}"><path class="coach-arrow-outline" d="${d}"/><path class="coach-arrow-line" d="${d}" marker-end="url(#coach-head-${a.kind})"/></g>`;
    }).join('');
    const marks=guide.escapes.map(e=>{const [x,y]=xy(e.sq);return `<g class="coach-escape coach-escape-${e.kind} coach-mate-detail" data-square="${E.sqName(e.sq)}"><rect class="coach-field-tint" x="${x-.45}" y="${y-.45}" width=".9" height=".9" rx=".06"/>${e.kind==='blocked'?`<path class="coach-field-bracket" d="M ${x-.35} ${y-.22} V ${y+.35} H ${x+.22}"/>`:`<path class="coach-field-edge" d="M ${x-.34} ${y+.35} H ${x+.34}"/>`}</g>`;}).join('');
    const [kx,ky]=xy(guide.king);
    return `<svg class="coach-diagram" viewBox="0 0 8 8" aria-hidden="true"><defs>${['move','attack','check','defend','control','threat','next-threat'].map(k=>`<marker id="coach-head-${k}" viewBox="0 0 10 10" refX="8" refY="5" markerWidth=".24" markerHeight=".24" markerUnits="userSpaceOnUse" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="${k==='move'?'#ffe5a3':k.includes('threat')?'#e8c682':k==='check'?'#ff9990':'#90e4d1'}" stroke="#15211b" stroke-width=".8" stroke-linejoin="round"/></marker>`).join('')}</defs>${guide.checked?`<rect class="coach-king-alert" x="${kx-.46}" y="${ky-.46}" width=".92" height=".92" rx=".09"/>`:''}${paths}${marks}</svg>`;
  }
  async function replay(ctx,s,input,selected=0,options={}){
    selected=Number.isInteger(selected)?selected:0;
    const valid=[];
    for(let line of input||[])try{
      if(!Array.isArray(line.moves)||!line.moves.length||line.moves.length>20)continue;
      const completed=window.ChessTeaching?.line(s,line.moves,{extend:!options.analysis});if(completed?.valid)line={...line,moves:completed.steps.map(st=>uci(st.move))};
      let state=E.fromFEN(E.toFEN(s));const positions=[state],sans=[],notes=[],guides=[];
      for(const [i,code] of line.moves.entries()){
        const m=E.legal(state).find(m=>uci(m)===code);if(!m)throw Error('illegal line');sans.push(E.toSAN(state,m));
        const after=E.make(state,m),guide=visuals(state,m,after),extra=options.analysis?purpose(state,m):null;
        const additional=i===0&&line.firstArrows?.length?line.firstArrows:extra?.arrows||[];
        if(extra&&!guide.checked)for(const a of additional)if(guide.arrows.length<3&&!guide.arrows.some(b=>a.from===b.from&&a.to===b.to))guide.arrows.push(a);
        guides.push(guide);
        const base=guide.mated?moveNotes(state,m,after,line.moves[i+1]):i===0&&line.firstNotes?.length?line.firstNotes:m.cap?[...moveNotes(state,m,after,line.moves[i+1]),...(extra?.facts||[]).filter(f=>f.type!=='capture'&&!f.key.startsWith('Mit {b} schlägst du die Figur'))]:extra?.facts.length?extra.facts:moveNotes(state,m,after,line.moves[i+1]);
        const facts=i===2&&line.exchangeNote?.move===code?[line.exchangeNote,...base]:base;
        // Nennt die Analyse den Tausch schon selbst, entfällt der allgemeine Rückschlag-Hinweis.
        const exchanged=facts.some(f=>f.type==='exchange'&&f.key!=='Der Gegner kann auf {s} zurückschlagen.');
        notes.push(facts.filter((f,k)=>!(exchanged&&f.recapture)&&facts.findIndex(x=>x.key===f.key&&JSON.stringify(x.args)===JSON.stringify(f.args))===k).slice(0,3));
        state=after;positions.push(state);
      }
      valid.push({...line,positions,sans,notes,guides,endpoint:completed,goal:window.ChessTeaching?.goal?.(s,completed)||null});
    }catch(e){/* Never display an unverified move sequence. */}
    if(!valid.length)return false;
    let line=Math.max(0,Math.min(valid.length-1,selected)),step=0;
    const flipped=s.turn==='b',settings=Store.get('chess.settings2',{}),theme=String(settings.theme||'turnier').replace(/[^a-z]/g,'');
    const comparison=options.analysis?`<div class="coach-comparison" role="group" aria-label="${UI.esc(T('Züge vergleichen'))}">${valid.map((l,i)=>({l,i})).sort((a,b)=>{const rank=l=>l.key==='Gespielter Zug'?0:l.key==='Empfehlung der Engine'?1:2;return rank(a.l)-rank(b.l);}).map(({l,i})=>`<button type="button" data-coach-line="${i}" aria-pressed="${i===line}"><span>${UI.esc(T(l.key))}${options.sameMove?' = '+UI.esc(T('Empfehlung der Engine')):''}</span><strong>${UI.esc(l.sans[0])}</strong><span class="coach-line-check" aria-hidden="true">✓</span></button>`).join('')}</div>`:'';
    await ctx.modal({title:options.analysis?T('Zug verstehen'):T('Fortsetzung nachspielen'),cls:'coach-replay'+(options.analysis?' coach-replay-analysis':''),
      html:`${comparison}<p class="coach-replay-label muted small" aria-live="polite"></p>
      <div class="chess theme-${theme}${Pieces.cls()}"><div class="board-frame"><div class="board coach-replay-board" role="img"></div></div></div>
      <p class="coach-replay-goal" hidden></p>
      <div class="coach-replay-explanation" aria-live="polite"></div>
      <p class="coach-replay-context coach-note" hidden></p>
      <div class="coach-replay-controls"><button class="btn" data-coach-step="prev">${Icon('back')}${T('Zug zurück')}</button><button class="btn primary" data-coach-step="next">${T('Nächster Zug')}${Icon('chevron')}</button></div>
      <p class="coach-replay-position"></p>
      <p class="coach-current-threat" hidden></p><p class="coach-line-balance muted small"></p>
      ${notation()}
      <div class="coach-visual-key" aria-live="polite"></div>
      <details class="coach-mate-explainer" hidden><summary>${UI.esc(T('Warum ist das Matt?'))}</summary><div class="coach-mate-reasons"></div></details>
      ${options.analysis?`<p class="coach-note">${UI.esc(T(options.forcedMate?'Das Matt ist erzwungen.':'Die Zugfolgen sind Beispiele.'))}</p>`:''}
      ${options.analysis?'':`<details class="coach-variants"><summary>${T('Andere Fortsetzung ansehen')}</summary><div class="coach-choices" role="group" aria-label="${UI.esc(T('Fortsetzung auswählen'))}">${valid.map((l,i)=>`<button class="btn" data-coach-line="${i}" aria-pressed="${i===line}">${UI.esc(T(l.key))}</button>`).join('')}</div></details>`}`,
      buttons:[{label:options.analysis?T('Zurück zur Analyse'):T('Zurück zur Übung'),value:null,primary:true}],
      onOpen(card){
        card.querySelector('.modal-btns').prepend(card.querySelector('.coach-replay-controls'));
        const draw=()=>{
          const active=card.contains(document.activeElement)?document.activeElement:null;
          const l=valid[line],state=l.positions[step],last=step?l.moves[step-1]:null;
          let squares='',pieces='';
          for(let y=0;y<8;y++)for(let x=0;x<8;x++){
            const sq=flipped?(7-y)*8+7-x:y*8+x,name=E.sqName(sq),p=state.b[sq],highlight=last&&(last.slice(0,2)===name||last.slice(2,4)===name);
            squares+=`<div class="sq ${((sq>>3)+(sq&7))%2?'dark':'light'}${highlight?' last':''}">${x===0?`<span class="co rk">${8-(sq>>3)}</span>`:''}${y===7?`<span class="co fl">${name[0]}</span>`:''}</div>`;
            if(p)pieces+=`<div class="piece ${E.isW(p)?'w':'b'}" style="transform:translate(${x*100}%,${y*100}%)"><span class="g">${Pieces.inner(p.toUpperCase())}</span></div>`;
          }
          const initial=!step&&l.initialThreat;
          const baseGuide=step?l.guides[step-1]:initial?{arrows:[{from:initial.from,to:initial.to,kind:'threat'}],escapes:[],checked:false,mated:false,king:state.turn==='w'?state.kw:state.kb}:null;
          const current=step?threatNow(state,l.positions[step-1].turn):null,guide=baseGuide&&{...baseGuide,arrows:baseGuide.arrows.slice()};
          // Keep the just-played tactic visible: an upcoming mating threat
          // must not erase the two targets of the fork being explained.
          if(current&&guide&&!guide.checked){guide.arrows=guide.arrows.filter(a=>a.from!==current.from||a.to!==current.to);guide.arrows.push({from:current.from,to:current.to,kind:'next-threat'});}
          const board=card.querySelector('.coach-replay-board');board.innerHTML=`<div class="squares">${squares}</div><div class="pieces" aria-hidden="true">${pieces}</div>${guide?visualMarkup(guide,flipped):''}`;
          board.setAttribute('aria-label',T('Schachbrett')+': '+state.b.map((p,i)=>p?UI.chessFieldLabel(i,p):'').filter(Boolean).join(', '));
          card.querySelector('.coach-replay-label').textContent=options.analysis?T('Gezeigt: {zug}',{zug:T(l.key)+' · '+l.sans[0]}):T(l.key);
          const context=card.querySelector('.coach-replay-context');context.hidden=!l.context?.length;context.textContent=(l.context||[]).map(f=>renderFact(f,s.turn,options.perspective)).join(' ');
          const goalEl=card.querySelector('.coach-replay-goal');goalEl.hidden=!l.goal;goalEl.textContent=l.goal?renderFact(l.goal,s.turn,options.perspective):'';
          const words=step?l.notes[step-1]:l.overview;
          const spoken=words?.length?words:[{key:'Sieh dir diese Fortsetzung Zug für Zug an.'}],actor=step?l.positions[step-1].turn:s.turn;
          if(window.ChessTeaching)card.querySelector('.coach-replay-explanation').innerHTML=ChessTeaching.stepCopy(spoken,actor,!step?l.teaching:null,0,options.perspective);else card.querySelector('.coach-replay-explanation').textContent=spoken.map(f=>renderFact(f,actor,options.perspective)).join(' ');
          const danger=card.querySelector('.coach-current-threat');danger.hidden=!current;danger.textContent=current?T('Was droht jetzt?')+' '+renderFact(current.fact,state.turn,options.perspective):'';
          const endpoint=card.querySelector('.coach-line-balance'),counted=l.endpoint;endpoint.dataset.actor=counted?.matedSide||s.turn;endpoint.hidden=step!==l.moves.length||!counted?.settled||l.teaching?.suppressBalances;endpoint.textContent=counted?.balance?T('Ergebnis: {result}',{result:renderFact(counted.balance,s.turn,options.perspective)}):'';
          const position=card.querySelector('.coach-replay-position');
          const initialMove=initial&&E.legal(asTurn(state,state.turn!=='w')).find(m=>uci(m)===initial.move);
          position.textContent=step?`${step}/${l.moves.length} · ${T(l.positions[step-1].turn==='w'?'Weiß':'Schwarz')}: ${l.sans[step-1]}`:initialMove?T('Gestrichelter Pfeil: drohender Zug {m}.',{m:E.toSAN(asTurn(state,state.turn!=='w'),initialMove)}):T('Ausgangsstellung');
          position.classList.toggle('coach-key-threat',!!initial);
          const notedState=l.positions[step?step-1:0],notedMove=E.legal(notedState).find(m=>uci(m)===l.moves[step?step-1:0]);
          const plain=card.querySelector('.coach-notation-current');plain.hidden=!notedMove;plain.textContent=notationMove(notedState,notedMove);
          const key=card.querySelector('.coach-visual-key'),items=[],reasons=[];
          if(step&&guide){
            const movement=guide.arrows[0],p=l.positions[step-1].b[movement.from];
            items.push(`<span class="coach-key-move">${UI.esc(T('{p}: {f} → {t}',{p:labelPiece(p),f:E.sqName(movement.from),t:E.sqName(movement.to)}))}</span>`);
            if(guide.checked)items.push(`<strong class="coach-check-badge">${UI.esc(guide.mated?T('Schachmatt'):T('Schach'))}</strong>`);
            const attacks=guide.arrows.filter(a=>a.kind==='attack');
            if(attacks.length)items.push(`<span class="coach-key-attack">${UI.esc(T('Gestrichelte Pfeile: Angriff auf {s}.',{s:attacks.map(a=>`${forkPiece(state.b[a.to])} ${E.sqName(a.to)}`).join(', ')}))}</span>`);
            const controlled=guide.arrows.filter(a=>a.kind==='control');
            if(controlled.length)items.push(`<span class="coach-key-attack">${UI.esc(T('Gepunktete Pfeile: kontrollierte oder gedeckte Felder {s}.',{s:controlled.map(a=>E.sqName(a.to)).join(', ')}))}</span>`);
            const support=guide.arrows.find(a=>a.kind==='defend');
            if(support)reasons.push(`<span class="coach-key-attack">${UI.esc(T('{p} auf {f} deckt {t}. Der König darf dort nicht schlagen.',{p:subjectPiece(state.b[support.from]),f:E.sqName(support.from),t:E.sqName(support.to)}))}</span>`);
            const blocked=guide.escapes.filter(e=>e.kind==='blocked').map(e=>E.sqName(e.sq)).join(', '),unsafe=guide.escapes.filter(e=>e.kind==='unsafe').map(e=>E.sqName(e.sq)).join(', ');
            if(blocked)reasons.push(`<span class="coach-key-blocked">${UI.esc(T('Eigene Figuren versperren {s}.',{s:blocked}))}</span>`);
            if(unsafe)reasons.push(`<span class="coach-key-unsafe">${UI.esc(T('Markierte Felder: Auf {s} würde der König im Schach stehen.',{s:unsafe}))}</span>`);
          }else if(!initial)items.push(`<span>${UI.esc(T('Gehe einen Zug weiter. Die Pfeile zeigen dir Bewegung und Wirkung.'))}</span>`);
          key.innerHTML=items.join('');
          const detail=card.querySelector('.coach-mate-explainer');detail.hidden=!guide?.mated;
          card.querySelector('.coach-mate-reasons').innerHTML=reasons.join('');
          card.classList.toggle('coach-show-mate',!!guide?.mated&&detail.open);
          card.querySelectorAll('[data-coach-line]').forEach(b=>b.setAttribute('aria-pressed',String(+b.dataset.coachLine===line)));
          card.querySelector('[data-coach-step=prev]').disabled=step===0;
          card.querySelector('[data-coach-step=next]').disabled=step===l.moves.length;
          if(active?.disabled)card.querySelector(step?'[data-coach-step=prev]':'[data-coach-step=next]').focus({preventScroll:true});
        };
        card.addEventListener('click',e=>{const b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.coachLine!==undefined){line=+b.dataset.coachLine;step=0;const variants=card.querySelector('.coach-variants');if(variants)variants.open=false;draw();if(variants)variants.querySelector('summary').focus({preventScroll:true});return;}else if(b.dataset.coachStep){step=Math.max(0,Math.min(valid[line].moves.length,step+(b.dataset.coachStep==='next'?1:-1)));}else return;draw();});
        card.querySelector('.coach-mate-explainer').addEventListener('toggle',e=>card.classList.toggle('coach-show-mate',e.currentTarget.open&&!e.currentTarget.hidden));
        draw();
      }
    });
    return true;
  }
  function extend(state,prefix,comparison){
    if(Array.isArray(comparison?.pvBest)||Array.isArray(comparison?.pvPlayed))return Promise.resolve(prefix);
    return new Promise(resolve=>{
      let worker,timer,done=false;
      const finish=moves=>{if(done)return;done=true;clearTimeout(timer);worker?.terminate();resolve(Array.isArray(moves)&&moves.length>=prefix.length&&prefix.every((m,i)=>moves[i]===m)?moves:prefix);};
      try{worker=new Worker('assets/19cb1156058757e9/js/games/chess-worker.js');worker.onmessage=e=>finish(e.data.moves);worker.onerror=()=>finish(null);timer=setTimeout(()=>finish(null),1800);worker.postMessage({op:'coach-line',state,prefix});}catch(e){finish(null);}
    });
  }
  async function analyseMove(ctx,s,played,reference,options={}){
    if(['similar','unconfirmed','rejected'].includes(options.comparison?.recommendationStatus)){
      if(!played)return false;
      // Old, untrainable entries remain inspectable. Show only the recorded
      // move/line, never the stored or rejected "better" reference.
      const candidate=options.comparison.pvPlayed,moves=Array.isArray(candidate)&&candidate[0]===uci(played)?candidate.slice():[uci(played)];
      return replay(ctx,s,[{key:'Gespielter Zug',moves,overview:[{key:options.comparison.recommendationStatus==='unconfirmed'?'Die Bewertung dieses Zugs konnte nicht abgeschlossen werden. Er zählt nicht zur Genauigkeit und wird nicht als Trainingsaufgabe gespeichert.':'Ein solider Zug.'}],firstNotes:[],firstArrows:[],context:[]}],0,{analysis:true,perspective:options.perspective,sameMove:false});
    }
    const reason=rationale(s,played,reference,options.comparison),d=reason.description,input=lines(s,played,reference,d,options.comparison);
    if(window.ChessTeaching){const model=ChessTeaching.inspect(s,played,reference,options.comparison||{},reason);for(const line of input)line.teaching=model;}
    input[0].overview=reason.flow;input[0].firstNotes=reason.why;input[0].firstArrows=reason.arrows;input[0].context=[];
    const actual=input.find(l=>l.key==='Nach deinem Partiezug');
    if(actual){actual.context=[];if(reason.difference.length){actual.overview=[...reason.context.filter(f=>f.type==='overlooked-threat'),...reason.difference];actual.firstNotes=reason.difference.filter(f=>f.type!=='exchange-loss');}actual.exchangeNote=reason.difference.find(f=>f.key.startsWith('Auch nach {r} bleibt'));}
    if(uci(played)===uci(reference)){input.splice(1,1);input[0].key='Gespielter Zug';}
    else{input[0].key='Empfehlung der Engine';const recorded=input.find(l=>l.key==='Nach deinem Partiezug');if(recorded)recorded.key='Gespielter Zug';}
    if(!d.good?.fromComparison&&d.bad?.reply&&mate(d.bad.end)&&!mate(d.good.after)){
      const attempt=E.legal(d.good.after).find(m=>uci(m)===uci(d.bad.reply));
      if(attempt){const checked=E.make(d.good.after,attempt);
        if(E.inCheck(checked)&&!mate(checked)){
          const defence=E.bestMove(checked,{maxDepth:3,timeMs:120,noise:0});
          if(defence)input.unshift({
            key:'Abwehr gegen den Mattversuch',moves:[uci(reference),uci(attempt),uci(defence)],
            overview:[...d.facts.slice(0,2),{key:'Hier versucht der Gegner denselben Angriff. Spiele weiter, um die Abwehr zu sehen.'}],
            firstNotes:input[0].firstNotes
          });
        }
      }
    }
    for(const l of input){l.moves=await extend(s,l.moves,options.comparison);if(options.isCurrent&&!options.isCurrent())return false;}
    return replay(ctx,s,input,0,{analysis:true,perspective:options.perspective,sameMove:uci(played)===uci(reference),forcedMate:reason.facts.some(f=>f.type==='mate'&&f.forced)});
  }
  function best(s){
    const opts={maxDepth:6,timeMs:900,noise:0};
    return new Promise(resolve=>{
      let w,t;
      const finish=m=>{clearTimeout(t);w?.terminate();resolve(m||E.bestMove(s,{...opts,maxDepth:4,timeMs:250}));};
      try{
        w=new Worker('assets/19cb1156058757e9/js/games/chess-worker.js');
        w.onmessage=e=>finish(e.data.move);w.onerror=()=>finish(null);
        t=setTimeout(()=>finish(null),5000);w.postMessage({id:1,state:s,opts});
      }catch(e){setTimeout(()=>resolve(E.bestMove(s,{...opts,maxDepth:4,timeMs:250})),0);}
    });
  }
  window.ChessCoach={renderFact,fieldList,moveNotes,describe,explain,positionalReason,best,compare,lesson,assess,assessMove,lines,replay,visuals,motifs,purpose,rationale,materialLoss,missedChance,restoreChance,overlookedThreat,notation,notationMove,analyseMove,inspectLine:lineEvidence,exchange,threatNow,goodDefence,trapped,strongSacrifice,version:11};
})();
