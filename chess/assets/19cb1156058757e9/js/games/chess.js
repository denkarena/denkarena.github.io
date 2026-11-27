/* Schach – Startbildschirm mit allen Einstellungen, 10 Spielstärken, Schachuhr, Hilfen, Partie-Analyse mit Erklärungen */
(function () {
  'use strict';
  const E = window.ChessEngine;
  const VAL = { P: 1, N: 3, B: 3, R: 5, Q: 9, K: 0 };
  // Bedenkzeit-Gruppen der Schach-Wertung (wie auf dem Server: chess_cat)
  // Wertungsgruppen wie auf dem Server (chess_cat): Bullet unter 3 Minuten, Blitz 3 bis 5, Schnellschach ab 10
  const chessCat = c => (['1', '2+1'].includes(c) ? 'bullet' : ['3', '3+2', '5', '5+3'].includes(c) ? 'blitz' : c === 'any' ? 'blitz' : 'rapid');
  const CAT_NAME = () => ({ blitz: T('Blitz'), bullet: T('Bullet'), rapid: T('Schnellschach') });
  const yourPiece = P => T({ Q: 'deine Dame', P: 'deinen Bauern', N: 'deinen Springer', B: 'deinen Läufer', R: 'deinen Turm', K: 'deinen König' }[P]);
  const aPiece = P => T({ Q: 'die Dame', P: 'einen Bauern', N: 'einen Springer', B: 'einen Läufer', R: 'einen Turm', K: 'den König' }[P]);

  // Dreizehn Spielstärken. Stufe 1 bis 10: DenkArena-Engine (die unteren spielen bewusst fehlerhaft, die oberen rechnen tief).
  // Stufe 11 bis 13 (Meisterstufen): Stockfish mit begrenzter Spielstärke (UCI_Elo), etwa 1 Sekunde pro Zug.
  // elo: Stufe 1–10 geschätzte Spielstärke auf der Elo-Skala von Stockfish (gemessen 11/2026, auf 100 gerundet; negativ = „unter“),
  // Stufe 11–13 Zielwert von Stockfish (target), keine Messung der App.
  const LEVELS = [
    { name: T('Stufe {n}', {n:1}), desc: T('Macht viele Fehler. Ideal zum Lernen der Regeln.'), opts: { maxDepth: 1, noise: 320, blunder: 0.45, noQ: true, timeMs: 400 }, elo: -800 },
    { name: T('Stufe {n}', {n:2}), desc: T('Übersieht häufig angegriffene Figuren.'), opts: { maxDepth: 1, noise: 200, blunder: 0.28, noQ: true, timeMs: 500 }, elo: -800 },
    { name: T('Stufe {n}', {n:3}), desc: T('Kennt die Grundlagen, übersieht Taktik.'), opts: { maxDepth: 1, noise: 110, blunder: 0.14, noQ: true, timeMs: 600 }, elo: -800 },
    { name: T('Stufe {n}', {n:4}), desc: T('Schlägt zu, wenn du etwas ungedeckt lässt.'), opts: { maxDepth: 1, noise: 55, blunder: 0.06, timeMs: 700 }, elo: 800 },
    { name: T('Stufe {n}', {n:5}), desc: T('Sieht einfache Kombinationen.'), opts: { maxDepth: 2, noise: 30, blunder: 0.03, timeMs: 1000 }, elo: 1300 },
    { name: T('Stufe {n}', {n:6}), desc: T('Solide und taktisch aufmerksam.'), opts: { maxDepth: 2, noise: 8, timeMs: 1200 }, elo: 1400 },
    { name: T('Stufe {n}', {n:7}), desc: T('Rechnet weiter voraus als die unteren Stufen.'), opts: { maxDepth: 3, noise: 4, timeMs: 1600 }, premium: true, elo: 1500 },
    { name: T('Stufe {n}', {n:8}), desc: T('Erkennt viele taktische Fehler und nutzt sie aus.'), opts: { maxDepth: 4, noise: 4, timeMs: 2200 }, premium: true, elo: 1500 },
    { name: T('Stufe {n}', {n:9}), desc: T('Vergleicht mehr Zugfolgen. Auch diese Stufe kann Fehler machen.'), opts: { maxDepth: 5, noise: 3, timeMs: 3000 }, premium: true, elo: 1500 },
    { name: T('Stufe {n}', {n:10}), desc: T('Die stärkste Stufe der DenkArena-Engine.'), opts: { maxDepth: 6, noise: 2, timeMs: 4500 }, premium: true, elo: 1600 },
    { name: T('Stufe {n}', {n:11}), desc: T('Stockfish spielt mit begrenzter Stärke.'), opts: { stockfishElo: 2000, timeMs: 1000 }, premium: true, elo: 2000, target: true },
    { name: T('Stufe {n}', {n:12}), desc: T('Stockfish spielt mit begrenzter Stärke.'), opts: { stockfishElo: 2400, timeMs: 1000 }, premium: true, elo: 2400, target: true },
    { name: T('Stufe {n}', {n:13}), desc: T('Stockfish spielt mit begrenzter Stärke. Für sehr starke Spieler.'), opts: { stockfishElo: 2800, timeMs: 1000 }, premium: true, elo: 2800, target: true }
  ];
  const lastDenkArenaLevel = LEVELS.reduce((last, level, i) => level.opts.stockfishElo ? last : i, 0);
  // gängige Bedenkzeiten: Minuten pro Spieler, „+ n“ = Sekunden Zuschlag pro Zug
  const CLOCKS = [['none', T('Ohne Uhr')], ['1', '1'], ['2+1', '2 + 1'], ['3', '3'], ['3+2', '3 + 2'], ['5', '5'], ['5+3', '5 + 3'], ['10', '10'], ['10+5', '10 + 5'], ['15+10', '15 + 10'], ['30', '30'], ['any', T('Egal')]];
  // Bedenkzeit nach Wertungsgruppe (Auswahl in der Lobby)
  const CLOCK_GROUPS = () => [['bullet', ['1', '2+1']], ['blitz', ['3', '3+2', '5', '5+3']], ['rapid', ['10', '10+5', '15+10', '30']], ['', ['none', 'any']]];
  const CLOCK_MS = { '1': [60000, 0], '2+1': [120000, 1000], '3': [180000, 0], '3+2': [180000, 2000], '5': [300000, 0], '5+3': [300000, 3000], '10': [600000, 0], '10+5': [600000, 5000], '15+10': [900000, 10000], '30': [1800000, 0] };
  const clockLabel = k => (k === 'none' ? T('Ohne Uhr') : k === 'any' ? T('egal') : T('{n} Min', { n: k.replace('+', ' + ') }) + (k.includes('+') ? ' ' + T('(+ Sekunden pro Zug)') : ''));
  const THEMES = [
    { id: 'turnier', name: T('Turnier') }, { id: 'holz', name: T('Nussbaum') },
    { id: 'graphit', name: T('Graphit'), premium: true }, { id: 'marmor', name: T('Marmor'), premium: true },
    // aus dem Club-Shop (gegen Clubpunkte)
    { id: 'walnuss', name: T('Walnuss'), shop: 'theme.walnuss' }, { id: 'schiefer', name: T('Schiefer'), shop: 'theme.schiefer' },
    { id: 'elfenbein', name: T('Elfenbein'), shop: 'theme.elfenbein' }, { id: 'mitternacht', name: T('Mitternacht'), shop: 'theme.mitternacht' },
    { id: 'botschafter', name: T('Botschafter'), shop: 'theme.botschafter' }
  ];
  const themeOk = (t, prem) => (!t.premium || prem) && (!t.shop || Shop.owns(t.shop));
  const piecesCls = () => Pieces.cls();
  const AIDS = [
    ['showMoves', T('Mögliche Züge anzeigen'), T('Punkte auf erreichbaren Feldern')],
    ['showEval', T('Bewertungsleiste'), T('Zeigt, wer besser steht. Online erst in der Analyse.')],
    ['allowUndo', T('Zurücknehmen erlauben'), T('Aus = ernsthafte Partie')]
  ];
  // Kommentare zu den Zügen gibt es nur mit der Spielweise Trainer (früher eigener Schalter „Kommentare während der Partie“)
  const AID_KEYS = ['showMoves', 'showEval', 'allowUndo'], STYLES = ['trainer', 'frei', 'ernst'];
  const START_COUNT = { P: 8, N: 2, B: 2, R: 2, Q: 1 };
  const colorOf = p => (E.isW(p) ? 'w' : 'b');
  // Ungefähre Spielstärke als kleine Zeile unter der Stufe (Meisterstufen: Angabe von Stockfish selbst).
  // Stufe 1–10: gemessene Schätzung (auf 100 gerundet). Stufe 11–13: Zielwert, auf den Stockfish sich begrenzt.
  const eloText = L => !L?.elo ? '' : L.target ? T('Stockfish-Zielwert: {e} Elo', { e: L.elo }) : L.elo < 0 ? T('Geschätzte Spielstärke: unter {e} Elo', { e: -L.elo }) : T('Geschätzte Spielstärke: ca. {e} Elo', { e: L.elo });
  const stageBar = n => `<span class="stagebar ten">${LEVELS.map((_, i) => `<i class="${i < n ? 'on' : ''}"></i>`).join('')}</span>`;
  const fmtClock = ms => { const s = Math.max(0, Math.ceil(ms / 1000)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };

  // ---------- Gegner rechnet im Worker (Fallback: Hauptthread) ----------
  let worker = null, workerOk = true, seq = 0;
  const pending = {};
  function getWorker() {
    if (worker || !workerOk) return worker;
    try {
      worker = new Worker('assets/19cb1156058757e9/js/games/chess-worker.js');
      worker.onmessage = e => { const cb = pending[e.data.id]; delete pending[e.data.id]; if (cb) cb('comparison' in e.data?e.data.comparison:'position' in e.data?e.data.position:e.data.move); };
      worker.onerror = () => {
        workerOk = false; worker = null;
        for (const id in pending) { const cb = pending[id]; delete pending[id]; cb('__fallback__'); }
      };
    } catch (e) { workerOk = false; worker = null; }
    return worker;
  }
  function think(state, opts,computerLevel) {
    return new Promise(res => {
      const local = () => setTimeout(() => res(Number.isInteger(computerLevel)?ChessComputer.choose(state,computerLevel,opts):E.bestMove(state, opts)), 30);
      const w = getWorker();
      if (!w) return local();
      const id = ++seq;
      pending[id] = m => (m === '__fallback__' ? local() : res(m));
      w.postMessage({ id, state, opts,computerLevel });
    });
  }
  function compare(state,played,extra={}){
    return new Promise(resolve=>{
      const unavailable={unavailable:true,uncertain:true,depth:0};
      let finished=false,timer;const finish=r=>{if(finished)return;finished=true;clearTimeout(timer);resolve(r||unavailable);};
      const opts={maxDepth:6,timeMs:900,...extra},local=()=>setTimeout(()=>{try{finish(E.compareMove(state,played,{...opts,timeMs:180,maxDepth:3}));}catch(e){finish(unavailable);}},0),w=getWorker();
      if(!w)return local();
      const id=++seq;pending[id]=r=>r==='__fallback__'?local():finish(r);
      timer=setTimeout(()=>{delete pending[id];w.terminate();if(worker===w){worker=null;workerOk=false;}for(const key in pending){const cb=pending[key];delete pending[key];cb('__fallback__');}finish(unavailable);},5000);
      try{w.postMessage({op:'compare',id,state,played,opts});}catch(e){delete pending[id];local();}
    });
  }

  // Stellungssuche im Hintergrund (Trainer: Plan des Gegners). Ohne Worker gibt es keinen Plan, das Brett soll nie stocken.
  function searchPosition(state,opts){
    return new Promise(resolve=>{
      const w=getWorker();if(!w)return resolve(null);
      let done=false;const id=++seq,finish=r=>{if(done)return;done=true;clearTimeout(timer);resolve(r&&r!=='__fallback__'?r:null);},timer=setTimeout(()=>{delete pending[id];finish(null);},4000);
      pending[id]=finish;
      try{w.postMessage({op:'position',id,state,opts});}catch(e){delete pending[id];finish(null);}
    });
  }

  // kleines statisches Brett für die Analyse
  function miniBoard(s, flipped, marks) {
    let h = '<div class="mini-board">';
    for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
      const sq = flipped ? (7 - y) * 8 + (7 - x) : y * 8 + x, p = s.b[sq];
      const cls = (((sq >> 3) + (sq & 7)) % 2 ? 'd' : 'l') + (marks[sq] ? ' ' + marks[sq] : '');
      h += `<i class="${cls}">${p ? `<span class="${colorOf(p)}">${Pieces.icon(p.toUpperCase(), colorOf(p))}</span>` : ''}</i>`;
    }
    return h + '</div>';
  }

  Games.chess = {
    id: 'chess', name: T('Schach'), desc: T('13 Spielstärken, Schachuhr und Analyse mit Erklärungen'),
    LEVELS,

    mount(el, ctx, opts = {}) {
      // Die Website nutzt denselben Trainer, aber ausschließlich lokale Computerpartien.
      // Der normale App-Einstieg und seine Einstellungen bleiben unverändert.
      const webdemo = ctx.webdemo === true;
      if (webdemo) opts = { resume: opts.resume === true };
      const DEF = { mode: 'solo', level: 3, color: 'w', clock: 'none', theme: 'turnier', showMoves: true, showEval: true, showJudge: false, allowUndo: true, premove:true,matchRating:'rated',pvpView: 'turn', adapt: true, v: 2 };
      const storedSettings = Store.get('chess.settings2', null);
      let settings = Object.assign({}, DEF, storedSettings || {});
      // Spielweise gegen den Computer: neu = Trainer; bestehende Einstellungen behalten ihre Hilfen (alle aus = Ernst)
      if (!STYLES.includes(settings.style)) settings.style = !storedSettings ? 'trainer' : AID_KEYS.every(k => !settings[k]) ? 'ernst' : 'frei';
      settings.onlineClock ??= settings.clock !== 'none' ? settings.clock : '5';
      settings.offlineClock ??= settings.mode === 'online' ? 'none' : settings.clock;
      if(settings.mode==='online')settings.clock=settings.onlineClock;
      if (!['turn', 'table'].includes(settings.pvpView)) { settings.pvpView = 'turn'; Store.set('chess.settings2', settings); }
      if (settings.v !== 2) { settings.showJudge = false; settings.v = 2; } // Kommentare während der Partie standardmäßig aus
      if (!LEVELS[settings.level]) settings.level = 3;
      if (!THEMES.some(t => t.id === settings.theme)) settings.theme = 'turnier';
      if (!ctx.isPremium() && LEVELS[settings.level].premium) settings.level = 5;
      if (!webdemo && !themeOk(THEMES.find(t => t.id === settings.theme), ctx.isPremium())) settings.theme = 'turnier';
      function demoSettings() {
        if (!webdemo) return;
        Object.assign(settings, { mode: 'solo', style: 'trainer', clock: 'none', offlineClock: 'none', onlineClock: 'none', theme: 'turnier',
          level: Number.isInteger(settings.level) ? Math.max(0, Math.min(5, settings.level)) : 3,
          color: ['w', 'b', 'r'].includes(settings.color) ? settings.color : 'w',
          showMoves: true, showEval: true, showJudge: false, allowUndo: true, premove: false });
        Store.set('chess.settings2', settings);
      }
      function demoSaved(sv) {
        if (!sv || sv.mode !== 'solo' || sv.setup || sv.initialFen || sv.cont || !Array.isArray(sv.moves) || sv.moves.length > 600) {
          if (sv != null) Store.del('chess.saved');
          return null;
        }
        const saved = { ...sv, mode: 'solo', style: 'trainer', theme: 'turnier',
          level: Number.isInteger(sv.level) ? Math.max(0, Math.min(5, sv.level)) : 3,
          clockKey: 'none', clock: null, timing: null, pvpView: 'turn', color: sv.color === 'b' ? 'b' : 'w' };
        Store.set('chess.saved', saved);
        return saved;
      }
      demoSettings();
      if (webdemo) demoSaved(Store.get('chess.saved', null));
      let setupSettings = null;
      let fantasySetup = false;
      const saveSettings = () => { if (!setupSettings) Store.set('chess.settings2', settings); };
      let S, hist, sans, keys, plies, legalAll = [], lastMove = null, selected = -1, targets = [];
      let playerColor = 'w', flipped = false, busy = false, over = true, token = 0, gen = 0, drag = null, touchTap = null;
      let evalNow = 0, lastCapture = null, clock = null, clockT = null;
      let online = null, net = null; // online: { room, names, started, retries }
      let premoves=[], premoveT=null, premoveBlocked=false, rematchT=null, rematchBusy=false, rematchData=null;
      const PREMOVE_LIMIT=3;
      let resultDialogCard=null;
      let archiveId='',gameDate=Date.now(), resultShown=false,onlineTiming=null,gameInitialFen=null;
      let phraseNoticeT=null,phraseSending=false;const usedPhrases=new Set();
      let viewing = null;   // geteilte Partie, die gerade angesehen wird (Daten aus GameLink.decode)
      let contGame = false; // Partie ab einer Stellung weitergespielt: ohne Punkte
      let lastEnd = null;   // Ergebnis der zuletzt beendeten Partie (für „Partie teilen“)
      const pieceEls = new Array(64).fill(null);
      const squareEls = new Array(64);
      const solo = () => settings.mode === 'solo' && !online && !viewing;
      // zu zweit an einem Gerät: Brett dreht sich zur Person am Zug („turn“), liegt zwischen beiden („table“) oder bleibt („fixed“)
      const pvpLocal = () => settings.mode === 'pvp' && !online && !viewing;
      const turnView = () => pvpLocal() && settings.pvpView === 'turn';
      const lvl = () => LEVELS[settings.level];

      el.innerHTML = `<div class="chess theme-${settings.theme}${piecesCls()}">
        <div class="lobby"></div>
        <div class="match hidden">
          <div class="online-context hidden"><p class="online-meta"></p></div>
          <div class="rv-opening hidden"></div>
          <div class="chess-bar" data-side="top"><div class="pl"><span class="av"></span><span class="who"><span class="nm"></span><span class="sub"></span></span></div><div class="caps"></div><div class="clock hidden"></div><p class="chess-phrase hidden" role="status" aria-live="polite"></p></div>
          <p class="on-unrated muted small hidden">${T('Ungewertete Partie: keine Änderung der Schach-Wertung und keine Punkte für die Rangliste.')}</p>
          <aside class="net-notice hidden" aria-label="${T('Online-Status')}"><strong class="net-title" role="status"></strong><div class="net-deadline"><span class="net-label"></span><b class="net-seconds" aria-live="off"></b></div><p class="net-detail"></p><small class="net-extra"></small></aside>
          <div class="board-frame"><div class="evalbar"><i></i></div><div class="board"><div class="squares"></div><div class="pieces"></div><div class="fx"></div></div></div>
          <div class="chess-bar" data-side="bot"><div class="pl"><span class="av"></span><span class="who"><span class="nm"></span><span class="sub"></span></span></div><div class="caps"></div><div class="clock hidden"></div></div>
          <div class="premove-note hidden">${webdemo ? '' : `<button class="btn" data-a="cancel-premove"></button>`}<ol class="premove-list" aria-live="polite"></ol><small class="muted">${T('Vorgemerkt, noch nicht gespielt. Bereits gesendete Züge lassen sich nicht zurückholen.')}</small></div>
          <div class="chess-status"></div>
          <div class="phrase-controls hidden">${webdemo ? '' : `<button class="btn" data-phrase="open">${T('Nachricht senden')}</button><button class="btn" data-phrase="mute" aria-pressed="false"></button>`}</div>
          <section class="chess-rematch hidden"><p role="status"></p><div class="rematch-actions"></div></section>
          <div class="chess-end-tools hidden">${webdemo ? '' : `<button class="chess-report" data-fair-report>${Icon('flag')}${T('Melden')}</button>`}</div>
          <div class="ctrl-row">
            <button class="ctrl" data-a="more" aria-haspopup="dialog">${Icon('more')}${T('Mehr')}</button>
            <button class="ctrl" data-a="new">${Icon('sliders')}${T('Neue Partie')}</button>
            <button class="ctrl" data-a="undo">${Icon('undo')}${T('Zug zurück')}</button>
            <button class="ctrl" data-a="hint">${Icon('hint')}${T('Tipp')}</button>
            <button class="ctrl" data-a="flip">${Icon('flip')}${T('Drehen')}</button>
            <button class="ctrl" data-a="resign">${Icon('flag')}${T('Aufgeben')}</button>
          </div>
          <section class="trainer-card hidden" aria-live="polite"></section>
          <section class="trainer-line hidden" aria-live="polite"></section>
          <section class="trainer-line trainer-opp hidden" aria-live="polite"></section>
          <div class="mv-wheel"><div class="movelist"></div><span class="mv-mark" aria-hidden="true"></span></div>
          <div class="review hidden">
            <div class="rv-nav">
              <button class="ctrl" data-r="first" aria-label="${T('Zum Anfang')}">${Icon('first')}</button>
              <button class="ctrl" data-r="prev" aria-label="${T('Zug zurück')}">${Icon('back')}</button>
              <button class="ctrl rv-play" data-r="next" aria-label="${T('Zug vor')}">${Icon('chevron')}</button>
              <button class="ctrl" data-r="last" aria-label="${T('Zum Ende')}">${Icon('last')}</button>
              <button class="ctrl rv-key" data-r="key">${Icon('flag')}${T('Nächster Moment')}</button>
            </div>
            <div class="rv-card"><div class="rv-head"><span class="rv-q"></span><b class="rv-move"></b><button class="rv-eval" data-r="evalhelp"></button></div><div class="rv-finish hidden" role="status" aria-live="polite"></div><div class="rv-text"></div><button type="button" class="btn rv-explain hidden" data-r="explain">${Icon('hint')}${T('Zug erklären')}</button></div>
            ${ChessCoach.notation()}
            <div class="rv-sum"></div>
            <div class="rv-graph"></div>
            <div class="rv-times hidden"></div>
            <div class="rv-keys"></div>
            <div class="rv-actions">
              <button class="btn primary hidden" data-r="analyse">${T('Partie analysieren')}</button>
            ${webdemo ? '' : `<button class="btn" data-r="cont">${T('Ab hier weiterspielen')}</button>
              <button class="btn" data-r="setup">${T('Stellung bearbeiten')}</button>
              <button class="btn" data-r="share">${T('Teilen')}</button>
               <button class="btn" data-r="pgn">${T('Exportieren')}</button>`}
              <button class="btn" data-r="again">${T('Revanche')}</button>
              ${opts.publicHistory?`<button class="btn" data-r="history">${T('Zur Partienliste')}</button>`:''}<button class="btn primary" data-r="lobby">${T('Neue Partie')}</button>
            </div>
          </div>
        </div>
      </div>`;
      const root = el.querySelector('.chess');
      const lobby = root.querySelector('.lobby'), match = root.querySelector('.match');
      const frame = root.querySelector('.board-frame');
      const board = root.querySelector('.board');
      const squaresEl = root.querySelector('.squares');
      const piecesEl = root.querySelector('.pieces');
      const fx = root.querySelector('.fx');
      const evalBar = root.querySelector('.evalbar');
      evalBar.addEventListener('click', () => explainEval());
      const statusEl = root.querySelector('.chess-status');
      const moveListEl = root.querySelector('.movelist');
      const bars = { top: root.querySelector('[data-side=top]'), bot: root.querySelector('[data-side=bot]') };
      const boardNotes=BoardNotes.attach(board,{after:bars.bot,toolbar:root.querySelector('.match > .ctrl-row'),flipped:()=>flipped,beforeDraw:()=>{
        cancelBoardInput(true);
      }});

      // ================= Startbildschirm =================
      // Spielweise: eine Wahl statt einzelner Schalter. Trainer und Ernst setzen die Hilfen, Frei stellt die eigenen wieder her.
      const clockLocked = () => settings.mode === 'solo' && settings.style === 'trainer';
      // Trainer: Zurücknehmen immer erlaubt (nach einem Fehler bietet er „Zug zurück“ an), auch wenn es vorher ausgeschaltet war
      const undoOk = () => !!settings.allowUndo || (settings.mode === 'solo' && settings.style === 'trainer') || selfPlay();
      // eigene Stellung, beide Seiten selbst gespielt
      const selfPlay = () => settings.mode === 'pvp' && settings.pvpView === 'self';
      function setStyle(v) {
        if (!STYLES.includes(v) || v === settings.style) return;
        if (settings.style === 'frei') settings.freeAids = Object.fromEntries(AID_KEYS.map(k => [k, !!settings[k]]));
        settings.style = v;
        if (v === 'ernst') AID_KEYS.forEach(k => { settings[k] = false; });
        else if (v === 'trainer') { settings.showMoves = true; settings.allowUndo = true; }
        else if (settings.freeAids) Object.assign(settings, settings.freeAids);
        saveSettings();
        lobby.querySelectorAll('.tgl input').forEach(c => { c.checked = !!settings[c.dataset.k]; });
      }
      function styleHint() {
        if (settings.style === 'ernst') return T('Wie eine echte Partie: keine möglichen Züge, keine Bewertungsleiste, keine Kommentare und kein Zurücknehmen.');
        if (settings.style === 'frei') return T('Keine Kommentare und keine Denkfragen. Die Hilfen stellst du unter „Hilfen und Brett“ einzeln ein.');
        return T('Der Trainer kann dich vor groben Fehlern warnen und zeigt dir, was der Gegner plant. Nach der Partie bespricht er sie mit dir.');
      }
      function renderLobby() {
        if (webdemo) { renderDemoLobby(); return; }
        const prem = ctx.isPremium();
        const toggle = (k, label, sub) => `<label class="tgl"><span><b>${label}</b><small>${sub}</small></span>
          <input type="checkbox" id="tg-${k}" data-k="${k}" ${settings[k] ? 'checked' : ''}><i></i></label>`;
        // Bedenkzeit nach Wertungsgruppe; online steht sie vor den Knöpfen, damit man sie vor der Suche sieht
        const lbl = Object.fromEntries(CLOCKS);
        const clockSec = `<section class="lb-sec online-only"><div class="lb-h clock-heading"><span>${T('Bedenkzeit')}</span><small class="lb-unit">${T('Minuten pro Spieler')}</small><button type="button" class="clock-help" aria-label="${T('Bedenkzeiten erklären')}">${Icon('help')}</button></div>
            <div class="clock-seg">${CLOCK_GROUPS().map(([cat, keys]) => `<div class="cg${cat ? '' : ' cg-misc'}">${cat ? `<small class="cg-h">${CAT_NAME()[cat]}</small>` : ''}${UI.seg('clock', keys.map(k => [k, lbl[k]]), settings.clock)}</div>`).join('')}</div>
</section>`;
        lobby.innerHTML = `
          <section class="lb-sec solo-only">
            <div class="lb-h"><span>${T('Spielstärke')}</span></div>
            <div class="lv-card"><div class="lv-txt"><b class="lv-num"></b><small class="lv-desc"></small><small class="lv-elo"></small></div><span class="chess-level-meter" aria-hidden="true"></span></div>
            <input type="range" id="lv-range" class="lv-range" min="1" max="${LEVELS.length}" step="1" value="${settings.level + 1}" aria-label="${T('Spielstärke')}">
            <div class="lv-scale"><span>${LEVELS[0].name}</span><span>${LEVELS[LEVELS.length - 1].name}</span></div>
          </section>
          <section class="lb-sec lb-mode"><div class="lb-h"><span>${T('Modus')}</span></div>${(() => {
            // Online-Schach lässt sich im Admin-Programm abschalten
            const onl = !window.Cloud || Cloud.Remote.feature('online_chess');
            if (!onl && settings.mode === 'online') settings.mode = 'solo';
            return UI.seg('mode', [['solo', T('Computer')], ...(onl ? [['online', 'Online']] : []), ['pvp', T('Zu zweit')]], settings.mode);
          })()}</section>
          <section class="lb-sec pvp-only"><div class="lb-h"><span>${T('Brett bei zwei Spielern')}</span></div>${UI.seg('pvpView', [['turn', T('Mitdrehen')], ['table', T('Gegenüber')]], settings.pvpView)}
            <div class="lb-view-hints"><p class="lb-hint pvp-view-hint"></p></div></section>
          ${(() => { const lv = Store.get('chess.live', null); if (!lv || Date.now() - lv.at > 6 * 3600000) return '';
            return `<button class="lb-learn lb-rejoin online-only">${Icon('users')}<span><b>${T('Online-Partie fortsetzen')}</b><small>${T('Deine Partie läuft noch. Komm schnell zurück.')}</small></span>${Icon('chevron')}</button>`; })()}
          ${(() => { const sv = Store.get('chess.saved', null); if (!sv || !sv.moves || !sv.moves.length) return '';
            const who = sv.mode === 'solo' ? T('Gegen Stufe {n}', { n: sv.level + 1 }) : T('Zu zweit');
            return `<button class="lb-learn lb-resume" data-resume-mode="${sv.mode === 'solo' ? 'solo' : 'pvp'}">${Icon('play')}<span><b>${T('Partie fortsetzen')}</b><small>${who} · ${T('{n} Züge', { n: Math.ceil(sv.moves.length / 2) })}</small></span>${Icon('chevron')}</button>`; })()}
          ${clockSec}
          <section class="lb-sec online-only"><div class="lb-h"><span>${T('Online spielen')}</span></div>

            ${UI.seg('matchRating', [['rated', T('Gewertet')], ['casual', T('Ungewertet')]], settings.matchRating)}
            <div class="on-actions on-matchmaking">
              <button class="on-btn on-search" data-on="quick">${Icon('play')}<span><b>${T('Gegner suchen')}</b><small class="on-quick-sub"></small><small class="on-est"></small></span></button>
              </div>
            <button class="on-rating"><span class="on-rt-list"><small class="muted">${T('Deine Schach-Wertung wird geladen …')}</small></span><span class="on-rt-go">${T('Rangliste')}${Icon('chevron')}</span></button>
            <div class="lb-h"><span>${T('Mit Freunden spielen')}</span></div>
            <button type="button" class="on-btn on-friends" data-on="friends">${Icon('users')}<span><b>${T('Freunde')}</b><small>${T('Anfragen und Schacheinladungen')}</small></span><small class="friends-badge" hidden></small></button>
            <div class="on-actions">
              <button class="on-btn" data-on="invite">${Icon('users')}<span><b>${T('Freund einladen')}</b><small>${T('Ungewertet · Raum erstellen und Code teilen')}</small></span></button>
              <button class="on-btn" data-on="join">${Icon('chevron')}<span><b>${T('Mit Code beitreten')}</b><small>${T('Code eines Freundes eingeben')}</small></span></button>
            </div>
            <p class="lb-hint on-return-rule"></p>
            <details class="on-info"><summary>${T('Hinweise zu Online-Partien')}</summary>
            <div class="tgl-list">${toggle('premove',T('Vorauszüge erlauben'),T('Plane bis zu drei Züge während des Gegenzugs. Mit „Alle Vorauszüge löschen“ entfernst du die ganze Kette.'))}</div>
            <p class="lb-hint">${T('„3 + 2“ heißt: 3 Minuten, und nach jedem Zug kommen 2 Sekunden dazu. Gewertete Partien zählen für die Rangliste ihrer Gruppe (Bullet, Blitz oder Schnellschach). Ohne Uhr hat online jeder Zug höchstens 1 Minute. Bei „Egal“ spielst du mit der Bedenkzeit deines Gegners.')}</p>
            <p class="muted small">${T('Verlässt du während einer Partie die App, hast du je nach Bedenkzeit 30 Sekunden bis 2 Minuten Zeit zurückzukommen. Danach gilt die Partie als verloren.')}</p>
            <p class="muted small">${T('Gegner suchen: Für den ersten Zug hast du 30 Sekunden. Wer mehrmals kurz hintereinander ablehnt, nicht zieht oder gleich aufgibt, kann ein paar Minuten nicht suchen.')}</p>
            <p class="muted small">${T('Online spielst du mit deinem Konto (E-Mail mit Code). Gespeichert werden dein Spielername und die Züge der Partie.')}</p></details>
          </section>
          <section class="lb-sec solo-only"><div class="lb-h"><span>${T('Deine Farbe')}</span></div>${UI.seg('color', [['w', T('Weiß')], ['b', T('Schwarz')], ['r', T('Zufall')]], settings.color)}</section>
          <section class="lb-sec solo-only lb-style"><div class="lb-h"><span>${T('Spielweise')}</span></div>${UI.seg('style', [['trainer', T('Trainer')], ['frei', T('Frei')], ['ernst', T('Ernst')]], settings.style)}<p class="lb-hint style-hint"></p></section>
          <section class="lb-sec offline-only lb-clock"><div class="on-actions"><button type="button" class="on-btn lb-clock-row">${Icon('clock')}<span><b>${T('Bedenkzeit')}</b></span><span class="lb-row-val"></span>${Icon('chevron')}</button></div></section>
          <section class="lb-sec solo-only"><div class="on-actions">
            <button type="button" class="on-btn lb-setup" data-open-setup>${Icon('pencil')}<span><b>${T('Eigene Stellung')}</b><small>${T('Stellung aufbauen oder FEN einfügen')}</small></span></button>
            ${Store.get('chess.setupGame', null) ? `<button type="button" class="on-btn lb-setup-resume" data-resume-setup>${Icon('play')}<span><b>${T('Eigene Stellung fortsetzen')}</b></span></button>` : ''}
          </div></section>
          <details class="lb-extra offline-only"><summary>${T('Hilfen und Brett')}</summary>
          <section class="lb-sec solo-only"><div class="lb-h"><span>${T('Computer')}</span></div><div class="tgl-list adapt-list">${toggle('adapt', T('Computer stellt sich auf mich ein'), T('Wählt öfter Eröffnungen, die dir schwerfallen, und seltener solche, die du sicher beherrschst. Die Spielstärke bleibt gleich.'))}${ChessAdapt.games() ? `<div class="adapt-info"><small>${T('Gemerkte Partien: {n}', { n: ChessAdapt.games() })}</small><button type="button" class="adapt-forget">${T('Vergessen')}</button></div>` : ''}</div></section>
          <section class="lb-sec"><div class="lb-h"><span>${T('Hilfen')}</span></div><div class="tgl-list">${AIDS.map(a => toggle(...a)).join('')}</div></section>
          <section class="lb-sec"><div class="lb-h"><span>${T('Brett')}</span></div><div class="theme-grid four">${THEMES.map(t => `<button class="theme-tile theme-${t.id} ${t.id === settings.theme ? 'on' : ''}" data-t="${t.id}">
            <span class="mini"><i></i><i></i><i></i><i></i></span><b>${t.name}${themeOk(t, prem) ? '' : ' ' + Icon('lock', 'lock')}</b></button>`).join('')}</div></section>
          </details>
          <section class="lb-sec lb-more"><div class="lb-h"><span>${T('Training und Partien')}</span></div><div class="on-actions"><button type="button" class="on-btn lb-archive">${Icon('chart')}<span><b>${T('Meine Partien')}</b><small>${T('Archiv und Analysen')}</small></span></button><button type="button" class="on-btn lb-mistakes">${Icon('hint')}<span><b>${T('Aus Fehlern lernen')}</b>${ChessMistakes.due().length ? '<small class="training-due">' + T('{n} Stellungen zum Üben', { n: ChessMistakes.due().length }) + '</small>' : ''}</span></button><button type="button" class="on-btn lb-openings">${Icon('play')}<span><b>${T('Eröffnungen lernen')}</b><small>${T('Italienisch, Sizilianisch, Damengambit und mehr')}</small></span></button><button type="button" class="on-btn lb-rules">${Icon('help')}<span><b>${T('Schachregeln')}</b><small>${T('Lerne alle Regeln in kurzen Lektionen')}</small></span></button></div></section>
          <div class="lb-footer offline-only"><button class="btn primary lb-start">${T('Partie starten')}</button></div>`;
        lobby.prepend(lobby.querySelector('.lb-mode'));
        // „Partie fortsetzen“ steht direkt unter dem Modus
        { const m = lobby.querySelector('.lb-mode'); [lobby.querySelector('.lb-resume'), lobby.querySelector('.lb-rejoin')].filter(Boolean).reverse().forEach(b => m.after(b)); }
        lobby.querySelector('.lb-archive').onclick=async()=>{Sound.play('tap');const state={source:'lobby'};const g=await ChessExtras.show({state});if(g&&lobby.isConnected)ctx.openGame('chess',{view:g,archiveReturn:{...state}});};
        lobby.querySelector('.lb-mistakes').onclick=()=>{Sound.play('tap');ctx.openGame('puzzles',{mistakes:true,overview:true});};
        lobby.querySelector('.lb-openings').onclick=()=>{Sound.play('tap');ctx.openGame('openings');};
        lobby.querySelector('.lb-rules').onclick=()=>{Sound.play('tap');App.openGame('learn');};
        // Bedenkzeit gegen den Computer und zu zweit: eine Zeile, die Auswahl öffnet sich als Fenster
        lobby.querySelector('.lb-clock-row').onclick = async () => {
          Sound.play('tap');
          // Trainer: immer ohne Uhr (man soll in Ruhe nachdenken und die Hinweise lesen können)
          if (clockLocked()) {
            const v = await ctx.modal({ title: T('Trainer spielt ohne Uhr'), html: `<p>${T('Mit dem Trainer spielst du ohne Bedenkzeit, damit du in Ruhe nachdenken und seine Hinweise lesen kannst. Für eine Partie mit Uhr wähle die Spielweise Frei oder Ernst.')}</p>`,
              buttons: [{ label: T('Frei wählen'), value: 'frei' }, { label: T('Verstanden'), value: null, primary: true }] });
            if (v === 'frei' && lobby.isConnected) { setStyle('frei'); lobby.querySelectorAll('[data-k=style] button').forEach(b => { b.classList.toggle('on', b.dataset.v === 'frei'); b.setAttribute('aria-pressed', String(b.dataset.v === 'frei')); }); syncMode(); }
            return;
          }
          const groups = CLOCK_GROUPS().map(([cat, keys]) => [cat, keys.filter(k => k !== 'any')]);
          void ctx.modal({ title: T('Bedenkzeit'), cls: 'clock-pick',
            html: `<div class="lb-h clock-heading"><small class="lb-unit">${T('Minuten pro Spieler')}</small><button type="button" class="clock-help" aria-label="${T('Bedenkzeiten erklären')}">${Icon('help')}</button></div><div class="clock-seg">${groups.map(([cat, keys]) => `<div class="cg${cat ? '' : ' cg-misc'}">${cat ? `<small class="cg-h">${CAT_NAME()[cat]}</small>` : ''}${UI.seg('clock', keys.map(k => [k, lbl[k]]), settings.clock)}</div>`).join('')}</div>`,
            buttons: [{ label: T('Fertig'), value: null, primary: true }],
            onOpen(card) {
              UI.bindSeg(card, (k, v) => { settings.clock = v; settings.offlineClock = v; saveSettings(); syncMode(); setTimeout(() => UI.closeModal(null), 180); return true; });
              card.querySelector('.clock-help').onclick = () => UI.closeModal('help');
            } }).then(r => { if (r === 'help' && lobby.isConnected) lobby.querySelector('.lb-sec .clock-help').onclick(); });
        };
        lobby.querySelector('.clock-help').onclick=()=>ctx.modal({title:T('Bedenkzeiten'),cls:'clock-explanation',html:`<section class="clock-kind"><h4>${T('Bullet')}</h4><p>${T('Unter 3 Minuten.')}</p><p class="clock-kind-note">${T('Sehr schnelle Partien mit wenig Zeit zum Überlegen. Gut, wenn du die Regeln und die Bedienung schon sicher beherrschst.')}</p></section><section class="clock-kind"><h4>${T('Blitz')}</h4><p>${T('Ab 3 und unter 10 Minuten.')}</p><p class="clock-kind-note">${T('Kurze Partien mit etwas Zeit zum Nachdenken. Ein Mittelweg zwischen hohem Tempo und längeren Überlegungen.')}</p></section><section class="clock-kind"><h4>${T('Schnellschach')}</h4><p>${T('Ab 10 Minuten.')}</p><p class="clock-kind-note">${T('Mehr Zeit, um Pläne zu finden und Züge zu prüfen. Eine gute Wahl zum Lernen und für ruhigere Partien.')}</p></section><p class="muted small">${T('Für die Einteilung zählt die Grundzeit plus 40-mal der Zuschlag pro Zug.')}</p>`+'<p>'+T('„3 + 2“ bedeutet drei Minuten pro Spieler und zwei Sekunden zusätzlich nach jedem Zug. Die Uhren starten für beide mit drei Minuten.')+'</p><section class="clock-kind"><h4>'+T('Ohne Uhr')+'</h4><p>'+T('Ohne Uhr gibt es online trotzdem eine Zugfrist. Die Rückkehrfrist beim Verlassen der App gilt zusätzlich; die zuerst ablaufende Frist entscheidet.')+'</p></section>'+ (settings.mode==='online'?`<section class="clock-kind"><h4>${T('Egal')}</h4><p>${T('Du wählst keine feste Bedenkzeit, sondern übernimmst die deines Gegners. Prüfe die angezeigte Zeit, bevor du die Partie annimmst.')}</p></section>`:'') ,buttons:[{label:T('Verstanden'),value:null,primary:true}]});

        { const x = lobby.querySelector('.lb-learn-x'); if (x) x.onclick = () => { Sound.play('tap'); Store.set('chess.learnHidden', true); x.closest('.lb-learn-wrap').remove(); }; }
        { const rs = lobby.querySelector('.lb-resume'); if (rs) rs.onclick = () => { Sound.play('tap'); const sv = Store.get('chess.saved', null); if (sv) resumeGame(sv); }; }
        { const rj = lobby.querySelector('.lb-rejoin'); if (rj) rj.onclick = async () => {
          Sound.play('tap');
          const lv = Store.get('chess.live', null); if (!lv) return;
          let st = null; try { st = await UI.load(Cloud.rpc('chess_state', { p_code: lv.room })); } catch (e) { /* unten */ }
          if (!st || st.result) { forgetLive(); UI.toast(st ? T('Diese Partie ist schon beendet.') : T('Keine Verbindung zum Server. Bitte später noch einmal versuchen.'), 2600); renderLobby(); return; }
          settings.mode = 'online'; saveSettings(); startOnline(lv.room, { clock: lv.clock, color: lv.color, quick: false });
        }; }
        const range = lobby.querySelector('.lv-range');
        const syncLevel = () => {
          const i = +range.value - 1, L = LEVELS[i];
          const locked = L.premium && !ctx.isPremium();
          lobby.querySelector('.lv-num').innerHTML = `${L.name}${locked ? ' ' + Icon('lock', 'lock') : ''}`;
          range.setAttribute('aria-valuetext', L.name + (locked ? ' · Premium' : ''));
          lobby.querySelector('.lv-desc').textContent = L.desc;
          lobby.querySelector('.lv-elo').textContent = eloText(L);
          lobby.querySelector('.chess-level-meter').innerHTML = stageBar(i + 1);
          range.style.setProperty('--p', (i / (LEVELS.length - 1) * 100) + '%');
          lobby.querySelector('.lv-card').classList.toggle('locked', !!locked);
        };
        range.oninput = () => { settings.level = +range.value - 1; syncLevel(); saveSettings(); Sound.play('tap'); };
        syncLevel();
        const syncMode = () => {
          const m = settings.mode;
          // Trainer gegen den Computer: Bedenkzeit fest „Ohne Uhr“; die eigene Wahl bleibt in offlineClock für Frei, Ernst und zu zweit
          { const want = clockLocked() ? 'none' : m === 'online' ? settings.clock : (settings.offlineClock || settings.clock);
            if (want !== settings.clock) { settings.clock = want; saveSettings(); }
            const row = lobby.querySelector('.lb-clock-row'); row.classList.toggle('locked', clockLocked()); }
          { const c = lobby.querySelector('#tg-allowUndo'), row = c?.closest('.tgl'); if (row) {
            const tr = clockLocked(); c.disabled = tr; c.checked = tr || !!settings.allowUndo; row.classList.toggle('fixed', tr);
            row.querySelector('small').textContent = tr ? T('Im Trainer immer an, damit du nach einem Fehler zurücknehmen kannst.') : T('Aus = ernsthafte Partie'); } }
          lobby.querySelectorAll('.solo-only').forEach(x => x.style.display = m === 'solo' ? '' : 'none');
          lobby.querySelectorAll('.online-only').forEach(x => x.style.display = m === 'online' ? '' : 'none');
          lobby.querySelectorAll('.offline-only').forEach(x => x.style.display = m === 'online' ? 'none' : '');
          { const rs = lobby.querySelector('.lb-resume'); if (rs) rs.style.display = rs.dataset.resumeMode === m ? '' : 'none'; }
          // „Egal“ gibt es nur online (gegen den Computer oder zu zweit fehlt ein Gegner, dessen Zeit man übernehmen könnte)
          { const any = lobby.querySelector('.clock-seg [data-v="any"]'); if (any) any.style.display = m === 'online' ? '' : 'none';
            if (m !== 'online' && settings.clock === 'any') { settings.clock = '5'; settings.offlineClock = '5'; saveSettings(); lobby.querySelectorAll('.clock-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === '5')); } }
          lobby.querySelectorAll('.pvp-only').forEach(x => x.style.display = m === 'pvp' ? '' : 'none');
          { const v = lobby.querySelector('.lb-row-val'); if (v) v.textContent = clockLabel(settings.clock).replace(/ \(.*\)$/, ''); }
          { const h = lobby.querySelector('.pvp-view-hint'); if (h) h.textContent = settings.pvpView === 'table' ? T('Handy liegt zwischen euch, die schwarzen Figuren stehen für die andere Seite richtig herum.') : T('Die Figuren drehen sich nach jedem Zug zu dem, der dran ist.'); }
          { const h = lobby.querySelector('.style-hint'); if (h) h.textContent = styleHint(); }          lobby.querySelector('.lb-start').style.display = m === 'online' ? 'none' : '';
          // eine Auswahl über alle Zeit-Gruppen; Untertitel von „Gegner suchen“ mit Gruppe und Zeit
          lobby.querySelectorAll('.clock-seg button').forEach(b => b.classList.toggle('on', b.dataset.v === settings.clock));
          const sub = lobby.querySelector('.on-quick-sub');
          if (sub) {
            const mode = T(settings.matchRating === 'casual' ? 'Ungewertet' : 'Gewertet');
            const time = settings.clock === 'any' ? T('Beliebige Bedenkzeit') : clockLabel(settings.clock).replace(/ \(.*\)$/, '');
            sub.textContent = [mode, time].join(' · ');
          }
          { const rule=lobby.querySelector('.on-return-rule'); if(rule) rule.textContent=T('Beim Verlassen der App: {s} s Rückkehrfrist. Die Schachuhr läuft weiter; die zuerst ablaufende Frist entscheidet.',{s:ChessDeadlines.awayMs(settings.clock)/1000}); }
          refreshEst();
          refreshFriendsBadge();
          if (m === 'online') refreshRatings();
        };
        syncMode();
        UI.bindSeg(lobby, (k, v) => {
          if (k === 'style') { setStyle(v); syncMode(); return true; }
          if(k==='mode'){if(!clockLocked())settings[settings.mode==='online'?'onlineClock':'offlineClock']=settings.clock;settings.clock=v==='online'?settings.onlineClock:settings.offlineClock;}
          settings[k] = v;
          if(k==='clock')settings[settings.mode==='online'?'onlineClock':'offlineClock']=v;
          saveSettings(); syncMode(); return true;
        });
        lobby.querySelectorAll('.tgl input').forEach(c => c.onchange = () => {
          if (c.disabled) return;
          settings[c.dataset.k] = c.checked;
          // eine Hilfe einschalten heißt: nicht mehr ernst
          if (c.checked && settings.style === 'ernst' && AID_KEYS.includes(c.dataset.k)) { settings.style = 'frei'; lobby.querySelectorAll('[data-k=style] button').forEach(b => { b.classList.toggle('on', b.dataset.v === 'frei'); b.setAttribute('aria-pressed', String(b.dataset.v === 'frei')); }); syncMode(); }
          saveSettings(); Sound.play('tap');
        });
        { const f = lobby.querySelector('.adapt-forget'); if (f) f.onclick = async () => {
          Sound.play('tap');
          const v = await ctx.modal({ title: T('Gemerktes vergessen?'), html: `<p>${T('Der Computer wählt seine Eröffnungen dann wieder ohne Rücksicht auf deine bisherigen Partien.')}</p>`,
            buttons: [{ label: T('Vergessen'), value: 'forget', primary: true }, { label: T('Abbrechen'), value: null }] });
          if (v === 'forget') { ChessAdapt.forget(); f.closest('.adapt-info')?.remove(); }
        }; }
        lobby.querySelectorAll('.theme-tile').forEach(b => b.onclick = async () => {
          const t = THEMES.find(x => x.id === b.dataset.t);
          if (t.premium && !ctx.isPremium() && !(await ctx.paywall(T('Bretter Graphit und Marmor')))) return;
          if (t.shop && !Shop.owns(t.shop)) { UI.toast(T('Gibt es im Shop für Punkte.'), 2200); if (window.App) App.shop(); return; }
          settings.theme = t.id; saveSettings();
          root.className = 'chess theme-' + t.id + piecesCls();
          lobby.querySelectorAll('.theme-tile').forEach(x => x.classList.toggle('on', x === b));
          Sound.play('tap');
        });
        lobby.querySelectorAll('.on-btn[data-on]').forEach(b => b.onclick = () => { Sound.play('tap'); onlineAction(b.dataset.on); });
        lobby.querySelector('[data-open-setup]').onclick = () => openSetup();
        const resumeSetup = lobby.querySelector('[data-resume-setup]');
        if (resumeSetup) resumeSetup.onclick = () => {
          const saved = Store.get('chess.setupGame', null);
          if (saved && !Store.get('chess.live', null)) resumeGame(saved);
          else if (saved) UI.toast(T('Es läuft bereits eine Online-Partie. Kehre zuerst dorthin zurück.'));
        };
        lobby.querySelector('.lb-start').onclick = async () => {
          if (solo() && lvl().premium && !ctx.isPremium()) {
            if (!(await ctx.paywall(T('Spielstärke {n}: {l}', { n: settings.level + 1, l: lvl().name })))) return;
            renderLobby();
          }
          await ctx.beforeNewGame();
          newGame();
        };
      }
      function renderDemoLobby() {
        demoSettings();
        const saved = Store.get('chess.saved', null);
        lobby.innerHTML = `<section class="lb-sec"><div class="lb-h"><span>${T('Spielstärke')}</span></div>
          <div class="lv-card"><div class="lv-txt"><b class="lv-num"></b><small class="lv-desc"></small><small class="lv-elo"></small></div><span class="chess-level-meter" aria-hidden="true"></span></div>
          <input type="range" class="lv-range" min="1" max="6" step="1" value="${settings.level + 1}" aria-label="${T('Spielstärke')}">
          <div class="lv-scale"><span>${LEVELS[0].name}</span><span>${LEVELS[5].name}</span></div></section>
          <section class="lb-sec"><div class="lb-h"><span>${T('Deine Farbe')}</span></div>${UI.seg('color', [['w', T('Weiß')], ['b', T('Schwarz')], ['r', T('Zufall')]], settings.color)}</section>
          <section class="lb-sec"><div class="lb-h"><span>${T('Trainer')}</span></div><p class="lb-hint">${styleHint()}</p></section>
          ${Array.isArray(saved?.moves) && saved.moves.length && saved.mode === 'solo' && !saved.setup && !saved.initialFen && !saved.cont ? `<button type="button" class="btn lb-resume">${Icon('play')}${T('Partie fortsetzen')}</button>` : ''}
          <div class="lb-footer"><button type="button" class="btn primary lb-start">${T('Partie starten')}</button></div>`;
        const range = lobby.querySelector('.lv-range');
        const sync = () => {
          demoSettings(); const L = lvl(); range.value = settings.level + 1;
          range.setAttribute('aria-valuetext', L.name);
          lobby.querySelector('.lv-num').textContent = L.name;
          lobby.querySelector('.lv-desc').textContent = L.desc;
          lobby.querySelector('.lv-elo').textContent = eloText(L);
          lobby.querySelector('.chess-level-meter').innerHTML = `<span class="stagebar">${LEVELS.slice(0, 6).map((_, i) => `<i class="${i <= settings.level ? 'on' : ''}"></i>`).join('')}</span>`;
          range.style.setProperty('--p', settings.level / 5 * 100 + '%');
        };
        range.oninput = () => { settings.level = Number(range.value) - 1; sync(); saveSettings(); };
        UI.bindSeg(lobby, (k, v) => { if (k !== 'color' || !['w', 'b', 'r'].includes(v)) return false; settings.color = v; saveSettings(); return true; });
        lobby.querySelector('.lb-start').onclick = () => { Sound.play('tap'); newGame(); };
        const resume = lobby.querySelector('.lb-resume');
        if (resume) resume.onclick = () => { const sv = Store.get('chess.saved', null); if (sv) resumeGame(sv); };
        sync();
      }
      // Online-Lobby: geschätzte Wartezeit für „Gegner suchen“. Der Server rechnet sie aus den Wartezeiten
      // der letzten 24 Stunden und wie viele gerade suchen oder spielen; aktualisiert alle 15 Sekunden.
      function waitText(s) { return s <= 10 ? T('sofort') : s < 60 ? T('ca. {n} Sek.', { n: Math.max(10, Math.round(s / 5) * 5) }) : T('ca. {n} Min.', { n: Math.round(s / 60) }); }
      function lobbyText(l) { return !l ? '' : l.est_secs == null ? T('Gerade niemand online') : l.est_secs <= 10 ? T('Ein Gegner wartet schon · {n} online', { n: l.online }) : T('Wartezeit {t} · {n} online', { t: waitText(l.est_secs), n: l.online }); }
      // eigene Wertungen (Blitz, Bullet, Schnellschach) in der Online-Lobby
      async function refreshRatings() {
        const box = lobby.querySelector('.on-rt-list'), btn = lobby.querySelector('.on-rating');
        if (!box || !window.Cloud || !Cloud.enabled()) return;
        btn.onclick = () => { Sound.play('tap'); Ranking.chess(chessCat(settings.clock)); };
        try {
          const list = await Cloud.rpc('chess_ratings', {});
          box.innerHTML = (list || []).filter(x=>x.games>0&&Number.isFinite(x.rating)).map(x => `<span class="on-rt"><small>${CAT_NAME()[x.cat]}</small><b>${x.rating}${x.provisional ? '?' : ''}</b></span>`).join('')||`<small class="muted">${T('Noch keine Wertung')}</small>`;
        } catch (e) { box.innerHTML = `<small class="muted">${T('Keine Verbindung zum Server. Bitte später noch einmal versuchen.')}</small>`; }
      }
      async function refreshEst() {
        clearTimeout(refreshEst.timer); refreshEst.timer = null;
        const box = lobby && lobby.querySelector('.on-est');
        if (box && settings.matchRating === 'casual') { box.textContent = ''; return; }
        if (!box || settings.mode !== 'online' || lobby.classList.contains('hidden') || !window.Cloud || !Cloud.enabled() || !Online.configured) return;
        try {
          const l = await Cloud.rpc('chess_lobby', {});
          if (settings.matchRating === 'casual') return;
          refreshEst.last = l; box.textContent = lobbyText(l); box.classList.toggle('none', l.est_secs == null);
        } catch (e) { /* ohne Anzeige */ }
        refreshEst.timer = setTimeout(refreshEst, 15000);
      }

      async function refreshFriendsBadge() {
        clearTimeout(refreshFriendsBadge.timer);
        const badge = lobby.querySelector('.friends-badge');
        if (!badge || !el.isConnected || settings.mode !== 'online' || lobby.classList.contains('hidden') || !Cloud.Account.get()) return;
        refreshFriendsBadge.timer = setTimeout(refreshFriendsBadge, 12000);
        if (document.hidden) return;
        const count = await Friends.inboxCount();
        if (!badge.isConnected) return;
        badge.hidden = !count;
        badge.textContent = count ? T('{n} offen', { n: count }) : '';
      }

      function showLobby() {
        if (setupSettings) { Object.assign(settings, setupSettings); setupSettings = null; }
        fantasySetup = false;
        bgStop(true); viewing = null; contGame = false; hideTrainer(); hideLine();
        leaveReview();
        leaveOnline();
        stopClock(); token++; gen++; over = true;
        match.classList.add('hidden'); lobby.classList.remove('hidden');
        renderLobby();
        el.closest('#view') && (el.closest('#view').scrollTop = 0);
      }

      // ================= Darstellung =================
      const disp = sq => { const r = sq >> 3, c = sq & 7; return flipped ? { x: 7 - c, y: 7 - r } : { x: c, y: r }; };
      const center = sq => { const { x, y } = disp(sq); return { x: x + 0.5, y: y + 0.5 }; };
      function place(pel, sq) { const { x, y } = disp(sq); pel.style.transform = `translate(${x * 100}%,${y * 100}%)`; }

      // A drag is only a temporary visual offset, never a board position.
      // Restore it BEFORE a move, rebuild, result or OS interruption changes state.
      function cancelBoardInput(clearSelection=false){
        const d=drag,t=touchTap;drag=null;touchTap=null;swipe=null;
        if(d?.el){
          d.el.classList.remove('dragging');
          if(d.el.isConnected){
            const actual=pieceEls.indexOf(d.el);
            if(actual>=0)place(d.el,actual);
            else if(d.el.classList.contains('premove-ghost'))place(d.el,d.sq);
          }
        }
        squareEls.forEach(cell=>cell?.classList.remove('hover'));
        for(const id of [d?.id,t?.id])if(id!==undefined)try{if(board.hasPointerCapture(id))board.releasePointerCapture(id);}catch(e){/* pointer already ended */}
        if(clearSelection&&S&&squareEls[0])deselect();
      }

      function buildSquares() {
        squaresEl.innerHTML = '';
        for (let y = 0; y < 8; y++) for (let x = 0; x < 8; x++) {
          const sq = flipped ? (7 - y) * 8 + (7 - x) : y * 8 + x;
          const d = document.createElement('div');
          d.className = 'sq ' + (((sq >> 3) + (sq & 7)) % 2 ? 'dark' : 'light');
          d.dataset.sq=sq;
          if (x === 0) d.insertAdjacentHTML('beforeend', `<span class="co rk">${8 - (sq >> 3)}</span>`);
          if (y === 7) d.insertAdjacentHTML('beforeend', `<span class="co fl">${'abcdefgh'[sq & 7]}</span>`);
          squaresEl.appendChild(d);
          squareEls[sq] = d;
        }
        squaresEl.setAttribute('aria-label',T('Schachbrett'));piecesEl.setAttribute('aria-hidden','true');fx.setAttribute('aria-hidden','true');
        UI.boardKeys(squaresEl,'.sq',8,d=>activateSquare(+d.dataset.sq));
      }
      function makePiece(sq, p) {
        const d = document.createElement('div');
        d.className = 'piece ' + colorOf(p);
        d.innerHTML = `<span class="g">${Pieces.inner(p.toUpperCase())}</span>`;
        place(d, sq);
        piecesEl.appendChild(d);
        pieceEls[sq] = d;
      }
      function buildPieces(fade) {
        cancelBoardInput();
        piecesEl.innerHTML = ''; fx.innerHTML = ''; pieceEls.fill(null);
        for (let i = 0; i < 64; i++) if (S.b[i]) makePiece(i, S.b[i]);
        if (fade) { piecesEl.classList.remove('fadein'); void piecesEl.offsetWidth; piecesEl.classList.add('fadein'); }
      }
      function renderAll(fade) { buildSquares(); buildPieces(fade); refresh(); setEval(evalNow, true); }

      function refreshSquares() {
        boardNotes.sync(E.toFEN(S));
        for (let i = 0; i < 64; i++) squareEls[i].classList.remove('last', 'sel', 'target', 'cap-target', 'check','premove','tr-plan');
        if (trainerQ?.type === 'question') { squareEls[trainerQ.m.f].classList.add('tr-plan'); squareEls[trainerQ.m.t].classList.add('tr-plan'); }
        if (lastMove) { squareEls[lastMove.f].classList.add('last'); squareEls[lastMove.t].classList.add('last'); }
        if (selected >= 0) {
          squareEls[selected].classList.add('sel');
          if (settings.showMoves) for (const m of targets) squareEls[m.t].classList.add(m.cap ? 'cap-target' : 'target');
        }
        if (E.inCheck(S)) squareEls[S.turn === 'w' ? S.kw : S.kb].classList.add('check');
        for(const move of premoves){squareEls[move.f].classList.add('premove');squareEls[move.t].classList.add('premove');}
        paintPremovePlan();
        const view=premoves.length?planningState():S;
        squareEls.forEach((cell,i)=>{cell.classList.toggle('touch-piece',!review&&canMove(view.b[i]));let label=UI.chessFieldLabel(i,S.b[i]);if(view.b[i]&&view.b[i]!==S.b[i]&&colorOf(view.b[i])===playerColor)label+=', '+T('Vorgemerkt: {p}',{p:UI.chessFieldLabel(i,view.b[i])});if(cell.classList.contains('target')||cell.classList.contains('cap-target'))label+=', '+T('Mögliches Ziel');if(cell.classList.contains('check'))label+=', '+T('Schach');cell.setAttribute('aria-label',label);cell.setAttribute('aria-pressed',String(i===selected));});
      }

      function capturedBy(color) {
        const opp = color === 'w' ? 'b' : 'w', data=ChessExtras.material(S,plies,color,review?review.idx:plies.length);
        let out = '';
        for (const T of ['Q', 'R', 'B', 'N', 'P']) {
          const miss = data.captures[T]||0;
          for (let i = 0; i < miss; i++) {
            const fresh = lastCapture && lastCapture.color === opp && lastCapture.T === T && i === miss - 1;
            out += `<span class="cp ${opp} ${fresh ? 'fresh' : ''}">${Pieces.icon(T, opp)}</span>`;
          }
        }
        return { html: out, val:data.value };
      }

      // Wertung hinter dem Namen, „?“ solange sie noch vorläufig ist
      const ratingOf = c => { const r = online && online.ratings && online.ratings[c]; return r ? ` · ${r.r}${r.p ? '?' : ''}` : ''; };
      // Brett exakt in der Bildschirmmitte (laufende Partie, nicht in der Analyse). Der freie Platz kommt über die
      // obere Spielerleiste; reicht er nicht für 10 px Luft unter der Zugliste, werden die Spielerleisten kompakt.
      // Passt der Inhalt nicht auf den Bildschirm, bleibt es beim normalen Fluss (scrollbar wie bisher).
      let centerFrame = 0, centerKey = '';
      function centerBoard() {
        cancelAnimationFrame(centerFrame);
        centerFrame = requestAnimationFrame(centerNow);
      }
      function centerNow() {
        {
          const view = root.closest('#view'), top = bars.top, active = !!view && !match.classList.contains('hidden') && !review && root.isConnected;
          match.classList.toggle('mid', active);
          if (!active) { match.classList.remove('compact'); top.style.marginTop = ''; match.style.minHeight = ''; centerKey = ''; return; }
          // nur neu rechnen, wenn sich Größen geändert haben, und nie während die Ansicht gescrollt ist
          const key = [innerWidth, innerHeight, view.clientHeight, ...[...match.children].map(e => e.offsetHeight)].join(',');
          if (view.scrollTop > 0 || key === centerKey) return;
          // alles in Inhaltskoordinaten (unabhängig davon, wie weit gerade gescrollt ist)
          const vr = view.getBoundingClientRect(), pad = parseFloat(getComputedStyle(view).paddingBottom) || 0, st = view.scrollTop;
          const matchTop = match.getBoundingClientRect().top + st - vr.top, avail = Math.max(0, view.clientHeight - pad - matchTop);
          match.style.minHeight = avail + 'px';
          const need = () => { top.style.marginTop = '0px'; const r = board.getBoundingClientRect(); return innerHeight / 2 - r.height / 2 - (r.top + st); };
          match.classList.remove('compact');
          let shift = need();
          if (shift < 10) { match.classList.add('compact'); shift = need(); }
          top.style.marginTop = Math.max(0, shift) + 'px';
          // passt die Partie dann nicht mehr auf den Bildschirm, so weit zurücknehmen, dass sie wieder passt
          const over = match.getBoundingClientRect().height - avail;
          if (over > 1) top.style.marginTop = Math.max(0, shift - over) + 'px';
          centerKey = [innerWidth, innerHeight, view.clientHeight, ...[...match.children].map(e => e.offsetHeight)].join(',');
        }
      }
      const onResize = () => { centerBoard(); if (trainerNote || trainerOpp) requestAnimationFrame(placeLine); if (trainerQ) requestAnimationFrame(placeCard); };
      window.addEventListener('resize', onResize);
      function refreshBars() {
        boardNotes.placeToolbar(root.querySelector(review?'.rv-nav':'.match > .ctrl-row'));
        // sofort rechnen (noch vor dem Zeichnen), sonst steht das Brett beim Start kurz oben und springt dann –
        // ein Antippen in diesem Moment träfe das falsche Feld; der Durchgang im nächsten Bild fängt späte Größen ab
        centerNow(); centerBoard();
        const bottomColor = flipped ? 'b' : 'w', topColor = bottomColor === 'w' ? 'b' : 'w';
        const label = c => {
          if (viewing) {
            const v = viewing, nm = ChessExtras.playerName(v,c);
            return [c === 'w' ? '<span class="side-dot w"></span>' : '<span class="side-dot b"></span>', nm + (v.ratings ? ` · ${v.ratings[c]}` : ''), c === 'w' ? T('Weiß') : T('Schwarz')];
          }
          // online: Rang-Abzeichen statt Personen-Symbol (wenn bekannt; private Profile zeigen keinen Rang)
          const rk = online && online.ranks ? Ranking.rankBadge(online.ranks[c]) : '';
          if (online) return c === playerColor
            ? [rk || Icon('user'), online.names && online.names[c] ? NameCheck.serverDisplay(online.names[c], T('Du')) : T('Du'), T('Du')+' · '+(c === 'w' ? T('Weiß') : T('Schwarz'))]
            : [rk || Icon('users'), (online.names && online.names[c] ? NameCheck.serverDisplay(online.names[c], T('Gegner')) : T('Gegner')),
              online.titles && Ranking.titleTag(online.titles[c]) ? Ranking.titleTag(online.titles[c]) : T('Online · Raum {r}', { r: online.room })];
          if (solo()) return c === playerColor
            ? [Icon('user'), T('Du'), c === 'w' ? T('Weiß') : T('Schwarz')]
            : [`<span class="lvl-badge">${settings.level + 1}</span>`, T('Stufe {n}', { n: settings.level + 1 }), lvl().desc];
          return c === 'w' ? ['<span class="side-dot w"></span>', T('Weiß'), ''] : ['<span class="side-dot b"></span>', T('Schwarz'), ''];
        };
        const capT = capturedBy(topColor), capB = capturedBy(bottomColor);
        for (const [bar, c, cap, other] of [[bars.top, topColor, capT, capB], [bars.bot, bottomColor, capB, capT]]) {
          const [av, nm, sub] = label(c);
          bar.querySelector('.av').innerHTML = av;
          bar.querySelector('.nm').textContent = nm;
          bar.querySelector('.nm').title=nm;
          let rating=bar.querySelector('.pl-rating');if(!rating){rating=document.createElement('span');rating.className='pl-rating';bar.querySelector('.pl').append(rating);}
          const rt=online&&online.ratings&&online.ratings[c];rating.textContent=rt&&Number.isFinite(rt.r)?rt.r+(rt.p?'?':''):'';rating.classList.toggle('hidden',!rating.textContent);rating.title=T('Schach-Wertung');
          bar.querySelector('.sub').textContent = sub;
          if (online && c !== playerColor && online.titles && Ranking.titleTag(online.titles[c])) Ranking.titleApply(bar.querySelector('.sub'), online.titles[c]);
          else if (!webdemo) Ranking.titleApply(bar.querySelector('.sub'), null, sub);
          const adv = cap.val - other.val;
          bar.querySelector('.caps').innerHTML = cap.html + (adv > 0 ? `<span class="adv">+${adv}</span>` : '');
          bar.classList.toggle('active', !over && S.turn === c);
          bar.dataset.color = c;
          // Online: Namen des Gegners melden
          let rep = bar.querySelector('.rep-name');
          const showRep = !!(online && c !== playerColor && online.names && online.names[c] && online.names[c] !== 'Spieler');
          if (showRep && !rep) {
            rep = document.createElement('button');
            rep.className = 'rep-name'; rep.innerHTML = Icon('flag'); rep.setAttribute('aria-label', T('Melden'));
            rep.onclick = e => { e.stopPropagation(); reportMenu(); };
            bar.appendChild(rep);
          }
          if (rep) rep.hidden = !showRep;
        }
        lastCapture = null;
        renderClock();
      }

      const wheel = { active: false, endT: 0, busy: false, programmatic: false, rebuild: 0, full: 0 };
      function refreshMoves() {
        let html = '';
        const cur = review ? review.idx - 1 : sans.length - 1;
        const q = i => (review && review.rows[i] && review.rows[i].cls ? ' q-' + review.rows[i].cls : '');
        moveListEl.classList.toggle('wheel', !!review);
        // Während des Wischens am Zug-Rad und solange das Brett noch Zug für Zug aufholt: Liste nicht neu aufbauen und
        // nicht verschieben, nur den aktuellen Zug markieren (sonst springt die Liste auf den Zwischenzug zurück)
        if (review && (wheel.active || wheel.busy) && moveListEl.querySelectorAll('em[data-ply]').length === sans.length + 1) {
          moveListEl.querySelectorAll('em[data-ply]').forEach(e => e.classList.toggle('cur', +e.dataset.ply === review.idx));
          return;
        }
        if (review && sans.length) html += `<em data-ply="0" class="mv-start${review.idx === 0 ? ' cur' : ''}">${T('Start')}</em> `;
        for (let i = 0; i < sans.length; i++) {
          const at=plies[i]?.S,white=at?at.turn==='w':i%2===0,number=at?.full||Math.floor(i/2)+1;
          if(white||i===0)html+=`${i?'</span>':''}<span class="mv"><i>${number}${white?'.':'…'}</i> `;
          html+=`<em data-ply="${i+1}" class="${i===cur?'cur':''}${q(i)}">${sans[i]}</em> `;
        }
        if(sans.length)html+='</span>';
        moveListEl.innerHTML = html || `<span class="muted">${T('Noch keine Züge')}</span>`;
        if (review) { wheelPad(); wheelCenter(); }
        else {
          // Analyse verlassen (z. B. „Ab hier weiterspielen“): Zug-Rad vollständig zurücksetzen
          moveListEl.style.paddingLeft = moveListEl.style.paddingRight = '';
          clearTimeout(wheel.endT); clearTimeout(wheel.rebuild); clearTimeout(wheel.full); wheel.active = wheel.busy = false; board.classList.remove('wheeling');
          moveListEl.scrollLeft = moveListEl.scrollWidth;
        }
      }
      // ---------- Zug-Rad in der Analyse: der Zug unter dem Rahmen ist die Stellung auf dem Brett ----------
      // Jeder Zug, der beim Wischen unter dem Rahmen durchläuft, wird gezeigt: vorwärts und rückwärts mit kurzer
      // Zuganimation, bei schnellem Wischen kürzer. Erster und letzter Eintrag können genau in die Mitte rollen.
      function wheelPad() {
        const ems = moveListEl.querySelectorAll('em[data-ply]'); if (!ems.length) return;
        const first = ems[0], last = ems[ems.length - 1], w = moveListEl.clientWidth;
        moveListEl.style.paddingLeft = Math.max(12, w / 2 - first.offsetWidth / 2) + 'px';
        moveListEl.style.paddingRight = Math.max(12, w / 2 - last.offsetWidth / 2) + 'px';
      }
      function wheelCenter() {
        const c = moveListEl.querySelector('em.cur'); if (!c) return;
        wheel.programmatic = true;
        moveListEl.scrollLeft += c.getBoundingClientRect().left - moveListEl.getBoundingClientRect().left - (moveListEl.clientWidth - c.offsetWidth) / 2;
        requestAnimationFrame(() => { wheel.programmatic = false; });
      }
      function wheelTarget() {
        const r = moveListEl.getBoundingClientRect(), mid = r.left + r.width / 2; let best = null, d = Infinity;
        for (const e of moveListEl.querySelectorAll('em[data-ply]')) { const b = e.getBoundingClientRect(), x = Math.abs(b.left + b.width / 2 - mid); if (x < d) { d = x; best = e; } }
        return best ? +best.dataset.ply : null;
      }
      function stepBack(i) {
        // einen Halbzug zurück, sichtbar: Figur zieht zurück, danach steht die genaue Stellung (geschlagene Figur wieder da)
        const m = plies[i - 1]?.m, pel = m && pieceEls[m.t];
        review.idx = i - 1; fx.innerHTML = '';
        if (pel && !UI.reducedMotion()) {
          pieceEls[m.t] = null; pieceEls[m.f] = pel; pel.classList.add('moving'); place(pel, m.f);
          if (m.castle) { const [rf, rt] = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] }[m.castle], rel = pieceEls[rt]; if (rel) { pieceEls[rt] = null; pieceEls[rf] = rel; place(rel, rf); } }
          const at = i - 1; clearTimeout(wheel.rebuild);
          wheel.rebuild = setTimeout(() => { if (review && review.idx === at) { pel.classList.remove('moving'); buildPieces(false); } }, 160);
        }
        S = review.pos[i - 1];
        if (!pel || UI.reducedMotion()) buildPieces(false);
      }
      function wheelShow(i, instant = false) {
        // wie gotoPly, aber ohne Ton und ohne das Rad zu verschieben; Text und Pfeile erst, wenn das Rad steht
        const prev = review.idx;
        if (instant) { clearTimeout(wheel.rebuild); review.idx = i; fx.innerHTML = ''; S = review.pos[i]; buildPieces(false); }
        else if (i === prev + 1) { fx.innerHTML = ''; review.idx = i; animateMove(plies[i - 1].m); S = review.pos[i]; }
        else if (i === prev - 1) stepBack(prev);
        else { clearTimeout(wheel.rebuild); review.idx = i; fx.innerHTML = ''; S = review.pos[i]; buildPieces(false); }
        lastMove = review.idx > 0 ? { f: plies[review.idx - 1].m.f, t: plies[review.idx - 1].m.t } : null;
        refreshSquares(); refreshMoves(); setEval(review.evals[review.idx]);
        clearTimeout(wheel.full); wheel.full = setTimeout(wheelFull, 90);
        Haptic.fire('sel');
      }
      // Erklärung, Bewertung und Pfeile der Stellung unter dem Rahmen: einmal, sobald das Rad steht
      function wheelFull() {
        if (!review) return;
        if (wheel.active || wheel.busy) { wheel.full = setTimeout(wheelFull, 90); return; }
        gotoPly(review.idx, false, true);
      }
      function wheelStep() {
        if (wheel.busy || !review) return;
        const target = wheelTarget();
        // angekommen und der Finger ist weg: den Zug genau unter den Rahmen rücken
        if (target === null || target === review.idx) { if (!wheel.active && target !== null) wheelCenter(); return; }
        wheel.busy = true;
        const left = Math.abs(target - review.idx), dir = Math.sign(target - review.idx);
        // liegt das Brett mehr als drei Züge zurück: Zwischenstellungen ohne Animation Bild für Bild zeigen, bei schnellem
        // Schleudern mehrere Züge je Bild (höchstens sechs Bilder Rückstand). Die letzten zwei Züge ziehen sichtbar.
        if (left > 3) { wheelShow(review.idx + dir * Math.ceil((left - 2) / 6), true); setTimeout(() => { wheel.busy = false; wheelStep(); }, 16); return; }
        const ms = Math.max(70, Math.min(150, 300 / left));
        board.style.setProperty('--wheel-ms', ms + 'ms');
        wheelShow(review.idx + dir);
        setTimeout(() => { wheel.busy = false; wheelStep(); }, ms);
      }
      moveListEl.addEventListener('scroll', () => {
        if (!review || wheel.programmatic) return;
        wheel.active = true; board.classList.add('wheeling');
        wheelStep();
        clearTimeout(wheel.endT);
        wheel.endT = setTimeout(() => { wheel.active = false; board.classList.remove('wheeling'); wheelStep(); if (!wheel.busy) wheelCenter(); }, 180);
      }, { passive: true });
      function setStatus(txt, cls = '') { statusEl.className = 'chess-status ' + cls; statusEl.innerHTML = txt; }
      function refresh() {
        if (trainerNote || trainerOpp) requestAnimationFrame(placeLine); // Lage der Kommentarzeile folgt dem Aufbau (Brett mittig, Leisten)
        root.classList.toggle('online-match',!!online);
        root.querySelector('[data-a=flip]').classList.toggle('hidden',!!online);
        const newButton = root.querySelector('[data-a=new]');
        newButton.classList.toggle('hidden', !!online);
        newButton.lastChild.textContent = T(setupSettings ? 'Neu starten' : 'Neue Partie');
        root.querySelector('.online-context').classList.toggle('hidden',!online||!!viewing);
        if(online){const key=online.opts.clock||settings.clock,parts=String(key).split('+');root.querySelector('.online-meta').textContent=[CAT_NAME()[chessCat(key)],key==='none'?T('Ohne Uhr'):T('{n} Min',{n:parts[0]})+(parts[1]?' + '+T('{s} s',{s:parts[1]}):''),T(online.rated?'Gewertet':'Ungewertet')].join(' · ');}
        refreshPhraseControls();
        refreshSquares(); refreshBars(); refreshMoves();
        root.querySelector('[data-a=undo]').disabled = !undoOk() || !!online || !hist.length;
        root.querySelector('[data-a=undo]').classList.toggle('hidden', !!online);
        root.querySelector('[data-a=hint]').innerHTML = online ? Icon('half') + T('Remis') : Icon('hint') + T('Tipp');
        if (online && !online.started) { setStatus(online.opts && online.opts.quick ? T('Warte, bis dein Gegner annimmt …') : T('Warte auf Mitspieler · Raum <b>{r}</b>', { r: online.room }), 'thinking'); return; }
        if (over) return;
        const check = E.inCheck(S);
        if (online && online.firstMs && plies.length < 2 && S.turn === playerColor) { setStatus(T('Dein erster Zug: Du hast dafür {s} Sekunden.', { s: Math.round(online.firstMs / 1000) }), 'warn'); return; }
        if (online) { setStatus(S.turn === playerColor ? (check ? T('Schach') : T('Du bist am Zug')) : T('Gegner ist am Zug'), check && S.turn === playerColor ? 'warn' : S.turn === playerColor ? '' : 'thinking'); return; }
        if (solo()) setStatus(S.turn === playerColor ? (check ? T('Schach') : T('Du bist am Zug')) : T('Gegenzug …'), check && S.turn === playerColor ? 'warn' : S.turn === playerColor ? '' : 'thinking');
        else setStatus((check ? T('Schach') + ' · ' : '') + T('{n} ist am Zug', { n: S.turn === 'w' ? T('Weiß') : T('Schwarz') }), check ? 'warn' : '');
      }

      // ================= Schachuhr =================
      function startClock() {
        stopClock();
        if (settings.clock === 'none' || !CLOCK_MS[settings.clock]) { clock = null; return; }
        const [base, inc] = CLOCK_MS[settings.clock];
        clock = { w: base, b: base, inc, last: Date.now(),turnStart:base };
        clockT = setInterval(() => {
          if (over || !clock) return;
          const now = Date.now();
          // „Anzeige und Ton“ offen: Offline-Uhr steht, die Zeit im Fenster wird nicht nachbelastet
          if (!online && UI.held()) { clock.last = now; return; }
          clock[S.turn] -= now - clock.last;
          clock.last = now;
          if (clock[S.turn] <= 0) { clock[S.turn] = 0; renderClock(); flagFall(S.turn); return; }
          renderClock();
        }, 200);
      }
      function stopClock() { clearInterval(clockT); clockT = null; }
      function clockMoveDone(mover) {
        if (!clock || online) return null;
        const now = Date.now();
        clock[mover] -= now - clock.last;
        const remaining=Math.max(0,Math.round(clock[mover]/100)),spent=Number.isFinite(clock.turnStart)?Math.max(0,Math.round(clock.turnStart/100)-remaining):null;
        clock[mover] += clock.inc;
        clock.last = now;
        clock.turnStart=clock[mover==='w'?'b':'w'];
        return {spent,remaining};
      }
      function renderClock() {
        for (const bar of Object.values(bars)) {
          const c = bar.querySelector('.clock');
          if (!clock) { c.classList.add('hidden'); continue; }
          const col = bar.dataset.color;
          c.classList.remove('hidden');
          c.textContent = fmtClock(clock[col] || 0);
          c.classList.toggle('run', !over && S.turn === col);
          c.classList.toggle('low', (clock[col] || 0) < 20000);
        }
      }
      function flagFall(color) {
        if (over || online) return;
        over = true; stopClock(); refresh();
        endGame({ over: true, result: color === 'w' ? 'b' : 'w', reason: 'Zeit abgelaufen' });
      }

      // ================= Bewertung =================
      function setEval(cp, instant) {
        evalNow = cp;
        evalBar.classList.toggle('hidden', !settings.showEval || (!!online && !review)); // online keine Rechenhilfe während der Partie
        const pct = Math.abs(cp) >= E.MATE - 1000 ? (cp > 0 ? 100 : 0) : 50 + 50 * Math.tanh(cp / 650);
        const i = evalBar.querySelector('i');
        evalBar.classList.toggle('flip', flipped);
        if (instant) { i.style.transition = 'none'; void i.offsetWidth; }
        i.style.height = pct + '%';
        if (instant) requestAnimationFrame(() => (i.style.transition = ''));
      }
      function arrow(f, t, ms) {
        let s = fx.querySelector('svg.rays');
        if (!s) {
          fx.insertAdjacentHTML('beforeend', `<svg class="rays" viewBox="0 0 8 8" preserveAspectRatio="none"><defs>
            <marker id="ah-g" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.4" markerHeight="2.4" orient="auto"><path d="M0 0L10 5L0 10z" fill="#7fbf8e"/></marker></defs></svg>`);
          s = fx.querySelector('svg.rays');
        }
        const a = center(f), b = center(t), dx = b.x - a.x, dy = b.y - a.y, len = Math.hypot(dx, dy);
        const l = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        l.setAttribute('x1', a.x); l.setAttribute('y1', a.y);
        l.setAttribute('x2', b.x - dx / len * 0.3); l.setAttribute('y2', b.y - dy / len * 0.3);
        l.setAttribute('class', 'ray hint'); l.setAttribute('marker-end', 'url(#ah-g)');
        s.appendChild(l);
        setTimeout(() => l.classList.add('out'), ms);
        setTimeout(() => l.remove(), ms + 400);
      }

      function animateMove(m) {
        const pel = pieceEls[m.f];
        if (m.cap) {
          const capSq = m.ep ? m.t + (E.isW(m.p) ? 8 : -8) : m.t;
          const cel = pieceEls[capSq];
          pieceEls[capSq] = null;
          if (cel) setTimeout(() => { cel.classList.add('taken'); setTimeout(() => cel.remove(), 200); }, 150);
          lastCapture = { color: colorOf(m.cap), T: m.cap.toUpperCase() };
        }
        pieceEls[m.f] = null; pieceEls[m.t] = pel;
        if (pel) {
          place(pel, m.t);
          if (m.promo) setTimeout(() => { pel.querySelector('.g').innerHTML = Pieces.inner(m.promo.toUpperCase()); }, 220);
        }
        if (m.castle) {
          const [rf, rt] = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] }[m.castle];
          const rel = pieceEls[rf];
          pieceEls[rf] = null; pieceEls[rt] = rel;
          if (rel) setTimeout(() => place(rel, rt), 60);
        }
      }

      // ================= Spielablauf =================
      function deselect() { selected = -1; targets = []; refreshSquares(); }
      const planningState=()=>premoves.length?(ChessExtras.projectPremoves(S,premoves,playerColor)||S):S;
      function select(sq) { selected = sq; targets = online&&S.turn!==playerColor?ChessExtras.targets(planningState(),sq,playerColor):legalAll.filter(m => m.f === sq); Sound.play('tap'); refreshSquares(); }
      function canMove(p) {
        if (busy || over || !p) return false;
        if (online) return online.started && !premoveBlocked && colorOf(p) === playerColor&&(S.turn===playerColor||settings.premove);
        if (solo()) return colorOf(p) === playerColor && S.turn === playerColor;
        return colorOf(p) === S.turn;
      }
      function choosePromotion(color) {
        return UI.modal({
          title: T('Umwandlung'), dismissable: false, cls: 'promo-modal', html: `<p class="muted">${T('Wähle die neue Figur')}</p>`,
          buttons: ['Q', 'R', 'B', 'N'].map(T => ({ label: `<span class="promo-g ${color}">${Pieces.icon(T, color)}</span>`, value: T, cls: 'promo-btn' }))
        }).then(type=>typeof type==='string'&&/^[QRBN]$/.test(type)?(color==='w'?type:type.toLowerCase()):null);
      }
      async function tryMove(f, t) {
        if(over||busy||review)return false;
        if(online&&S.turn!==playerColor){
          if(!settings.premove||premoveBlocked||document.visibilityState!=='visible')return false;
          if(premoves.length>=PREMOVE_LIMIT){UI.toast(T('Du kannst höchstens drei Vorauszüge vormerken.'));deselect();return false;}
          const m=ChessExtras.targets(planningState(),f,playerColor).find(x=>x.t===t);if(!m)return false;
          premoves.push({f,t,p:m.p,promo:m.promo,ply:sans.length+premoves.length*2});selected=-1;targets=[];refreshSquares();return false;
        }
        const cands = legalAll.filter(m => m.f === f && m.t === t);
        if (!cands.length) return false;
        let m = cands[0];
        if(online)clearPremove(); // A manual move replaces the remaining plan.
        if (m.promo) {
          const position=S,epoch=gen;busy=true;const pr=await choosePromotion(colorOf(m.p));
          if(epoch!==gen)return false;
          busy=false;if(!pr||over||S!==position)return false;
          m=cands.find(c=>c.promo===pr)||m;
        }
        if (await trainerCheck(m)) return false;
        trainerJudgeStart(trainerPending);
        doMove(m);
        trainerAfter();
        return true;
      }

      // ---------- Trainer (Spielweise „Trainer“, nur gegen den Computer, ohne Uhr) ----------
      // Vor einem Zug, der nachweislich Material oder die Partie kostet, hält die Partie an: „Was kann der Gegner danach tun?“
      // Grundlage ist dieselbe geprüfte Zugvergleichs-Suche wie in der Analyse; die Folge wird legal nachgespielt und gezählt.
      // Dazu: Vorwarnung bei Drohungen, die du oft übersiehst, Lob nur für nachgewiesen gute Züge und eine kurze Nachbesprechung.
      // Drohungen stammen aus ChessCoach.threatNow (jede Abwehr geprüft), abgewehrt heißt ChessCoach.goodDefence plus kein Verlust.
      let trainerQ = null, trainerOff = false, trainerAsked = -9, trainerBase = {};
      let trainerThreat = null, trainerPending = null, trainerRetry = null, trainerWarned = -9, trainerPraised = -9, trainerWarns = 0, trLog = null;
      let trainerAgain = null, trainerPlan = null, trainerPlanAt = -9, trainerHint = null, trainerNote = null, trainerOpp = null, trainerMine = null, tipAt = null, trainerRepWarned = new Set(), praiseWaiting = new Map();
      const posKey = s => ChessTrainer.position(E.toFEN(s));
      // helped: die Drohung dieser Stellung war bekannt (Vorwarnung, Denkfrage, Kommentar); tips: hier gab es einen Tipp (der Zug ist nicht deine Leistung)
      const helpedHere = (s, list = 'helped') => { try { return !!trLog?.[list]?.includes(posKey(s)); } catch (e) { return false; } };
      function markHelped(s, list = 'helped') { if (!trLog || !s) return; try { const k = posKey(s); trLog[list] = trLog[list] || []; if (!trLog[list].includes(k) && trLog[list].length < 200) { trLog[list].push(k); if (!over) saveGame(); } } catch (e) { /* ohne Vermerk */ } }
      const trainerCard = root.querySelector('.trainer-card'), trainerLine = root.querySelector('.trainer-line'), trainerOppEl = root.querySelector('.trainer-opp');
      const emptyLog = () => ({ since: Date.now(), events: [], praise: [], asks: [], again: [], plans: [], moves: [], undone: [], helped: [], tips: [] });
      const VERDICTS = ['best', 'good', 'opening', 'forced', 'ok', 'meh', 'bad', 'uncertain'];
      const ownMoves = () => plies.filter(p => p.mover === playerColor).length;
      const trainerOn = () => solo() && settings.style === 'trainer' && !trainerOff && !clock && !fantasySetup && !review && !!window.ChessTeaching;      const trainerKey = () => window.ChessErrorProfile?.gameKey({ id: archiveId }, playerColor) || null;
      const moveNo = s => Number(E.toFEN(s).split(' ')[5]) || 1;
      function trainerReset() {
        trainerOff = false; trainerAsked = -9; trainerThreat = null; trainerPending = null; trainerRetry = null;
        trainerWarned = -9; trainerPraised = -9; trainerWarns = 0; trLog = emptyLog();
        trainerAgain = null; trainerPlan = null; trainerPlanAt = -9; trainerHint = null; trainerRepWarned = new Set(); praiseWaiting.clear(); tipAt = null; hideLine();
      }
      // Die Notizen der laufenden Partie werden mit dem Spielstand gespeichert (App geschlossen, später weitergespielt)
      const savedProof = z => z && typeof z === 'object' && typeof z.best === 'string' && typeof z.bsan === 'string' && Number.isFinite(z.ev) && z.proof && typeof z.proof === 'object' && Array.isArray(z.proof.pvBest) && Array.isArray(z.proof.pvPlayed)
        ? { best: z.best.slice(0, 5), bsan: z.bsan.slice(0, 12), ev: z.ev, proof: z.proof, engine: Number(z.engine) || 0, rev: Number(z.rev) || 0 } : null;
      function trainerRestore(saved) {
        if (!saved || typeof saved !== 'object') return;
        const keep = (list, ok) => Array.isArray(list) ? list.filter(x => x && Number.isInteger(x.ply) && x.ply >= 0 && x.ply < plies.length && ok(x)).slice(0, 200) : [];
        const kind = x => ChessTrainer.KINDS.includes(x.kind);
        // „Trainer für diese Partie aus“ gilt auch nach dem Fortsetzen, ebenso ein Tipp in der aktuellen Stellung
        trainerOff = saved.off === true;
        if (saved.hint === plies.length) trainerHint = S;
        // nach „Statistik löschen“ werden Notizen aus der Zeit davor verworfen (die Partie beginnt für den Trainer neu)
        if (!((Store.get('stats.reset', 0) || 0) <= (Number(saved.since) || 0))) return;
        trLog = {
          since: Number(saved.since) || 0,
          events: keep(saved.events, kind).map(x => ({ ply: x.ply, kind: x.kind, seen: !!x.seen, warned: !!x.warned })),
          praise: keep(saved.praise, x => typeof x.text === 'string' && ['threat', 'capture', 'retry', 'mate', 'again', 'plan'].includes(x.line)).map(x => ({ ply: x.ply, rank: Number(x.rank) || 1, no: Number(x.no) || 1, m: String(x.m || '').slice(0, 12), text: x.text.slice(0, 400), line: x.line, capture: !!x.capture, shown: !!x.shown, lang: typeof x.lang === 'string' ? x.lang.slice(0, 5) : undefined })),
          asks: keep(saved.asks, () => true).map(x => ({ ply: x.ply, right: !!x.right, ...(x.skip ? { skip: true } : {}) })),
          again: keep(saved.again, x => typeof x.pos === 'string').map(x => ({ ply: x.ply, pos: x.pos.slice(0, 100), better: x.better === true ? true : x.better === false ? false : null })),
          plans: keep(saved.plans, x => typeof x.type === 'string').map(x => ({ ply: x.ply, type: x.type.slice(0, 10), foiled: x.foiled === true ? true : x.foiled === false ? false : null })),
          // zurückgenommene Fehler: die Züge gibt es in der Partie nicht mehr, darum ohne Halbzugnummer
          undone: (Array.isArray(saved.undone) ? saved.undone : []).filter(x => x && typeof x.m === 'string' && typeof x.pos === 'string').slice(0, 50).map(x => ({ no: Number(x.no) || 1, m: x.m.slice(0, 12), pos: x.pos.slice(0, 100), u: String(x.u || '').slice(0, 5), kind: ChessTrainer.KINDS.includes(x.kind) ? x.kind : null, fen: typeof x.fen === 'string' ? x.fen.slice(0, 100) : '', pz: savedProof(x.pz) })),
          helped: (Array.isArray(saved.helped) ? saved.helped : []).filter(x => typeof x === 'string').slice(0, 200).map(x => x.slice(0, 100)),
          tips: (Array.isArray(saved.tips) ? saved.tips : []).filter(x => typeof x === 'string').slice(0, 200).map(x => x.slice(0, 100)),
          moves: keep(saved.moves, x => VERDICTS.includes(x.cls)).map(x => ({ ply: x.ply, cls: x.cls, no: Number(x.no) || 1, m: String(x.m || '').slice(0, 12), best: String(x.best || '').slice(0, 12), text: String(x.text || '').slice(0, 300), w: Number(x.w) || 0, lang: typeof x.lang === 'string' ? x.lang.slice(0, 5) : undefined, bu: typeof x.bu === 'string' ? x.bu.slice(0, 5) : '', pz: x.cls === 'bad' ? savedProof(x.pz) : null }))
        };
        trainerWarns = trLog.events.filter(x => x.warned).length;
      }
      // „Statistik löschen“ (auch auf einem anderen Gerät, per Abgleich) während der Partie: Notizen davor verwerfen
      function trainerFresh() {
        if (trLog && (Store.get('stats.reset', 0) || 0) > (trLog.since || 0)) trLog = emptyLog();
        return trLog;
      }
      // nach „Zug zurück“: was zu zurückgenommenen Zügen gehört, zählt nicht mehr
      // before: die Halbzüge vor dem Zurücknehmen
      function trainerUndo(before = []) {
        trainerThreat = null; trainerPending = null; trainerRetry = null;
        trainerAgain = null; trainerPlan = null; trainerHint = null; praiseWaiting.clear(); tipAt = null; hideLine();
        // ein zurückgenommener Fehler bleibt gemerkt: im echten Spiel gäbe es kein Zurück.
        // Nur Züge, die der Trainer nachgeprüft als Fehler bewertet hat; eine dabei übersehene Drohung zählt als übersehen.
        // nach „Statistik löschen“ während der Partie: alte Notizen erst verwerfen, sonst käme Gelöschtes ins Gedächtnis zurück
        if (trLog && trainerFresh()) {
          const n = plies.length; trLog.undone = trLog.undone || [];
          for (const x of trLog.moves || []) {
            const p = before[x.ply];
            if (x.ply < n || x.cls !== 'bad' || !p || p.mover !== playerColor) continue;
            const fen = E.toFEN(p.S), pos = ChessTrainer.position(fen), u = uciOfMove(p.m);
            if (trLog.undone.some(o => o.pos === pos && o.u === u) || trLog.undone.length >= 50) continue;
            const miss = (trLog.events || []).find(e => e.ply === x.ply && !e.warned && e.seen === false);
            trLog.undone.push({ no: x.no, m: x.m, pos, u, kind: miss?.kind || null, fen, pz: x.pz || null });
            try { ChessTrainer.spot({ fen, m: u, san: x.m, key: trainerKey(), undone: true }); } catch (e) { /* ohne Gedächtnis */ }
          }
        }
        if (trLog) for (const k of ['events', 'praise', 'asks', 'again', 'plans', 'moves']) trLog[k] = (trLog[k] || []).filter(x => x.ply < plies.length);
      }
      async function trainerCheck(m) {
        trainerPending = null;
        if (!trainerOn() || S.turn !== playerColor) return false;
        const pos = S, epoch = gen, sign = S.turn === 'w' ? 1 : -1;
        // schnelle Vorprüfung; nur auffällige Züge werden gründlich geprüft
        // derselbe Zug wie damals in einer wiedererkannten Stellung wird immer gründlich geprüft
        const repeat = trainerAgain?.S === pos && uciOfMove(m) === trainerAgain.mem.m;
        let drop = 0;
        try { if (trainerBase.S !== S) trainerBase = { S, v: E.analyse(S, 2) }; drop = (trainerBase.v - E.analyse(E.make(S, m), 2)) * sign; } catch (e) { if (!repeat) return false; drop = 999; }
        const pend = trainerPending = { S: pos, m, drop };
        if (trainerRepeatCheck(pos, m, sign)) return true;
        if (!repeat && (drop < 150 || ownMoves() - trainerAsked < 3)) return false;
        busy = true; hideLine(); setStatus(T('Der Trainer sieht sich deinen Zug an …'), 'thinking');
        const r = await compare(S, m);
        if (epoch !== gen || S !== pos || over) return true;
        if (trainerPending === pend) pend.r = r;
        busy = false; refresh();
        const q = trainerQuestion(pos, m, r);
        if (!q) return false;
        q.pending = trainerPending;
        // eine Drohung, die zu diesem Zug geführt hätte, gilt als übersehen (ohne Frage wäre sie durchgegangen)
        const tt = trainerThreat?.S === pos ? trainerThreat : null;
        if (tt?.t && !tt.helped && trLog) trLog.events.push({ ply: plies.length, kind: ChessTrainer.kindOf(tt.t), seen: false });
        if (tt) tt.helped = true;
        markHelped(pos); trainerAsked = ownMoves(); trainerQ = q; showTrainer('ask');
        try { ChessTrainer.spot({ fen: E.toFEN(pos), m: uciOfMove(m), san: q.san, key: trainerKey() }); } catch (e) { /* ohne Gedächtnis */ }
        return true;
      }
      // Remis durch dreifache Wiederholung, obwohl du besser stehst: vorher fragen (je Stellung und Zug einmal pro Partie).
      // own: dein Zug stellt die Stellung zum dritten Mal her; opp: danach kann der Computer das mit einem Zug tun.
      function trainerRepeatCheck(pos, m, sign) {
        if (trainerBase.S !== pos || !Number.isFinite(trainerBase.v) || trainerBase.v * sign < 150) return false;
        const id = E.key(pos) + uciOfMove(m);
        if (trainerRepWarned.has(id)) return false;
        const next = E.make(pos, m), k = E.key(next), replies = E.legal(next), times = (list, key) => list.filter(x => x === key).length;
        if (!replies.length) return false;
        let who = times(keys, k) >= 2 ? 'own' : null;
        if (!who) { const after = [...keys, k]; if (replies.some(r => times(after, E.key(E.make(next, r))) >= 2)) who = 'opp'; }
        if (!who) return false;
        trainerRepWarned.add(id);
        trainerQ = { type: 'repeat', s: pos, m, san: E.toSAN(pos, m, legalAll), who, pending: trainerPending, phase: 'answer' }; showTrainer('answer');
        return true;
      }
      function trainerQuestion(s, m, r) {
        if (!r || r.unavailable || r.uncertain || r.recommendationStatus !== 'verified') return null;
        if (!r.mateError && !(r.loss >= 200)) return null;
        const pv = r.pvPlayed || [];
        if (pv.length < 2) return null;
        let model; try { model = ChessTeaching.line(s, pv); } catch (e) { return null; }
        if (!model.valid || model.steps.length < 2 || !model.balance) return null;
        const lost = model.mated ? model.matedSide === s.turn : model.settled && model.net <= -200;
        if (!lost) return null;
        return { type: 'question', s, m, model, reply: model.steps[1].move, san: E.toSAN(s, m, legalAll), phase: 'ask' };
      }
      // Am Zug: droht der Gegner gerade etwas? Vorwarnung nur bei deinen eigenen Mustern (ohne Vorgeschichte: Matt oder Dame)
      function trainerTurn(at) {
        if (S !== at || !trainerOn() || over || S.turn !== playerColor) return;
        try { if (trainerBase.S !== at) trainerBase = { S: at, v: E.analyse(at, 2) }; } catch (e) { /* beim Zug */ }
        trainerAgain = null;
        // direkt nach einem Schlagzug des Gegners ist meist das Zurückschlagen dran: das ist kein Muster, sondern ein Abtausch
        const t = plies.at(-1)?.m?.cap ? null : threatOf(at);
        // zeigt der Computerkommentar die Drohung schon (Pfeil oder Text), gilt sie nicht mehr als selbst gesehen
        trainerThreat = { S: at, t, helped: false };
        if (trainerOppNote(at, t) && t) { trainerThreat.helped = true; markHelped(at); }
        if (helpedHere(at)) trainerThreat.helped = true;
        const again = trainerAgainCheck(at);
        if (!t) { if (!again) trainerPlanCheck(at); return; }
        // Erinnerung an diese Stellung oder Drohung schon gezeigt: keine zusätzliche Denkfrage
        if (again || trainerThreat.helped) return;
        if (busy || (trainerQ && trainerQ.type !== 'praise')) return;
        const own = ownMoves(), kind = ChessTrainer.kindOf(t), mine = ChessTrainer.weakness(kind, trainerKey());
        if (own - trainerWarned < 3 || own - trainerAsked < 2 || trainerWarns >= 3) return;
        // wer selbst mattsetzen kann, braucht keine Warnung
        if (E.legal(at).some(m => { const n = E.make(at, m); return E.inCheck(n) && !E.legal(n).length; })) return;
        const big = kind === 'mate' || [...(t.targets || []).map(x => x.piece), at.b[t.to]?.toUpperCase()].includes('Q');
        if (!(mine.n >= 2 || (ChessTrainer.games() < 3 && big))) return;
        // wie ein Trainer, der Schritt für Schritt loslässt: nach einer Warnung schaust du beim nächsten Mal selbst,
        // und wer das Muster zuletzt selbst gesehen hat, wird nicht gewarnt (dafür gibt es Lob, wenn es wieder klappt)
        const here = [...trLog.events].reverse().find(x => x.kind === kind);
        const last = here ? (here.warned ? 'warned' : here.seen ? 'seen' : 'missed') : ChessTrainer.last(kind, trainerKey());
        if (last === 'warned' || last === 'seen') return;
        trainerWarns++; trainerWarned = own; trainerThreat.helped = true; trLog.events.push({ ply: plies.length, kind, warned: true });
        markHelped(at); trainerQ = { type: 'warn', s: at, t, kind, mine, phase: 'ask' }; showTrainer('ask');
      }
      // Wiedersehen: eine Stellung, in der du früher einen Fehler gemacht hast (oder angehalten wurdest). Höchstens zweimal je Partie.
      function trainerAgainCheck(at) {
        if (!trLog || trLog.again.length >= 2 || busy || (trainerQ && trainerQ.type !== 'praise') || E.inCheck(at)) return false;
        let mem = null; try { mem = ChessTrainer.memory(E.toFEN(at), trainerKey(), archiveId); } catch (e) { mem = null; }
        const old = mem && mem.at > 0 && legalAll.find(m => uciOfMove(m) === mem.m), pos = ChessTrainer.position(E.toFEN(at));
        if (!old || trLog.again.some(x => x.pos === pos)) return false;
        trLog.again.push({ ply: plies.length, pos, better: null });
        trainerAgain = { S: at, mem, old };
        if (trainerNote?.opp && trainerNote.danger && trainerNote.ply === plies.length - 1) return true;
        const d = new Date(mem.at).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long' }), m = E.toSAN(at, old, legalAll);
        const txt = mem.kind === 'played' ? T('Am {d} hast du hier {m} gespielt. Das war ein Fehler.', { d, m }) : mem.kind === 'undone' ? T('Am {d} hast du hier {m} gespielt und wieder zurückgenommen. Das war ein Fehler.', { d, m }) : T('Am {d} wolltest du hier {m} spielen, und ich habe dich angehalten.', { d, m });
        showLine({ tone: 'plan', sym: Icon('flag'), title: T('Diese Stellung kennst du'), text: UI.esc(txt + ' ' + T('Was spielst du diesmal?')), arrows: [{ f: old.f, t: old.t, kind: 'threat' }], ply: plies.length - 1, again: true });
        return true;
      }
      // Plan des Gegners: was würde er tun, wenn er gleich noch einmal ziehen dürfte? Nur mehrzügige, geprüfte Ziele
      // (Matt, Umwandlung, Freibauer, Königsangriff, Material ab einer Leichtfigur mit ruhigem ersten Zug), nicht bei
      // einer akuten Drohung, höchstens zweimal je Partie. Ein bloßer Schlagzug ist eine Drohung, kein Plan.
      const planType = key => /setzt matt/.test(key) ? 'mate' : /wandelt einen Bauern um|kurz vor die Umwandlung/.test(key) ? 'promote' : /gewinnt \{p\} für/.test(key) ? 'trade'
        : /gewinnt \{p\}/.test(key) ? 'win' : /Freibauern/.test(key) ? 'passer' : /greift den König an/.test(key) ? 'king' : null;
      function planOf(s, r, side) {
        if (!r || r.unavailable || r.uncertain || r.terminal || !(r.depth >= 3) || !Array.isArray(r.pv) || r.pv.length < 3) return null;
        let model, g; try { model = ChessTeaching.line(s, r.pv); g = ChessTeaching.goal(s, model); } catch (e) { return null; }
        const type = g && g.actorTurn === side ? planType(g.key) : null;
        const first = type && type !== 'trade' && E.legal(s).find(m => uciOfMove(m) === r.pv[0]);
        // beginnt der Plan mit einem Schlagzug, ist es eine Drohung (Ausnahmen: Matt und Umwandlung)
        if (!first || first.cap && !['mate', 'promote'].includes(type) || type === 'win' && !(model.net >= 300)) return null;
        return { type, args: { ...(g.args || {}) }, move: r.pv[0], f: first.f, t: first.t, san: E.toSAN(s, first), score: r.score };
      }
      const passState = (s, turn) => ({ ...s, turn, ep: -1, h1: undefined, h2: undefined });
      async function trainerPlanCheck(at) {
        const own = ownMoves(), comp = playerColor === 'w' ? 'b' : 'w';
        if (!trLog || trLog.plans.length >= 2 || own < 5 || own - trainerPlanAt < 6 || trainerPlan || E.inCheck(at)) return;
        trainerPlanAt = own;
        const pass = passState(at, comp);
        if (!E.legal(pass).length) return;
        const my = gen, r = await searchPosition(pass, { maxDepth: 5, timeMs: 700 });
        if (my !== gen || S !== at || !trainerOn() || over || busy || (trainerQ && trainerQ.type !== 'praise')) return;
        const plan = planOf(pass, r, comp);
        if (!plan) { trainerPlanAt = own - 4; return; } // kein klarer Plan: in zwei Zügen wieder schauen
        trainerPlan = { ...plan, S: at };
        trLog.plans.push({ ply: plies.length, type: plan.type, foiled: null });
        const a = plan.args, what = { mate: T('Der Gegner plant ein Matt.'), promote: T('Der Gegner will einen Bauern umwandeln.'), win: T('Der Gegner will {p} gewinnen.', { p: a.p }), trade: T('Der Gegner will {p} für {q} gewinnen.', { p: a.p, q: a.q }),
          passer: T('Der Gegner will seinen Freibauern auf der {f}-Linie nach vorn schieben.', { f: a.f }), king: T('Der Gegner will deinen König angreifen.') }[plan.type];
        showOpp({ tone: 'plan', sym: Icon('cpu'), title: T('Plan des Gegners'), text: UI.esc(what + ' ' + T('Sein erster Zug wäre {m}.', { m: plan.san }) + ' ' + T('Kannst du das verhindern?')), arrows: [{ f: plan.f, t: plan.t, kind: 'threat' }], ply: plies.length - 1 });
      }
      // Nach deinem Zug: hat er den Plan durchkreuzt? Das Ziel ist weg und der Gegner steht schlechter als geplant, oder sein Zug geht nicht mehr.
      async function trainerPlanAfter(p, ply) {
        const plan = trainerPlan; trainerPlan = null;
        if (!plan || plan.S !== p.S) return;
        const rec = trLog.plans.find(x => x.ply === ply) || trLog.plans.at(-1), comp = playerColor === 'w' ? 'b' : 'w', next = E.make(p.S, p.m), my = gen;
        const r = await searchPosition(next, { maxDepth: 5, timeMs: 700 });
        if (my !== gen || !trLog || !r) return;
        const again = planOf(next, r, comp), sign = comp === 'w' ? 1 : -1;
        const gone = !again || again.type !== plan.type, worse = Number.isFinite(r.score) && Number.isFinite(plan.score) && (plan.score - r.score) * sign >= 100;
        const blocked = !E.legal(next).some(m => uciOfMove(m) === plan.move);
        if (rec) rec.foiled = gone && (worse || blocked);
        if (!rec?.foiled) return;
        const praise = { rank: 3, ply, no: moveNo(p.S), m: plies[ply]?.san || '', text: T('Plan vereitelt: Nach {m} klappt das so nicht mehr.', { m: plies[ply]?.san || '' }), line: 'plan' };
        offerPraise(praise, p);
      }
      // Nach deinem Zug: Drohung gesehen? Lob nur, wenn es nachweislich stimmt, und nicht öfter als alle vier eigenen Züge.
      // danach den Spielstand samt Trainer-Notizen speichern (sonst fehlt das Lob des letzten Zugs nach einem Neustart)
      function trainerAfter(p = trainerPending) { trainerAfterMove(p); if (!over && trLog && trainerOn()) saveGame(); }
      function trainerAfterMove(p) {
        trainerPending = null;
        if (!p || !trLog || !trainerOn() || plies.at(-1)?.S !== p.S) return;
        const ply = plies.length - 1, own = ownMoves(), tt = trainerThreat?.S === p.S ? trainerThreat : null;
        // direkt nach einer Denkfrage kennt man die Gefahr schon: das zählt nicht als selbst gesehen
        if (tt && own - trainerAsked <= 2) tt.helped = true;
        // nach einem Tipp ist der Zug nicht die eigene Leistung: kein Lob, nichts als „selbst gesehen“ zählen
        const hinted = trainerHint === p.S || helpedHere(p.S, 'tips'); trainerHint = null;
        if (hinted) { trainerThreat = null; trainerPlan = null; trainerAgain = null; trainerRetry = null; return; }
        let praise = null;
        const after = E.make(p.S, p.m), mate = E.inCheck(after) && !E.legal(after).length;
        if (tt?.t) {
          const kind = ChessTrainer.kindOf(tt.t);
          // matt setzen erledigt jede Drohung
          let parried = mate;
          if (!mate && p.drop < 100) try { parried = !!ChessCoach.goodDefence(p.S, p.m); } catch (e) { parried = false; }
          if (!tt.helped && (parried || p.drop >= 150)) trLog.events.push({ ply, kind, seen: parried });
          if (parried && !tt.helped && !mate) praise = trainerPraiseThreat(tt.t, kind, ply, p.S);
        }
        if (mate) praise = { rank: 4, ply, no: moveNo(p.S), m: plies[ply]?.san || '', text: T('Matt. Gut gesehen.'), line: 'mate' };
        // Plan des Gegners: Ergebnis kommt aus dem Hintergrund
        if (trainerPlan?.S === p.S && !mate) trainerPlanAfter(p, ply); else trainerPlan = null;
        // Wiedersehen: diesmal anders und ohne Verlust gespielt?
        const ag = trainerAgain?.S === p.S ? trainerAgain : null; trainerAgain = null;
        if (ag) {
          const rec = trLog.again.find(x => x.pos === ChessTrainer.position(E.toFEN(p.S))), m = plies[ply]?.san || '';
          const better = uciOfMove(p.m) !== ag.mem.m && p.drop < 100;
          // „besser“ steht erst mit der geprüften Bewertung fest (trainerVerdict); „nicht besser“ sofort
          if (rec) { if (better) rec.maybe = true; else rec.better = false; }
          if (!praise && better) praise = { rank: 5, ply, no: moveNo(p.S), m, text: ag.mem.best === uciOfMove(p.m) ? T('Genau: {m} war hier der beste Zug.', { m }) : T('Diesmal besser als damals.'), line: 'again', force: true };
        }
        if (!praise && trainerRetry?.S === p.S && p.drop < 100) praise = { rank: 1, ply, no: moveNo(p.S), text: T('Besser.'), line: 'retry' };
        trainerRetry = null;
        if (!praise && p.m.cap && p.drop < 100) praise = trainerPraiseCapture(p, ply);
        if (!praise) return;
        offerPraise(praise, p, { mark: true });
      }
      // Lob ist eine Aussage über deinen Zug und erscheint erst, wenn die geprüfte Bewertung sie trägt (bewiesenes Matt sofort).
      // Lob mit eigenem Beleg (Drohung abgewehrt, Material gewonnen, Plan vereitelt) braucht keinen Fehler; „besser“ braucht einen guten Zug.
      function praiseFits(praise, cls) {
        if (praise.line === 'mate') return true;
        if (['meh', 'bad', 'uncertain'].includes(cls)) return false;
        if (['retry', 'again'].includes(praise.line)) return ['best', 'good', 'opening', 'forced'].includes(cls);
        return true;
      }
      function offerPraise(praise, p, o = {}) {
        const ply = praise.ply, v = (trLog?.moves || []).find(x => x.ply === ply);
        if (praise.line !== 'mate' && !v) { praiseWaiting.set(ply, { praise, p, o }); return; }
        if (v && !praiseFits(praise, v.cls)) { praiseDropped(praise); return; }
        praise.lang = window.DA_LANG || 'de'; trLog.praise.push(praise);
        if (over || trainerQ || plies[ply]?.S !== p.S) { saveGame(); return; }
        praise.shown = true; trainerPraised = ownMoves();
        showLine({ tone: 'great', sym: '!', title: T('Stark'), move: moveLabel(p.S, plies[ply]?.san || ''), text: UI.esc(praise.text), ply, praise: true, own: true, ...(o.mark ? { mark: { sq: p.m.t, cls: 'great', sym: '!' } } : {}) });
        if (!over) saveGame();
      }
      // verworfenes Lob: „diesmal besser“ gilt dann nicht („Plan vereitelt“ bleibt eine Tatsache)
      function praiseDropped(praise) {
        if (praise.line === 'again') { const rec = trLog.again.find(x => x.ply === praise.ply); if (rec) rec.better = false; }
      }
      function trainerPraiseThreat(t, kind, ply, s) {
        const m = t.fact?.args?.m || '';
        const key = kind === 'mate' ? 'Gut gesehen: Der Gegner drohte mit {m} Matt. Dein Zug verhindert das.'
          : t.kind === 'fork' ? 'Gut gesehen: Der Gegner drohte {m} mit einer Gabel. Dein Zug verhindert sie.'
          : t.kind === 'double-attack' ? 'Gut gesehen: Der Gegner drohte {m} mit einem Doppelangriff. Dein Zug verhindert ihn.'
          : kind === 'pin' ? 'Gut gesehen: Der Gegner drohte {m} mit einer Fesselung. Dein Zug verhindert sie.'
          : 'Gut gesehen: Der Gegner drohte {m} und hätte Material gewonnen. Dein Zug verhindert das.';
        const mine = ChessTrainer.weakness(kind, trainerKey());
        const extra = mine.n >= 2 ? ' ' + T('Genau das hast du in {n} deiner letzten {k} Partien übersehen. Diesmal nicht.', { n: mine.n, k: mine.k }) : '';
        return { rank: mine.n >= 2 ? 3 : kind === 'mate' ? 2 : 1, ply, no: moveNo(s), m: plies[ply]?.san || '', threatM: m, text: T(key, { m }) + extra, line: 'threat' };
      }
      // Schlagzug: Lob nur, wenn die Bilanz seit dem letzten Zug des Gegners mindestens eine Leichtfigur beträgt (kein normales Zurückschlagen)
      function trainerPraiseCapture(p, ply) {
        if (!'NBRQ'.includes(String(p.m.cap).toUpperCase())) return null;
        const white = playerColor === 'w', worth = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
        const mat = s => s.b.reduce((n, x) => n + (x ? (E.isW(x) === white ? 1 : -1) * worth[x.toUpperCase()] : 0), 0);
        const after = E.make(p.S, p.m), before = plies[ply - 1]?.S || p.S;
        let end; try { end = ChessCoach.exchange(after, p.m.t, white); } catch (e) { return null; }
        if (!Number.isFinite(end) || end - mat(p.S) < 250 || end - mat(before) < 250) return null;
        const free = !E.legal(after).some(x => x.cap && x.t === p.m.t), lang = window.DA_LANG || 'de', s = E.sqName(p.m.t);
        const text = free ? T('Gut zugegriffen: {p} auf {s} war nicht gedeckt.', { p: ChessTeaching.piecePhrase(p.m.cap, 'subject', lang === 'de'), s }) : T('Gut gerechnet: Der Abtausch auf {s} bringt dir Material.', { s });
        return { rank: 1, ply, no: moveNo(p.S), m: plies[ply]?.san || '', capture: true, text, line: 'capture' };
      }
      // Pfeile des Trainers: grün = besserer Zug, rot = Gegner, gold = dein Zug; nummeriert für eine Folge
      const ARROW_FILL = { best: '#8db596', threat: '#e0816f', mine: '#e6cf96' };
      function trainerArrows(list, cls) {
        fx.querySelectorAll('svg.' + cls).forEach(n => n.remove());
        if (!list?.length) return;
        const marks = Object.entries(ARROW_FILL).map(([k, c]) => `<marker id="tra-${k}" viewBox="0 0 10 10" refX="5" refY="5" markerWidth="2.6" markerHeight="2.6" orient="auto"><path d="M0 0L10 5L0 10z" fill="${c}"/></marker>`).join('');
        const parts = list.map(a => {
          const p = center(a.f), q = center(a.t), dx = q.x - p.x, dy = q.y - p.y, len = Math.hypot(dx, dy) || 1, mx = p.x + dx / 2, my = p.y + dy / 2;
          return `<line class="tra ${a.kind}" x1="${p.x}" y1="${p.y}" x2="${q.x - dx / len * .32}" y2="${q.y - dy / len * .32}" marker-end="url(#tra-${a.kind})"/>`
            + (a.n ? `<circle class="tra-n ${a.kind}" cx="${mx}" cy="${my}" r=".21"/><text class="tra-t" x="${mx}" y="${my + .09}">${a.n}</text>` : '');
        }).join('');
        fx.insertAdjacentHTML('beforeend', `<svg class="tr-arrows ${cls}" viewBox="0 0 8 8" preserveAspectRatio="none" aria-hidden="true"><defs>${marks}</defs>${parts}</svg>`);
      }
      function trainerRay(f, t) { trainerArrows([{ f, t, kind: 'threat' }], 'tr-ray'); }
      const moveLabel = (s, san) => `${s.full}${s.turn === 'w' ? '.' : '…'} ${san}`;
      // ---------- Kommentarzeile: zu jedem eigenen Zug, zu auffälligen Zügen des Computers, Lob, Plan, Wiedersehen ----------
      // Sie liegt zwischen deiner Spielerleiste und der Knopfleiste und hält das Spiel nicht an; Brett und Knöpfe bleiben stehen.
      // Oben an der Leiste des Computers steht, was vom Gegner ausgeht (sein Zug, sein Plan). Deine Bewertung bleibt so unten stehen.
      // Reicht der Platz oben nicht, kommt der Computer unten hin und deine Bewertung als kleine Kopfzeile darüber.
      const lineHtml = n => `<span class="tl-sym" aria-hidden="true">${n.sym}</span><div class="tl-main"><div class="tl-title"><b>${UI.esc(n.title)}</b>${n.move ? `<span class="tl-mv">${UI.esc(n.move)}</span>` : ''}</div>${n.text ? `<p>${n.text}</p>` : ''}</div>`
        + '<svg class="tl-go" viewBox="0 0 16 16" aria-hidden="true"><path d="M6 3.5 10.5 8 6 12.5" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg>';
      const mineFor = n => trainerMine && n !== trainerMine && trainerMine.ply !== n.ply ? trainerMine : null;
      // vorgelesen wird, worum es geht (Bewertung, Zug, bei der Kopfzeile auch dein Zug), dann was Antippen tut
      function lineButton(el, n, mine = null) {
        el.setAttribute('role', 'button'); el.tabIndex = 0;
        const say = x => [x.title, x.move].filter(Boolean).join(' ');
        el.setAttribute('aria-label', [mine && T('Dein Zug {m}', { m: mine.move }) + ' ' + mine.title, n && say(n), T('Ganze Erklärung anzeigen')].filter(Boolean).join('. '));
      }
      function showLine(n) {
        if (over) return;
        // ein Tipp zu dieser Stellung hat Vorrang: später eintreffende Kommentare verdecken „Empfohlen: …“ nicht
        if (tipAt === S) { if (n.own) trainerMine = n; return; }
        // dein Zug wird erst bewertet oder gelobt, wenn unten schon etwas Späteres steht: er kommt als Kopfzeile dazu
        // (ein Lob verdrängt dabei einen harmlosen Computerkommentar, wie auf kurzen Bildschirmen üblich)
        if (n.own && trainerNote && trainerNote !== n && trainerNote.ply > n.ply && !(n.praise && trainerNote.opp && !trainerNote.danger)) { trainerMine = n; n = trainerNote; }
        trainerNote = n;
        if (n.own) trainerMine = n;
        const mine = mineFor(n);
        trainerLine.className = 'trainer-line tone-' + n.tone + (mine ? ' has-mine' : '');
        lineButton(trainerLine, n, mine);
        trainerLine.innerHTML = (mine ? `<div class="tl-mine tone-${mine.tone}"><span class="tm-sym" aria-hidden="true">${mine.sym}</span><span class="tm-mv">${UI.esc(T('Dein Zug {m}', { m: mine.move }))}</span><span aria-hidden="true">·</span><b>${UI.esc(mine.title)}</b></div>` : '') + lineHtml(n);
        match.classList.add('trainer-line-on');
        placeLine(); paintLine();
        root.querySelector('.ctrl-row [data-a=undo]')?.classList.toggle('trn-undo', !!(n.undo || mine?.undo) && undoOk() && !over);
      }
      // Platz zwischen dem Inhalt über der Computerleiste und der Leiste selbst (die Leiste rückt zum Mittigstellen des Bretts nach unten)
      function oppRoom() {
        const bar = bars.top, start = bar.offsetTop - (parseFloat(getComputedStyle(bar).marginTop) || 0) + 6;
        return { top: start, room: bar.offsetTop - 6 - start };
      }
      function showOpp(n) {
        n.opp = true;
        if (over) return;
        if (oppRoom().room < 56) {
          // unten ist kein Platz für beides: ein Lob für deinen letzten Zug bleibt stehen, außer der Computer bringt Gefahr
          // (Schach, nachgeprüfte Drohung auf Matt oder Material); dann steht das Lob als Kopfzeile darüber
          if ((trainerNote?.praise || trainerNote?.again) && trainerNote.ply >= plies.length - 2 && !n.danger) return;
          return showLine(n);
        }
        trainerOpp = n;
        trainerOppEl.className = 'trainer-line trainer-opp tone-' + n.tone;
        lineButton(trainerOppEl, n);
        trainerOppEl.innerHTML = lineHtml(n);
        placeLine(); paintLine();
      }
      function hideOpp() {
        trainerOpp = null;
        if (!trainerOppEl) return;
        trainerOppEl.className = 'trainer-line trainer-opp hidden'; trainerOppEl.innerHTML = '';
      }
      function placeLine() {
        // vorher zu eng, jetzt wieder Platz oben: der Computer geht zurück an seine Leiste, unten bleibt deine Bewertung
        if (!trainerOpp && trainerNote?.opp && oppRoom().room >= 64) {
          const n = trainerNote, mine = trainerMine;
          trainerNote = null;
          if (mine) showLine(mine); else hideBottom();
          return showOpp(n);
        }
        if (trainerOpp) {
          const { top, room } = oppRoom();
          // nach einer Größenänderung oben zu eng: dann unten zeigen
          if (room < 56) { const n = trainerOpp; hideOpp(); showOpp(n); }
          else { trainerOppEl.style.top = top + 'px'; trainerOppEl.style.height = room + 'px'; trainerOppEl.classList.toggle('tight', room < 90); trainerOppEl.classList.toggle('tiny', room < 62); }
        }
        if (!trainerNote) return;
        const row = root.querySelector('.match > .ctrl-row');
        let top = bars.bot.offsetTop + bars.bot.offsetHeight + 6, room = row.offsetTop - 6 - top;
        // kurze Bildschirme: reicht der Platz nicht für Überschrift und eine Zeile, liegt die Zeile über der eigenen Spielerleiste
        // (im Trainer gibt es keine Uhr, dort steht nur der Name)
        const cover = room < 56; if (cover) { top = bars.bot.offsetTop; room = row.offsetTop - 6 - top; }
        match.classList.toggle('trainer-line-cover', cover);
        trainerLine.style.top = top + 'px'; trainerLine.style.height = Math.max(0, room) + 'px';
        trainerLine.classList.toggle('tight', room < 90); trainerLine.classList.toggle('tiny', room < 62);
      }
      // Pfeile und Zeichen nur zur Stellung auf dem Brett (eine Bewertung von vor dem Computerzug zeigt keine Pfeile mehr)
      function paintLine() {
        fx.querySelectorAll('.tl-mark').forEach(x => x.remove());
        if (!squareEls[0]) return;
        const now = [trainerOpp, trainerNote].filter(n => n && n.ply === plies.length - 1);
        trainerArrows(now.flatMap(n => n.arrows || []), 'tl-mark');
        const n = trainerNote;
        if (n?.mark && n.ply === plies.length - 1) { const { x, y } = disp(n.mark.sq), b = document.createElement('div'); b.className = 'qbadge stay tl-mark ' + n.mark.cls; b.style.left = ((x + 1) * 12.5) + '%'; b.style.top = (y * 12.5) + '%'; b.innerHTML = `<b>${n.mark.sym}</b>`; fx.appendChild(b); }
      }
      async function openLine(n) {
        if (!n) return;
        Sound.play('tap');
        // unten mit Kopfzeile: erst deine Bewertung, dann der Kommentar darunter
        const mine = n === trainerNote ? mineFor(n) : null, u = n.undo ? n : mine?.undo ? mine : null;
        // der erklärte Zug ist noch dein letzter Zug auf dem Brett (der Computer darf inzwischen geantwortet haben)
        const pl = u && plies[u.ply], my = gen;
        const stillLast = () => !!u && gen === my && !over && plies[u.ply] === pl && u.ply === plies.length - (S.turn === playerColor ? 2 : 1);
        const canUndo = !!u && undoOk() && hist.length && !!pl && stillLast();
        const head = x => x.title + (x.move ? ' · ' + x.move : ''), first = mine && !n.danger ? mine : n, next = mine && (first === n ? mine : n);
        const html = `<p>${first.text || ''}</p>` + (next ? `<p class="tl-next"><b>${UI.esc(head(next))}</b><br>${next.text || ''}</p>` : '');
        const v = await ctx.modal({ title: head(first), cls: 'trainer-explain tone-' + first.tone, html,
          buttons: [canUndo ? { label: T('Zug zurück'), value: 'undo' } : null, { label: T('Verstanden'), value: null, primary: true }].filter(Boolean) });
        if (v === 'undo' && stillLast()) undo();
      }
      for (const [el, get] of [[trainerLine, () => trainerNote], [trainerOppEl, () => trainerOpp]]) {
        el.addEventListener('click', () => openLine(get()));
        el.addEventListener('keydown', e => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); openLine(get()); } });
      }
      function hideBottom() {
        trainerNote = null; trainerMine = null;
        if (!trainerLine) return;
        trainerLine.className = 'trainer-line hidden'; trainerLine.innerHTML = '';
        match.classList.remove('trainer-line-on', 'trainer-line-cover');
        root.querySelector('.ctrl-row [data-a=undo]')?.classList.remove('trn-undo');
        paintLine();
      }
      function hideLine() {
        hideOpp(); hideBottom();
        fx.querySelectorAll('.tl-mark').forEach(x => x.remove());
      }
      // gespeicherte Notizen in der aktuellen Sprache: Text wie gespeichert, sonst eine kurze Fassung (nie zwei Sprachen gemischt)
      const sameLang = x => !x.lang || x.lang === (window.DA_LANG || 'de');
      const savedSan = x => plies[x.ply]?.san || x.m;
      // zurückgenommene Züge stehen nicht mehr in der Partie: aus der gemerkten Stellung neu schreiben (Notation der aktuellen Sprache)
      const undoneSan = x => {
        if (/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(x.u || '') && (x.fen || x.pos)) {
          try { const S0 = E.fromFEN(x.fen || x.pos), L = E.legal(S0), m = L.find(v => uciOfMove(v) === x.u); if (m) return E.toSAN(S0, m, L); } catch (e) { /* gespeichert */ }
        }
        return x.m;
      };
      function savedBest(x) {
        const p = plies[x.ply];
        if (x.bu && p) { try { const L = E.legal(p.S), m = L.find(v => uciOfMove(v) === x.bu); if (m) return E.toSAN(p.S, m, L); } catch (e) { /* gespeichert */ } }
        return sameLang(x) ? x.best : '';
      }
      function savedText(x) {
        if (sameLang(x)) return x.text || '';
        if (x.line) return ''; // Lob: Titel und Zug reichen
        const b = savedBest(x);
        return b && ['meh', 'bad'].includes(x.cls) ? T('Besser war {b}.', { b }) : b && x.cls === 'ok' ? T('Etwas besser war {b}.', { b }) : '';
      }
      // nach dem Fortsetzen: die gespeicherte Bewertung deines letzten Zugs wieder unten zeigen
      function trainerShowSaved() {
        if (!trLog || !trainerOn() || over) return;
        const x = [...(trLog.moves || [])].reverse().find(v => v.ply >= plies.length - 2), p = x && plies[x.ply];
        if (!p || p.mover !== playerColor || !TONES[x.cls] || (x.cls === 'uncertain' && !savedText(x))) return;
        const bSan = savedBest(x), L = E.legal(p.S), [tone, sym, title] = TONES[x.cls], best = bSan && L.find(m => E.toSAN(p.S, m, L) === bSan);
        let text = UI.esc(savedText(x));
        if (bSan) text = text.replace(UI.esc(bSan) + '.', `<b>${UI.esc(bSan)}</b>.`);
        showLine({ tone, sym, title: T(title), move: moveLabel(p.S, p.san), text, arrows: best ? [{ f: best.f, t: best.t, kind: 'best' }] : [], ply: x.ply, undo: ['meh', 'bad'].includes(x.cls), own: true, mark: { sq: p.m.t, cls: BADGE[tone], sym } });
      }
      // nur für Partien, die schon mit Trainer-Notizen gespeichert wurden (eine ohne Trainer begonnene bleibt unbewertet)
      function showOwnIfHidden() {
        const ply = [plies.length - 1, plies.length - 2].find(i => plies[i]?.mover === playerColor);
        if (ply === undefined || [trainerNote, trainerMine].some(n => n?.own && n.ply === ply)) return;
        if ((trLog?.moves || []).some(x => x.ply === ply)) trainerShowSaved();
      }
      // quiet: nur für die Notizen (nach „Zug zurück“ steht unten nichts)
      function trainerJudgeMissing(quiet = false) {
        if (!trLog || !trainerOn() || over) return;
        const ply = [plies.length - 1, plies.length - 2].find(i => plies[i]?.mover === playerColor), p = plies[ply];
        if (!p || (trLog.moves || []).some(x => x.ply === ply)) return;
        const my = gen;
        compare(p.S, p.m, { timeMs: 700 }).then(r => { if (my === gen) trainerVerdict({ S: p.S, m: p.m, ply }, r, quiet); });
      }
      // Bewertung des eigenen Zugs: dieselbe geprüfte Zugvergleichs-Suche wie in der Analyse, angestoßen vor dem Zug des Computers
      function trainerJudgeStart(p) {
        if (!p || !trLog || !trainerOn() || S !== p.S || S.turn !== playerColor) return;
        const my = gen, ply = plies.length, at = { S: p.S, m: p.m, ply };
        // geprüfter Buchzug (durchgehend aus der Grundstellung): sofort kommentieren, ohne Suche
        let book = false; try { book = !p.r && !!window.ChessOpenings?.scan([...plies, { S: p.S, m: p.m }]).rows[ply]?.trusted && !!ChessOpenings.lookup(p.S, p.m)?.trusted; } catch (e) { book = false; }
        (p.r ? Promise.resolve(p.r) : book ? Promise.resolve({ book: true }) : compare(p.S, p.m, { timeMs: 700 })).then(r => { if (my === gen) trainerVerdict(at, r); });
      }
      const TONES = { best: ['great', '★', 'Bester gefundener Zug'], good: ['good', '✓', 'Guter Zug'], opening: ['good', '✓', 'Bekannter Eröffnungszug'], forced: ['ok', '□', 'Einziger Zug'],
        ok: ['ok', '·', 'Spielbar'], meh: ['meh', '?!', 'Ungenau'], bad: ['bad', '??', 'Fehler'], uncertain: ['ok', '·', 'Dein Zug'] };
      const BADGE = { great: 'great', good: 'good', ok: 'okq', meh: 'meh', bad: 'bad' };
      function coachFact(s, m) { try { const f = ChessCoach.purpose(s, m).facts[0]; return f ? ChessCoach.renderFact(f, s.turn, s.turn) : ''; } catch (e) { return ''; } }
      // Übungsbeleg eines nachgeprüften Fehlers: nur mit legaler, abweichender Lösung, vollständigen Varianten und einer erklärbaren Aufgabe
      function practiceProof(p, row) {
        try {
          if (row.recommendationStatus !== 'verified' || !row.best || row.same || !window.ChessAnalysis || !ChessCoach.lesson(p.S, p.m, row.best, row)) return null;
          const proof = ChessAnalysis.proof(row);
          return proof ? { best: uciOfMove(row.best), bsan: E.toSAN(p.S, row.best), ev: row.evBest, proof, engine: ChessCoach.version, rev: E.ENGINE_REVISION } : null;
        } catch (e) { return null; }
      }
      function trainerVerdict(p, r, quiet = false) {
        const pl = plies[p.ply];
        if (!trLog || !trainerOn() || !pl || pl.S !== p.S || uciOfMove(pl.m) !== uciOfMove(p.m)) return;
        const row = { ...(r || { unavailable: true, uncertain: true }), S: p.S, m: p.m, mover: p.S.turn };
        row.same = !!row.best && uciOfMove(row.best) === uciOfMove(p.m);
        try { row.opening = window.ChessOpenings?.scan(plies.slice(0, p.ply + 1)).rows[p.ply] || null; } catch (e) { row.opening = null; }
        let cls; try { cls = classify(row).cls; } catch (e) { cls = 'uncertain'; }
        if (cls === 'miss') cls = 'bad';
        if (!VERDICTS.includes(cls) || row.recommendationStatus === 'unconfirmed') cls = 'uncertain';
        // „Ungenau“ und „Fehler“ nur, wenn der bessere Zug nachgeprüft ist
        if (['meh', 'bad'].includes(cls) && (row.recommendationStatus !== 'verified' || !row.best)) cls = 'uncertain';
        const san = pl.san, lang = window.DA_LANG || 'de', bestSan = row.best && !row.same ? E.toSAN(p.S, row.best) : '', B = bestSan ? `<b>${UI.esc(bestSan)}</b>` : '';
        let text = '', arrows = [];
        if (cls === 'bad') {
          const parts = [];
          if (row.mateError) {
            parts.push(UI.esc(T('Danach kann der Gegner matt setzen.')));
            try { const after = E.make(p.S, p.m), u = (row.pvPlayed || [])[1], rp = u && E.legal(after).find(x => uciOfMove(x) === u); if (rp) arrows.push({ f: rp.f, t: rp.t, kind: 'threat' }); } catch (e) { /* ohne Pfeil */ }
          } else try {
            const model = ChessTeaching.line(p.S, row.pvPlayed || []), st = model.valid && model.steps[1];
            if (st) {
              const rp = st.move, check = E.inCheck(st.after);
              const key = rp.cap ? (check ? '{p} auf {f} schlägt auf {t} und gibt Schach.' : '{p} auf {f} schlägt auf {t}.') : (check ? '{p} auf {f} zieht nach {t} und gibt Schach.' : '{p} auf {f} zieht nach {t}.');
              parts.push(UI.esc(T(key, { p: ChessTeaching.piecePhrase(rp.p, 'subject', lang !== 'tr'), f: E.sqName(rp.f), t: E.sqName(rp.t) })));
              arrows.push({ f: rp.f, t: rp.t, kind: 'threat' });
              if (model.settled && model.balance) parts.push(UI.esc(ChessCoach.renderFact(model.balance, p.S.turn, p.S.turn)));
            }
          } catch (e) { /* ohne Folge */ }
          if (B) parts.push(T('Besser war {b}.', { b: B }));
          text = parts.join(' ');
        } else if (cls === 'meh' || cls === 'ok') {
          if (B) { text = T(cls === 'ok' ? 'Etwas besser war {b}.' : 'Besser war {b}.', { b: B }); const why = cls === 'meh' && coachFact(p.S, row.best); if (why) text += ' ' + UI.esc(why); }
        } else {
          const why = coachFact(p.S, p.m);
          text = UI.esc(why || (cls === 'forced' ? T('Das war der einzige legale Zug.') : cls === 'opening' ? T('Dieser Zug gehört zur geprüften Eröffnungstabelle.') : ''));
        }
        if (bestSan && ['meh', 'bad', 'ok'].includes(cls)) arrows.push({ f: row.best.f, t: row.best.t, kind: 'best' });
        const no = moveNo(p.S), plain = text.replace(/<[^>]+>/g, '');
        trLog.moves = (trLog.moves || []).filter(x => x.ply !== p.ply);
        let w = 0; try { w = row.mateError ? 100 : Math.round(row.winLoss ?? E.comparisonMetrics(row.evBest, row.evPlayed, p.S.turn).winLoss) || 0; } catch (e) { w = 0; }
        trLog.moves.push({ ply: p.ply, cls, no, m: san, best: bestSan, text: plain.slice(0, 300), w, lang: window.DA_LANG || 'de', bu: row.best && !row.same ? uciOfMove(row.best) : '', pz: cls === 'bad' ? practiceProof(p, row) : null });
        // ein Lob, das auf diese Bewertung gewartet hat: passt es, steht es statt der Bewertung (es sagt mehr)
        { const rec = trLog.again.find(x => x.ply === p.ply); if (rec?.maybe) { rec.better = !['meh', 'bad', 'uncertain'].includes(cls); delete rec.maybe; } }
        const waiting = praiseWaiting.get(p.ply); praiseWaiting.delete(p.ply);
        if (waiting && waiting.p.S === p.S && uciOfMove(waiting.p.m) === uciOfMove(p.m)) { if (praiseFits(waiting.praise, cls)) return offerPraise(waiting.praise, waiting.p, waiting.o); praiseDropped(waiting.praise); }
        // bewiesenes Matt wurde schon gelobt; ein Fehler kann es nicht sein
        if (!over) saveGame();
        if (quiet || over || trainerQ || (trainerNote?.ply === p.ply && trainerNote.praise && !['meh', 'bad'].includes(cls))) return;
        if (cls === 'uncertain' && !text) return;
        const [tone, sym, title] = TONES[cls];
        const note = { tone, sym, title: T(title), move: moveLabel(p.S, san), text, arrows, ply: p.ply, undo: ['meh', 'bad'].includes(cls), own: true, mark: { sq: p.m.t, cls: BADGE[tone], sym } };
        // unten steht schon etwas Späteres (Wiedersehen, oder der Computer auf kurzen Bildschirmen): deine Bewertung kommt als Kopfzeile dazu
        if (trainerNote && trainerNote.ply > p.ply) { trainerMine = note; return showLine(trainerNote); }
        showLine(note);
      }
      // nachgeprüfte Drohung des Gegners in dieser Stellung (Matt oder Material), je Stellung einmal gerechnet
      let threatSeen = null;
      function threatOf(at) {
        if (threatSeen?.S !== at) { let t = null; try { t = ChessCoach.threatNow(at); } catch (e) { t = null; } threatSeen = { S: at, t: t?.verified && Number.isInteger(t.from) ? t : null }; }
        return threatSeen.t;
      }
      // Zug des Computers: nur kommentieren, wenn er etwas will (Schach, Schlagen, Angriff).
      // Bringt er Gefahr (Schach, nachgeprüfte Drohung), steht die zuerst im Text.
      function trainerOppNote(at, threat = null) {
        const last = plies.at(-1);
        if (!last || last.mover === playerColor || S !== at) return false;
        let facts = [], arrows = [];
        try { const pu = ChessCoach.purpose(last.S, last.m); facts = pu.facts; arrows = (pu.arrows || []).filter(a => a.kind === 'attack').map(a => ({ f: a.from, t: a.to, kind: 'threat' })); } catch (e) { return false; }
        // was erst nach dem nächsten Zug droht, findest du selbst (die Denkfrage und das Lob „Gut gesehen“ hängen daran)
        facts = facts.filter(f => !/droht/.test(f.key || ''));
        const check = E.inCheck(at), notable = facts.filter(f => /^Mit \{b\} (greifst|schlägst|setzt|gibst)/.test(f.key || '') || f.type === 'capture' || f.type === 'fork' || f.type === 'double-attack');
        if (!check && !last.m.cap && !notable.length) return false;
        const why = (notable.length ? notable : facts).slice(0, 1).map(f => ChessCoach.renderFact(f, last.S.turn, playerColor)).join(' ');
        // Schach zuerst nennen; eine Drohung wird nicht ausgeschrieben, sie zählt nur für den Platz auf kurzen Bildschirmen
        const warn = check && !/Schach|gibst/.test(notable[0]?.key || '') ? T('Der Computer gibt Schach.') : '';
        const text = [warn, why].filter(Boolean).join(' ');
        if (!text) return false;
        const shown = arrows.slice(0, 1);
        showOpp({ tone: 'opp', sym: Icon('cpu'), title: T('Computer'), move: moveLabel(last.S, last.san), text: UI.esc(text), arrows: shown, ply: plies.length - 1, danger: check || !!threat });
        // zeigt der Pfeil auf die drohende Figur oder ihr Ziel (bei Gabeln auch die Ziele), ist die Drohung verraten
        const spots = threat ? [threat.from, threat.to, ...(threat.targets || []).map(x => x.square)] : [];
        return shown.some(a => spots.includes(a.f) || spots.includes(a.t) || spots.includes(E.sqName(a.t)) || spots.includes(E.sqName(a.f)));
      }
      function warnBody(q, phase, answer) {
        const t = q.t, kind = q.kind;
        if (phase === 'ask') {
          const what = kind === 'mate' ? T('Achtung: Der Gegner droht Matt.') : t.kind === 'fork' ? T('Achtung: Der Gegner droht eine Gabel.') : t.kind === 'double-attack' ? T('Achtung: Der Gegner droht einen Doppelangriff.')
            : kind === 'pin' ? T('Achtung: Der Gegner droht eine Fesselung.') : T('Achtung: Der Gegner droht, Material zu gewinnen.');
          const known = q.mine.n >= 2 ? `<p class="tr-known">${UI.esc(T('Das kennst du: In {n} deiner letzten {k} Partien hast du so etwas übersehen.', { n: q.mine.n, k: q.mine.k }))}</p>` : '';
          return `<div class="tr-body">${known}<p>${UI.esc(what)} <span class="tr-tip">${T('Welche Figur droht? Tippe sie an.')}</span></p></div>
            <div class="tr-acts one"><button type="button" class="btn" data-tr="skip">${T('Überspringen')}</button></div>`;
        }
        const lead = answer === 'right' ? T('Richtig erkannt.') : answer === 'wrong' ? T('Nicht ganz.') : '';
        let fact = ''; try { fact = ChessCoach.renderFact(t.fact, q.s.turn, q.s.turn); } catch (e) { fact = ''; }
        trainerRay(t.from, t.to);
        return `<div class="tr-body"><p>${lead ? `<b>${UI.esc(lead)}</b> ` : ''}${altText(q, answer)}${UI.esc(fact)}</p><p class="tr-line">${T('Was tust du dagegen?')}</p></div>
          <div class="tr-acts one"><button type="button" class="btn primary" data-tr="next">${T('Weiter')}</button></div>`;
      }
      const altText = (q, answer) => answer === 'right' && q.alt ? UI.esc(T(q.alt.mate ? 'Auch {m} setzt matt.' : 'Auch {m} gewinnt hier Material.', { m: q.alt.san })) + ' ' : '';
      function showTrainer(phase, answer) {
        const q = trainerQ; if (!q) return;
        q.phase = phase;
        fx.querySelectorAll('.tr-ray').forEach(n => n.remove());
        const other = q.s?.turn === 'w' ? 'b' : 'w', lang = window.DA_LANG || 'de';
        let body;
        if (q.type === 'warn') body = warnBody(q, phase, answer);
        else if (q.type === 'repeat') {
          const m = '<b>' + UI.esc(q.san) + '</b>';
          body = '<div class="tr-body"><p>' + (q.who === 'own' ? T('Mit {m} steht dieselbe Stellung zum dritten Mal auf dem Brett. Das ist Remis.', { m }) : T('Nach {m} kann der Computer dieselbe Stellung zum dritten Mal herbeiführen. Das ist Remis.', { m }))
            + ' ' + UI.esc(T('Du stehst besser. Möchtest du weiterspielen oder das Remis zulassen?')) + '</p></div>'
            + '<div class="tr-acts"><button type="button" class="btn primary" data-tr="other">' + T('Anderen Zug suchen') + '</button><button type="button" class="btn" data-tr="play">' + T('Trotzdem spielen') + '</button></div>';
        }
        else if (phase === 'ask') {
          body = `<div class="tr-body"><p>${T(other === 'b' ? 'Bevor du {m} spielst: Was kann Schwarz danach tun?' : 'Bevor du {m} spielst: Was kann Weiß danach tun?', { m: `<b>${UI.esc(q.san)}</b>` })} <span class="tr-tip">${T('Tippe die Figur an.')}</span></p></div>
            <div class="tr-acts one"><button type="button" class="btn" data-tr="skip">${T('Überspringen')}</button></div>`;
        } else {
          const rp = q.reply, st = q.model.steps[1], check = E.inCheck(st.after);
          const key = rp.cap ? (check ? '{p} auf {f} schlägt auf {t} und gibt Schach.' : '{p} auf {f} schlägt auf {t}.') : (check ? '{p} auf {f} zieht nach {t} und gibt Schach.' : '{p} auf {f} zieht nach {t}.');
          const what = T(key, { p: ChessTeaching.piecePhrase(rp.p, 'subject', lang !== 'tr'), f: E.sqName(rp.f), t: E.sqName(rp.t) });
          const end = ChessCoach.renderFact(q.model.balance, q.s.turn, q.s.turn);
          const lead = answer === 'right' ? T('Richtig erkannt.') : answer === 'wrong' ? T('Nicht ganz.') : '';
          body = `<div class="tr-body"><p>${lead ? `<b>${UI.esc(lead)}</b> ` : ''}${altText(q, answer)}${UI.esc(what)} ${UI.esc(end)}</p></div>
            <div class="tr-acts"><button type="button" class="btn primary" data-tr="other">${T('Anderen Zug suchen')}</button><button type="button" class="btn" data-tr="play">${T('Trotzdem spielen')}</button></div>`;
          // die Folge steht als nummerierte Pfeile auf dem Brett: 1 dein Zug, 2 die Antwort
          trainerArrows(q.model.steps.slice(0, 2).map((x, i) => ({ f: x.move.f, t: x.move.t, kind: i % 2 ? 'threat' : 'mine', n: i + 1 })), 'tr-ray');
        }
        const hadFocus = trainerCard.contains(document.activeElement);
        trainerCard.className = 'trainer-card ' + (answer || phase);
        trainerCard.innerHTML = `<div class="tr-head">${Logo(24, 'tr-logo')}<b>${q.type === 'repeat' ? T('Remis durch Wiederholung') : T('Denkfrage')}</b><button type="button" class="tr-x" data-tr="off" aria-label="${T('Trainer für diese Partie aus')}">${T('Trainer aus')}</button></div>${body}`;
        match.classList.add('trainer-open');
        placeCard();
        // wer mit Tastatur oder Vorlesen in der Karte war, bleibt dort (der angetippte Knopf ist nach dem Neuaufbau weg)
        if (hadFocus) trainerCard.querySelector('.tr-acts .btn')?.focus();
        selected = -1; targets = [];
        refreshSquares();
        if (phase === 'ask') Haptic.fire('sel');
      }
      // die Karte liegt unter dem Brett über der eigenen Spielerleiste, Status und Knopfleiste (ohne Uhr steht dort nur der Name)
      function placeCard() {
        if (!trainerQ || trainerCard.classList.contains('hidden')) return;
        trainerCard.style.maxHeight = ''; trainerCard.style.minHeight = ''; trainerCard.style.top = bars.bot.offsetTop + 'px';
        // die Karte deckt genau den Bereich bis zur Unterkante der Knopfleiste ab: keine Lücke darunter, Knöpfe am Daumen
        { const row = root.querySelector('.match > .ctrl-row'); trainerCard.style.minHeight = Math.max(0, row.offsetTop + row.offsetHeight - trainerCard.offsetTop) + 'px'; }
        // kein Scrollen in der Karte: reicht der Platz unter dem Brett nicht, rückt sie nach oben über die Spielerleiste
        { const view = root.closest('#view'), bottom = view ? view.getBoundingClientRect().bottom - (parseFloat(getComputedStyle(view).paddingBottom) || 0) : innerHeight;
          const over = trainerCard.getBoundingClientRect().bottom - bottom + 4; if (over > 0) trainerCard.style.top = Math.max(0, bars.bot.offsetTop - over) + 'px'; }
      }
      function hideTrainer() {
        if (!trainerQ && trainerCard.classList.contains('hidden')) return;
        trainerQ = null; trainerCard.className = 'trainer-card hidden'; trainerCard.innerHTML = '';
        match.classList.remove('trainer-open');
        fx.querySelectorAll('.tr-ray').forEach(n => n.remove());
        if (S && squareEls[0]) refreshSquares();
      }
      // eine andere Figur, die auf dasselbe Feld zieht (Denkfrage oder Vorwarnung), zählt als richtig, wenn ihr Zug nachweislich genug bringt:
      // ist die geprüfte Antwort Matt, muss sie auch matt setzen; sonst mindestens eine Leichtfigur nach dem Abtausch auf dem Feld (oder Matt).
      // Gibt die Figur zurück, deren Zug angenommen wird (oder null).
      const WORTH = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
      function moveProof(after, mv) {
        const white = after.turn === 'w', next = E.make(after, mv);
        if (E.inCheck(next) && !E.legal(next).length) return { mate: true, gain: Infinity };
        const mat = st => st.b.reduce((n, x) => n + (x ? (E.isW(x) === white ? 1 : -1) * WORTH[x.toUpperCase()] : 0), 0);
        let end = NaN; try { end = ChessCoach.exchange(next, mv.t, white); } catch (e) { end = NaN; }
        return { mate: false, gain: Number.isFinite(end) ? end - mat(after) : -Infinity };
      }
      function altMove(after, ref, sq, mateGoal = false) {
        const L = E.legal(after), alt = L.find(x => x.f === sq && x.t === ref.t), mv = L.find(x => x.f === ref.f && x.t === ref.t);
        if (!alt || !mv) return null;
        try {
          const a = moveProof(after, alt), b = moveProof(after, mv);
          return (b.mate || mateGoal ? a.mate : a.mate || a.gain >= 300) ? alt : null;
        } catch (e) { return null; }
      }
      function trainerTap(sq) {
        const q = trainerQ;
        if (!q || q.phase !== 'ask') return;
        const p = q.s.b[sq];
        if (!p || colorOf(p) === q.s.turn) return;
        // Vorwarnung: die drohende Figur. Denkfrage: die Figur aus der geprüften Folge oder eine andere, die auf dasselbe Feld schlagen kann
        const base = q.type === 'warn' ? passState(q.s, q.s.turn === 'w' ? 'b' : 'w') : E.make(q.s, q.m), ref = q.type === 'warn' ? { f: q.t.from, t: q.t.to } : q.reply;
        const mateGoal = q.type === 'warn' ? ChessTrainer.kindOf(q.t) === 'mate' : !!q.model?.mated;
        const alt = sq !== ref.f && Number.isInteger(ref.t) ? altMove(base, ref, sq, mateGoal) : null;
        const right = sq === ref.f || !!alt;
        // angenommene andere Figur: die Antwort nennt sie ausdrücklich, bevor sie die geprüfte Folge erklärt
        q.alt = alt ? { san: E.toSAN(base, alt), mate: moveProof(base, alt).mate } : null;
        if (q.type === 'question') trLog?.asks.push({ ply: plies.length, right });
        Sound.play('tap');
        showTrainer('answer', right ? 'right' : 'wrong');
      }
      trainerCard.addEventListener('click', e => {
        const b = e.target.closest('[data-tr]'); if (!b || !trainerQ) return;
        const q = trainerQ, a = b.dataset.tr;
        Sound.play('tap');
        if (a === 'skip') { if (q.type === 'question') trLog?.asks.push({ ply: plies.length, right: false, skip: true }); showTrainer('answer', 'skip'); }
        else if (a === 'off') { trainerOff = true; hideTrainer(); hideLine(); deselect(); refresh(); if (!over) saveGame(); UI.toast(T('Trainer für diese Partie aus'), 1800); }
        else if (a === 'other') { if (q.type !== 'repeat') trainerRetry = { S: q.s }; hideTrainer(); deselect(); refresh(); showOwnIfHidden(); }
        else if (a === 'next') { hideTrainer(); refresh(); showOwnIfHidden(); }
        else if (a === 'play') { hideTrainer(); if (S === q.s && !over && !busy) { trainerJudgeStart(q.pending); doMove(q.m); trainerAfter(q.pending); } }
      });
      // zurückgenommene Fehler als Übungen für „Aus Fehlern lernen“ (je Stellung einmal; Herkunft ohne Halbzug, der Zug steht nicht in der Partie)
      function undoneTasks() {
        const out = [], keys = new Set();
        for (const x of trLog?.undone || []) {
          if (!x.pz || !x.fen) continue;
          try {
            const S0 = E.fromFEN(x.fen), L = E.legal(S0), m = L.find(v => uciOfMove(v) === x.u), b = L.find(v => uciOfMove(v) === x.pz.best);
            const k = x.fen.split(' ').slice(0, 4).join(' ');
            if (!m || !b || keys.has(k)) continue;
            keys.add(k);
            out.push({ fen: x.fen, best: x.pz.best, played: x.u, bsan: x.pz.bsan, san: E.toSAN(S0, m, L), ev: x.pz.ev, at: Date.now() - out.length,
              source: { id: archiveId || null, code: null, date: gameDate, type: 'trainer-undo' }, engine: x.pz.engine, analysis: 'denkarena', explainable: true, proof: x.pz.proof, rev: x.pz.rev });
          } catch (e) { /* ohne diese Stellung */ }
        }
        return out;
      }
      // „Jetzt üben“: übernehmen und nur diese Stellungen üben. Eine schon gespeicherte Stellung behält ihre Aufgabe und ihren Lernstand.
      const fenKey4 = f => f.split(' ').slice(0, 4).join(' ');
      const savedMistake = f => window.ChessMistakes ? Object.values(ChessMistakes.all()).find(m => m?.fen && fenKey4(m.fen) === fenKey4(f)) : null;
      // übungsfähig: neu, oder schon gespeichert und noch offen und erklärbar
      function undoneOpen() {
        if (!window.ChessMistakes || (Store.get('stats.reset', 0) || 0) > (trLog?.since || 0)) return [];
        return undoneTasks().filter(t => { const m = savedMistake(t.fen); return !m || (!m.fixed && m.explainable !== false); });
      }
      function practiceUndone() {
        const tasks = undoneOpen();
        if (!tasks.length) { UI.toast(T('Diese Stellungen sind nicht mehr gespeichert.')); return; }
        const key = fenKey4, fresh = tasks.filter(t => !savedMistake(t.fen));
        if (fresh.length) ChessMistakes.add(fresh);
        const now = ChessMistakes.all(), fens = tasks.map(t => Object.values(now).find(m => m?.fen && key(m.fen) === key(t.fen))).filter(m => m && !m.fixed && m.explainable !== false).map(m => m.fen);
        if (!fens.length) { UI.toast(T('Diese Stellungen sind nicht mehr gespeichert.')); return; }
        ctx.openGame('puzzles', { mistakes: true, trainingFens: fens, trainingGroup: archiveId ? 'id:' + archiveId : null });
      }
      // Nachbesprechung im Ergebnisfenster: was gut war, Drohungen und Denkfragen, Entwicklung über Partien, nächstes Ziel
      function trainerReview() {
        if (!trLog || trainerOff || settings.style !== 'trainer' || !solo() || contGame || fantasySetup || viewing || clock || !window.ChessTrainer) return { html: '', kind: null };
        // vor „Statistik löschen“ begonnene Partie: Notizen verwerfen und nicht in die Statistik übernehmen
        const stale = (Store.get('stats.reset', 0) || 0) > (trLog.since || 0); trainerFresh();
        const key = trainerKey(), count = seen => trLog.events.filter(x => !x.warned && x.seen === seen).reduce((o, x) => (o[x.kind] = (o[x.kind] || 0) + 1, o), {});
        const log = { seen: count(true), missed: count(false) };
        for (const x of trLog.undone || []) if (x.kind) log.missed[x.kind] = (log.missed[x.kind] || 0) + 1;
        // nach „Statistik löschen“ zählt eine vorher begonnene Partie nicht mehr in die Statistik
        if (plies.length >= 6 && !stale) ChessTrainer.record({ id: archiveId }, playerColor, log);
        const lines = [], best = [...trLog.praise].sort((a, b) => b.rank - a.rank || a.ply - b.ply)[0], mv = trLog.moves || [], open = plies.length >= 4;
        if (mv.length) {
          const n = list => mv.filter(x => list.includes(x.cls)).length, c = { good: n(['best', 'good', 'opening', 'forced']), ok: n(['ok']), meh: n(['meh']), bad: n(['bad']) }, open = n(['uncertain']);
          // nicht bewertbare Züge gehören nicht in die Leiste: sie werden nur gezählt
          if (c.good + c.ok + c.meh + c.bad) lines.push(`<div class="trv-bar" aria-hidden="true">${['good', 'ok', 'meh', 'bad'].map(k => c[k] ? `<i class="${k}" style="flex:${c[k]}"></i>` : '').join('')}</div>`);
          lines.push(`<p class="trv-sum"><span class="good">${T('Gut: {n}', { n: c.good })}</span> · <span>${T('Spielbar: {n}', { n: c.ok })}</span> · <span class="meh">${T('Ungenau: {n}', { n: c.meh })}</span> · <span class="bad">${T('Fehler: {n}', { n: c.bad })}</span>${open ? ` · <span>${T('Nicht bewertet: {n}', { n: open })}</span>` : ''}</p>`);
        }
        const row = (ply, cls, sym, head, text) => { const inner = `<span class="trv-sym ${cls}">${sym}</span><span class="trv-txt"><b>${UI.esc(head)}</b>${UI.esc(text)}</span>`;
          return open ? `<button type="button" class="trv-row" data-tr-ply="${ply + 1}">${inner}${Icon('chevron')}</button>` : `<div class="trv-row">${inner}</div>`; };
        const label = x => `${x.no}${plies[x.ply]?.mover === 'b' ? '…' : '.'} ${savedSan(x)}`;
        const top = best || [...mv].reverse().find(x => x.cls === 'best' && savedText(x)) || null;
        if (top) lines.push(row(top.ply, 'good', '!', label(top), savedText(top) || T('Stark')));
        const byLoss = cls => mv.filter(x => x.cls === cls).sort((a, b) => (b.w || 0) - (a.w || 0) || a.ply - b.ply);
        const worst = byLoss('bad')[0] || byLoss('meh')[0];
        if (worst) lines.push(row(worst.ply, worst.cls, worst.cls === 'bad' ? '??' : '?!', label(worst), savedText(worst) || (savedBest(worst) ? T('Besser war {b}.', { b: savedBest(worst) }) : '')));
        const un = trLog.undone || [];
        if (un.length && !webdemo) { const list = un.slice(0, 4).map(x => x.no + (playerColor === 'b' ? '…' : '.') + ' ' + undoneSan(x)).join(', ') + (un.length > 4 ? ' …' : '');
          const say = UI.esc(un.length === 1 ? T('Zurückgenommen: {m}. Die Stellung merke ich mir zum Üben.', { m: list }) : T('Zurückgenommen: {m}. Die Stellungen merke ich mir zum Üben.', { m: list }));
          lines.push(undoneOpen().length ? `<div class="tr-goal tr-undone"><p>${say}</p><button type="button" class="btn small-btn" data-tr-undo>${T('Jetzt üben')}</button></div>` : `<p class="trv-stat">${say}</p>`); }
        const seen = trLog.events.filter(x => !x.warned && x.seen).length, all = trLog.events.filter(x => !x.warned).length + un.filter(x => x.kind).length;
        if (all) lines.push(`<p class="trv-stat">${UI.esc(T('Drohungen ohne Hilfe erkannt: {n} von {k}', { n: seen, k: all }))}</p>`);
        // übersprungene Denkfragen zählen nicht als „nicht gefunden“
        const answered = trLog.asks.filter(x => !x.skip), asks = answered.length, found = answered.filter(x => x.right).length;
        if (asks) lines.push(`<p class="trv-stat">${UI.esc(asks === 1 ? (found ? T('Bei meiner Denkfrage hast du die Antwort selbst gefunden.') : T('Bei meiner Denkfrage hast du die Antwort diesmal nicht gefunden.')) : T('Denkfragen: {n} von {k} selbst gelöst', { n: found, k: asks }))}</p>`);
        const plans = trLog.plans.filter(x => x.foiled !== null);
        if (plans.length) lines.push(`<p class="trv-stat">${UI.esc(T('Pläne des Gegners vereitelt: {n} von {k}', { n: plans.filter(x => x.foiled).length, k: plans.length }))}</p>`);
        const pr = ChessTrainer.progress();
        if (pr) lines.push(`<p class="muted small">${UI.esc(T('Erkannte Drohungen in deinen letzten 5 Partien: {a} %, in den 5 davor: {b} %.', { a: pr.now, b: pr.before }))}</p>`);
        const kind = ChessTrainer.focus(log, key), goal = { fork: T('Gabeln früher sehen.'), pin: T('Fesselungen erkennen.'), mate: T('Mattdrohungen rechtzeitig sehen.'), threat: T('Vor jedem Zug prüfen, was der Gegner droht.') }[kind];
        const train = !webdemo && kind && window.ChessErrorProfile?.pool(kind).length ? kind : null;
        if (goal) lines.push(`<div class="tr-goal"><p><b>${T('Nächstes Ziel:')}</b> ${UI.esc(goal)}</p>${train ? `<button type="button" class="btn small-btn" data-tr-train>${T('Gezielt üben')}</button>` : ''}</div>`);
        if (!lines.length) return { html: '', kind: null };
        return { kind: train, html: `<section class="tr-review"><div class="tr-head">${Logo(22, 'tr-logo')}<b>${T('Trainer')}</b></div>${lines.join('')}</section>` };
      }

      function clearPremove(){clearTimeout(premoveT);premoves=[];selected=-1;targets=[];root.querySelector('.premove-note').classList.add('hidden');if(S&&squareEls[0])refreshSquares();}
      function paintPremovePlan(){
        fx.querySelectorAll('.premove-ghost,.premove-index').forEach(n=>n.remove());pieceEls.forEach(n=>n?.classList.remove('premove-source'));
        const note=root.querySelector('.premove-note');note.classList.toggle('hidden',!premoves.length);
        if(!premoves.length){note.querySelector('ol').replaceChildren();delete note.dataset.plan;return;}
        const view=ChessExtras.projectPremoves(S,premoves,playerColor);if(!view){clearPremove();UI.toast(T('Die Vorauszüge wurden gelöscht, weil sich die Stellung geändert hat.'));return;}
        note.querySelector('button').textContent=T('Alle Vorauszüge löschen')+' · '+premoves.length;
        const key=premoves.map(m=>m.f+':'+m.t+':'+m.p).join('|');
        if(note.dataset.plan!==key){note.dataset.plan=key;note.querySelector('ol').innerHTML=premoves.map((m,i)=>`<li><b>${i+1}</b><span class="premove-g">${Pieces.icon((m.promo||m.p).toUpperCase(),colorOf(m.p))}</span><span>${E.sqName(m.f)} → ${E.sqName(m.t)}${m.promo?' · '+T('Umwandlung zur Dame.'):''}</span></li>`).join('');}
        for(let sq=0;sq<64;sq++){
          const actual=S.b[sq],planned=view.b[sq];if(actual===planned)continue;
          if(actual&&colorOf(actual)===playerColor)pieceEls[sq]?.classList.add('premove-source');
          if(planned&&colorOf(planned)===playerColor){const ghost=document.createElement('div');ghost.className='piece '+playerColor+' premove-ghost';ghost.dataset.sq=sq;ghost.setAttribute('aria-hidden','true');ghost.innerHTML=`<span class="g">${Pieces.inner(planned.toUpperCase())}</span>`;place(ghost,sq);fx.append(ghost);}
        }
        const numbers=new Map();premoves.forEach((m,i)=>numbers.set(m.t,[...(numbers.get(m.t)||[]),i+1]));
        for(const [sq,steps] of numbers){const {x,y}=disp(sq),label=document.createElement('span');label.className='premove-index';label.setAttribute('aria-hidden','true');label.style.left=(x+1)*12.5+'%';label.style.top=y*12.5+'%';label.textContent=steps.join('/');fx.append(label);}
      }
      if (!webdemo) root.querySelector('[data-a=cancel-premove]').onclick=()=>{clearPremove();deselect();};
      const clearHiddenPremove=()=>{if(document.visibilityState==='hidden'){cancelBoardInput(true);clearPremove();}};
      const cancelLostFocus=()=>cancelBoardInput(true);
      window.addEventListener('blur',cancelLostFocus);
      window.addEventListener('resize',cancelLostFocus);
      document.addEventListener('visibilitychange',clearHiddenPremove);
      function runPremove(){
        if(!premoves.length||!online||!online.started||over||S.turn!==playerColor)return;
        if(premoveBlocked||document.visibilityState!=='visible'||!settings.premove){clearPremove();return;}
        const next=premoves[0];
        const m=sans.length===next.ply+1&&S.b[next.f]===next.p&&legalAll.find(x=>x.f===next.f&&x.t===next.t&&(x.promo||null)===(next.promo||null));
        if(m){premoves.shift();doMove(m);}else{clearPremove();UI.toast(T('Die Vorauszüge wurden gelöscht, weil der nächste Zug nicht mehr erlaubt ist.'));}
      }
      function schedulePremove(){clearTimeout(premoveT);premoveT=setTimeout(runPremove,0);}

      function doMove(m, fromNet) {
        cancelBoardInput();
        if (online && !fromNet && net) net.send({ t: 'move', uci: E.sqName(m.f) + E.sqName(m.t) + (m.promo ? m.promo.toLowerCase() : '') });
        const mover = colorOf(m.p);
        if(!online&&clock&&clock[mover]-(Date.now()-clock.last)<=0){clock[mover]=0;flagFall(mover);return;}
        const san = E.toSAN(S, m, legalAll);
        const beforeClock=clock&&!online?{...clock,[mover]:Math.max(0,clock[mover]-(Date.now()-clock.last)),last:Date.now()}:null;
        const time=clockMoveDone(mover);
        hist.push({ S, lastMove, evalNow, clock:beforeClock });
        if (trainerNote || trainerOpp) fx.querySelectorAll('.tl-mark').forEach(x => x.remove());
        // dein neuer Zug: der Kommentar zum Computerzug oben und die alte Bewertung als Kopfzeile sind erledigt
        if (mover === playerColor) { trainerMine = null; if (trainerOpp) hideOpp(); }
        plies.push({ S, m, san, mover,time });
        animateMove(m);
        S = E.make(S, m);
        keys.push(E.key(S)); sans.push(san);
        lastMove = { f: m.f, t: m.t };
        selected = -1; targets = [];
        Sound.play(m.cap ? 'capture' : 'move');
        if (E.inCheck(S)) setTimeout(() => Sound.play('check'), 160);
        const myGen = gen;
        setTimeout(() => {
          if (myGen !== gen) return;
          const after = boardEvaluation(S);
          setEval(after);
        }, 300);
        afterMove();
      }

      // ---------- laufende Partie sichern (nicht online): nach dem Schließen auf der Startseite „Weiterspielen“ ----------
      const uciOfMove = m => E.sqName(m.f) + E.sqName(m.t) + (m.promo ? m.promo.toLowerCase() : '');
      function saveGame() {
        if (online || over || (!plies.length && !setupSettings)) return;
        const saved = { v: 1, mode: settings.mode, level: settings.level, clockKey: settings.clock, color: selfPlay() ? (flipped ? 'b' : 'w') : playerColor, pvpView: settings.pvpView,
          moves: plies.map(p => uciOfMove(p.m)), timing:ChessTiming.pack(plies.map(p=>p.time),settings.clock),clock: clock ? { w: clock.w, b: clock.b, inc: clock.inc,turnStart:clock.turnStart } : null, hints: hintsUsed, at: Date.now(), archiveId,gameDate,initialFen:gameInitialFen||undefined,cont: contGame || undefined,setup: !!setupSettings || undefined, trainer: solo() && settings.style === 'trainer' && trLog ? { ...trainerFresh(), off: trainerOff || undefined, hint: trainerHint === S ? plies.length : undefined } : undefined };
        if (webdemo) demoSaved(saved);
        else Store.set(setupSettings ? 'chess.setupGame' : 'chess.saved', saved);
      }
      const dropSave = () => Store.del(setupSettings ? 'chess.setupGame' : 'chess.saved');
      // Gespeicherte Partie auf einer Premium-Stufe ohne Premium (z. B. Abo abgelaufen): Spielstand bleibt erhalten;
      // weiter mit Premium, auf der höchsten freien Stufe oder gar nicht.
      async function resumeLocked(sv, fromMount) {
        const free = LEVELS.reduce((n, L, i) => (L.premium ? n : i), 0), n = sv.level + 1;
        const v = await ctx.modal({ title: T('Partie auf Stufe {n} fortsetzen', { n }),
          html: `<p>${T('Diese Partie hast du auf Stufe {n} begonnen. Diese Stufe gehört zu Premium. Dein Spielstand bleibt gespeichert.', { n })}</p>`,
          buttons: [{ label: T('Premium holen'), value: 'premium', primary: true }, { label: T('Auf Stufe {n} weiterspielen', { n: free + 1 }), value: 'free' }, { label: T('Abbrechen'), value: null }] });
        if (v === 'premium' && await ctx.paywall(T('Spielstärke {n}: {l}', { n, l: LEVELS[sv.level].name })) && ctx.isPremium()) return resumeGame(sv);
        if (v === 'free') return resumeGame({ ...sv, level: free });
        if (fromMount) showLobby();
      }
      function resumeGame(sv, fromMount = false) {
        if (webdemo) {
          sv = demoSaved(sv);
          if (!sv) { showLobby(); return; }
          demoSettings();
        }
        let startingState;
        if (sv.setup) {
          try { startingState = ChessFenUI.parse(sv.initialFen, { freeMaterial: true }); }
          catch {
            UI.toast(T('Diese Stellung ist ungültig. Prüfe Figuren, Königsschach und Rochaderechte.'));
            if (fromMount) showLobby();
            return;
          }
        }
        const fantasy = !!startingState && !ChessPgn.hasStandardMaterial(startingState.b);
        if (fantasy && LEVELS[sv.level]?.opts.stockfishElo) sv = { ...sv, level: lastDenkArenaLevel };
        if (sv.mode === 'solo' && LEVELS[sv.level]?.premium && !ctx.isPremium()) { void resumeLocked(sv, fromMount); return; }
        if (sv.setup) { setupSettings ||= { ...settings }; bgStop(true); leaveOnline(); lastEnd = null; onlineTiming = null; }
        fantasySetup = fantasy;
        gameInitialFen=sv.initialFen||null;archiveId=sv.archiveId||'local:'+Date.now();gameDate=sv.gameDate||sv.at||Date.now();resultShown=false;
        // Einstellungen der gespeicherten Partie übernehmen, Züge nachspielen
        Object.assign(settings, { mode: sv.mode, level: LEVELS[sv.level] ? sv.level : settings.level, clock: sv.clockKey, pvpView: ['turn', 'table'].includes(sv.pvpView) || (sv.setup && sv.pvpView === 'self') ? sv.pvpView : 'turn' }); saveSettings();
        leaveReview(); viewing = null; contGame = !!sv.cont;
        token++; gen++; busy = false; over = false; hintsUsed = sv.hints || 0; hideTrainer(); trainerReset();
        lobby.classList.add('hidden'); match.classList.remove('hidden');
        S = startingState || (gameInitialFen ? ChessPgn.initial(gameInitialFen) : E.initial()); hist = []; sans = []; plies = []; keys = [E.key(S)]; lastMove = null; selected = -1; targets = []; evalNow = 0;
        for (const u of sv.moves || []) {
          const L = E.legal(S), m = L.find(x => uciOfMove(x) === u);
          if (!m) break; // beschädigter Spielstand: so weit wie möglich
          hist.push({ S, lastMove, evalNow, clock: null });
          plies.push({ S, m, san: E.toSAN(S, m, L), mover: colorOf(m.p) });
          sans.push(plies[plies.length - 1].san);
          S = E.make(S, m); keys.push(E.key(S)); lastMove = { f: m.f, t: m.t };
        }
        {const times=ChessTiming.decode(sv.timing,plies.length,settings.clock),snapshots=ChessTiming.snapshots(times,settings.clock);plies.forEach((p,i)=>{p.time=times?.[i]||null;hist[i].clock=snapshots[i]||null;});}
        playerColor = solo() ? sv.color || 'w' : 'w';
        flipped = solo() ? playerColor === 'b' : selfPlay() && sv.color === 'b';
        root.classList.toggle('pvp-table', pvpLocal() && settings.pvpView === 'table');
        stopClock();
        clock = sv.clock ? { w: sv.clock.w, b: sv.clock.b, inc: sv.clock.inc,turnStart:sv.clock.turnStart,last: Date.now() } : null;
        const st = E.status(S, keys); legalAll = st.moves;
        trainerRestore(sv.trainer);
        evalNow = boardEvaluation(S);
        renderAll(true); turnBoard();
        if (st.over) { over = true; dropSave(); endGame(st); return; }
        trainerShowSaved(); if (sv.trainer) trainerJudgeMissing();
        startClockKeep();
        if (sv.setup) saveGame();
        if (!sv.starting) UI.toast(T('Partie fortgesetzt'), 1600);
        const my = gen;
        if (solo() && S.turn !== playerColor) setTimeout(() => { if (my === gen) oppTurn(); }, 500);
        else if (trainerOn()) { const at = S; setTimeout(() => { if (my === gen) trainerTurn(at); }, 1900); } // erst nach dem Hinweis „Partie fortgesetzt“
      }

      function afterMove() {
        const st = E.status(S, keys);
        legalAll = st.moves;
        if (online) { if (st.over) over = true; refresh(); return; } // Ergebnis kommt vom Server
        if (st.over) { over = true; stopClock(); root.classList.remove('pvp-turn-b'); refresh(); dropSave(); endGame(st); return; }
        saveGame();
        refresh();
        if (solo() && S.turn !== playerColor) oppTurn();
        // Trainer: Drohungen des Gegners prüfen und die Bewertung vorab rechnen, während man überlegt (macht die Prüfung beim Ziehen schneller)
        else if (trainerOn()) { const at = S, my = gen; setTimeout(() => { if (my === gen) trainerTurn(at); }, 450); }        turnBoard();
      }

      // Keep the live board responsive even with unusually many legal moves.
      const boardEvaluation = state => fantasySetup ? (state.turn === 'w' ? 1 : -1) * E.evaluate(state) : E.analyse(state, 2);

      // zu zweit: Figuren zeigen zur Person am Zug (Schwarz am Zug → alle Figuren um 180° gedreht, ohne Animation)
      function turnBoard() { root.classList.toggle('pvp-turn-b', turnView() && S.turn === 'b' && !over); }

      // Meisterstufen: Zug von Stockfish mit begrenzter Stärke. Ohne Stockfish spielt Stufe 10 weiter (einmaliger Hinweis).
      let stockfishFallback=false;
      async function stockfishMove(o,my){
        // Eröffnung aus dem geprüften Buch der stärksten eigenen Stufe (abwechslungsreich), danach Stockfish.
        const book=S.full<=ChessAdapt.BOOK_FULL?ChessComputer.opening(S,9,{prefer:adaptPrefer()}):null;if(book)return book;
        const u=window.StockfishAnalysis?.available()?await StockfishAnalysis.play(gameInitialFen||E.toFEN(E.initial()),plies.map(p=>uciOfMove(p.m)),o.stockfishElo,o.timeMs).catch(()=>null):null;
        // Antwort für eine Partie, die es nicht mehr gibt (Zug zurück, neue Partie, Spiel verlassen): nichts ändern.
        if(my!==token||over)return null;
        const m=u&&E.legal(S).find(x=>uciOfMove(x)===u);if(m)return m;
        if(!stockfishFallback){stockfishFallback=true;UI.toast(T('Stockfish konnte auf diesem Gerät nicht gestartet werden. Die Partie geht auf Stufe {n} weiter und zählt als Stufe {n}.',{n:10}),4500);}
        // Ab hier ist es eine Partie gegen Stufe 10: so speichern, anzeigen, archivieren und bepunkten.
        settings.level=9;saveSettings();saveGame();refreshBars();
        return think(S,{...LEVELS[9].opts,history:keys.slice(),prefer:adaptPrefer()},9);
      }
      // Gewichte aus dem Spielergedächtnis, nur in der Eröffnung und nur mit eingeschaltetem Schalter.
      const adaptPrefer=()=>settings.adapt&&S.full<=ChessAdapt.BOOK_FULL?ChessAdapt.prefer():undefined;
      async function oppTurn() {
        busy = true;
        const my = ++token, t0 = Date.now();
        const m = lvl().opts.stockfishElo ? await stockfishMove(lvl().opts,my) : await think(S, { ...lvl().opts, history: keys.slice(), prefer: adaptPrefer() },settings.level);
        await new Promise(r => setTimeout(r, Math.max(0, (clock ? 250 : 500) - (Date.now() - t0))));
        // Der Computer zieht erst, wenn „Anzeige und Ton“ wieder zu ist
        while (UI.held() && my === token && !over) await new Promise(r => setTimeout(r, 200));
        if (my !== token || over) return;
        busy = false;
        if (!m) return;
        const real = legalAll.find(x => x.f === m.f && x.t === m.t && (x.promo || null) === (m.promo || null));
        if (real) doMove(real);
      }

      function resultCard(title, sub) {
        const c = document.createElement('div');
        c.className = 'result-card';
        c.innerHTML = `<div><b>${title}</b><span>${sub}</span></div>`;
        fx.appendChild(c);
      }

      function endGame(st, resigned) {
        cancelBoardInput(true);
        // Trainer: Karte und Kommentarzeilen weg, der Ergebnisstatus ist wieder zu sehen (die Notizen für die Nachbesprechung bleiben)
        if (trainerQ || trainerNote || trainerOpp) { hideTrainer(); hideLine(); }
        tipAt = null;
        if(resultShown)return;resultShown=true;clearPremove();
        const endGen=gen;
        if (!online) dropSave(); else forgetLive();
        lastEnd = { result: st.result, reason: resigned ? 'Aufgabe' : st.reason };
        if(!contGame&&!viewing)ChessExtras.save(gameData());
        if(online)pollRematch();
        let title, text, outcome;
        const winnerName = online && online.names && online.names[st.result] ? NameCheck.serverDisplay(online.names[st.result], st.result === 'w' ? T('Weiß') : T('Schwarz')) : st.result === 'w' ? T('Weiß') : T('Schwarz');
        if (st.result === 'draw') { title = T('Remis'); text = T(st.reason); outcome = 'draw'; }
        else if (solo() || online) {
          const won = st.result === playerColor;
          title = won ? T('Sieg') : T('Niederlage');
          text = online && st.reason === 'Aufgabe' ? (won ? T('Der Gegner hat aufgegeben.') : T('Du hast aufgegeben.')) : online && st.reason === 'Verbindung verloren' ? (won ? T('Der Gegner ist nicht zurückgekehrt.') : T('Die Verbindung ist abgebrochen.')) : online && st.reason === 'Remis vereinbart' ? T('Remis vereinbart.') : resigned ? T('Du hast aufgegeben.') : st.reason === 'Zeit abgelaufen' ? (won ? T('Die Zeit des Gegners ist abgelaufen.') : T('Deine Zeit ist abgelaufen.')) : won ? (online ? T('Schachmatt. Gut gespielt.') : T('Schachmatt auf Stufe {n}.', { n: settings.level + 1 })) : T('Schachmatt.');
          outcome = won ? 'win' : 'loss';
          if (won && solo() && !contGame) {
            const best = Store.get('chess.bestLevel', 0);
            if (settings.level + 1 > best) Store.set('chess.bestLevel', settings.level + 1);
          }
        } else { title = T(st.reason); text = T('{n} gewinnt.', { n: winnerName }); outcome = 'win'; }

        // Spielergedächtnis: wie diese Eröffnung gegen den Computer für dich ausging (nur mit eingeschaltetem Schalter).
        if (settings.adapt && solo() && !contGame && !viewing) ChessAdapt.record(plies, playerColor === 'w' ? 'b' : 'w', Math.min(settings.level, 9), outcome === 'win' ? 1 : outcome === 'draw' ? 0.5 : 0);
        const cardTitle = st.result === 'draw' ? T('Remis') : (resigned||st.reason==='Aufgabe') ? T('Aufgegeben') : st.reason === 'Zeit abgelaufen' ? T('Zeit abgelaufen') : T('Schachmatt');
        setTimeout(() => {if(endGen===gen)resultCard(cardTitle, st.result === 'draw' ? T(st.reason) : T('{n} gewinnt', { n: winnerName }));}, 300);
        setStatus(title, outcome === 'win' ? 'win' : outcome === 'loss' ? 'lose' : '');
        refreshBars();
        const stage = settings.level + 1;
        // Freundespartien und ausgeschöpfte Paarungen sind ohne Punkte. Ein Abbruch
        // vor dem ersten Zug beider Seiten zählt auch nicht als gespielte Partie.
        const onlinePlayed = online && online.started && plies.length >= 2;
        const onlinePoints = onlinePlayed && online.rated && !online.ratingNote;
        if (!contGame && (!online || onlinePlayed)) ctx.recordResult('chess', solo() || online ? outcome : 'pvp', {
          points: online ? (onlinePoints ? (outcome === 'win' ? 30 : outcome === 'draw' ? 12 : 4) : 0) : !solo() ? 3 : outcome === 'win' ? 6 * stage : outcome === 'draw' ? 3 * stage : 2,
          level: stage, hints: solo() ? hintsUsed : 0, hintMax: 3
        });
        setTimeout(() => { if(endGen!==gen)return;if (outcome === 'win') Sound.play('win'); else if (outcome === 'loss') Sound.play('lose'); }, 400);
        setTimeout(async () => {
          if(endGen!==gen)return;
          const canAnalyse = plies.length >= 4;
          // gewertete Online-Partie: Änderung der Wertung (der Server rechnet sie beim Partieende)
          let elo = '';
          if (online && online.rated && window.Cloud) {
            try {
              const rt = await UI.load(Cloud.rpc('chess_rating_result', { p_code: online.room }));
              if (rt) elo = `<div class="elo-res"><small>${T('Schach-Wertung · {c}', { c: CAT_NAME()[rt.cat] })}</small><b>${rt.before} → ${rt.after}${rt.provisional ? '?' : ''}</b><em class="${rt.delta > 0 ? 'up' : rt.delta < 0 ? 'down' : ''}">${rt.delta > 0 ? '+' : ''}${rt.delta}</em></div>`
                + (rt.limit ? `<p class="muted small">${T('Gegen denselben Gegner zählen höchstens drei Partien in 24 Stunden.')}</p>` : '');
              else if (sans.length < 2) elo = `<p class="muted small">${T('Ungewertet: Die Partie wurde vor dem zweiten Zug beendet.')}</p>`;
            } catch (e) { /* ohne Anzeige */ }
          } else if (online) elo = `<p class="muted small">${online.ratingNote ? T('Ungewertete Partie: keine Änderung der Schach-Wertung und keine Punkte für die Rangliste.') : T('Freundespartien bringen keine Punkte für Rang, Shop oder Rangliste.')}</p>`;
          const coach = trainerReview();
          let r;
          for (;;) { if(endGen!==gen)return;r = await ctx.modal({
            title,
            html: `<p>${text}</p>${elo}${contGame ? `<p class="muted small">${T('Ab einer Stellung weitergespielt: ohne Punkte.')}</p>` : ''}<p class="muted">${online ? T('Online-Partie') + ' · ' : solo() ? T('Stufe {n}', { n: stage }) + ' · ' : ''}${T('{n} Züge', { n: Math.ceil(sans.length / 2) })}</p>${coach.html}
              ${online ? '<div class="end-rematch"></div>' : ''}${canAnalyse ? `<p class="an-teaser">${T('Lass dir mit Erklärungen zeigen, wo die Partie entschieden wurde.')}</p>` : ''}${online ? `<div class="friends-actions">${online.started ? `<button type="button" class="btn" data-result-friend>${T('Als Freund hinzufügen')}</button>` : ''}<button class="chess-report" data-fair-report>${Icon('flag')}${T('Melden')}</button></div>` : ''}`,
            onOpen(card){resultDialogCard=card;const tr=card.querySelector('[data-tr-train]');if(tr)tr.onclick=()=>UI.closeModal('train');const tu=card.querySelector('[data-tr-undo]');if(tu)tu.onclick=()=>UI.closeModal('undo-train');card.querySelectorAll('[data-tr-ply]').forEach(b=>b.onclick=()=>UI.closeModal('ply:'+b.dataset.trPly));if(online){renderRematch();card.querySelector('[data-fair-report]').onclick=()=>UI.closeModal('fair-report');const add=card.querySelector('[data-result-friend]');if(add)add.onclick=()=>UI.closeModal('friend');}},
            buttons: [
              canAnalyse ? { label: T('Partie analysieren'), value: 'analyse', primary: !online } : null,
              { label: online ? T('Neue Online-Partie') : T('Revanche'), value: online ? 'lobby' : 'again', primary: !online&&!canAnalyse },
              !webdemo && plies.length ? { label: T(fantasySetup ? 'Stellung kopieren (FEN)' : 'Partie teilen'), value: 'link' } : null,
              !online ? { label: T('Einstellungen'), value: 'lobby' } : null
            ].filter(Boolean)
          });
          if(endGen!==gen)return;
          resultDialogCard=null;renderRematch();
          if(r==='fair-report'){await reportMenu();continue;}
          if(r==='friend' && online){await Friends.person('room:'+online.room);continue;}
          if(r!=='link')break;await shareGame(); }
          if (r === 'analyse') analyseChosen(outcome);
          else if (typeof r === 'string' && r.startsWith('ply:')) analyseChosen(outcome, Number(r.slice(4)));
          else if (r === 'train' && coach.kind) ctx.openGame('puzzles', { mistakes: true, trainingType: coach.kind });
          else if (r === 'undo-train') practiceUndone();
          else if (r === 'again') { if (setupSettings) restartSetup(); else { if (!bgSearch) await ctx.beforeNewGame(); newGame(); } }
          else if (r === 'lobby') showLobby();
        }, 1500);
      }

      // Bewertung als Zahl („+1,2“) und in Worten, aus Sicht von Weiß (positiv = Weiß steht besser)
      const evalNum = cp => Math.abs(cp) >= E.MATE - 1000 ? (cp > 0 ? '+M' : '−M') : (cp >= 0 ? '+' : '−') + (Math.abs(cp) / 100).toLocaleString(LOCALE, { minimumFractionDigits: 1, maximumFractionDigits: 1 });
      function evalWords(cp) {
        const a = Math.abs(cp), w = cp > 0, me = !viewing && (solo() || online) ? (w === (playerColor === 'w')) : null;
        if (a < 40) return T('Die Stellung ist ausgeglichen.');
        // eigene Sätze für Weiß und Schwarz (in anderen Sprachen passt ein eingesetztes Wort grammatisch nicht)
        if (a >= E.MATE - 1000) return me === null ? (w ? T('Weiß kann matt setzen.') : T('Schwarz kann matt setzen.')) : me ? T('Du kannst matt setzen.') : T('Der Gegner kann matt setzen.');
        const lvl = a < 120 ? 0 : a < 300 ? 1 : 2;
        if (me === null) return w ? [T('Weiß steht etwas besser.'), T('Weiß steht deutlich besser.'), T('Weiß steht klar auf Gewinn.')][lvl]
          : [T('Schwarz steht etwas besser.'), T('Schwarz steht deutlich besser.'), T('Schwarz steht klar auf Gewinn.')][lvl];
        return me ? [T('Du stehst etwas besser.'), T('Du stehst deutlich besser.'), T('Du stehst klar auf Gewinn.')][lvl] : [T('Der Gegner steht etwas besser.'), T('Der Gegner steht deutlich besser.'), T('Der Gegner steht klar auf Gewinn.')][lvl];
      }
      const positionLimited=row=>!!(row?.sacrificeUnresolved||row?.quietKingUnresolved);
      async function explainEval() {
        const live = (!online || review)&&!positionLimited(review?.rows[review.idx-1]);
        await ctx.modal({ title: T('Die Bewertungsleiste'),
          html: `<p class="muted small analysis-name">${UI.esc(ChessAnalysis.name(review?.analysisVersion,review?.engine))}</p><p>${T('Die Leiste neben dem Brett zeigt, wer gerade besser steht. Der helle Teil gehört Weiß, der dunkle Schwarz. Halb und halb heißt: ausgeglichen.')}</p>
            <p>${T('Je weiter sie zu einer Seite ausschlägt, desto größer der Vorteil, etwa durch mehr Material oder einen starken Angriff. Ganz gefüllt heißt: Matt ist nicht mehr zu verhindern.')}</p>
            <p>${T('Die Zahl in der Analyse misst den Vorteil in Bauerneinheiten: +1,0 heißt, Weiß steht so gut, als hätte es einen Bauern mehr.')}</p>
            ${live ? `<p class="ev-now"><b>${UI.esc(evalNum(evalNow))}</b> ${evalWords(evalNow)}</p>` : ''}
            <p class="muted small">${T('In Online-Partien erscheint die Leiste erst in der Analyse. Abschalten kannst du sie unter „Hilfen“.')}</p>`,
          buttons: [{ label: T('Verstanden'), value: null, primary: true }] });
      }

      // ================= Partie-Analyse (Nachspielen auf dem Brett) =================
      let review = null, analysisDone = false;
      const cap = v => Math.max(-1500, Math.min(1500, v));
      const uciOf = m => m && (E.sqName(m.f) + E.sqName(m.t) + (m.promo ? m.promo.toLowerCase() : ''));

      // Womit bewertet wird: DenkArena-Engine oder Stockfish. Die Erklärungen kommen immer von DenkArena.
      async function chooseEngine(force=false) {
        if(fantasySetup||!window.StockfishAnalysis?.available())return 'denkarena';
        // Ohne frühere Wahl ist Stockfish vorausgewählt: Es erkennt deutlich mehr Fehler als die schnelle Suche.
        const last=Store.get('chess.analysisEngine','stockfish')==='denkarena'?'denkarena':'stockfish';
        const preference=Store.get('chess.analysisPreference','ask');
        if(!force&&['denkarena','stockfish'].includes(preference))return preference;
        let remember;
        const v=await ctx.modal({title:T('Partie-Analyse'),cls:'engine-choice',
          html:`<p>${T('Womit soll die Partie bewertet werden? Die Erklärungen zu den Zügen kommen in beiden Fällen von DenkArena.')}</p><p class="muted small">${T('Stockfish ist freie Software (GPLv3) und rechnet auf deinem Gerät, auch ohne Internet.')}</p><label class="engine-remember"><input type="checkbox"${preference!=='ask'?' checked':''}> ${T('Auswahl merken und künftig nicht fragen')}</label>`,
          onOpen(card){remember=card.querySelector('.engine-remember input');},
          buttons:[{label:T('DenkArena-Engine'),hint:T('Schnell'),value:'denkarena',primary:last==='denkarena'},{label:'Stockfish',hint:T('Genauere Bewertung, dauert länger'),value:'stockfish',primary:last==='stockfish'},{label:T('Abbrechen'),value:null}]});
        if(v){Store.set('chess.analysisEngine',v);Store.set('chess.analysisPreference',remember?.checked?v:'ask');}
        return v;
      }
      // „at“: nach der Analyse direkt diesen Zug zeigen (aus der Nachbesprechung des Trainers)
      let reviewStart=null;
      async function analyseChosen(outcome,at=null){reviewStart=Number.isInteger(at)?at:null;const engine=await chooseEngine();if(engine)await analyse(outcome,null,false,engine);reviewStart=null;}

      async function analyse(outcome, saved=null, automatic=false, engine='denkarena') {
        const myGen = gen,analysisOwner=ChessAnalysis.owner();
        const restored=saved&&ChessAnalysis.restore(saved,plies);
        if(saved)engine=ChessAnalysis.engineOf(saved);
        const sides = !viewing && (solo() || online) ? [playerColor] : ['w', 'b'];
        let sf=null,stockfishInterrupted=false;
        const prog = restored?()=>{}:await openAnalysisShell(engine,()=>sf?.cancel());
        if(myGen!==gen)return;
        if(!restored)prog(0);
        if(!restored&&engine==='stockfish'){
          sf=window.StockfishAnalysis?.session(plies);
          const ready=sf&&await sf.ready();
          if(myGen!==gen)return;
          if(!ready){
            sf=null;engine='denkarena';
            const notice=T('Stockfish konnte auf diesem Gerät nicht gestartet werden. Die Partie wird mit der DenkArena-Engine analysiert.');
            prog(0,notice);UI.toast(notice);
          }
        }
        const rows = [], evals = [0],opening=window.ChessOpenings?.scan(plies),traps=window.ChessOpenings?.trapScan(plies);
        for (let i = 0; i < plies.length;) {
          if (myGen !== gen) return;
          const p = plies[i];
          if(!restored)prog(i / plies.length);
          const comparison = restored?restored[i]:window.ChessOpenings?.certificate(p.S,p.m)||(sf?await sf.compare(i):await compare(p.S,p.m));
          if(restored&&saved.analysisVersion===E.ANALYSIS_VERSION){const proof=window.ChessOpenings?.certificate(p.S,p.m);if(proof)Object.assign(comparison,proof);}
          if(myGen!==gen){sf?.cancel();return;}
          if(sf&&comparison.unavailable){
            sf.cancel();sf=null;engine='denkarena';stockfishInterrupted=true;
            rows.length=0;evals.length=1;i=0;
            prog(0,T('Stockfish wurde unterbrochen. Die Partie wird mit der DenkArena-Engine neu analysiert.'));
            continue;
          }
          const evPlayed = Number.isFinite(comparison.evPlayed)?comparison.evPlayed:evals[evals.length-1];
          const row = { ...p, ...comparison, i, opening:opening?.rows[i],trap:traps?.[i]||window.ChessTrapUI?.context(p.S,p.m),evAfter: evPlayed,same:comparison.best&&uciOf(comparison.best)===uciOf(p.m) };
          // Assess the opponent internally too: a missed opportunity needs
          // the immediately preceding error, even in an own-side review.
          let judgement=classify({...row,previous:rows.at(-1)});
          if(restored&&saved.analysisVersion!==E.ANALYSIS_VERSION)judgement={...judgement,...comparison.savedQuality};
          row.judgement=judgement;
          if (sides.includes(p.mover)||['forced','opening'].includes(judgement.cls))Object.assign(row,judgement);
          row.sacrifice = ChessCoach.strongSacrifice(row.S, row.m, row);
          rows.push(row); evals.push(evPlayed);
          i++;
          prog(i / plies.length);
          await new Promise(r => setTimeout(r, 0));
        }
        if (myGen !== gen) {sf?.cancel();return;}
        rows.filter(r => important(r)).forEach(r => (r.text = explain(r)));
        // Züge, die „Eröffnungen lernen“ der eigenen Seite beibringt (etwa ein Gambit), bleiben bewertet,
        // werden aber keine Trainingsaufgabe: Der Kurs und das Training sollen sich nicht widersprechen.
        if(window.OpeningCourse?.taught)rows.filter(r=>important(r)).forEach(r=>(r.course=OpeningCourse.taught(plies,r.i)));
        if(viewing?.initialFen&&Number.isFinite(rows[0]?.evBest))evals[0]=rows[0].evBest;
        const acc = arr => arr.length ? Math.round(arr.reduce((t,r)=>t+(r.accuracy??E.moveAccuracy(E.comparisonMetrics(r.evBest,r.evAfter,r.mover).winLoss)),0)/arr.length) : null;
        const summary = sides.map(sd => {
          const mine = rows.filter(r => r.mover === sd && r.loss != null&&!r.uncertain&&!r.unavailable&&!['forced','opening'].includes(r.cls));
          return { side: sd, acc: acc(mine),phases:ChessReviewData.phases(rows,sd),best: mine.filter(r => r.cls === 'best').length, good: mine.filter(r => r.cls === 'good' || r.cls === 'ok').length, errors: mine.filter(r => r.cls==='bad').length, inacc: mine.filter(r => r.cls==='meh').length,missed:mine.filter(r=>r.cls==='miss').length };
        });
        const localAnalysis=!setupSettings&&(!viewing||viewing.archived&&!opts.publicHistory),ownGame=localAnalysis&&!viewing?.imported,ownAnalysis=ownGame&&!restored;
        if(ownAnalysis){const accuracy=(summary.find(s=>s.side===playerColor)||summary[0]).acc;if(accuracy!==null)Store.set('chess.lastAccuracy',accuracy);if(!automatic)Store.set('ach.analysed', Store.get('ach.analysed', 0) + 1);}
        // eigene Fehler (gegen den Computer oder online) für „Aus Fehlern lernen“ sammeln
        let practice = 0,practiceGroup=null;
        if (ownGame && (viewing ? ['solo','online'].includes(viewing.mode) : solo() || online) && window.ChessMistakes) {
          const now = Date.now(), g=gameData(), source={id:g.mode==='online'?null:g.id,code:g.code||null,date:g.date};
          // Legacy archives without an explicit own colour are not guessed.
          if(ownAnalysis&&(!viewing||['w','b'].includes(viewing.you)))window.ChessErrorProfile?.record(g,playerColor,rows);
          const list = rows.filter(r => r.mover === playerColor && important(r) && ['bad','miss'].includes(r.cls) && r.best && !r.same && !r.course && ChessCoach.lesson(r.S,r.m,r.best,r)).sort((a,b)=>(b.mateError-a.mateError)||(b.winLoss-a.winLoss)).slice(0,ChessMistakes.MAX)
            .map((r, k) => ({ fen: E.toFEN(r.S), best: uciOf(r.best), played:uciOf(r.m), bsan: E.toSAN(r.S, r.best), san: r.san, ev: r.evBest, at: now - k, source:{...source,ply:r.i,...(r.opportunity?{opportunity:{fen:r.opportunity.previousFen,move:r.opportunity.previousMove}}:{})},engine:ChessCoach.version,explainable:true,
              // Welche Engine den Fehler gefunden hat; ihr Beleg (Lösung und Varianten) bleibt die Grundlage der Aufgabe.
              analysis:engine,...(ChessAnalysis.proof(r)?{proof:ChessAnalysis.proof(r)}:{}) }));
          if(ownAnalysis)ChessMistakes.add(list);practice=ChessMistakes.available(list);practiceGroup=source.id?'id:'+source.id:source.code&&source.date?'online:'+source.code+':'+source.date:null;
        }
        if(localAnalysis&&!restored)ChessAnalysis.save(gameData(),rows,analysisOwner,engine);
        analysisDone = true;
        if(!restored)UI.closeModal('done');
        enterReview({ rows, evals, summary, outcome, practice,practiceGroup,opening,cached:!!restored,analysisVersion:restored?saved.analysisVersion:E.ANALYSIS_VERSION,engineRevision:restored?saved.engineRevision:engine==='stockfish'?StockfishAnalysis.REVISION:E.ENGINE_REVISION,engine });
        if(!webdemo&&ownAnalysis&&!automatic)Growth.Achievements.check();
        if(stockfishInterrupted)UI.toast(T('Die Partie wurde mit der DenkArena-Engine analysiert.'),4000);
      }

      function important(row) { return !row.uncertain&&!row.unavailable&&['meh','bad','miss'].includes(row.cls); }
      function reviewMoment(row) { return important(row) || !!row.sacrifice; }
      function accuracyText(value) { return Number.isFinite(value)?value+' %':'—'; }

      const matesNow=row=>row.matesNow??=(()=>{const after=E.make(row.S,row.m);return E.inCheck(after)&&!E.legal(after).length;})();
      function classify(r) {
        if(r.S&&E.legal(r.S).length===1)return {cls:'forced',label:T('Erzwungener Zug'),sym:'□'};
        // Naming and book quality are separate: only locally reference-checked
        // edges qualify, and only after a continuous game from the initial position.
        if(r.opening?.trusted&&(!r.certifiedTrap||!r.mateError&&r.winLoss<10)&&window.ChessOpenings?.lookup(r.S,r.m)?.trusted)return {cls:'opening',label:T('Eröffnung'),sym:'·'};
        if(r.unavailable)return {cls:'uncertain',label:T('Nicht bewertbar'),sym:'—'};
        if (r.uncertain) return { cls: 'uncertain', label: T('Unsichere Einschätzung'), sym: '≈' };
        if(['similar','rejected'].includes(r.recommendationStatus))return {cls:'good',label:T('Guter Zug'),sym:'✓'};
        if (r.same) return { cls: 'best', label: T('Empfehlung der Engine'), sym: '★' };
        const metrics=E.comparisonMetrics(r.evBest,r.evPlayed??r.evAfter,r.mover??r.S.turn),loss=r.winLoss??metrics.winLoss;
        if(r.mateTiming??metrics.mateTiming)return {cls:'ok',label:T('Spielbar'),sym:'·'};
        const opportunity=r.previous&&ChessCoach.missedChance(r.S,r.m,r,r.previous);
        if(opportunity)return {cls:'miss',label:T('Chance verpasst'),sym:'⊙',opportunity};
        if(loss>=10&&loss<20&&r.S&&r.best&&ChessCoach.materialLoss(r.S,r))return {cls:'bad',label:T('Fehler'),sym:'??',materialError:true};
        if (!(r.mateError??metrics.mateError)) {
          // In klar entschiedenen Stellungen bewegt sich die Gewinnchance kaum noch.
          // Wer dort zwei Bauern (200 Hundertstelbauern) oder mehr an Bewertung abgibt, hat keinen „guten Zug“ gespielt.
          const decided = r.loss >= 200;
          if (loss < 5 && !decided) return { cls: 'good', label: T('Guter Zug'), sym: '✓' };
          if (loss < 10) return { cls: 'ok', label: T('Spielbar'), sym: '·', ...(decided ? { decided: true } : {}) };
          if (loss < 20) return { cls: 'meh', label: T('Ungenau'), sym: '?!' };
        }
        return { cls: 'bad', label: T('Fehler'), sym: '??' };
      }

      function explain(r) {
        if(typeof ChessCoach!=='undefined'){r.coachDescription??=ChessCoach.describe(r.S,r.m,r.best,r);return ChessCoach.explain(r.S,r.m,r.best,r.coachDescription,r,{perspective:teachingPerspective()});}
        const sign = r.mover === 'w' ? 1 : -1;
        const bestSan = E.toSAN(r.S, r.best), child = E.make(r.S, r.m);
        if (r.evBest * sign >= E.MATE - 1000) return T('Hier gab es ein erzwungenes Matt, beginnend mit {b}.', { b: `<b>${bestSan}</b>` });
        const reply = E.bestMove(child, { maxDepth: 2, timeMs: 300 });
        if (reply) {
          const after = E.make(child, reply);
          const replySan = E.toSAN(child, reply);
          if (E.analyse(after, 2) * sign <= -(E.MATE - 1000)) return T('Nach {m} hat der Gegner einen Mattangriff: {r}. Besser war {b}.', { m: `<b>${r.san}</b>`, r: `<b>${replySan}</b>`, b: `<b>${bestSan}</b>` });
          if (reply.cap && VAL[reply.cap.toUpperCase()] >= 1) return T('Nach {m} kann der Gegner {p} auf {s} schlagen ({r}). Besser war {b}.', { m: `<b>${r.san}</b>`, p: viewing?aPiece(reply.cap.toUpperCase()):yourPiece(reply.cap.toUpperCase()), s: E.sqName(reply.t), r: `<b>${replySan}</b>`, b: `<b>${bestSan}</b>` });
        }
        if (r.best.cap && VAL[r.best.cap.toUpperCase()] >= 1) {
          // Der Schlagzug ist sicher; ein dauerhafter Materialgewinn folgt daraus noch nicht.
          return T('{b} schlägt {p} und war deutlich stärker als {m}.', { b: `<b>${bestSan}</b>`, p: aPiece(r.best.cap.toUpperCase()), m: `<b>${r.san}</b>` });
        }
        return T('{b} war deutlich stärker als {m}. Die Stellung wäre klar besser gewesen.', { b: `<b>${bestSan}</b>`, m: `<b>${r.san}</b>` });
      }

      function teachingPerspective(){
        if(!viewing)return solo()||online?playerColor:null;
        if(opts.publicHistory||!viewing.archived||!['solo','online'].includes(viewing.mode)||!['w','b'].includes(viewing.you))return null;
        const own=window.ChessExtras?.local().some(g=>g.id&&g.id===viewing.id&&g.you===viewing.you&&JSON.stringify(g.moves)===JSON.stringify(viewing.moves));
        return own?viewing.you:null;
      }

      function openAnalysisShell(engine,onCancel) {
        UI.clearToast();
        return new Promise(res => {
          // Temporary display only: leave the live/review position and its input nodes intact.
          const preview=document.createElement('div'),view=el.closest('#view'),scrollTop=view?.scrollTop||0;
          preview.className='an-background';preview.setAttribute('aria-hidden','true');
          board.appendChild(preview);board.classList.add('an-running');
          ctx.modal({
            title: T('Analyse'), cls: 'analysis',
            html: `${UI.loader(T('Analyse läuft …'))}<p class="muted an-status" role="status">${engine==='stockfish'?T('Stockfish bewertet die Partie …'):T('Jeder Zug wird nachgerechnet …')}</p><div class="an-prog"><i></i></div><p class="muted small an-step"></p>`,
            buttons: [{ label: T('Abbrechen'), value: null }],
            onOpen(){if(view)view.scrollTop=0;}
          }).then(v => {
            preview.remove();if(!board.querySelector('.an-background'))board.classList.remove('an-running');
            if (v === null && !analysisDone) { if(view?.isConnected&&root.isConnected)view.scrollTop=scrollTop;gen++;onCancel(); }
          });
          analysisDone = false;
          setTimeout(() => res((p,message) => {
            const status = document.querySelector('.an-status'); if (status&&message) status.textContent = message;
            const i = document.querySelector('.an-prog i'); if (i) i.style.width = Math.round(p * 100) + '%';
            const index=Math.min(plies.length-1,Math.floor(p*plies.length)),row=plies[index];
            const st = document.querySelector('.an-step'); if (st) st.textContent = T('Zug {a} von {b}', { a: Math.min(plies.length,index+1), b: plies.length })+(row?' · '+row.S.full+(row.S.turn==='b'?'… ':'. ')+row.san:'');
            if(preview.isConnected&&row&&preview.dataset.ply!==String(index)){
              const state=E.make(row.S,row.m);let squares='',pieces='';
              for(let y=0;y<8;y++)for(let x=0;x<8;x++){
                const sq=flipped?(7-y)*8+7-x:y*8+x,piece=state.b[sq],highlight=sq===row.m.f||sq===row.m.t;
                squares+=`<div class="sq ${((sq>>3)+(sq&7))%2?'dark':'light'}${highlight?' last':''}"></div>`;
                if(piece)pieces+=`<div class="piece ${E.isW(piece)?'w':'b'}" style="transform:translate(${x*100}%,${y*100}%)"><span class="g">${Pieces.inner(piece.toUpperCase())}</span></div>`;
              }
              preview.innerHTML=`<div class="squares">${squares}</div><div class="pieces" aria-hidden="true">${pieces}</div>`;preview.dataset.ply=String(index);
            }
          }), 0);
        });
      }

      const reviewEl = root.querySelector('.review');
      function enterReview(data) {
        const pos = [plies.length ? plies[0].S : E.initial()];
        plies.forEach(p => pos.push(E.make(p.S, p.m)));
        review = Object.assign(data, { pos, idx: 0 });
        const opening=data.opening||window.ChessOpenings?.scan(plies),openingEl=root.querySelector('.rv-opening');
        openingEl.classList.toggle('hidden',!opening?.name);
        openingEl.innerHTML=opening?.name?`<div><strong>${UI.esc(T(opening.name.name))}</strong><span>${UI.esc(opening.exit?T('Buch verlassen mit {m}',{m:opening.exit.full+(opening.exit.side==='b'?'… ':'. ')+opening.exit.san}):T('Noch in der Eröffnungstabelle'))}</span></div><button type="button" class="iconbtn" data-opening-help aria-label="${T('Zur Eröffnungstabelle')}">${Icon('help')}</button>`:'';
        openingEl.querySelector('[data-opening-help]')?.addEventListener('click',()=>ctx.modal({title:T('Eröffnung'),html:`<p>${T('Die Tabelle enthält eine Auswahl bekannter Eröffnungen. Ein Zug außerhalb der Tabelle ist deshalb nicht automatisch schlecht.')}</p><p>${T('Nur geprüfte Buchzüge sind neutral markiert und zählen nicht für die Genauigkeit. Bekannte Fallen und andere ungeprüfte Züge werden weiterhin bewertet.')}</p>`,buttons:[{label:T('Verstanden'),value:null,primary:true}]}));
        over = true; busy = false; stopClock(); selected = -1; targets = []; hideLine();
        root.classList.add('reviewing');
        root.classList.toggle('replaying',!!data.replay);
        reviewEl.classList.remove('hidden');
        reviewEl.querySelector('[data-r=analyse]').classList.toggle('hidden',!data.replay&&(!data.cached||data.analysisVersion!==E.ANALYSIS_VERSION));
        reviewEl.querySelector('[data-r=analyse]').classList.toggle('primary',!!data.replay);
        reviewEl.querySelector('[data-r=analyse]').textContent=T(data.replay?'Partie analysieren':'Neu analysieren');
        reviewEl.querySelector('[data-r=key]').classList.toggle('hidden',!!data.replay);
        reviewEl.querySelector('.rv-graph').classList.toggle('hidden',!!data.replay);
        reviewEl.querySelector('.rv-times').classList.toggle('hidden',!!data.replay);
        reviewEl.querySelector('[data-r=again]').hidden = !!viewing; // bei einer geteilten Partie gibt es keine Revanche
        reviewEl.querySelector('[data-r=again]').textContent=online?T('Revanche anbieten'):T('Revanche');
        if (!webdemo) {
          reviewEl.querySelector('[data-r=share]').classList.toggle('hidden', fantasySetup);
          reviewEl.querySelector('[data-r=pgn]').textContent = T(fantasySetup ? 'Stellung kopieren (FEN)' : 'Exportieren');
        }
        if(data.replay){reviewEl.querySelector('.rv-sum').innerHTML='';reviewEl.querySelector('.rv-keys').innerHTML='';reviewEl.querySelector('.rv-graph').innerHTML='';gotoPly(Number.isSafeInteger(opts.reviewPly)?opts.reviewPly:0,false);return;}
        const sideName = sd => !viewing && (solo() || online) ? T('Deine Genauigkeit') : (sd === 'w' ? T('Weiß') : T('Schwarz'));
        const ring = a => `<svg viewBox="0 0 44 44" aria-hidden="true"><circle cx="22" cy="22" r="19" class="rg-bg"/><circle cx="22" cy="22" r="19" class="rg-fg" style="stroke-dasharray:${(a / 100 * 119.4).toFixed(1)} 119.4"/></svg>`;
        const chip = (cls, sym, nr, label) => `<span class="rv-chip q-${cls}"><b>${sym}</b>${nr} ${label}</span>`;
        const res = data.outcome === 'win' ? T('Sieg') : data.outcome === 'loss' ? T('Niederlage') : data.outcome === 'draw' ? T('Remis') : '';
        reviewEl.querySelector('.rv-sum').innerHTML = (res ? `<p class="rv-res">${res} · ${T('{n} Züge', { n: Math.ceil(plies.length / 2) })}</p>` : '') + data.summary.map(x => `<div class="rv-acc">
          <div class="rv-ring">${ring(x.acc??0)}<b>${x.acc===null?'—':x.acc}${x.acc===null?'':'<small>%</small>'}</b></div>
          <div class="rv-acc-txt"><small>${sideName(x.side)}</small><div class="rv-chips">${chip('best', '★', x.best, T('beste'))}${chip('good', '✓', x.good, T('gut'))}${chip('meh', '?!', x.inacc, T('ungenau'))}${chip('bad', '??', x.errors, T('Fehler'))}${x.missed?chip('miss','⊙',x.missed,T(x.missed===1?'Chance verpasst':'Chancen verpasst')):''}</div></div></div><button type="button" class="rv-phases" data-r="phasehelp" aria-label="${T('Genauigkeit nach Partiephase erklären')}">${['opening','middle','ending'].map((key,i)=>`<span><small>${T(['Eröffnung','Mittelspiel','Endspiel'][i])}</small><b>${accuracyText(x.phases[key].accuracy)}</b></span>`).join('')}</button>`).join('');
        reviewEl.querySelector('.rv-sum').insertAdjacentHTML('beforeend',`<p class="muted small">${T('Lokale Engine-Einschätzung, keine Turnierwertung. Unsichere, erzwungene und geprüfte Eröffnungszüge zählen nicht für die Genauigkeit.')}</p>`);
        reviewEl.querySelector('.rv-sum').insertAdjacentHTML('beforeend',`<p class="muted small analysis-name">${UI.esc(ChessAnalysis.name(data.analysisVersion,data.engine))}</p>${data.analysisVersion!==E.ANALYSIS_VERSION?`<div class="analysis-version-notice"><p class="muted small">${T(data.analysisVersion<E.ANALYSIS_VERSION?'Mit einer älteren Version analysiert. Neu analysieren?':'Mit einer neueren Version analysiert. Neu analysieren?')}</p><button type="button" class="btn" data-r="refreshanalysis">${T('Neu analysieren')}</button></div>`:''}`);
        if(window.ChessTeaching&&data.analysisVersion===E.ANALYSIS_VERSION){const course=ChessTeaching.course(data.rows);if(course.length)reviewEl.querySelector('.rv-sum').insertAdjacentHTML('beforeend',`<div class="rv-course"><h4>${T('Partieverlauf')}</h4>${course.map(f=>`<p>${UI.esc(ChessCoach.renderFact(f,'w'))}</p>`).join('')}</div>`);}
        const keys = data.rows.map((r, k) => ({ r, k })).filter(o => reviewMoment(o.r));
        const num = k => `${data.rows[k].S.full}${data.rows[k].S.turn==='b'?'…':'.'}`;
        reviewEl.querySelector('.rv-keys').innerHTML = keys.length
          ? `<h4>${T('Wichtige Momente')}</h4>${keys.slice(0, 10).map(o => `<button class="rv-krow q-${o.r.cls}" data-ply="${o.k + 1}"><span class="rv-ksym">${o.r.sym}</span><b>${num(o.k)} ${UI.esc(o.r.san)}</b><span class="rv-kbest">${o.r.sacrifice ? UI.esc(T('Starkes Opfer')) : T('besser: {b}', { b: UI.esc(E.toSAN(o.r.S, o.r.best)) })}</span>${Icon('chevron')}</button>`).join('')}`
          : `<p class="rv-clean">${T('In dieser Suche wurden keine eindeutigen Fehler erkannt.')}</p>`;
        if (data.practice) reviewEl.querySelector('.rv-keys').insertAdjacentHTML('beforeend', `<button class="rv-practice" data-r="practice">${Icon('undo')}<span><b>${data.practice === 1 ? T('Diese Stellung üben') : T('Diese {n} Stellungen üben', { n: data.practice })}</b><small>${T('Finde in derselben Stellung den besseren Zug')}</small></span>${Icon('chevron')}</button>`);
        drawGraph();
        drawTimes();
        const firstKey = data.rows.findIndex(reviewMoment);
        gotoPly(Number.isInteger(reviewStart) && reviewStart >= 0 && reviewStart <= plies.length ? reviewStart : firstKey >= 0 ? firstKey + 1 : plies.length, false); reviewStart = null;
        const v = el.closest('#view'); if (v) v.scrollTop = 0;
      }
      // ---------- Partie als Link teilen / geteilte Partie ansehen ----------
      function gameData() {
        if (viewing) return ChessExtras.withProfileName(viewing,!!viewing.archived);
        const me = Store.get('profile.name', '') || T('Spieler');
        const names = online ? { w: (online.names || {}).w || '', b: (online.names || {}).b || '' }
          : solo() ? { [playerColor]: me, [playerColor === 'w' ? 'b' : 'w']: '' } : { w: '', b: '' };
        const rt = online && online.ratings && online.ratings.w && online.ratings.b ? { w: online.ratings.w.r, b: online.ratings.b.r } : null;
        return { names, result: lastEnd ? lastEnd.result : '', reason: lastEnd ? lastEnd.reason : '', mode: online ? 'online' : solo() ? 'solo' : 'pvp',
          id:archiveId, code:online&&online.room,you:online||solo()?playerColor:null,
          level: settings.level, clock: online ? ((online.opts && online.opts.clock) || settings.clock) : settings.clock, date: gameDate, ratings: rt,initialFen:gameInitialFen||undefined,
          moves: plies.map(p => uciOfMove(p.m)),timing:online?onlineTiming:ChessTiming.pack(plies.map(p=>p.time),settings.clock) };
      }
      async function shareGame() {
        if (fantasySetup) return ChessFenUI.copy(E.toFEN(S), { freeMaterial: true });
        if(gameData().imported||gameData().initialFen||gameData().moves.length>600)return ChessPgnUI.exportGames([gameData()]);
        if(viewing ? viewing.archived&&viewing.mode==='solo' : solo())await ChessExtras.ensureProfileName();
        const g = gameData(), url = GameLink.url(GameLink.encode(g));
        const nm = c => ChessExtras.shareName(g, c);
        await ctx.share([T('Schachpartie bei DenkArena: {w} gegen {b}. Hier kannst du sie Zug für Zug nachspielen:', { w: nm('w'), b: nm('b') }),...(review&&!review.replay?[ChessAnalysis.name(review.analysisVersion,review.engine)]:[]), url, T('Welchen Zug hättest du gespielt?')].join('\n\n'), null, {gameUrl:url});
      }
      // geteilte Partie öffnen: Züge nachspielen, dann Analyse zum Durchklicken anbieten
      async function viewGame(g) {
        g=ChessExtras.withProfileName(g,!!g.archived);
        bgStop(true); leaveReview(); leaveOnline(); stopClock();gameInitialFen=g.initialFen||null;
        fantasySetup = false;
        token++; gen++; busy = false; over = true; contGame = false; viewing = g; lastEnd = { result: g.result, reason: g.reason };
        lobby.classList.add('hidden'); match.classList.remove('hidden');
        S = g.initialFen?ChessPgn.initial(g.initialFen):E.initial(); hist = []; sans = []; plies = []; keys = [E.key(S)]; lastMove = null; selected = -1; targets = []; evalNow = 0; clock = null;
        for (const u of g.moves) {
          const L = E.legal(S), m = L.find(x => uciOfMove(x) === u);
          if (!m) break;
          hist.push({ S, lastMove, evalNow, clock: null });
          plies.push({ S, m, san: E.toSAN(S, m, L), mover: colorOf(m.p) });
          sans.push(plies[plies.length - 1].san);
          S = E.make(S, m); keys.push(E.key(S)); lastMove = { f: m.f, t: m.t };
        }
        {const times=ChessTiming.decode(g.timing,plies.length,g.clock);plies.forEach((p,i)=>p.time=times?.[i]||null);}
        legalAll = [];
        playerColor = g.archived&&!opts.publicHistory&&['w','b'].includes(g.you)?g.you:g.mode === 'solo' && !g.names.w && g.names.b ? 'b' : 'w'; flipped = playerColor === 'b';
        renderAll(true);
        const nm = c => ChessExtras.shareName(g, c);
        const res = g.result === 'draw' ? T('Remis') : g.result ? T('{n} gewinnt', { n: nm(g.result) }) : T('Partie nicht beendet');
        setStatus(res);
        if(g.archived){
          const cached=!opts.publicHistory?ChessAnalysis.lookup(g):{kind:'none'};
          const replay=()=>enterReview({replay:true,rows:plies.map(p=>({...p})),evals:Array(plies.length+1).fill(0),summary:[]});
          if(opts.archiveReturn&&plies.length){
            replay();
            const ticket=gen,engine=await chooseEngine();
            if(ticket!==gen||!root.isConnected)return;
            // Abbrechen: die Partie bleibt ohne Analyse zum Ansehen offen.
            if(engine){
              const saved=cached.kind!=='engine'&&cached.engine===engine&&ChessAnalysis.restore(cached.entry,plies)?cached.entry:null;
              await analyse(null,saved,cached.kind==='engine',engine);
            }
          }
          else if(cached.kind==='engine')await analyse(null,null,true,cached.engine);
          else if(cached.entry&&ChessAnalysis.restore(cached.entry,plies))await analyse(null,cached.entry);
          else replay();
          if(opts.trainingReturn)reviewEl.querySelector('.rv-actions').insertAdjacentHTML('afterbegin',`<button class="btn" data-r="training">${T('Zurück zum Üben')}</button>`);return;
        }
        const kind = g.mode === 'imported' ? T('Importierte Partie') : g.mode === 'online' ? T('Online-Partie') : g.mode === 'solo' ? T('Gegen den Computer') : T('Partie zu zweit');
        const r = await ctx.modal({ title: g.archived?T('Meine Partien'):T('Geteilte Partie'),
          html: `<p><b>${UI.esc(nm('w'))}</b> ${T('gegen')} <b>${UI.esc(nm('b'))}</b></p>
            <p>${UI.esc(res)}${g.reason ? ' · ' + UI.esc(T(g.reason)) : ''}</p>
            <p class="muted small">${kind} · ${g.clock !== 'none' ? clockLabel(g.clock) + ' · ' : ''}${T('{n} Züge', { n: Math.ceil(plies.length / 2) })} · ${new Date(g.date).toLocaleDateString(LOCALE, { day: 'numeric', month: 'long', year: 'numeric' })}</p>
            ${plies.length < g.moves.length ? `<p class="muted small">${T('Der Link ist beschädigt. Die Partie wird so weit wie möglich gezeigt.')}</p>` : ''}`,
          buttons: [{ label: T('Schließen'), value: null }, plies.length ? { label: T('Nachspielen'), value: 'go', primary: true } : null].filter(Boolean) });
        const engine = r === 'go' ? await chooseEngine() : null;
        if (engine) analyse(null, null, false, engine); else showLobby();
      }
      // ab der gezeigten Stellung selbst gegen den Computer weiterspielen (ohne Punkte)
      function continueFrom(i) {
        resultShown=false;lastEnd=null;
        // du spielst die Seite, die gerade unten auf dem Brett steht (nach „Drehen“ also die andere)
        const mine = flipped ? 'b' : 'w';
        if (setupSettings) return startSetup(E.toFEN(review.pos[i]), mine, settings.level);
        const moves = plies.slice(0, i).map(p => uciOfMove(p.m));
        contGame = true;
        resumeGame({ v: 1, mode: 'solo', level: settings.level, clockKey: 'none', color: mine, moves, initialFen:viewing?.initialFen,hints: 0, cont: true });
        UI.toast(T('Du spielst ab hier gegen den Computer (Stufe {n}). Ohne Punkte.', { n: settings.level + 1 }), 3200);
      }
      function leaveReview() {
        review = null;
        root.querySelector('.rv-opening').classList.add('hidden');
        root.classList.remove('reviewing','replaying');
        reviewEl.classList.add('hidden');
      }

      function drawGraph() {
        const n = review.evals.length - 1;
        if (n < 1) { reviewEl.querySelector('.rv-graph').innerHTML = ''; return; }
        const W = 300, H = 64, y = v => H / 2 - Math.tanh(cap(v) / 600) * (H / 2 - 3), x = i => (i / n) * W;
        const pts = review.evals.map((v, i) => `${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(' ');
        const marks = review.rows.map((r, i) => important(r) ? `<circle class="g-${r.cls}" cx="${x(i + 1)}" cy="${y(review.evals[i + 1])}" r="2.6"/>` : '').join('');
        reviewEl.querySelector('.rv-graph').innerHTML = `<svg viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="${UI.esc(T('Bewertungsverlauf'))}">
          <rect class="g-bg" width="${W}" height="${H}"/>
          <polygon class="g-white" points="0,${H} ${pts} ${W},${H}"/>
          <line class="g-mid" x1="0" y1="${H / 2}" x2="${W}" y2="${H / 2}"/>
          <polyline class="g-line" points="${pts}"/>${marks}
          <line class="g-cur" x1="0" y1="0" x2="0" y2="${H}"/></svg><span class="g-lab top">${T('Schwarz besser')}</span><span class="g-lab bot">${T('Weiß besser')}</span>`;
        const svg = reviewEl.querySelector('.rv-graph svg');
        bindReviewChart(svg,e=>{const r=svg.getBoundingClientRect();jumpToPly(Math.round((e.clientX-r.left)/r.width*n));});
      }

      function drawTimes(){
        const box=reviewEl.querySelector('.rv-times'),g=gameData(),times=ChessTiming.decode(g.timing,plies.length,g.clock),known=times?.filter(t=>Number.isFinite(t?.spent))||[];
        box.classList.toggle('hidden',!known.length);box.innerHTML='';if(!known.length)return;
        const max=Math.max(1,...known.map(t=>t.spent)),n=times.length,width=Math.max(300,n*3);
        box.innerHTML=`<div class="rv-time-heading"><strong>${T('Bedenkzeit pro Zug')}</strong><span class="rv-time-legend"><i class="white">${T('Weiß')}</i><i class="black">${T('Schwarz')}</i></span></div><div class="rv-time-scroll"><svg viewBox="0 0 ${width} 38" style="min-width:${width}px" role="img" aria-label="${T('Bedenkzeit beider Seiten je Zug')}">${times.map((t,i)=>{if(!Number.isFinite(t?.spent))return '';const h=Math.max(1,t.spent/max*32);return `<rect class="time-${i%2?'b':'w'}" data-time-ply="${i+1}" x="${i*width/n}" y="${34-h}" width="${Math.max(1,width/n-.5)}" height="${h}"><title>${UI.esc(T('Zug {n}: {s} s',{n:(Math.floor(i/2)+1)+(i%2?'… ':'. ')+plies[i].san,s:(t.spent/10).toLocaleString(LOCALE,{maximumFractionDigits:1})}))}</title></rect>`;}).join('')}</svg></div><p class="rv-time-current muted small"></p>${known.length<n?`<p class="muted small">${T('Fehlende Zeitdaten bleiben leer.')}</p>`:''}`;
        const svg=box.querySelector('svg');bindReviewChart(svg,e=>{const rect=svg.getBoundingClientRect();jumpToPly(Math.min(n,Math.max(1,Math.floor((e.clientX-rect.left)/rect.width*n)+1)));});
      }

      function bindReviewChart(svg,pick){
        let press=null;
        svg.onpointerdown=e=>{if(e.button!==0)return;if(press){press=null;return;}press={id:e.pointerId,x:e.clientX,y:e.clientY};};
        svg.onpointermove=e=>{if(press&&e.pointerId===press.id&&Math.hypot(e.clientX-press.x,e.clientY-press.y)>8)press=null;};
        svg.onpointercancel=svg.onpointerleave=()=>{press=null;};
        svg.onpointerup=e=>{if(!press||press.id!==e.pointerId)return;const p=press;press=null;if(Math.hypot(e.clientX-p.x,e.clientY-p.y)<=8)pick(e);};
      }
      function jumpToPly(i){gotoPly(i,false);root.closest('#view')?.scrollTo({top:0,behavior:'instant'});}
      // „Nächster Moment“: der Knopf bleibt, wo er war (kein Sprung nach oben), damit man direkt weitertippen kann
      function keepAt(el, y) { const view = root.closest('#view'); if (view) view.scrollTop += el.getBoundingClientRect().top - y; }

      function gotoPly(i, animate, shown = false) {
        if (!review) return;
        i = Math.max(0, Math.min(plies.length, i));
        const prev = review.idx;
        review.idx = i;
        if (shown) { /* Stellung zeigt das Zug-Rad bereits */ }
        else {
        fx.innerHTML = '';
        if (animate && i === prev + 1) { animateMove(plies[i - 1].m); S = review.pos[i]; Sound.play(plies[i - 1].m.cap ? 'capture' : 'move'); }
        else { S = review.pos[i]; buildPieces(false); }
        }
        lastMove = i > 0 ? { f: plies[i - 1].m.f, t: plies[i - 1].m.t } : null;
        refreshSquares(); refreshBars(); refreshMoves();
        setEval(review.evals[i]);
        const row = i > 0 ? review.rows[i - 1] : null;
        { const ev = reviewEl.querySelector('.rv-eval'), cp = review.evals[i]; ev.textContent = positionLimited(row)?'—':row?.uncertain?'≈':evalNum(cp); ev.className = 'rv-eval ' + (cp >= 0 ? 'w' : 'b'); ev.title = positionLimited(row)?T('Diese Stellung lässt sich noch nicht sicher beurteilen.'):row?.uncertain?T('Unsichere Einschätzung'):evalWords(cp); }
        const moveTxt = row ? `${row.S.full}${row.mover === 'w' ? '.' : '…'} ${row.san}` : T('Ausgangsstellung');
        reviewEl.querySelector('.rv-move').textContent = moveTxt;
        {const help=reviewEl.querySelector('.coach-notation-current');help.hidden=!row;help.textContent=row?ChessCoach.notationMove(row.S,row.m):'';}
        const q = reviewEl.querySelector('.rv-q');
        q.className = 'rv-q' + (row && row.cls ? ' q-' + row.cls : '');
        q.textContent = row && row.cls ? `${row.sym} ${row.label}` : '';
        let text = '';
        if (!row) text = T('Tippe auf ›, um die Partie Zug für Zug nachzuspielen.');
        else if (!row.cls) text = viewing || row.mover === playerColor || !(solo() || online) ? '' : T('Zug des Gegners.');
        else if (row.cls==='forced') text=T('Das war der einzige legale Zug.');
        else if (row.cls==='opening') text=T('Dieser Zug gehört zur geprüften Eröffnungstabelle.');
        else if (row.text) text = row.text;
        else if(row.unavailable)text=T('Dieser Zug konnte nicht bewertet werden. Die übrige Partie wurde weiter analysiert.');
        else if(row.recommendationStatus==='unconfirmed')text=T('Die Bewertung dieses Zugs konnte nicht abgeschlossen werden. Er zählt nicht zur Genauigkeit und wird nicht als Trainingsaufgabe gespeichert.');
        else if(['similar','rejected'].includes(row.recommendationStatus))text=T('Ein solider Zug.');
        else if (row.uncertain) text = T('Diese Stellung lässt sich noch nicht sicher beurteilen.');
        else if (row.cls === 'best') text = T('Die Engine bevorzugt diesen Zug. Andere Züge können ähnlich gut sein.');
        else if (row.cls === 'good') text = T('Ein solider Zug.') + (row.best ? ' ' + T('Die Engine bevorzugt knapp {b}.', { b: `<b>${E.toSAN(row.S, row.best)}</b>` }) : '');
        else if (row.cls === 'ok') text = T('Spielbar, aber {b} war etwas besser.', { b: `<b>${E.toSAN(row.S, row.best)}</b>` });
        if(row&&!['forced','opening'].includes(row.cls)&&!row.uncertain&&!['similar','rejected'].includes(row.recommendationStatus)&&!row.text&&row.best&&window.ChessCoach){
          if(!row.same&&!row.mateError&&row.winLoss<5&&!row.mateTiming)text=UI.esc(T('Beide Züge sind ähnlich gut. {b} war etwas besser.',{b:E.toSAN(row.S,row.best)}));
          if(row.decided&&!row.same&&!row.mateError&&!row.mateTiming){
            const side=row.S.turn==='w'?1:-1,b=E.toSAN(row.S,row.best);
            if(row.evAfter*side>0)text=UI.esc(T('Die Stellung bleibt gewonnen, aber {b} war deutlich stärker.',{b}));
            else if(row.evBest*side<0)text=UI.esc(T('Die Stellung war schon vorher verloren. Mit {b} wäre der Rückstand kleiner geblieben.',{b}));
          }
          if(row.mateTiming)text=ChessCoach.rationale(row.S,row.m,row.best,row).flow.map(f=>UI.esc(ChessCoach.renderFact(f,row.S.turn,teachingPerspective()))).join(' ');
          const why=(row.purpose||(row.purpose=ChessCoach.purpose(row.S,row.best))).facts;
          if(why.length&&!row.mateTiming)text+=(text?' ':'')+why.map(f=>UI.esc(ChessCoach.renderFact(f,row.S.turn,teachingPerspective()))).join(' ');
        }
        if(row?.course&&row.mover===playerColor&&important(row))text+=(text?' ':'')+UI.esc(T('Dieser Zug stammt aus „Eröffnungen lernen“ ({name}). Die Analyse rechnet mit der besten Verteidigung und bewertet ihn deshalb streng. Er wird nicht als Trainingsaufgabe gespeichert.',{name:T(row.course.name)}));
        // Ein Zug, der matt setzt, braucht weder einen Vergleich noch eine Lagebeschreibung.
        const mated=!!(row&&!row.uncertain&&!row.unavailable&&matesNow(row));
        if(mated&&row.cls&&!['forced','opening'].includes(row.cls))text=window.ChessCoach?ChessCoach.purpose(row.S,row.m).facts.map(f=>UI.esc(ChessCoach.renderFact(f,row.S.turn,teachingPerspective()))).join(' '):'';
        if(!mated&&row&&['best','good','ok'].includes(row.cls)&&row.mover===playerColor&&window.ChessTeaching){const critical=row.critical||(row.critical=ChessTeaching.critical(row.S,row.m,row));if(critical)text=ChessTeaching.copy(critical,[],row.S.turn,0,teachingPerspective());}
        if (row&&!mated&&!['forced','opening'].includes(row.cls)&&!row.uncertain&&!review.replay) text += `${text ? '<br>' : ''}<span class="rv-sit">${positionLimited(row)?T('Diese Stellung lässt sich noch nicht sicher beurteilen.'):evalWords(review.evals[i])}</span>`;
        const recorded=gameData(),ending=ChessExtras.ending(recorded),finish=reviewEl.querySelector('.rv-finish'),resultText=ChessExtras.resultText(recorded);
        const atEnd=i===plies.length&&!!resultText&&(!viewing||plies.length===viewing.moves.length);
        finish.classList.toggle('hidden',!atEnd);
        finish.innerHTML=atEnd?`${ending?`<strong>${UI.esc(ending.text)}</strong>`:''}<span>${UI.esc(resultText)}</span>`:'';
        const resignedKing=atEnd&&ending?.kind==='resign'&&['w','b'].includes(recorded.result)?(recorded.result==='w'?S.kb:S.kw):-1;
        if(Number.isInteger(resignedKing)&&resignedKing>=0&&resignedKing<64&&S.b[resignedKing]===(recorded.result==='w'?'k':'K')){
          const {x,y}=disp(resignedKing),badge=document.createElement('div');
          badge.className='resignation-flag';badge.dataset.square=String(resignedKing);
          badge.style.left=((x+.78)*12.5)+'%';badge.style.top=((y+.23)*12.5)+'%';
          badge.innerHTML='<svg viewBox="0 0 24 24" focusable="false"><g transform="translate(.5 .75)"><path d="M6 20V4" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M7 4c4-3 6 3 11 0v9c-5 3-7-3-11 0z" fill="currentColor"/></g></svg>';
          fx.appendChild(badge);
          squareEls[resignedKing].setAttribute('aria-label',squareEls[resignedKing].getAttribute('aria-label')+', '+ending.text);
        }
        if (row?.sacrifice) {
          const { capture, moves } = row.sacrifice;
          const note = moves === 1
            ? T('Wird die Figur mit {m} geschlagen, folgt sofort Matt.', { m: capture })
            : T('Wird die Figur mit {m} geschlagen, folgt Matt in höchstens zwei Zügen.', { m: capture });
          text = `<span class="rv-sacrifice"><strong>${UI.esc(T('Starkes Opfer'))}</strong> ${UI.esc(note)}</span>` + text;
        }
        reviewEl.querySelector('.rv-text').innerHTML = text || '&nbsp;';
        if(row?.trap&&window.ChessTrapUI)reviewEl.querySelector('.rv-text').insertAdjacentHTML('afterbegin',`<span class="rv-trap muted small">${UI.esc(ChessTrapUI.note(row.trap,row))}</span> `);
        if(row&&['bad','miss'].includes(row.cls)&&!row.uncertain&&!row.unavailable&&row.mover===playerColor&&(!viewing?(solo()||online):viewing.archived&&!opts.publicHistory&&['solo','online'].includes(viewing.mode)&&viewing.you===playerColor)){
          const tm=row.time,cfg=ChessTiming.settings(recorded.clock);
          if(cfg&&tm){const notice=Number.isFinite(tm.remaining)&&tm.remaining<cfg.base*.1?T('Hier hattest du nur noch {t} auf der Uhr.',{t:Math.floor(tm.remaining/600)+':'+String(Math.floor(tm.remaining%600/10)).padStart(2,'0')}):Number.isFinite(tm.spent)&&tm.spent<30?(tm.spent===10?T('Diesen Zug hast du in einer Sekunde gespielt.'):T('Diesen Zug hast du in {s} Sekunden gespielt.',{s:(tm.spent/10).toLocaleString(LOCALE,{maximumFractionDigits:1})})):'';if(notice)reviewEl.querySelector('.rv-text').insertAdjacentHTML('beforeend',`<span class="rv-time-note">${UI.esc(notice)}</span>`);}
        }
        if(row&&!['forced','opening'].includes(row.cls)&&!row.uncertain&&!row.unavailable&&!review.replay&&row.best&&!row.same&&window.ChessCoach){
          const proof=row.materialNotice||(row.materialNotice=ChessCoach.rationale(row.S,row.m,row.best,row));
          const loss=proof.description.evidence?.bad.facts.find(f=>f.type==='material'&&f.owner==='opponent'&&f.verified&&f.net<=-200&&f.targets?.some(t=>'QR'.includes(t.piece)));
          if(loss){const target=loss.targets.find(t=>'QR'.includes(t.piece));reviewEl.querySelector('.rv-text').insertAdjacentHTML('beforeend',`<span class="rv-material">${UI.esc(T('Materialverlust: {p} auf {s}.',{p:T(target.piece==='Q'?'Dame':'Turm'),s:target.square}))}${row.evBest*(row.S.turn==='w'?1:-1)<-150?' '+UI.esc(T('Die Stellung war schon vorher schlechter.')):''}</span>`);}
        }
        reviewEl.querySelector('[data-r=explain]').classList.toggle('hidden',!row||['forced','opening'].includes(row.cls)||row.unavailable||['similar','unconfirmed','rejected'].includes(row.recommendationStatus)||!!review.replay);
        if (row && !row.uncertain && row.best && row.cls && !['forced','opening','best','good'].includes(row.cls)) arrow(row.best.f, row.best.t, 600000);
        if (row && !['forced','opening'].includes(row.cls) && !row.uncertain && row.cls && row.m.t!==resignedKing) { const { x, y } = disp(row.m.t); const b = document.createElement('div'); b.className = 'qbadge stay ' + ({ best: 'great', good: 'good', ok: 'okq', meh: 'meh', bad: 'bad',miss:'meh' })[row.cls]; b.style.left = ((x + 1) * 12.5) + '%'; b.style.top = (y * 12.5) + '%'; b.innerHTML = `<b>${row.sym}</b>`; fx.appendChild(b); }
        const n = review.evals.length - 1, cur = reviewEl.querySelector('.g-cur');
        if (cur && n) { cur.setAttribute('x1', (i / n) * 300); cur.setAttribute('x2', (i / n) * 300); }
        {const caption=reviewEl.querySelector('.rv-time-current');if(caption){caption.textContent=i&&Number.isFinite(row?.time?.spent)?T('Zug {n}: {s} s',{n:(Math.floor((i-1)/2)+1)+(row.mover==='b'?'… ':'. ')+row.san,s:(row.time.spent/10).toLocaleString(LOCALE,{maximumFractionDigits:1})}):i?T('Für diesen Zug fehlen Zeitdaten.'):'';reviewEl.querySelectorAll('[data-time-ply]').forEach(b=>b.classList.toggle('current',+b.dataset.timePly===i));}}
        reviewEl.querySelector('[data-r=prev]').disabled = i === 0;
        reviewEl.querySelector('[data-r=first]').disabled = i === 0;
        reviewEl.querySelector('[data-r=next]').disabled = i === plies.length;
        reviewEl.querySelector('[data-r=last]').disabled = i === plies.length;
        reviewEl.querySelector('[data-r=key]').disabled = !review.rows.some((r, k) => k >= i && reviewMoment(r));
        { const c = reviewEl.querySelector('[data-r=cont]'); if (c) c.disabled = !E.legal(review.pos[i]).length; } // Matt/Patt: nichts mehr zu spielen
        reviewEl.querySelectorAll('.rv-krow').forEach(b => b.classList.toggle('on', +b.dataset.ply === i));
      }

      reviewEl.addEventListener('click', async e => {
        const b = e.target.closest('button');
        if (!b || !review || b.disabled) return;
        if (b.dataset.ply) { jumpToPly(+b.dataset.ply); return; }
        if (b.dataset.r === 'evalhelp') { explainEval(); return; }
        if(b.dataset.r==='phasehelp'){ctx.modal({title:T('Genauigkeit nach Partiephase'),html:`<p class="muted small analysis-name">${UI.esc(ChessAnalysis.name(review.analysisVersion,review.engine))}</p><p>${T('Eröffnung: bis zum Ende des 10. Zuges. Danach beginnt das Mittelspiel, sofern noch kein Endspiel erreicht ist. Geprüfte Buchzüge zählen weiterhin nicht zur Genauigkeit.')}</p><p>${T('Endspiel: Der Figurenwert beider Seiten zusammen liegt bei höchstens 20 (Dame 9, Turm 5, Läufer und Springer je 3). Bauern und Könige zählen nicht mit. Eine erreichte Endspielphase bleibt auch nach einer Umwandlung bestehen.')}</p><p>${T('Ein Phasenwert erscheint erst nach mindestens drei eigenen bewertbaren Zügen. Unsichere, erzwungene und geprüfte Buchzüge sind ausgenommen; sonst steht dort „—“.')}</p>`,buttons:[{label:T('Verstanden'),value:null,primary:true}]});return;}
        const r = b.dataset.r, i = review.idx;
        if (r === 'first') gotoPly(0, false);
        else if(r==='explain'){
          if(review.replay||!over||!i)return;
          const current=review,row=review.rows[i-1],version=gen;if(['forced','opening'].includes(row.cls))return;b.disabled=true;
          try{
            const reference=row.best||row.coachBest||await UI.load(ChessCoach.best(row.S));
            if(!root.isConnected||gen!==version||review!==current||review.idx!==i||!reference)return;
            row.coachBest=reference;
            await ChessCoach.analyseMove(ctx,row.S,row.m,reference,{comparison:row,perspective:teachingPerspective(),isCurrent:()=>root.isConnected&&gen===version&&review===current&&review.idx===i});
          }catch(err){UI.toast(T('Die Erklärung konnte nicht geladen werden. Bitte versuche es erneut.'));}
          finally{b.disabled=false;if(root.isConnected&&gen===version&&review===current&&review.idx===i&&!document.querySelector('#modal:not(.hidden)'))b.focus({preventScroll:true});}
        }
        else if(r==='training')ctx.back();
        else if(r==='analyse'||r==='refreshanalysis'){const engine=await chooseEngine(true);if(engine&&review)analyse(null,null,false,engine);}
        else if (r === 'prev') gotoPly(i - 1, false);
        else if (r === 'next') gotoPly(i + 1, true);
        else if (r === 'last') gotoPly(plies.length, false);
        else if (r === 'key') { const k = review.rows.findIndex((x, n) => n >= i && reviewMoment(x)); if (k >= 0) { const y = b.getBoundingClientRect().top; gotoPly(k + 1, false); keepAt(b, y); } }
        else if(r==='history'&&opts.publicHistory)ctx.back();
        else if(r==='pgn'){
          const fen = E.toFEN(review.pos[review.idx]);
          if (fantasySetup) await ChessFenUI.copy(fen, { freeMaterial: true });
          else await ChessPgnUI.exportGames([gameData()], { fen });
        }
        else if (r === 'cont') continueFrom(i);
        else if (r === 'setup') await openSetup(E.toFEN(review.pos[i]));
        else if (r === 'share' && viewing) shareGame();
        else if (r === 'share') {
          if(solo())await ChessExtras.ensureProfileName();
          const s0 = review.summary[0]||{},s1=review.summary[1]||{};
          const res = review.outcome === 'win' ? T('Sieg') : review.outcome === 'loss' ? T('Niederlage') : T('Remis');
          const blob = await ctx.card({ kicker: solo() ? T('Schach gegen Stufe {n}', { n: settings.level + 1 }) : online ? T('Online-Schach') : T('Schach zu zweit'), emblem: 'value', value: accuracyText(s0.acc),
            small: T('Genauigkeit'), title: res, sub: T('{n} Züge', { n: Math.ceil(sans.length / 2) }) + (solo() ? ' · ' + lvl().name : '') });
          ctx.share((solo()
            ? T('DenkArena Schach · Stufe {n} ({l}) · {r} in {m} Zügen · Genauigkeit: {a}', { n: settings.level + 1, l: lvl().name, r: res, m: Math.ceil(sans.length / 2), a: accuracyText(s0.acc) })
            : online ? T('DenkArena Online-Schach · {r} · Genauigkeit: {a}', { r: res, a: accuracyText(s0.acc) })
            : T('DenkArena Schach · Partie zu zweit · Genauigkeit: Weiß {a}, Schwarz {b}', { a: accuracyText(s0.acc), b: accuracyText(s1.acc) })) + '\n\n' + (!review.replay?ChessAnalysis.name(review.analysisVersion,review.engine)+'\n\n':'') + T('Welchen Zug hättest du gespielt?') + '\n\n' + T('Zum Nachspielen:') + '\n' + GameLink.url(GameLink.encode(gameData())), blob);
        }
        else if (r === 'again') { if (online) rematchAction('offer'); else if (setupSettings) restartSetup(); else {leaveReview();if (!bgSearch) await ctx.beforeNewGame(); newGame();} }
        else if (r === 'lobby') { leaveReview(); showLobby(); }
        else if (r === 'practice') { const group=review.practiceGroup;leaveReview();ctx.openGame('puzzles',{mistakes:true,overview:true,group}); }
      });
      moveListEl.addEventListener('click', e => {
        const m = e.target.closest('em[data-ply]');
        if (m && review) gotoPly(+m.dataset.ply, false);
      });
      this._key = e => {
        if (!review || UI.isModalOpen() || boardNotes.active) return;
        if (e.key === 'ArrowLeft') { gotoPly(review.idx - 1, false); e.preventDefault(); }
        else if (e.key === 'ArrowRight') { gotoPly(review.idx + 1, true); e.preventDefault(); }
      };
      document.addEventListener('keydown', this._key);
      // Wischen auf dem Brett blättert in der Analyse
      let swipe = null;
      board.addEventListener('pointerdown', e => { if (review&&!boardNotes.active&&e.button===0) swipe = {id:e.pointerId, x: e.clientX, y: e.clientY }; }, true);
      board.addEventListener('pointerup', e => {
        if (!review || !swipe || swipe.id!==e.pointerId) return;
        const dx = e.clientX - swipe.x,dy=e.clientY-swipe.y; swipe = null;
        if (Math.abs(dx) > 40&&Math.abs(dx)>Math.abs(dy)*1.5) gotoPly(review.idx + (dx < 0 ? 1 : -1), dx < 0);
      }, true);
      board.addEventListener('pointercancel',()=>{swipe=null;},true);

      // ================= Partie starten / steuern =================
      // self: Vorauswahl „Beide Seiten selbst“ (Standard: wie die laufende eigene Stellung)
      async function openSetup(initialFen, self = !!setupSettings && selfPlay()) {
        if (Store.get('chess.live', null)) {
          UI.toast(T('Es läuft bereits eine Online-Partie. Kehre zuerst dorthin zurück.'));
          return;
        }
        const stamp = gen, isCurrent = () => root.isConnected && gen === stamp && !Store.get('chess.live', null);
        // alle Stufen sichtbar; ohne Premium sind die Premium-Stufen gesperrt und führen zum Abo
        const levelList = () => LEVELS.map((item, i) => [i, item.name, !!item.opts.stockfishElo, !!item.premium && !ctx.isPremium(), item.desc]);
        let level = LEVELS[settings.level] && !(LEVELS[settings.level].premium && !ctx.isPremium()) ? settings.level : LEVELS.reduce((n, L, i) => (L.premium ? n : i), 0);
        let color = initialFen ? (flipped ? 'b' : 'w') : (settings.color === 'b' ? 'b' : 'w'), selected, draft = null;
        for (;;) {
          selected = await ChessSetup.show({ initialFen, color, level, levels: levelList(), theme: settings.theme, isCurrent, self, draft });
          if (!selected?.paywall || !isCurrent()) break;
          // Premium-Stufe angetippt: Abo zeigen, danach mit demselben Entwurf zurück in den Editor
          const ok = await ctx.paywall(T('Spielstärke {n}: {l}', { n: selected.level + 1, l: LEVELS[selected.level].name }));
          if (!isCurrent()) return;
          ({ fen: initialFen, color, self, draft } = selected);
          level = ok && ctx.isPremium() ? selected.level : selected.current;
        }
        if (!selected || !isCurrent()) return;
        if (Store.get('chess.setupGame', null) && !setupSettings) {
          const replace = await ctx.modal({ title: T('Eigene Stellung'), html: '<p>' + T('Die laufende Partie aus einer eigenen Stellung wird ersetzt.') + '</p>',
            buttons: [{ label: T('Abbrechen'), value: false }, { label: selected.self ? T('Selbst spielen') : T('Gegen Computer spielen'), value: true, primary: true }] });
          if (!replace || !isCurrent()) return;
        }
        startSetup(selected.fen, selected.color, selected.level, selected.self);
      }

      // self: beide Seiten selbst spielen (zu zweit am Gerät, aber ohne Mitdrehen; das Brett zeigt deine Farbe unten)
      function startSetup(fen, color, level, self = false) {
        resumeGame({ v: 1, mode: self ? 'pvp' : 'solo', pvpView: self ? 'self' : undefined, level, clockKey: 'none', color, moves: [],
          initialFen: fen, hints: 0, cont: true, setup: true, starting: true });
      }

      async function restartSetup() {
        const stamp = gen;
        if (!over && plies.length) {
          const ok = await ctx.modal({ title: T('Neu starten'), html: '<p>' + T('Zurück zur Ausgangsstellung dieser Partie?') + '</p>',
            buttons: [{ label: T('Abbrechen'), value: false }, { label: T('Neu starten'), value: true, primary: true }] });
          if (!ok || stamp !== gen || !root.isConnected) return;
        }
        startSetup(gameInitialFen, selfPlay() ? (flipped ? 'b' : 'w') : playerColor, settings.level, selfPlay());
      }

      function newGame() {
        demoSettings();
        fantasySetup = false;
        if (clockLocked() && settings.clock !== 'none') { settings.clock = 'none'; saveSettings(); } // Trainer immer ohne Uhr, auch bei Revanche
        gameInitialFen=null;clearPremove();archiveId='local:'+Date.now()+':'+Math.random().toString(36).slice(2);gameDate=Date.now();lastEnd=null;resultShown=false;onlineTiming=null;
        leaveReview(); viewing = null; contGame = false;
        token++; gen++; busy = false; over = false; hintsUsed = 0; hideTrainer(); trainerReset();
        lobby.classList.add('hidden'); match.classList.remove('hidden');
        S = E.initial(); hist = []; sans = []; plies = []; keys = [E.key(S)]; lastMove = null; selected = -1; targets = []; evalNow = 0;
        dropSave();
        playerColor = settings.color === 'r' ? (Math.random() < 0.5 ? 'w' : 'b') : settings.color;
        if (!solo()) playerColor = 'w';
        flipped = solo() && playerColor === 'b';
        root.classList.toggle('pvp-table', pvpLocal() && settings.pvpView === 'table');
        root.classList.remove('pvp-turn-b');
        legalAll = E.legal(S);
        startClock();
        renderAll(true);
        const my = gen;
        if (solo() && playerColor === 'b') setTimeout(() => { if (my === gen) oppTurn(); }, 500);
      }

      function undo() {
        if (!hist.length || !undoOk()) return;
        token++; gen++; busy = false; hideTrainer();
        const before = plies.slice();
        const steps = solo() ? (S.turn === playerColor ? 2 : 1) : 1;
        const pop = () => { const h = hist.pop(); S = h.S; lastMove = h.lastMove; evalNow = h.evalNow; if (h.clock) clock = Object.assign(h.clock, { last: Date.now() });else if(clock)clock.turnStart=undefined; sans.pop(); keys.pop(); plies.pop(); };
        for (let i = 0; i < steps && hist.length; i++) pop();
        if (solo() && S.turn !== playerColor && hist.length && !over) pop();
        if (over) { over = false; resultShown=false;lastEnd=null;startClockKeep(); }
        selected = -1; targets = []; trainerUndo(before);
        legalAll = E.legal(S);
        buildPieces(false); refresh(); setEval(evalNow); turnBoard();
        Sound.play('tap');
        if (plies.length || setupSettings) saveGame(); else dropSave();
        if (solo() && S.turn !== playerColor) oppTurn();
        else if (trainerOn()) { const at = S, my = gen; trainerJudgeMissing(true); setTimeout(() => { if (my === gen) trainerTurn(at); }, 450); }
      }
      function startClockKeep() {
        if (!clock) return;
        clock.last = Date.now();
        clockT = setInterval(() => {
          if (over || !clock) return;
          const now = Date.now(); if (!online && UI.held()) { clock.last = now; return; } clock[S.turn] -= now - clock.last; clock.last = now;
          if (clock[S.turn] <= 0) { clock[S.turn] = 0; renderClock(); flagFall(S.turn); return; }
          renderClock();
        }, 200);
      }

      let hintsUsed = 0;
      async function hint() {
        if (busy || over) return;
        if (solo() && S.turn !== playerColor) return;
        const at = S, g0 = gen, same = () => gen === g0 && S === at && !over;
        if (!(await ctx.hintGate(3)) || !same()) return;
        if (!(await ctx.rewarded(T('einen Tipp'))) || !same()) return;
        hintsUsed++;
        if (solo()) { trainerHint = S; markHelped(S, 'tips'); saveGame(); }
        const cost = ctx.hintCost(hintsUsed, 3); if (cost) UI.toast(cost, 2600);
        busy = true; tipAt = S; hideBottom();
        setStatus(T('Analyse läuft …'), 'thinking');
        const my = gen;
        const m = await think(S, { maxDepth: 4, timeMs: 1500, noise: 0, history: keys.slice() });
        if (my !== gen) return;
        busy = false; refresh();
        if (!m) return;
        arrow(m.f, m.t, 3200);
        setStatus(T('Empfohlen') + ': ' + E.toSAN(S, m, legalAll), 'hintmsg');
      }

      async function resign() {
        if (over) return;
        const ok = online ? await Online.confirmResign(online.room) : await ctx.modal({ title: T('Aufgeben?'), html: `<p>${T('Die Partie wird als Niederlage gewertet.')}</p>`, buttons: [{ label: T('Weiterspielen'), value: false }, { label: T('Aufgeben'), value: true, danger: true }] });
        if (!ok || over) return;
        if (online) { net && net.send({ t: 'resign' }); return; }
        token++; over = true; busy = false; stopClock(); refresh(); dropSave();
        const loser = solo() ? playerColor : S.turn;
        endGame({ over: true, result: loser === 'w' ? 'b' : 'w', reason: 'Aufgabe' }, true);
      }

      async function backToLobby() {
        if (!over && plies.length) {
          const ok = await ctx.modal({ title: T('Partie beenden?'), html: `<p>${T('Die laufende Partie wird abgebrochen.')}</p>`, buttons: [{ label: T('Weiterspielen'), value: false }, { label: T('Beenden'), value: true, danger: true }] });
          if (!ok) return;
          if (!online) dropSave();
        }
        showLobby();
      }

      // ================= Online =================
      // Ranglistenpartien: alle spielen mit dem DenkArena-Standardsatz, egal welche Figuren im Shop ausgewählt sind.
      function rankedPieces(on){const want=on?'turnier':null;if(Pieces.locked()===want)return;Pieces.lock(want);root.className=root.className.replace(/\s*pcs-\S+/g,'')+piecesCls();renderAll(false);}
      function leaveOnline() { rankedPieces(false); resultDialogCard=null;premoveBlocked=false;root.querySelector('.chess-end-tools').classList.add('hidden'); clearTimeout(phraseNoticeT);root.querySelector('.online-context').classList.add('hidden');root.querySelector('.online-context').classList.remove('speaking');root.classList.remove('online-match');root.querySelector('.chess-phrase').classList.add('hidden');root.querySelector('.phrase-controls').classList.add('hidden');clearPremove();clearTimeout(rematchT);rematchData=null;root.querySelector('.chess-rematch').classList.add('hidden');showNetTiming(null); root.querySelector('.on-unrated').classList.add('hidden'); if (net) { net.close(); net = null; } online = null; }
      const onlineProblem = (why, secs) => why === 'active' ? T('Es läuft bereits eine Online-Partie. Kehre zuerst dorthin zurück.') : why === 'cooldown' ? T('Du hast mehrere Partien früh abgebrochen. Du kannst in {m} Min. wieder suchen.', { m: Math.max(1, Math.ceil((secs || 60) / 60)) })
        : why === 'capacity' ? T('Online-Schach ist gerade ausgelastet. Bitte versuche es später erneut.')
        : why === 'rate' ? T('Es gab zu viele Anfragen in kurzer Zeit. Bitte warte kurz und versuche es erneut.')
        : why === 'expired' ? T('Zu spät angenommen. Die Partie wurde schon abgebrochen.')
        : why === 'disabled' ? T('Online-Schach ist gerade abgeschaltet. Bitte später erneut versuchen.')
        : why === 'banned' ? T('Dein Konto ist für Online-Funktionen gesperrt.') : why === 'account' ? T('Für Partien gegen andere Spieler brauchst du ein Konto.') : why === 'integrity' ? T('Online-Funktionen gibt es nur in der App aus dem Google Play Store.') : T('Server nicht erreichbar. Bitte später erneut versuchen.');

      async function onlineFailure(why, secs, action, retryGame) {
        const retry = Number.isFinite(secs) && secs > 0 ? T('Bitte versuche es nach {t} erneut.', { t: new Date(Date.now() + secs * 1000).toLocaleString(LOCALE, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) }) : '';
        const result = await ctx.modal({ title: T('Online-Schach'), html: `<p>${UI.esc(onlineProblem(why,secs))}</p>${retry ? `<p class="muted">${UI.esc(retry)}</p>` : ''}`,
          buttons: [{ label: T('Schließen'), value: null }, ...(!retryGame ? [{ label: T('Gegen Computer spielen'), value: 'cpu' }] : []), { label: T('Erneut versuchen'), value: 'retry', primary: true }] });
        if (result === 'retry') return retryGame ? retryGame() : onlineAction(action || 'quick');
        if (result === 'cpu') { settings.mode = 'solo'; saveSettings(); await ctx.beforeNewGame(); newGame(); }
      }

      async function onlineAction(kind) {
        if (!Online.configured) { UI.toast(T('Der Online-Server ist noch nicht eingerichtet')); return; }
        if (kind === 'friends') {
          const stamp = gen;
          await Friends.show({ clocks: CLOCKS.filter(([key]) => key !== 'any'), defaultClock: settings.clock === 'any' ? '5' : settings.clock, clockLabel,
            start: match => { if (stamp === gen && el.isConnected && !lobby.classList.contains('hidden')) startOnline(match.room, { clock: match.clock, color: match.color }); } });
          if (el.isConnected) refreshFriendsBadge();
          return;
        }
        if (ctx.requireAccount && !(await ctx.requireAccount())) return;
        if (Cloud.Integrity) await Cloud.Integrity.ensure();
        if (kind === 'quick') {
          let rated = settings.matchRating !== 'casual';
          // card/offered vor dem Fenster anlegen: onOpen läuft sofort beim Öffnen (sonst „before initialization“)
          let sock = null, done = false, card = null, offered = null, modeOffered = null, bg = false, warned = false;
          const res = UI.modal({
            title: T('Gegner wird gesucht'), html: `<p><b class="srch-mode-label">${rated ? T('Gewertet') : T('Ungewertet')}</b></p><p class="muted">${!rated ? clockLabel(settings.clock) : !refreshEst.last ? T('Bedenkzeit: {c}. Das dauert meist nur wenige Sekunden.', { c: clockLabel(settings.clock) })
              : refreshEst.last.est_secs == null ? T('Bedenkzeit: {c}. Gerade ist niemand online. Lass die Suche ruhig laufen oder lade einen Freund ein.', { c: clockLabel(settings.clock) })
              : T('Bedenkzeit: {c}. Geschätzte Wartezeit: {t}.', { c: clockLabel(settings.clock), t: waitText(refreshEst.last.est_secs) })}</p>${UI.loader(T('Gegner wird gesucht'))}
              <p class="muted small srch-info"></p><div class="srch-offer srch-clock" hidden></div><div class="srch-offer srch-mode" hidden></div>`,
            onOpen(c) { card = c; },
            buttons: [{ label: T('Abbrechen'), value: null }, { label: T('Solange gegen den Computer spielen'), value: 'cpu' }]
          });
          sock = Online.match(settings.clock, async m => {
              done = true;
              if (bg) return foundWhilePlaying(m);
              UI.closeModal('matched');
              // nach längerer Suche erst annehmen lassen: wer kurz weggeschaut hat, landet nicht ungefragt in einer Partie
              if (!m.active && !(await acceptMatch(m))) return;
              startOnline(m.room, { clock: m.clock, color: m.color, quick: m.quick !== false });
            },
            (failed, why, secs) => { if (done) return; done = true; if (bg) { bgStop(false); UI.toast(onlineProblem(why, secs), 4000); return; } UI.closeModal('fail'); if (['capacity','rate'].includes(why) || !['active','cooldown','expired','disabled','banned','account','integrity'].includes(why)) setTimeout(() => onlineFailure(why,secs,'quick'),0); else UI.toast(onlineProblem(why, secs), 4000); },
            info => {
              if (info.warn && !warned) { warned = true; UI.toast(T('Du hast gerade mehrere Partien früh abgebrochen. Beim nächsten Abbruch kannst du kurz nicht suchen.'), 4500); }
              if (done || bg || !card) return;
              const n = info.searching, el = card.querySelector('.srch-info');
              const modeOffer = info.modeOffer && info.modeOffer !== (rated ? 'rated' : 'casual') ? info.modeOffer : null;
              if (el) el.textContent = n === 0 ? (modeOffer ? '' : T('Gerade sucht sonst niemand.')) : n === 1 ? T('1 weiterer Spieler sucht gerade.') : T('{n} weitere Spieler suchen gerade.', { n });
              // Gegner wartet mit der anderen Wahl (gewertet/ungewertet): für diese Suche übernehmen
              const mbox = card.querySelector('.srch-mode');
              if (mbox && !modeOffer) { mbox.hidden = true; modeOffered = null; }
              else if (mbox && modeOffer !== modeOffered) {
                modeOffered = modeOffer;
                const toRated = modeOffer === 'rated';
                mbox.innerHTML = `<p><b>${toRated ? T('Ein Spieler wartet auf eine gewertete Partie.') : T('Ein Spieler wartet auf eine ungewertete Partie.')}</b><br><span class="muted small">${toRated
                  ? T('Für eine ungewertete Partie passt gerade kein Gegner. Gewertet geht es sofort los, die Partie zählt dann für deine Schach-Wertung.')
                  : T('Für eine gewertete Partie passt gerade kein Gegner. Ungewertet geht es sofort los, deine Wertung bleibt gleich.')}</span></p><button class="btn primary small-btn">${toRated ? T('Gewertet spielen') : T('Ungewertet spielen')}</button>`;
                mbox.hidden = false;
                mbox.querySelector('button').onclick = () => {
                  Sound.play('tap'); rated = toRated; sock.setRated(toRated);
                  const label = card.querySelector('.srch-mode-label'); if (label) label.textContent = toRated ? T('Gewertet') : T('Ungewertet');
                  mbox.innerHTML = UI.waiting(T('Einen Moment …'));
                };
              }
              const box = card.querySelector('.srch-clock');
              if (!box) return;
              if (!info.offer) { box.hidden = true; offered = null; return; }
              if (info.offer === offered) return;
              offered = info.offer;
              box.innerHTML = `<p>${T('Ein Gegner wartet mit {c}.', { c: clockLabel(info.offer) })}</p><button class="btn primary small-btn">${T('Mit {c} spielen', { c: clockLabel(info.offer) })}</button>`;
              box.hidden = false;
              box.querySelector('button').onclick = () => { Sound.play('tap'); sock.setClock(offered); box.innerHTML = UI.waiting(T('Einen Moment …')); };
            }, { rated });
          const r = await res;
          if (r === 'cpu' && sock && !done) {
            // Suche läuft im Hintergrund weiter; sobald ein Gegner da ist, fragt die App, ob du wechseln willst
            bg = true; bgSearch = { sock, clock: settings.clock };
            settings.mode = 'solo'; saveSettings(); newGame(); bgBar(); // keine Vollbildwerbung, während auf einen Gegner gewartet wird
          } else {
            if (r !== 'matched' && sock) sock.close();
            if (r === 'cpu') { settings.mode = 'solo'; saveSettings(); await ctx.beforeNewGame(); newGame(); }
          }
        } else if (kind === 'invite') {
          let room;
          try { room = await Online.createRoom(settings.clock); } catch (e) { const info = Cloud.errorInfo ? Cloud.errorInfo(e) : {}; if (['active','disabled','banned','account','integrity'].includes(e.message)) UI.toast(onlineProblem(e.message)); else await onlineFailure(info.kind || e.message,e.retryAfter,'invite'); return; }
          startOnline(room, { clock: settings.clock });
          inviteDialog(room);
        } else if (kind === 'join') {
          let val = '';
          const r = await UI.modal({
            title: T('Raum beitreten'), html: `<p class="muted">${T('Gib den fünfstelligen Raum-Code ein.')}</p><input id="room-code" class="code-input" maxlength="5" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="ABCDE">`,
            buttons: [{ label: T('Abbrechen'), value: null }, { label: T('Beitreten'), value: 'go', primary: true }],
            onOpen(card) { const i = card.querySelector('#room-code'); i.oninput = () => { val = i.value; }; setTimeout(() => i.focus(), 50); }
          });
          const code = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
          if (r !== 'go') return;
          if (code.length !== 5) { UI.toast(T('Der Code hat fünf Zeichen')); return; }
          startOnline(code, { clock: settings.clock });
        }
      }

      // ---------- Gegnersuche im Hintergrund (während einer Partie gegen den Computer) ----------
      let bgSearch = null;
      function bgBar() {
        let bar = match.querySelector('.bg-search');
        if (!bgSearch) { if (bar) bar.remove(); return; }
        if (!bar) { bar = document.createElement('div'); bar.className = 'bg-search'; match.prepend(bar); }
        bar.innerHTML = `<span class="bgs-loader">${UI.loader(T('Gegner wird gesucht'),{decorative:true})}</span><span>${T('Suche Online-Gegner · {c}', { c: clockLabel(bgSearch.clock) })}</span><button>${T('Abbrechen')}</button>`;
        bar.querySelector('button').onclick = () => { Sound.play('tap'); bgStop(true); };
      }
      function bgStop(cancel) {
        if (!bgSearch) return;
        if (cancel && bgSearch.sock) bgSearch.sock.close();
        bgSearch = null; bgBar();
      }
      // Gefundenen Gegner annehmen (15 s). Ablehnen oder keine Antwort zählt als Abbruch.
      const ACCEPT_SECS = 15;
      async function acceptMatch(m, bgGame) {
        Sound.play('check'); Haptic.fire('ok');
        let left = m.accept_until&&m.now ? Math.max(0,Math.min(25,Math.ceil((Date.parse(m.accept_until)-Date.parse(m.now)-(Date.now()-(m.receivedAt||Date.now()))-(m.roundTripMs||0))/1000))) : ACCEPT_SECS, timer = null;
        const formatRating=r=>r&&Number.isFinite(r.r)?UI.esc(String(r.r))+(r.p?'?':''):T('Noch keine Wertung');
        const ratings=m.rating_note!=='casual'&&m.your_rating&&m.opponent_rating?`<div class="match-ratings"><div><small>${T('Du')}</small><b>${formatRating(m.your_rating)}</b></div><span>–</span><div><small>${UI.esc(m.opponent_name||T('Gegner'))}</small><b>${formatRating(m.opponent_rating)}</b></div></div><p class="muted small">${T('Schach-Wertung · {c}',{c:CAT_NAME()[m.rating_cat]||T('Schach')})}</p>`:'';
        const r = await ctx.modal({ title: T('Gegner gefunden'), dismissable: false,
          html: `<p>${T('Ein Gegner wartet auf dich ({c}).', { c: clockLabel(m.clock) })}</p>${ratings}${m.rating_wide?`<p class="match-gap">${T('Eure Schach-Wertungen liegen {n} Punkte auseinander.',{n:m.rating_gap})}</p><p>${T('Möchtest du diese Partie trotzdem spielen? Du kannst ohne Suchsperre ablehnen.')}</p>`:''}${m.rating_note ? `<p class="muted">${T('Ungewertete Partie: keine Änderung der Schach-Wertung und keine Punkte für die Rangliste.')} ${m.rating_note==='limit' ? T('Gegen denselben Gegner zählen höchstens drei Partien in 24 Stunden.') : ''}</p>` : ''}${bgGame ? `<p class="muted small">${T('Deine Partie gegen den Computer wird gespeichert. Du kannst sie später über „Weiterspielen“ fortsetzen.')}</p>` : ''}<p class="muted small bgs-left"></p>${m.decline_free||m.rating_note ? '' : `<p class="muted small">${T('Wer oft ablehnt oder nicht reagiert, kann kurz nicht suchen.')}</p>`}`,
          buttons: [{ label: T('Ablehnen'), value: 'no' }, { label: bgGame ? T('Jetzt online spielen') : T('Annehmen'), value: 'go', primary: true }],
          onOpen(card) {
            const el = card.querySelector('.bgs-left'), upd = () => { if (el) el.textContent = T('Noch {n} Sekunden', { n: left }); };
            upd(); timer = setInterval(() => { left--; upd(); if (left <= 0) { clearInterval(timer); UI.closeModal('no'); } }, 1000);
          } });
        clearInterval(timer);
        if (r === 'go') return true;
        let d = null;
        try { d = await Cloud.rpc('chess_match_decline', { p_code: m.room }); } catch (e) { /* Server entscheidet spätestens nach Ablauf der Frist */ }
        UI.toast(d && d.ban_secs ? onlineProblem('cooldown', d.ban_secs) : d && d.warn ? T('Du hast gerade mehrere Partien früh abgebrochen. Beim nächsten Abbruch kannst du kurz nicht suchen.') : T('Abgelehnt. Die Suche ist beendet.'), d && (d.ban_secs || d.warn) ? 4500 : 2200);
        return false;
      }
      // abgebrochene Partie aus der Suche (nicht angenommen / erster Zug fehlt): ungewertet, zurück in die Suche
      function abortedMatch(reason) {
        over = true; stopClock(); busy = false; forgetLive();
        const mine = reason === 'Kein Zug ' + playerColor;
        showLobby();
        if (mine) { UI.toast(T('Du hast deinen ersten Zug nicht rechtzeitig gemacht. Die Partie wurde abgebrochen.'), 3500); return; }
        UI.toast(reason === 'Nicht angenommen' ? T('Der Gegner hat nicht angenommen. Die Suche läuft weiter.') : T('Dein Gegner hat nicht gezogen. Die Partie wird nicht gewertet. Die Suche läuft weiter.'), 3200);
        setTimeout(() => onlineAction('quick'), 400);
      }
      async function foundWhilePlaying(m) {
        if (!bgSearch) return;
        bgSearch.sock = null; // der Server hat schon gepaart, nichts mehr abzubrechen
        // ein offenes Fenster (z. B. Partieende) kurz abwarten, die Annehmen-Frist läuft schon
        for (let i = 0; i < 6 && UI.isModalOpen(); i++) await new Promise(r => setTimeout(r, 500));
        if (!bgSearch) return;
        const ok = await acceptMatch(m, true);
        bgSearch = null; bgBar();
        if (!ok) return;
        if (!over && plies.length) saveGame();
        settings.mode = 'online'; saveSettings();
        startOnline(m.room, { clock: m.clock, color: m.color, quick: m.quick !== false });
      }

      async function inviteDialog(room) {
        const text = T('Spiel eine Partie Schach mit mir bei DenkArena.') + '\n' + T('Öffne Schach → Online → Raum beitreten → Code: {r}', { r: room });
        const r = await UI.modal({
          title: T('Freund einladen'), html: `<p class="muted">${T('Schick diesen Code an deinen Mitspieler. Die Partie beginnt, sobald er beitritt.')}</p><div class="room-code">${room}</div>`,
          buttons: [{ label: T('Schließen'), value: null }, { label: T('Code teilen'), value: 'share', primary: true }]
        });
        if (r === 'share') ctx.share(text);
      }

      // laufende Online-Partie merken, damit man nach versehentlichem Schließen der App zurückkommt
      const rememberLive = (room, opts) => Store.set('chess.live', { room, clock: opts.clock || null, color: opts.color || null, quick: !!opts.quick, at: Date.now() });
      const forgetLive = () => Store.del('chess.live');
      function startOnline(room, opts) {
        gameInitialFen=null;
        fantasySetup = false;
        leaveOnline(); viewing = null; contGame = false;onlineTiming=null;
        resultShown=false;lastEnd=null;gameDate=Date.now();archiveId='online:'+room;
        usedPhrases.clear();phraseSending=false;
        rememberLive(room, opts);
        token++; gen++; busy = false; over = false;
        online = { room, names: {}, started: false, retries: 0, opts };
        lobby.classList.add('hidden'); match.classList.remove('hidden');
        S = E.initial(); hist = []; sans = []; plies = []; keys = [E.key(S)]; lastMove = null; selected = -1; targets = []; evalNow = 0;
        playerColor = opts.color || 'w'; flipped = playerColor === 'b'; clock = null; stopClock();
        legalAll = E.legal(S);
        renderAll(true);
        connect();
      }

      function connect() {
        if (!online) return;
        const my = online;
        net = Online.join(online.room, online.opts, msg => onNet(msg), failedToOpen => {
          if (online !== my || over) return;
          if (failedToOpen && !online.started) { UI.toast(T('Server nicht erreichbar')); showLobby(); return; }
          if (online.retries++ < 6) { setStatus(T('Verbindung unterbrochen, verbinde neu …'), 'warn'); setTimeout(() => online === my && connect(), 1500); }
          else { UI.toast(T('Verbindung verloren')); showLobby(); }
        });
      }

      function setNetClock(c) {
        if (!c) { clock = null; stopClock(); renderClock(); return; }
        clock = { w: c.w, b: c.b, inc: c.inc || 0, last: Date.now() };
        if (!clockT) startClockKeep();
        renderClock();
      }
      function syncMoveTimes(value){
        const times=ChessTiming.decode(value,plies.length,online?.opts.clock);
        if(!times)return;
        onlineTiming=value;plies.forEach((p,i)=>p.time=times[i]);
        if(resultShown&&!contGame&&!viewing)ChessExtras.save(gameData());
      }

      function showNetTiming(timing) {
        const box=root.querySelector('.net-notice');
        box.classList.toggle('hidden', !timing || over || !online);
        if (!timing || over || !online) return;
        const title=timing.own ? (timing.uncertain ? T('Verbindung unterbrochen, verbinde neu …') : T('Deine Rückkehr wird geprüft')) : timing.absent ? T('Dein Gegner ist abwesend') : T('Frist für den ersten Zug');
        const titleEl=box.querySelector('.net-title'); if (titleEl.textContent!==title) titleEl.textContent=title;
        const label=timing.kind==='first' ? T('Erster Zug') : timing.kind==='clock' ? T('Schachuhr') : timing.kind==='move' ? T('Zugfrist') : T('Rückkehrfrist');
        box.querySelector('.net-label').textContent=label;
        box.querySelector('.net-seconds').textContent=T('{s} s',{s:timing.seconds});
        box.classList.toggle('urgent', timing.seconds<=10);
        box.querySelector('.net-detail').textContent=timing.seconds===0 ? T('Frist abgelaufen. Der Server prüft das Ergebnis.') : timing.kind==='first' ? T('Ohne ersten Zug wird die Partie ungewertet abgebrochen.') : timing.side===playerColor ? T('Läuft diese Frist ab, verlierst du die Partie.') : T('Läuft diese Frist ab, verliert dein Gegner die Partie.');
        box.querySelector('.net-extra').textContent=timing.uncertain ? T('Verbindung zum Server fehlt. Die angezeigten Fristen beruhen auf dem letzten bestätigten Stand.') : timing.absent ? (timing.kind==='away'||timing.kind==='lost' ? T('Die Schachuhr läuft weiter. Die zuerst ablaufende Frist entscheidet.') : T('Rückkehrfrist: noch {s} s. Die zuerst ablaufende Frist entscheidet.',{s:timing.returnSeconds})) : '';
      }

      function onNet(m) {
        if (m.t === 'live-busy') { UI.toast(T('Die Live-Verbindung ist gerade ausgelastet. Der Spielstand wird weiter regelmäßig abgefragt.'), 5500); return; }
        if (!online) return;
        if(m.t==='phrase'){
          const text=ChessExtras.phrases()[m.key];if(!text||Store.get('chess.phrasesMuted',false))return;
          if(m.by===playerColor){usedPhrases.add(m.key);refreshPhraseControls();return;}
          const notice=root.querySelector('.chess-phrase'),context=root.querySelector('.online-context');notice.textContent=text;notice.classList.remove('hidden');context.classList.add('speaking');clearTimeout(phraseNoticeT);phraseNoticeT=setTimeout(()=>{notice.classList.add('hidden');context.classList.remove('speaking');},6000);return;
        }
        if(m.t==='background'){clearPremove();return;}
        if (m.t === 'timing') { premoveBlocked=!!m.timing?.uncertain;if(premoveBlocked)clearPremove();showNetTiming(m.timing); return; }
        if (m.t === 'state') {
          online.retries = 0;
          if(m.clockKey==='none'||ChessTiming.settings(m.clockKey))online.opts.clock=m.clockKey;
          online.names = m.names || {};
          if (m.titles) online.titles = m.titles;
          if (m.ranks) online.ranks = m.ranks;
          online.rated = !!m.rated; online.ratingNote=m.rating_note || null; rankedPieces(online.rated); root.querySelector('.on-unrated').classList.toggle('hidden', !online.ratingNote); if (m.ratings) online.ratings = m.ratings; online.firstMs = m.first_ms || 0;
          if (m.result && m.result.winner === 'abort') { if (!over) abortedMatch(m.result.reason); return; }
          if (playerColor !== m.you) { playerColor = m.you; flipped = playerColor === 'b'; renderAll(false); }
          const sameMoves=m.moves.length===plies.length&&m.moves.every((u,i)=>u===uciOfMove(plies[i].m));
          if (!sameMoves) {
            const prefix=plies.map(p=>uciOfMove(p.m));
            if(m.moves.length!==sans.length+1||!prefix.every((u,i)=>m.moves[i]===u))clearPremove();
            // nach Wiederverbinden: Stellung aus der Zugliste des Servers neu aufbauen
            S = E.initial(); hist = []; sans = []; plies = []; keys = [E.key(S)]; lastMove = null;
            for (const u of m.moves) {
              const mv = E.legal(S).find(x => E.sqName(x.f) + E.sqName(x.t) + (x.promo ? x.promo.toLowerCase() : '') === u);
              if (!mv) break;
              const san = E.toSAN(S, mv);
              hist.push({ S, lastMove, evalNow }); plies.push({ S, m: mv, san, mover: colorOf(mv.p) });
              S = E.make(S, mv); sans.push(san); keys.push(E.key(S)); lastMove = { f: mv.f, t: mv.t };
            }
            legalAll = E.legal(S);
            buildPieces(false);
          }
          if (m.started && !online.started) { online.started = true; Sound.play('check'); UI.closeModal(null); }
          syncMoveTimes(m.moveTiming);setNetClock(m.clock);
          refresh();
          if (m.result && !over) { over = true; stopClock(); showNetTiming(null); endGame({ over: true, result: m.result.winner, reason: m.result.reason }); }
          if(m.result&&!resultShown&&m.result.winner!=='abort'){over=true;stopClock();endGame({result:m.result.winner,reason:m.result.reason});}
          if(!m.result)schedulePremove();
        } else if (m.t === 'move') {
          if (m.by !== playerColor) {
            const mv = legalAll.find(x => E.sqName(x.f) + E.sqName(x.t) + (x.promo ? x.promo.toLowerCase() : '') === m.uci);
            if (mv) doMove(mv, true);
          }
          syncMoveTimes(m.moveTiming);setNetClock(m.clock);
          schedulePremove();
        } else if (m.t === 'end') {
          if (m.result === 'abort') { if (!over) abortedMatch(m.reason); return; }
          syncMoveTimes(m.moveTiming);if (m.clock) setNetClock(m.clock);
          over = true; stopClock(); busy = false; showNetTiming(null); refresh();
          endGame({ over: true, result: m.result, reason: m.reason }, m.reason === 'Aufgabe');
        } else if (m.t === 'opp-left') {
          setStatus(m.away ? T('Dein Gegner hat die App verlassen. Kommt er nicht innerhalb von {s} s zurück, gewinnst du.', { s: m.seconds })
            : T('Gegner hat die Verbindung verloren. Wir warten bis zu {s} s.', { s: m.seconds }), 'warn');
        } else if (m.t === 'draw-offer') {
          UI.modal({ title: T('Remis-Angebot'), html: `<p>${T('Dein Gegner bietet Remis an.')}</p>`, buttons: [{ label: T('Ablehnen'), value: 'no' }, { label: T('Annehmen'), value: 'yes', primary: true }] })
            .then(r => net && net.send({ t: r === 'yes' ? 'draw-accept' : 'draw-decline' }));
        } else if (m.t === 'draw-declined') {
          UI.toast(T('Remis abgelehnt'));
        } else if (m.t === 'full') {
          forgetLive();
          UI.toast(T('Dieser Raum ist schon voll')); leaveOnline(); showLobby();
        } else if (m.t === 'unavailable') {
          const transient = m.why === 'capacity' || m.why === 'rate', retryGame = transient && online ? { room: online.room, opts: online.opts } : null;
          if (!transient) forgetLive();
          leaveOnline(); showLobby();
          if (transient) onlineFailure(m.why,m.retryAfter,'join',retryGame ? () => startOnline(retryGame.room,retryGame.opts) : null);
          else UI.toast(m.why === 'notfound' ? T('Diesen Raum gibt es nicht. Bitte prüfe den Code.') : onlineProblem(m.why));
        } else if (m.t === 'error') {
          clearPremove();
          UI.toast(T(m.error));
        }
      }

      async function reportMenu(){
        if(!online)return;
        const action=await ctx.modal({title:T('Melden'),html:!over?`<p class="muted small">${T('Spielverhalten kannst du nach Partieende melden.')}</p>`:'',buttons:[{label:T('Namen melden'),value:'name'},{label:T('Spielverhalten melden'),value:'fair'}, {label:T('Abbrechen'),value:null}],onOpen(card){if(!over){const button=card.querySelectorAll('.modal-btns button')[1];button.disabled=true;}}});
        if(action==='name')await reportOpponent();else if(action==='fair'&&over)await reportFair();
      }
      async function reportOpponent() {
        if (!online) return;
        const opp = playerColor === 'w' ? 'b' : 'w', nm = (online.names && online.names[opp]) || '';
        const ok = await ctx.modal({ title: T('Namen melden?'), html: `<p>${T('Meldest du „{n}“ als unpassend? Nach mehreren Meldungen wird der Name automatisch entfernt, und wir prüfen ihn.', { n: UI.esc(NameCheck.display(nm, T('Gegner'))) })}</p>`,
          buttons: [{ label: T('Abbrechen'), value: false }, { label: T('Melden'), value: true, danger: true }] });
        if (!ok) return;
        try { const res = await UI.load(Cloud.rpc('chess_report', { p_code: online.room })); UI.toast(Ranking.reportMsg(res), 3200); }
        catch (e) { UI.toast(T('Keine Verbindung zum Server. Bitte später noch einmal versuchen.')); }
      }

      function refreshPhraseControls(){
        if (webdemo) return;
        const muted=!!Store.get('chess.phrasesMuted',false),box=root.querySelector('.phrase-controls');box.classList.toggle('hidden',!online||!online.started||!!viewing);
        const mute=box.querySelector('[data-phrase=mute]'),label=muted?T('Nachrichten stumm'):T('Nachrichten aktiv');mute.innerHTML=Icon(muted?'mute':'sound');mute.title=label;mute.setAttribute('aria-label',label);mute.setAttribute('aria-pressed',String(muted));
        box.querySelector('[data-phrase=open]').disabled=muted||phraseSending||usedPhrases.size>=3;
      }
      if (!webdemo) root.querySelector('[data-phrase=mute]').onclick=()=>{Store.set('chess.phrasesMuted',!Store.get('chess.phrasesMuted',false));root.querySelector('.chess-phrase').classList.add('hidden');root.querySelector('.online-context').classList.remove('speaking');refreshPhraseControls();};
      if (!webdemo) root.querySelector('[data-phrase=open]').onclick=async()=>{
        if(!online||!online.started||phraseSending||Store.get('chess.phrasesMuted',false))return;
        const current=online;
        const key=await UI.modal({title:T('Nachricht senden'),html:`<p>${T('Dein Gegner liest die Nachricht in seiner Sprache. Jeder Spruch ist einmal pro Partie möglich, mit zehn Sekunden Abstand.')}</p>${over?'':`<p class="muted small">${T('Die Schachuhr läuft weiter.')}</p>`}`,
          buttons:[...Object.entries(ChessExtras.phrases()).filter(([k])=>!usedPhrases.has(k)).map(([value,label])=>({label,value})),{label:T('Abbrechen'),value:null}]});
        if(!key||online!==current||Store.get('chess.phrasesMuted',false))return;
        phraseSending=true;refreshPhraseControls();
        try{const r=net&&net.phrase?await net.phrase(key):null;if(online!==current)return;
          if(r&&['ok','already'].includes(r.status))usedPhrases.add(key);
          if(r&&r.status==='ok')UI.toast(T('Nachricht gesendet.'));
          if(!r||r.status==='unavailable')UI.toast(T('Nachrichten sind gerade nicht verfügbar.'));
          else if(r.status==='wait')UI.toast(T('Bitte warte zehn Sekunden zwischen zwei Nachrichten.'));
          else if(r.status==='already')UI.toast(T('Diese Nachricht hast du in dieser Partie schon gesendet.'));
        }catch(e){if(online===current)UI.toast(T('Keine Verbindung zum Server. Bitte später noch einmal versuchen.'));}
        finally{if(online===current){phraseSending=false;refreshPhraseControls();}}
      };

      async function reportFair(){
        const room=online&&online.room;if(!room||!over)return;
        const reason=await UI.modal({title:T('Unfaires Spiel melden'),html:`<p>${T('Melde nur einen konkreten Verdacht. Eine Meldung allein führt zu keiner Sperre.')}</p><p class="muted small">${T('Höchstens drei Meldungen in 24 Stunden, zehn Minuten Abstand und derselbe Gegner höchstens einmal pro Tag.')}</p>`,
          buttons:[{label:T('Verdacht auf unerlaubte Hilfe'),value:'assistance'},{label:T('Absichtliches Verzögern'),value:'stalling'},{label:T('Anderer Fairplay-Verstoß'),value:'other'},{label:T('Abbrechen'),value:null}]});
        if(!reason)return;
        try{const r=await UI.load(Cloud.rpc('chess_fair_report',{p_code:room,p_reason:reason}));
          const messages={ok:T('Die Meldung wurde zur späteren Prüfung gespeichert.'),already:T('Diese Partie hast du bereits gemeldet.'),limit:T('Dein Meldelimit ist erreicht. In 24 Stunden sind höchstens drei Meldungen möglich.'),opponent:T('Diesen Gegner hast du in den letzten 24 Stunden bereits gemeldet.'),wait:T('Bitte warte zehn Minuten zwischen zwei Meldungen.'),unfinished:T('Du kannst eine Partie nach ihrem Ende melden.')};UI.toast(messages[r]||T('Keine Verbindung zum Server. Bitte später noch einmal versuchen.'),4000);
        }catch(e){UI.toast(T('Keine Verbindung zum Server. Bitte später noch einmal versuchen.'));}
      }
      async function rematchAction(action){
        if(!online||!over||rematchBusy)return;
        rematchBusy=true;const current=online;
        const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),5000);
        try{
          const r=await Cloud.rpc('chess_rematch',{p_code:current.room,p_action:action},{signal:controller.signal});
          if(online!==current)return;
          rematchData=r;
          if(r.status==='accepted'&&r.room){UI.closeModal(null);startOnline(r.room,{clock:r.clock,color:r.color,quick:true});return;}
          renderRematch();
        }catch(e){if(action!=='status')UI.toast(T('Keine Verbindung zum Server. Bitte später noch einmal versuchen.'));}
        finally{clearTimeout(timeout);rematchBusy=false;}
      }
      function renderRematch(){
        const panel=root.querySelector('.chess-rematch'),tools=root.querySelector('.chess-end-tools');
        const slot=resultDialogCard?.isConnected&&UI.isModalOpen()?resultDialogCard.querySelector('.end-rematch'):null;
        tools.classList.toggle('hidden',!online||!over);panel.classList.add('hidden');
        if(!online||!over)return;
        const r=rematchData||{status:'none'};
        const text=r.status==='offered'?(r.mine?T('Revanche angeboten. Warte auf deinen Gegner …'):T('Dein Gegner bietet eine Revanche mit Farbwechsel an.')):r.status==='declined'?T('Die Revanche wurde abgesagt.'):r.status==='expired'?T('Das Revanche-Angebot ist abgelaufen.'):r.status==='active'?T('Eine andere Partie läuft bereits.'):r.status==='cooldown'?T('Eine Suchsperre ist noch aktiv.'):r.status==='unavailable'?T('Eine Revanche ist gerade nicht möglich.'):'',host=slot||panel;
        if(!slot&&r.status!=='offered')return;
        host.classList.remove('hidden');const stateKey=r.status+':'+!!r.mine+':'+text;
        if(host.dataset.rematchState===stateKey)return;
        host.dataset.rematchState=stateKey;host.innerHTML=`${text?`<p role="status">${UI.esc(text)}</p>`:''}<div class="rematch-actions"></div>`;
        const buttons=host.querySelector('.rematch-actions'),add=(label,action,primary)=>{const b=document.createElement('button');b.className='btn'+(primary?' primary':'');b.textContent=label;b.onclick=()=>rematchAction(action);buttons.append(b);};
        if(r.status==='none')add(T('Revanche anbieten'),'offer',true);
        if(r.status==='offered'){if(!r.mine)add(T('Revanche annehmen'),'accept',true);add(r.mine?T('Abbrechen'):T('Ablehnen'),r.mine?'cancel':'decline',false);}
      }
      if (!webdemo) root.querySelector('.chess-end-tools [data-fair-report]').onclick=reportMenu;
      function pollRematch(){
        clearTimeout(rematchT);const current=online;
        const tick=async()=>{if(online!==current||!over)return;await rematchAction('status');if(online===current&&over&&(!rematchData||['none','offered'].includes(rematchData.status)))rematchT=setTimeout(tick,3000);};tick();
      }

      async function offerDraw() {
        if (!online || over || !online.started) return;
        const ok = await ctx.modal({ title: T('Remis anbieten?'), html: `<p>${T('Dein Gegner kann annehmen oder ablehnen.')}</p>`, buttons: [{ label: T('Abbrechen'), value: false }, { label: T('Anbieten'), value: true, primary: true }] });
        if (ok && net) { net.send({ t: 'draw-offer' }); UI.toast(T('Remis angeboten')); }
      }

      // ================= Eingabe =================
      function sqAt(x, y) {
        const r = board.getBoundingClientRect();
        const cx = Math.floor((x - r.left) / r.width * 8), cy = Math.floor((y - r.top) / r.height * 8);
        if (cx < 0 || cx > 7 || cy < 0 || cy > 7) return -1;
        return flipped ? (7 - cy) * 8 + (7 - cx) : cy * 8 + cx;
      }
      function activateSquare(sq, keepSelection=false){
        if (sq < 0 || boardNotes.active) return false;
        // Lob, Wiedersehen und Plan sind nur Hinweise: das nächste Antippen des Bretts schließt sie und zählt als Eingabe
        if (busy || over) return false;
        if (trainerQ) { trainerTap(sq); return false; }
        if(online&&S.turn===playerColor&&premoves.length)clearPremove();
        if (selected >= 0 && targets.some(m => m.t === sq)) { tryMove(selected, sq); return false; }
        const p = online&&S.turn!==playerColor?planningState().b[sq]:S.b[sq];
        if (canMove(p)) {
          UI.pieceRipple(squareEls[sq]);
          if (selected === sq) { if(!keepSelection){deselect();return false;}return true; }
          select(sq);return true;
        }else{deselect();return false;}
      }
      board.addEventListener('pointerdown', e => {
        if(e.button!==0||busy||over||review||boardNotes.active)return;
        const active=drag||touchTap;
        if(active){
          // pointerdown itself has buttons=1, even after a missed release.
          // A fresh primary down of the same device kind starts a new gesture;
          // a secondary finger must never interrupt the still-active primary.
          const kind=e.pointerType||'mouse';
          if((e.isPrimary||e.pointerId===active.id)&&kind===active.pointerType)cancelBoardInput(true);
          else return;
        }
        const sq=sqAt(e.clientX,e.clientY);
        // Defer a touch on a destination until release: a vertical swipe is
        // scrolling, never an immediate move of the already selected piece.
        if(e.pointerType==='touch'&&!e.target.closest('.touch-piece')){
          touchTap={id:e.pointerId,pointerType:e.pointerType||'mouse',sq,x:e.clientX,y:e.clientY,moved:false,state:S,epoch:gen};return;
        }
        const selectedBefore=selected===sq;
        if(activateSquare(sq,true)){
          drag = { id:e.pointerId,pointerType:e.pointerType||'mouse',state:S,epoch:gen,sq, x: e.clientX, y: e.clientY, el: fx.querySelector('.premove-ghost[data-sq="'+sq+'"]')||pieceEls[sq], moved: false, deselectOnTap:selectedBefore };
          try { board.setPointerCapture(e.pointerId); } catch (err) { /* kein aktiver Zeiger */ }
        }
      });
      board.addEventListener('pointermove', e => {
        if(touchTap?.id===e.pointerId&&Math.hypot(e.clientX-touchTap.x,e.clientY-touchTap.y)>10)touchTap.moved=true;
        if (!drag||drag.id!==e.pointerId||!drag.el)return;
        if (!drag.moved && Math.hypot(e.clientX - drag.x, e.clientY - drag.y) < 6) return;
        if (!drag.moved) Haptic.fire('sel');
        drag.moved = true;
        const r = board.getBoundingClientRect(), cell = r.width / 8;
        drag.el.classList.add('dragging');
        drag.el.style.transform = `translate(${e.clientX - r.left - cell / 2}px,${e.clientY - r.top - cell / 2}px)`;
        const hov = sqAt(e.clientX, e.clientY);
        squareEls.forEach((s, i) => s.classList.toggle('hover', i === hov && targets.some(m => m.t === i)));
      });
      const endDrag=async e=>{
        if(touchTap?.id===e.pointerId){
          const t=touchTap;touchTap=null;
          if(t.state===S&&t.epoch===gen&&!t.moved&&Math.hypot(e.clientX-t.x,e.clientY-t.y)<=10)activateSquare(t.sq);
        }
        if(!drag||drag.id!==e.pointerId)return;
        const d=drag,to=sqAt(e.clientX,e.clientY);
        // Restore first: promotion dialogs and server updates must not leave
        // a pixel-positioned piece behind, even if the attempted move is rejected.
        cancelBoardInput();
        if(d.state!==S||d.epoch!==gen||!d.el?.isConnected)return;
        // A second press can become a drag. Only a stationary release toggles
        // the selection off; destination markers must never disable dragging.
        if(!d.moved){if(d.deselectOnTap)deselect();return;}
        if(to>=0&&to!==d.sq&&targets.some(m=>m.t===to))await tryMove(d.sq,to);
      };
      board.addEventListener('pointerup',endDrag);
      const cancelPointer=e=>{if(drag?.id===e.pointerId||touchTap?.id===e.pointerId)cancelBoardInput(true);};
      board.addEventListener('pointercancel',cancelPointer);
      board.addEventListener('lostpointercapture',cancelPointer);
      // Capture can be denied by the WebView/OS. Observe releases at window
      // capture phase too, so an outside target cannot strand the board input.
      const releaseOutsideBoard=e=>{if(!(e.target instanceof Node)||!board.contains(e.target))cancelPointer(e);};
      window.addEventListener('pointerup',releaseOutsideBoard,true);
      window.addEventListener('pointercancel',cancelPointer,true);

      root.querySelector('.ctrl-row').addEventListener('click', e => {
        const b = e.target.closest('button');
        if (!b || b.disabled) return;
        const a = b.dataset.a;
        if (a === 'more') { void moreSheet(); return; }
        if (a === 'new') { if (setupSettings) restartSetup(); else backToLobby(); }
        else if (a === 'undo') undo();
        else if (a === 'hint') { if (online) offerDraw(); else hint(); }
        else if (a === 'resign') resign();
        else if (a === 'flip'&&!online) { flipped = !flipped; renderAll(false); if(review)gotoPly(review.idx,false); Sound.play('tap'); }
      });

      // „Mehr“: selten gebrauchte Aktionen als Blatt von unten. Die Knöpfe bleiben in der Leiste (versteckt), damit
      // Tastatur, Tests und bestehende Abläufe unverändert über dieselben Handler laufen.
      async function moreSheet() {
        const bar = root.querySelector('.match > .ctrl-row');
        const items = [];
        const phrases = root.querySelector('.phrase-controls');
        if (online && phrases && !phrases.classList.contains('hidden')) { const mute = phrases.querySelector('[data-phrase=mute]'); items.push(['phrase', Icon('chat'), T('Nachricht senden')], ['mute', mute.querySelector('.ico')?.outerHTML || '', Store.get('chess.phrasesMuted', false) ? T('Nachrichten wieder anzeigen') : T('Nachrichten stummschalten')]); }
        for (const a of ['new', 'flip', 'resign']) {
          const b = bar.querySelector('[data-a=' + a + ']');
          if (!b || b.classList.contains('hidden') || b.disabled || (online && a === 'resign') || (a === 'resign' && selfPlay())) continue;
          items.push([a, (b.querySelector('.ico') || { outerHTML: '' }).outerHTML, b.textContent.trim()]);
        }
        // eigene Stellung: die aktuelle Stellung im Editor anpassen und von dort weiterspielen
        if (setupSettings && !online && !viewing && !review) items.unshift(['edit', Icon('pencil'), T('Stellung bearbeiten')]);
        // beide Seiten selbst: statt Aufgeben ab der aktuellen Stellung gegen den Computer weiterspielen
        if (setupSettings && selfPlay() && !viewing && !review && !over) items.splice(1, 0, ['cpu', Icon('cpu'), T('Ab hier gegen Computer')]);
        // Schrift, Kontrast und Ton, ohne die Partie zu verlassen; „Aufgeben“ bleibt unten
        const resignAt = items.findIndex(i => i[0] === 'resign');
        items.splice(resignAt < 0 ? items.length : resignAt, 0, ['display', Icon('gear'), T('Anzeige und Ton')]);
        const r = await ctx.modal({ title: T('Mehr'), cls: 'chess-more',
          html: `<div class="more-list">${items.map(([a, ico, label]) => `<button type="button" class="more-i${a === 'resign' ? ' danger' : ''}" data-more="${a}">${ico}<span>${UI.esc(label)}</span></button>`).join('')}</div>`,
          buttons: [{ label: T('Schließen'), value: null }],
          onOpen(card) { card.querySelectorAll('[data-more]').forEach(b => b.onclick = () => UI.closeModal(b.dataset.more)); } });
        if (!r || !root.isConnected) return;
        if (r === 'phrase') root.querySelector('[data-phrase=open]')?.click();
        else if (r === 'mute') root.querySelector('[data-phrase=mute]')?.click();
        else if (r === 'edit') { if (setupSettings && !busy) await openSetup(E.toFEN(S)); }
        else if (r === 'cpu') { if (setupSettings && !busy) await openSetup(E.toFEN(S), false); }
        else if (r === 'display') await ctx.openDisplay();
        else bar.querySelector('[data-a=' + r + ']')?.click();
      }

      // Wer eine laufende Online-Partie verlässt, gibt sie auf (sonst wartet der Gegner umsonst)
      this.confirmLeave = async () => {
        if (!online || over || !net || !net.running || !net.running()) return true;
        const ok = await ctx.modal({ title: T('Partie verlassen?'), html: `<p>${T('Wenn du jetzt gehst, gibst du die Partie auf.')}</p>`,
          buttons: [{ label: T('Weiterspielen'), value: false }, { label: T('Aufgeben und gehen'), value: true, danger: true }] });
        if (ok && net) { net.send({ t: 'resign' }); forgetLive(); }
        return !!ok;
      };
      // Partie gegen den Computer oder zu zweit am Gerät angefangen: vor dem Verlassen nachfragen (wird gespeichert)
      this.leaveInfo = () => (!online && !over && plies.length && !match.classList.contains('hidden') ? { saved: true } : null);
      this._stop = () => { cancelAnimationFrame(centerFrame); window.removeEventListener('resize', onResize); cancelBoardInput();window.removeEventListener('pointerup',releaseOutsideBoard,true);window.removeEventListener('pointercancel',cancelPointer,true);window.removeEventListener('blur',cancelLostFocus);window.removeEventListener('resize',cancelLostFocus);boardNotes.destroy(); document.removeEventListener('visibilitychange',clearHiddenPremove);bgStop(true); clearTimeout(refreshEst.timer); clearTimeout(refreshFriendsBadge.timer); if (!online && !over && clock) { const now = Date.now(); clock[S.turn] -= now - clock.last; clock.last = now; } saveGame(); token++; gen++; stopClock(); if (online && !over && net && net.running && net.running()) net.send({ t: 'resign' }); leaveOnline(); document.removeEventListener('keydown', this._key); };
      const saved = Store.get(opts.resumeSetup ? 'chess.setupGame' : 'chess.saved', null);
      if (opts.rejoin) { settings.mode = 'online'; saveSettings(); startOnline(opts.rejoin.room, { clock: opts.rejoin.clock, color: opts.rejoin.color, quick: false }); }
      else if (opts.view) viewGame(opts.view);
      else if (opts.resumeSetup && saved && !Store.get('chess.live', null)) resumeGame(saved, true);
      else if (opts.resume && saved && saved.moves && saved.moves.length) resumeGame(saved, true);
      else showLobby();
    },

    unmount() { if (this._stop) this._stop(); }
  };
})();
