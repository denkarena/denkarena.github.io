/* Wandelzug – das DenkArena-Spiel (intern "Metamorph").
 * Sammle alle Münzen mit möglichst wenigen Zügen. Die Figur wechselt nach JEDEM Zug zur nächsten in einer festen
 * Zugfolge (z. B. Springer → Läufer → Turm → Springer …). Wendefelder drehen die Folge um, brüchige Felder tragen
 * genau einmal und werden danach zur Mauer.
 * Reine Logik: Zuggenerator, optimaler Löser (Breitensuche), Rätselgenerator mit Startwert. */
(function (root) {
  'use strict';
  const N = 6, SIZE = N * N;
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]], ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];

  // erreichbare Felder einer Figur; Mauern, zerbrochene Felder und (ohne Schlüssel) Tore blockieren, alles andere wird überquert
  function targets(pos, piece, walls, p, broken, kb) {
    const r = (pos / N) | 0, c = pos % N, out = [];
    const ok = (rr, cc) => rr >= 0 && rr < N && cc >= 0 && cc < N;
    const ci = p && p.crackIdx, gs = p && !kb && p.gateSet && p.gateSet.size ? p.gateSet : null;
    const blocked = sq => walls.has(sq) || (ci && ci[sq] >= 0 && (broken & (1 << ci[sq])) !== 0) || (gs && gs.has(sq));
    if (piece === 'N' || piece === 'K') {
      for (const [dr, dc] of piece === 'N' ? KN : KG) {
        const rr = r + dr, cc = c + dc;
        if (ok(rr, cc) && !blocked(rr * N + cc)) out.push(rr * N + cc);
      }
    } else {
      for (const [dr, dc] of piece === 'B' ? DIAG : ORTH) {
        let rr = r + dr, cc = c + dc;
        while (ok(rr, cc) && !blocked(rr * N + cc)) { out.push(rr * N + cc); rr += dr; cc += dc; }
      }
    }
    return out;
  }
  const cur = (p, st) => p.seq[st.idx];
  const moves = (p, st) => targets(st.pos, cur(p, st), p.wallSet, p, st.broken, st.kb);
  const startState = p => ({ pos: p.start, idx: 0, dir: 1, mask: 0, broken: 0, kb: 0 });
  const allCoins = p => (1 << p.coins.length) - 1;

  // Zustand nach einem Zug: Portal versetzt die Figur, Münze einsammeln (Zahlenmünzen nur in ihrer Reihenfolge),
  // Schlüssel öffnet die Tore, Wendefeld dreht die Folge, verlassenes brüchiges Feld zerbricht.
  // Danach wechselt die Figur zur nächsten in der (ggf. umgedrehten) Folge – oder ein Prägefeld bestimmt sie.
  // at = angetipptes Zielfeld (für gespeicherte Züge), pos = Feld, auf dem die Figur danach steht
  function step(p, st, to) {
    const L = p.seq.length;
    const land = p.portalOf && p.portalOf[to] >= 0 ? p.portalOf[to] : to;
    const dir = p.flipSet && p.flipSet.has(land) ? -st.dir : st.dir;
    const ci = p.coins.indexOf(land);
    const take = ci >= 0 && (!p.order || (st.mask & ((1 << ci) - 1)) === (1 << ci) - 1);
    const k = p.crackIdx ? p.crackIdx[st.pos] : -1;
    const si = p.stampAt ? p.stampAt[land] : -1;
    return {
      pos: land, at: to, dir, idx: si >= 0 ? si : ((st.idx + dir) % L + L) % L,
      mask: take ? st.mask | (1 << ci) : st.mask,
      broken: st.broken | (k >= 0 ? 1 << k : 0),
      kb: st.kb || (p.key != null && p.key === land) ? 1 : 0,
      flipped: dir !== st.dir, ported: land !== to, stamped: si >= 0, keyed: !st.kb && p.key != null && p.key === land
    };
  }

  function prep(p) {
    p.walls = p.walls || []; p.flips = p.flips || []; p.cracks = p.cracks || [];
    p.portals = p.portals || []; p.stamps = p.stamps || []; p.gates = p.gates || [];
    p.order = !!p.order; if (p.key === undefined) p.key = null;
    p.wallSet = new Set(p.walls);
    p.flipSet = new Set(p.flips);
    p.crackIdx = new Array(SIZE).fill(-1);
    p.cracks.forEach((sq, i) => (p.crackIdx[sq] = i));
    // Portale paarweise: [a, b, c, d] verbindet a↔b und c↔d
    p.portalOf = null;
    if (p.portals.length) { p.portalOf = new Array(SIZE).fill(-1); for (let i = 0; i + 1 < p.portals.length; i += 2) { p.portalOf[p.portals[i]] = p.portals[i + 1]; p.portalOf[p.portals[i + 1]] = p.portals[i]; } }
    // Prägefelder: [[Feld, Figur]] – die Figur muss in der Zugfolge vorkommen
    p.stampAt = null;
    if (p.stamps.length) { p.stampAt = new Array(SIZE).fill(-1); p.stamps.forEach(([sq, pc]) => { const i = p.seq.indexOf(pc); if (i >= 0) p.stampAt[sq] = i; }); }
    p.gateSet = new Set(p.gates);
    return p;
  }

  // optimaler Weg (Breitensuche über Feld × Folgenposition × Richtung × Münzen × zerbrochene Felder)
  function solve(p, from, opt = {}) {
    const full = (1 << p.coins.length) - 1;
    let q = p;
    // Varianten zum Prüfen, ob ein Element für die Lösung zählt
    if (opt.noFlips || opt.noCracks || opt.noPortals || opt.noStamps || opt.noOrder || opt.noGates || opt.gatesClosed) {
      q = Object.assign({}, p);
      if (opt.noFlips) q.flipSet = null; if (opt.noCracks) q.crackIdx = null; if (opt.noPortals) q.portalOf = null;
      if (opt.noStamps) q.stampAt = null; if (opt.noOrder) q.order = false;
      if (opt.noGates) { q.gateSet = new Set(); q.key = null; }
      if (opt.gatesClosed) { q.wallSet = new Set([...p.wallSet, ...p.gates]); q.gateSet = new Set(); q.key = null; }
    }
    const L = p.seq.length, KB = 1 << (q.crackIdx ? p.cracks.length : 0);
    const key = s => (((((s.mask * L + s.idx) * 2 + (s.dir > 0 ? 1 : 0)) * KB) + (q.crackIdx ? s.broken : 0)) * 2 + (s.kb ? 1 : 0)) * SIZE + s.pos;
    const start = from || startState(p);
    if (start.mask === full) return { len: 0, path: [], states: 1, complete: true };
    const prev = new Map([[key(start), null]]);
    const maxDepth = opt.maxDepth == null ? 40 : opt.maxDepth;
    const maxStates = opt.maxStates == null ? Infinity : opt.maxStates;
    const deadline = opt.maxMs == null ? Infinity : Date.now() + opt.maxMs;
    const limited = limit => ({ len: Infinity, path: [], states: prev.size, complete: false, limit });
    let frontier = [start];
    for (let d = 1; frontier.length && d <= maxDepth; d++) {
      const next = [];
      for (const s of frontier) {
        if (prev.size >= maxStates) return limited('states');
        if (deadline !== Infinity && Date.now() >= deadline) return limited('time');
        for (const t of targets(s.pos, q.seq[s.idx], q.wallSet, q, s.broken, s.kb)) {
          const n = step(q, s, t), k = key(n);
          if (prev.has(k)) continue;
          prev.set(k, s);
          if (n.mask === full) {
            const path = [n];
            let c = s;
            while (c && key(c) !== key(start)) { path.unshift(c); c = prev.get(key(c)); }
            return { len: d, path, states: prev.size, complete: true };
          }
          next.push(n);
        }
      }
      frontier = next;
    }
    return frontier.length ? limited('depth') : { len: Infinity, path: [], states: prev.size, complete: true };
  }

  function seeded(str) {
    let a = 0;
    for (const ch of String(str)) a = (a * 31 + ch.charCodeAt(0)) >>> 0;
    return () => { a = (a + 0x6D2B79F5) >>> 0; let t = a; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61); return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
  }

  // Rätsel nach Vorgaben: Länge und Figuren der Zugfolge, Mauern, Wendefelder, brüchige Felder, Bestwert-Bereich
  function generateCustom(seed, o) {
    const rng = seeded('wz-' + seed);
    const rint = (a, b) => a + ((rng() * (b - a + 1)) | 0);
    const shuffle = a => { for (let i = a.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; [a[i], a[j]] = [a[j], a[i]]; } return a; };
    for (let attempt = 0; attempt < (o.tries || 2000); attempt++) {
      const L = rint(o.seq[0], o.seq[1]);
      const seq = shuffle(o.pieces.slice()).slice(0, L);
      if (o.must && !seq.includes(o.must)) continue;
      const free = [...Array(SIZE).keys()];
      const take = () => free.splice((rng() * free.length) | 0, 1)[0];
      const walls = Array.from({ length: rint(o.walls[0], o.walls[1]) }, take);
      const flips = L >= 3 ? Array.from({ length: rint(o.flips[0], o.flips[1]) }, take) : [];
      const coins = Array.from({ length: rint(o.coins[0], o.coins[1]) }, take);
      const start = take();
      const extra = {};
      if (o.portals) { const np = rint(o.portals[0], o.portals[1]); extra.portals = Array.from({ length: np * 2 }, take); }
      if (o.stamps) { const ns = rint(o.stamps[0], o.stamps[1]); extra.stamps = Array.from({ length: ns }, () => [take(), seq[(rng() * seq.length) | 0]]); }
      if (o.gates) { extra.key = take(); extra.gates = Array.from({ length: rint(o.gates[0], o.gates[1]) }, take); }
      if (o.order) extra.order = true;
      const p = prep(Object.assign({ seq, start, walls, flips, coins, cracks: [] }, extra));
      // ein Tor auf dem Startfeld-Nachbarn reicht nicht: Münzen müssen hinter Toren liegen können, der Schlüssel aber erreichbar sein
      let best = solve(p);
      if (best.len === Infinity || best.len > o.par[1] + 3) continue;
      // brüchige Felder gezielt auf Landefelder des bisher besten Wegs legen, damit sie ihn wirklich stören
      const nc = rint(o.cracks[0], o.cracks[1]);
      if (nc) {
        const land = [p.start, ...best.path.map(s => s.pos)].slice(0, -1).filter(sq => !p.coins.includes(sq) && !p.flipSet.has(sq) && !(p.portalOf && p.portalOf[sq] >= 0) && !(p.stampAt && p.stampAt[sq] >= 0) && sq !== p.key);
        const cand = [...new Set(land)];
        if (cand.length < nc) continue;
        p.cracks = shuffle(cand).slice(0, nc);
        prep(p);
        const before = best.len;
        best = solve(p);
        if (best.len === Infinity || best.len < before + (o.crackGain || 0)) continue;
      }
      if (best.len < o.par[0] || best.len > o.par[1]) continue;
      // Wendefelder müssen zur Lösung gehören
      if (flips.length && o.needFlip !== false && !best.path.some(s => s.flipped)) continue;
      // neue Elemente müssen die Lösung wirklich verändern (ohne sie wäre der Bestwert ein anderer)
      // loose: das Element muss in der besten Lösung vorkommen, muss sie aber nicht allein verändern (für Kapitel mit allen Elementen)
      if (o.portals && (!best.path.some(s => s.ported) || (!o.loose && solve(p, null, { noPortals: true }).len === best.len))) continue;
      if (o.stamps && (!best.path.some(s => s.stamped) || (!o.loose && solve(p, null, { noStamps: true }).len === best.len))) continue;
      if (o.order && solve(p, null, { noOrder: true }).len >= best.len) continue;
      if (o.gates) { const closed = solve(p, null, { gatesClosed: true }).len, open = solve(p, null, { noGates: true }).len; if (closed !== Infinity && closed <= best.len) continue; if (open >= best.len) continue; }
      // knifflig statt nur lang: ein naiver Spieler („immer zur nächsten Münze“) darf die Sterne nicht schaffen
      if (o.antiGreedy != null) { const g = greedyLen(p, best.len + 12); if (g != null && g <= best.len + o.antiGreedy) continue; }
      return Object.assign(p, { par: best.len, states: best.states });
    }
    return null;
  }

  // naiver Spieler: nimmt eine erreichbare Münze, sonst den Zug, der der nächsten Münze am nächsten kommt (erster bei Gleichstand).
  // Liefert die Zuganzahl bis alle Münzen eingesammelt sind, oder null, wenn er es nicht schafft.
  function greedyLen(p, maxMoves) {
    const full = (1 << p.coins.length) - 1;
    // Zahlenmünzen: der naive Spieler zielt auf die nächste Zahl
    const want = (i, mask) => !(mask & (1 << i)) && (!p.order || (mask & ((1 << i) - 1)) === (1 << i) - 1);
    const dist = (pos, mask) => { let b = 99; p.coins.forEach((c, i) => { if (want(i, mask)) b = Math.min(b, Math.abs(c % 6 - pos % 6) + Math.abs(((c / 6) | 0) - ((pos / 6) | 0))); }); return b; };
    let st = startState(p), n = 0;
    while (st.mask !== full && n < maxMoves) {
      const mv = moves(p, st);
      if (!mv.length) return null;
      const coin = mv.find(to => p.coins.includes(to) && want(p.coins.indexOf(to), st.mask));
      st = step(p, st, coin != null ? coin : mv.reduce((a, b) => (dist(b, st.mask) < dist(a, st.mask) ? b : a)));
      n++;
    }
    return st.mask === full ? n : null;
  }

  // Tagesrätsel: drei Schwierigkeiten; mittel und schwer sind für den naiven Spieler nicht mit 3 bzw. 2 Sternen lösbar
  const DAILY = [
    { seq: [2, 3], pieces: ['N', 'B', 'R'], walls: [2, 4], flips: [0, 1], cracks: [0, 0], coins: [4, 5], par: [6, 8] },
    { seq: [3, 3], pieces: ['N', 'B', 'R', 'K'], walls: [3, 5], flips: [1, 2], cracks: [0, 1], coins: [5, 6], par: [8, 11], antiGreedy: 0 },
    { seq: [3, 4], pieces: ['N', 'B', 'R', 'K'], walls: [3, 6], flips: [1, 2], cracks: [1, 2], coins: [5, 7], par: [10, 14], antiGreedy: 2 }
  ];
  const LEVELS = DAILY.map(d => ({ min: d.par[0], max: d.par[1] }));
  const genCache = new Map();
  function generate(seed, level) {
    const ck = seed + '|' + level;
    if (genCache.has(ck)) return genCache.get(ck);
    for (let k = 0; k < 50; k++) {
      const p = generateCustom('d' + level + '-' + seed + (k ? '-' + k : ''), Object.assign({ tries: 400 }, DAILY[level]));
      if (p) { genCache.set(ck, p); return p; }
    }
    return null;
  }

  // kompakte Form für die Leveldatei und zurück
  // neue Elemente nur, wenn vorhanden: p = Portale, m = Prägefelder, o = Zahlenmünzen, y = Schlüssel, g = Tore
  const pack = p => Object.assign({ q: p.seq.join(''), s: p.start, w: p.walls, f: p.flips, k: p.cracks, c: p.coins, par: p.par, lim: p.lim || 0 },
    p.portals && p.portals.length ? { p: p.portals } : {}, p.stamps && p.stamps.length ? { m: p.stamps } : {}, p.order ? { o: 1 } : {},
    p.key != null ? { y: p.key, g: p.gates } : {});
  const unpack = o => prep({ seq: o.q.split(''), start: o.s, walls: o.w, flips: o.f, cracks: o.k, coins: o.c, par: o.par, lim: o.lim || 0,
    portals: o.p, stamps: o.m, order: !!o.o, key: o.y != null ? o.y : null, gates: o.g });

  // Nummer des Tagesrätsels (#1 = 12.10.2026)
  const EPOCH = Date.UTC(2026, 9, 12);
  const dayNumber = dateKey => { const [y, m, d] = dateKey.split('-').map(Number); return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86400000) + 1; };
  const dailyLevel = dateKey => [2, 0, 0, 1, 1, 1, 2][new Date(dateKey + 'T12:00:00').getDay()];

  // ---------- Eigene Level: Code zum Teilen und automatische Prüfung (auch auf dem Server genutzt) ----------
  // Code = "W" + 5-Bit-Zeichen: Version, Zugfolge, Start, Anzahlen, Felder (je 6 Bit), Prüfzeichen
  const ABC = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', PCS = 'NBRK';
  const LIMITS = { coins: [3, 8], walls: 12, flips: 3, cracks: 4, seq: [2, 4], par: [4, 25], portals: 4, stamps: 2, gates: 3 };
  // neue Elemente (ab App 1.0.8 in der Werkstatt): Portale, Prägefelder, Schlüssel und Tore, Zahlenmünzen
  const hasExtras = p => !!((p.portals && p.portals.length) || (p.stamps && p.stamps.length) || p.key != null || (p.gates && p.gates.length) || p.order);
  // name = [Eigenschaft|-1, Nomen, Zusatz|-1] aus LevelWords (optional, dann Version 2)
  function encode(p, name) {
    const sorted = a => [...a].sort((x, y) => x - y);
    const bits = [];
    const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
    const ext = hasExtras(p);
    put(ext ? (name ? 5 : 4) : (name ? 3 : 1), 3); put(p.seq.length - 1, 2);
    for (let i = 0; i < 4; i++) put(PCS.indexOf(p.seq[i] || 'N'), 2);
    put(p.start, 6);
    put(p.coins.length, 4); put(p.walls.length, 4); put(p.flips.length, 2); put(p.cracks.length, 3);
    // Zahlenmünzen: die Reihenfolge der Münzen ist Teil des Levels, deshalb nicht sortieren
    for (const sq of [...(ext && p.order ? p.coins : sorted(p.coins)), ...sorted(p.walls), ...sorted(p.flips), ...sorted(p.cracks)]) put(sq, 6);
    if (name) { put(name[0] < 0 ? 127 : name[0], 7); put(name[1], 8); put(name[2] < 0 ? 127 : name[2], 7); put(name[3] || 0, 3); }
    if (ext) {
      const pt = p.portals || [], stp = p.stamps || [], gt = p.gates || [];
      put(p.order ? 1 : 0, 1);
      put(pt.length >> 1, 2); for (const sq of pt.slice(0, (pt.length >> 1) * 2)) put(sq, 6);
      put(stp.length, 2); for (const [sq, pc] of stp) { put(sq, 6); put(PCS.indexOf(pc), 2); }
      put(p.key != null ? 1 : 0, 1); if (p.key != null) put(p.key, 6);
      put(gt.length, 2); for (const sq of sorted(gt)) put(sq, 6);
    }
    while (bits.length % 5) bits.push(0);
    let out = '', sum = 0;
    for (let i = 0; i < bits.length; i += 5) { const v = bits.slice(i, i + 5).reduce((a, b) => a * 2 + b, 0); out += ABC[v]; sum = (sum * 7 + v) % 32; }
    return 'W' + out + ABC[sum];
  }
  function decode(code) {
    const c = String(code || '').trim().toUpperCase().replace(/[\s-]/g, '');
    if (!/^W[A-Z2-9]{8,60}$/.test(c)) return null;
    const body = c.slice(1, -1), chk = c.slice(-1);
    let sum = 0; const bits = [];
    for (const ch of body) { const v = ABC.indexOf(ch); if (v < 0) return null; sum = (sum * 7 + v) % 32; for (let i = 4; i >= 0; i--) bits.push((v >> i) & 1); }
    if (ABC[sum] !== chk) return null;
    let pos = 0;
    const get = n => { let v = 0; for (let i = 0; i < n; i++) v = v * 2 + (bits[pos++] || 0); return v; };
    const ver = get(3);
    if (ver < 1 || ver > 5) return null;
    const L = get(2) + 1, seq = [];
    for (let i = 0; i < 4; i++) { const k = PCS[get(2)]; if (i < L) seq.push(k); }
    const start = get(6), nc = get(4), nw = get(4), nf = get(2), nk = get(3);
    const take = n => Array.from({ length: n }, () => get(6));
    const coins = take(nc), walls = take(nw), flips = take(nf), cracks = take(nk);
    let name = null;
    if (ver === 2 || ver === 3 || ver === 5) { const a = get(7), n = get(8), z = get(7); name = [a === 127 ? -1 : a, n, z === 127 ? -1 : z, ver !== 2 ? Math.min(get(3), 5) : 0]; }
    let order = false, portals = [], stamps = [], key = null, gates = [];
    if (ver >= 4) {
      order = !!get(1);
      portals = take(get(2) * 2);
      stamps = Array.from({ length: get(2) }, () => [get(6), PCS[get(2)]]);
      if (get(1)) key = get(6);
      gates = take(get(2));
    }
    if (pos > bits.length) return null;
    // die Startfigur darf auf einem brüchigen Feld stehen, sonst ist jedes Feld nur einmal belegt
    const fields = [...coins, ...walls, ...flips, ...cracks, ...portals, ...stamps.map(x => x[0]), ...(key != null ? [key] : []), ...gates];
    if ([start, ...fields].some(x => x >= SIZE) || new Set(fields).size !== fields.length || fields.filter(x => !cracks.includes(x)).includes(start)) return null;
    const lv = prep({ seq, start, coins, walls, flips, cracks, portals, stamps, key, gates, order });
    if (name) lv.name = name;
    return lv;
  }
  // prüft ein eigenes Level: Regeln, Lösbarkeit, Bestwert, Schwierigkeit (0 leicht … 3 sehr schwer)
  function check(p) {
    if (p.start == null || p.start < 0) return { ok: false, reason: 'start' };
    if (p.seq.length < LIMITS.seq[0] || p.seq.length > LIMITS.seq[1]) return { ok: false, reason: 'seq' };
    // die Zugfolge läuft im Kreis: bei zwei Figuren ist vorwärts und rückwärts dasselbe – Wendefelder wären wirkungslos
    if (p.flips.length && p.seq.length < 3) return { ok: false, reason: 'flip_seq' };
    if (p.coins.length < LIMITS.coins[0]) return { ok: false, reason: 'coins_few' };
    if (p.coins.length > LIMITS.coins[1]) return { ok: false, reason: 'coins_many' };
    if (p.walls.length > LIMITS.walls || p.flips.length > LIMITS.flips || p.cracks.length > LIMITS.cracks) return { ok: false, reason: 'too_many' };
    const pt = p.portals || [], stp = p.stamps || [], gt = p.gates || [];
    if (pt.length > LIMITS.portals || stp.length > LIMITS.stamps || gt.length > LIMITS.gates) return { ok: false, reason: 'too_many' };
    if (pt.length % 2) return { ok: false, reason: 'portal_pair' };
    if (stp.some(([, pc]) => !p.seq.includes(pc))) return { ok: false, reason: 'stamp_piece' };
    if ((p.key != null) !== (gt.length > 0)) return { ok: false, reason: 'gate_key' };
    const r = solve(prep(p));
    if (r.len === Infinity) return { ok: false, reason: 'unsolvable' };
    if (r.len < LIMITS.par[0]) return { ok: false, reason: 'trivial', par: r.len };
    if (r.len > LIMITS.par[1]) return { ok: false, reason: 'long', par: r.len };
    // neue Elemente müssen für die Lösung zählen (wie bei den Leveln im Levelweg)
    if (gt.length) { const closed = solve(p, null, { gatesClosed: true }).len; if (closed !== Infinity && closed <= r.len) return { ok: false, reason: 'gate_useless', par: r.len }; }
    if (pt.length && !r.path.some(s => s.ported)) return { ok: false, reason: 'portal_useless', par: r.len };
    if (stp.length && !r.path.some(s => s.stamped)) return { ok: false, reason: 'stamp_useless', par: r.len };
    if (p.order && solve(p, null, { noOrder: true }).len >= r.len) return { ok: false, reason: 'order_useless', par: r.len };
    const difficulty = r.len >= 14 ? 3 : r.len >= 10 ? 2 : r.len >= 7 ? 1 : 0;
    return { ok: true, par: r.len, difficulty, states: r.states };
  }

  // Name eines eigenen Levels: aus dem Code berechnet, in App und Server identisch (0 … 399 → Adjektiv × Nomen)
  const nameKey = code => { let h = 0; for (const c of String(code)) h = (h * 31 + c.charCodeAt(0)) | 0; return Math.abs(h) % 400; };

  root.Metamorph = { nameKey, N, targets, moves, cur, step, startState, solve, prep, generate, generateCustom, pack, unpack, dayNumber, dailyLevel, LEVELS, DAILY, encode, decode, check, LIMITS };
})(typeof self !== 'undefined' ? self : this);
