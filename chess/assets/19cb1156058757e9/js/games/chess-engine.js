/* Schach-Engine: Zuggenerator (alle Regeln) + KI (Alpha-Beta mit Ruhesuche).
 * Die Partie-Analyse sucht zusätzlich selektiv (Nullzug, verkürzte späte Züge, Schach-Verlängerung),
 * mit eigenen Figurenwerten und mit Stellungsmerkmalen (Beweglichkeit, Königssicherheit, Bauernstruktur);
 * die Computerstufen nutzen das nicht.
 * Läuft im Fenster und im Web-Worker. Feld 0 = a8, 63 = h1.
 * Weiße Figuren groß (PNBRQK), schwarze klein. */
(function (root) {
  'use strict';

  // Public analysis numbering starts with the public launch. Closed-test engine
  // improvements stay on ANALYSIS_VERSION 1. Change it only on explicit request.
  const ANALYSIS_VERSION = 1;
  // Bump for every change to search/evaluation; independent of ChessCoach.version.
  const ENGINE_REVISION = 22;

  const VAL = { P: 100, N: 320, B: 330, R: 500, Q: 900, K: 0 };
  // Analysis only: piece values on the scale of the win-chance bands used for move grades
  // (a clean extra piece is clearly winning there). The computer levels keep VAL.
  const AVAL = { P: 100, N: 450, B: 470, R: 720, Q: 1350, K: 0 };
  const PST = {
    P: [0, 0, 0, 0, 0, 0, 0, 0, 50, 50, 50, 50, 50, 50, 50, 50, 10, 10, 20, 30, 30, 20, 10, 10, 5, 5, 10, 25, 25, 10, 5, 5,
      0, 0, 0, 20, 20, 0, 0, 0, 5, -5, -10, 0, 0, -10, -5, 5, 5, 10, 10, -20, -20, 10, 10, 5, 0, 0, 0, 0, 0, 0, 0, 0],
    N: [-50, -40, -30, -30, -30, -30, -40, -50, -40, -20, 0, 0, 0, 0, -20, -40, -30, 0, 10, 15, 15, 10, 0, -30, -30, 5, 15, 20, 20, 15, 5, -30,
      -30, 0, 15, 20, 20, 15, 0, -30, -30, 5, 10, 15, 15, 10, 5, -30, -40, -20, 0, 5, 5, 0, -20, -40, -50, -40, -30, -30, -30, -30, -40, -50],
    B: [-20, -10, -10, -10, -10, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 10, 10, 5, 0, -10, -10, 5, 5, 10, 10, 5, 5, -10,
      -10, 0, 10, 10, 10, 10, 0, -10, -10, 10, 10, 10, 10, 10, 10, -10, -10, 5, 0, 0, 0, 0, 5, -10, -20, -10, -10, -10, -10, -10, -10, -20],
    R: [0, 0, 0, 0, 0, 0, 0, 0, 5, 10, 10, 10, 10, 10, 10, 5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5,
      -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, -5, 0, 0, 0, 0, 0, 0, -5, 0, 0, 0, 5, 5, 0, 0, 0],
    Q: [-20, -10, -10, -5, -5, -10, -10, -20, -10, 0, 0, 0, 0, 0, 0, -10, -10, 0, 5, 5, 5, 5, 0, -10, -5, 0, 5, 5, 5, 5, 0, -5,
      0, 0, 5, 5, 5, 5, 0, -5, -10, 5, 5, 5, 5, 5, 0, -10, -10, 0, 5, 0, 0, 0, 0, -10, -20, -10, -10, -5, -5, -10, -10, -20],
    K: [-30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30, -30, -40, -40, -50, -50, -40, -40, -30,
      -20, -30, -30, -40, -40, -30, -30, -20, -10, -20, -20, -20, -20, -20, -20, -10, 20, 20, 0, 0, 0, 0, 20, 20, 20, 30, 10, 0, 0, 10, 30, 20],
    KE: [-50, -40, -30, -20, -20, -30, -40, -50, -30, -20, -10, 0, 0, -10, -20, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -10, 30, 40, 40, 30, -10, -30,
      -30, -10, 30, 40, 40, 30, -10, -30, -30, -10, 20, 30, 30, 20, -10, -30, -30, -30, 0, 0, 0, 0, -30, -30, -50, -30, -30, -30, -30, -30, -30, -50]
  };
  const KN = [[-2, -1], [-2, 1], [-1, -2], [-1, 2], [1, -2], [1, 2], [2, -1], [2, 1]];
  const KG = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
  const DIAG = [[-1, -1], [-1, 1], [1, -1], [1, 1]];
  const ORTH = [[-1, 0], [1, 0], [0, -1], [0, 1]];
  const ALL = DIAG.concat(ORTH);
  const INF = 1e9, MATE = 100000;
  const ABORT = { abort: true };
  const isW = p => p < 'a';
  const FILES = 'abcdefgh';

  // Zobrist-Schlüssel (zwei 32-Bit-Hälften) für die Transpositionstabelle
  const PIDX = 'PNBRQKpnbrqk';
  let seedZ = 0x9e3779b9;
  const rnd32 = () => { seedZ ^= seedZ << 13; seedZ ^= seedZ >>> 17; seedZ ^= seedZ << 5; return seedZ >>> 0; };
  const Z1 = new Uint32Array(12 * 64), Z2 = new Uint32Array(12 * 64);
  for (let i = 0; i < 768; i++) { Z1[i] = rnd32(); Z2[i] = rnd32(); }
  const ZC1 = Array.from({ length: 16 }, rnd32), ZC2 = Array.from({ length: 16 }, rnd32);
  const ZE1 = Array.from({ length: 8 }, rnd32), ZE2 = Array.from({ length: 8 }, rnd32);
  const ZS1 = rnd32(), ZS2 = rnd32();
  const cIdx = c => (c.K ? 1 : 0) | (c.Q ? 2 : 0) | (c.k ? 4 : 0) | (c.q ? 8 : 0);
  function hashFull(s) {
    let h1 = 0, h2 = 0;
    for (let i = 0; i < 64; i++) { const p = s.b[i]; if (p) { const k = PIDX.indexOf(p) * 64 + i; h1 ^= Z1[k]; h2 ^= Z2[k]; } }
    const ci = cIdx(s.castle); h1 ^= ZC1[ci]; h2 ^= ZC2[ci];
    if (s.ep >= 0) { h1 ^= ZE1[s.ep & 7]; h2 ^= ZE2[s.ep & 7]; }
    if (s.turn === 'b') { h1 ^= ZS1; h2 ^= ZS2; }
    s.h1 = h1 >>> 0; s.h2 = h2 >>> 0;
    return s;
  }
  const ensureHash = s => (s.h1 === undefined ? hashFull(s) : s);

  function initial() {
    const rows = ['rnbqkbnr', 'pppppppp', '........', '........', '........', '........', 'PPPPPPPP', 'RNBQKBNR'];
    const b = [];
    for (const row of rows) for (const ch of row) b.push(ch === '.' ? null : ch);
    return hashFull({ b, turn: 'w', castle: { K: true, Q: true, k: true, q: true }, ep: -1, half: 0, full: 1, kw: 60, kb: 4 });
  }

  function attacked(b, sq, byW) {
    const r = sq >> 3, c = sq & 7;
    const pr = byW ? r + 1 : r - 1;
    if (pr >= 0 && pr < 8) {
      const pawn = byW ? 'P' : 'p';
      if (c > 0 && b[pr * 8 + c - 1] === pawn) return true;
      if (c < 7 && b[pr * 8 + c + 1] === pawn) return true;
    }
    const kn = byW ? 'N' : 'n', kg = byW ? 'K' : 'k';
    for (const [dr, dc] of KN) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === kn) return true;
    }
    for (const [dr, dc] of KG) {
      const rr = r + dr, cc = c + dc;
      if (rr >= 0 && rr < 8 && cc >= 0 && cc < 8 && b[rr * 8 + cc] === kg) return true;
    }
    const bb = byW ? 'B' : 'b', rr0 = byW ? 'R' : 'r', qq = byW ? 'Q' : 'q';
    for (const [dr, dc] of DIAG) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = b[rr * 8 + cc];
        if (p) { if (p === bb || p === qq) return true; break; }
        rr += dr; cc += dc;
      }
    }
    for (const [dr, dc] of ORTH) {
      let rr = r + dr, cc = c + dc;
      while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
        const p = b[rr * 8 + cc];
        if (p) { if (p === rr0 || p === qq) return true; break; }
        rr += dr; cc += dc;
      }
    }
    return false;
  }

  function pseudo(s, capsOnly) {
    const b = s.b, w = s.turn === 'w', out = [];
    const pushPawn = (f, t, p, cap) => {
      const tr = t >> 3;
      if (tr === 0 || tr === 7) { for (const pr of (w ? 'QRBN' : 'qrbn')) out.push({ f, t, p, cap, promo: pr }); }
      else out.push({ f, t, p, cap });
    };
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p || isW(p) !== w) continue;
      const r = i >> 3, c = i & 7, T = p.toUpperCase();
      if (T === 'P') {
        const dir = w ? -1 : 1, r1 = r + dir;
        if (r1 < 0 || r1 > 7) continue;
        if (!capsOnly && !b[r1 * 8 + c]) {
          pushPawn(i, r1 * 8 + c, p, null);
          if (r === (w ? 6 : 1) && !b[(r + 2 * dir) * 8 + c]) out.push({ f: i, t: (r + 2 * dir) * 8 + c, p, cap: null, dbl: true });
        }
        for (const dc of [-1, 1]) {
          const cc = c + dc;
          if (cc < 0 || cc > 7) continue;
          const t = r1 * 8 + cc, q = b[t];
          if (q && isW(q) !== w) pushPawn(i, t, p, q);
          else if (!q && t === s.ep) out.push({ f: i, t, p, cap: w ? 'p' : 'P', ep: true });
        }
      } else if (T === 'N' || T === 'K') {
        for (const [dr, dc] of (T === 'N' ? KN : KG)) {
          const rr = r + dr, cc = c + dc;
          if (rr < 0 || rr > 7 || cc < 0 || cc > 7) continue;
          const t = rr * 8 + cc, q = b[t];
          if (!q) { if (!capsOnly) out.push({ f: i, t, p, cap: null }); }
          else if (isW(q) !== w) out.push({ f: i, t, p, cap: q });
        }
      } else {
        const dirs = T === 'B' ? DIAG : T === 'R' ? ORTH : ALL;
        for (const [dr, dc] of dirs) {
          let rr = r + dr, cc = c + dc;
          while (rr >= 0 && rr < 8 && cc >= 0 && cc < 8) {
            const t = rr * 8 + cc, q = b[t];
            if (!q) { if (!capsOnly) out.push({ f: i, t, p, cap: null }); }
            else { if (isW(q) !== w) out.push({ f: i, t, p, cap: q }); break; }
            rr += dr; cc += dc;
          }
        }
      }
    }
    if (!capsOnly) {
      const cs = s.castle;
      if (w && b[60] === 'K') {
        if (cs.K && !b[61] && !b[62] && b[63] === 'R' && !attacked(b, 60, false) && !attacked(b, 61, false) && !attacked(b, 62, false))
          out.push({ f: 60, t: 62, p: 'K', cap: null, castle: 'K' });
        if (cs.Q && !b[59] && !b[58] && !b[57] && b[56] === 'R' && !attacked(b, 60, false) && !attacked(b, 59, false) && !attacked(b, 58, false))
          out.push({ f: 60, t: 58, p: 'K', cap: null, castle: 'Q' });
      }
      if (!w && b[4] === 'k') {
        if (cs.k && !b[5] && !b[6] && b[7] === 'r' && !attacked(b, 4, true) && !attacked(b, 5, true) && !attacked(b, 6, true))
          out.push({ f: 4, t: 6, p: 'k', cap: null, castle: 'k' });
        if (cs.q && !b[3] && !b[2] && !b[1] && b[0] === 'r' && !attacked(b, 4, true) && !attacked(b, 3, true) && !attacked(b, 2, true))
          out.push({ f: 4, t: 2, p: 'k', cap: null, castle: 'q' });
      }
    }
    return out;
  }

  const ROOK_CASTLE = { K: [63, 61], Q: [56, 59], k: [7, 5], q: [0, 3] };

  function make(s, m, inPlace = false) {
    const b = inPlace ? s.b : s.b.slice(), w = isW(m.p);
    let h1 = s.h1, h2 = s.h2;
    const zx = (p, sq) => { const k = PIDX.indexOf(p) * 64 + sq; h1 ^= Z1[k]; h2 ^= Z2[k]; };
    const hashed = h1 !== undefined;
    if (hashed) {
      zx(m.p, m.f); zx(m.promo || m.p, m.t);
      if (m.cap && !m.ep) zx(m.cap, m.t);
      if (m.ep) zx(m.cap, m.t + (w ? 8 : -8));
      if (m.castle) { const [rf, rt] = ROOK_CASTLE[m.castle]; zx(b[rf], rf); zx(b[rf], rt); }
    }
    b[m.f] = null;
    b[m.t] = m.promo || m.p;
    if (m.ep) b[m.t + (w ? 8 : -8)] = null;
    if (m.castle) { const [rf, rt] = ROOK_CASTLE[m.castle]; b[rt] = b[rf]; b[rf] = null; }
    const c = { K: s.castle.K, Q: s.castle.Q, k: s.castle.k, q: s.castle.q };
    if (m.p === 'K') c.K = c.Q = false;
    if (m.p === 'k') c.k = c.q = false;
    if (m.f === 63 || m.t === 63) c.K = false;
    if (m.f === 56 || m.t === 56) c.Q = false;
    if (m.f === 7 || m.t === 7) c.k = false;
    if (m.f === 0 || m.t === 0) c.q = false;
    const ep = m.dbl ? (m.f + m.t) >> 1 : -1;
    if (hashed) {
      const o = cIdx(s.castle), n = cIdx(c);
      if (o !== n) { h1 ^= ZC1[o] ^ ZC1[n]; h2 ^= ZC2[o] ^ ZC2[n]; }
      if (s.ep >= 0) { h1 ^= ZE1[s.ep & 7]; h2 ^= ZE2[s.ep & 7]; }
      if (ep >= 0) { h1 ^= ZE1[ep & 7]; h2 ^= ZE2[ep & 7]; }
      h1 ^= ZS1; h2 ^= ZS2;
    }
    return {
      b, turn: w ? 'b' : 'w', castle: c, h1: hashed ? h1 >>> 0 : undefined, h2: hashed ? h2 >>> 0 : undefined,
      ep,
      half: (m.p === 'P' || m.p === 'p' || m.cap) ? 0 : s.half + 1,
      full: w ? s.full : s.full + 1,
      kw: m.p === 'K' ? m.t : s.kw,
      kb: m.p === 'k' ? m.t : s.kb
    };
  }

  function legal(s) {
    const w = s.turn === 'w';
    return pseudo(s, false).filter(m => { const n = make(s, m); return !attacked(n.b, w ? n.kw : n.kb, !w); });
  }

  function inCheck(s) {
    const w = s.turn === 'w';
    return attacked(s.b, w ? s.kw : s.kb, !w);
  }

  function boardMove(s,m){const b=s.b,w=isW(m.p);b[m.f]=null;b[m.t]=m.promo||m.p;if(m.ep)b[m.t+(w?8:-8)]=null;if(m.castle){const [f,t]=ROOK_CASTLE[m.castle];b[t]=b[f];b[f]=null;}}
  function undoBoard(s,m){const b=s.b,w=isW(m.p);b[m.f]=m.p;b[m.t]=m.ep?null:(m.cap||null);if(m.ep)b[m.t+(w?8:-8)]=m.cap;if(m.castle){const [f,t]=ROOK_CASTLE[m.castle];b[f]=b[t];b[t]=null;}}
  function legalQuick(s,m){boardMove(s,m);try{return !attacked(s.b,m.p.toUpperCase()==='K'?m.t:(isW(m.p)?s.kw:s.kb),!isW(m.p));}finally{undoBoard(s,m);}}
  // Incremental static evidence is private to analysis search states. Public
  // make()/legal() and the ten computer levels keep the previous code path.
  function staticChange(v,p,sq,delta){
    if(!p)return;const type=p.toUpperCase(),white=isW(p),idx=white?sq:((7-(sq>>3))<<3)|(sq&7),sign=white?1:-1;
    const val=v.sc?AVAL:VAL;v.mg+=delta*sign*(val[type]+PST[type][idx]);v.eg+=delta*sign*(val[type]+PST[type==='K'?'KE':type][idx]);
    if('QRBN'.includes(type)){v.material+=delta*VAL[type];v[white?'wm':'bm']+=delta*VAL[type];}
    if(type==='B')v[white?'wb':'bb']+=delta;if(type==='Q')v[white?'wq':'bq']+=delta;
  }
  // scaled: analysis piece values (AVAL). Without it the totals equal the public evaluation;
  // {prune:false} keeps that exhaustive reference search available for differential tests.
  function staticData(s,scaled=false){const v={mg:0,eg:0,material:0,wm:0,bm:0,wb:0,bb:0,wq:0,bq:0,sc:scaled?1:0};for(let i=0;i<64;i++)staticChange(v,s.b[i],i,1);return v;}
  function analysisMake(s,m,inPlace=false){
    const n=make(s,m,inPlace),v={...(s._static||staticData(s))},white=isW(m.p);staticChange(v,m.p,m.f,-1);staticChange(v,m.promo||m.p,m.t,1);
    if(m.cap)staticChange(v,m.cap,m.ep?m.t+(white?8:-8):m.t,-1);
    if(m.castle){const [from,to]=ROOK_CASTLE[m.castle];staticChange(v,white?'R':'r',from,-1);staticChange(v,white?'R':'r',to,1);}
    n._static=v;return n;
  }
  // Analysis only: positional terms on top of material and piece-square tables (revision 18).
  // Mobility, king safety, pawn structure, rooks on open files, development. Centipawns, white minus black.
  const EW = {
    tempo: 10, mobN: 4, mobB: 4, mobR: 2, mobRe: 4, mobQ: 1,
    doubled: 10, doubledE: 20, isolated: 10, isolatedE: 15,
    passed: [0, 5, 10, 20, 40, 70, 110], passedE: [0, 10, 20, 40, 75, 130, 200],
    rookOpen: 20, rookSemi: 10, rookSeventh: 20, undeveloped: 12,
    shieldNear: 0, shieldFar: 12, shieldNone: 28, kingFileOpen: 18, kingCentre: 30,
    attack: { N: 20, B: 20, R: 40, Q: 80 }, attackCount: [0, 0, 50, 75, 88, 94, 97, 99, 99, 99, 99, 99, 99, 99, 99, 99, 99], attackScale: 100
  };
  const LAZY = 400;
  const NB = [], RAY_D = [], RAY_O = [], ZONE_W = new Uint8Array(4096), ZONE_B = new Uint8Array(4096);
  for (let i = 0; i < 64; i++) {
    const r = i >> 3, c = i & 7, inside = (rr, cc) => rr >= 0 && rr < 8 && cc >= 0 && cc < 8;
    const ray = ([dr, dc]) => { const a = []; for (let rr = r + dr, cc = c + dc; inside(rr, cc); rr += dr, cc += dc) a.push(rr * 8 + cc); return a; };
    NB.push(KN.filter(([dr, dc]) => inside(r + dr, c + dc)).map(([dr, dc]) => (r + dr) * 8 + c + dc));
    RAY_D.push(DIAG.map(ray).filter(a => a.length)); RAY_O.push(ORTH.map(ray).filter(a => a.length));
    // King zone: the ring around the king plus the three squares two ranks in front of it.
    for (let t = 0; t < 64; t++) {
      const dr = (t >> 3) - r, dc = Math.abs((t & 7) - c);
      if (dc <= 1 && dr >= -2 && dr <= 1) ZONE_W[i * 64 + t] = 1;
      if (dc <= 1 && dr >= -1 && dr <= 2) ZONE_B[i * 64 + t] = 1;
    }
  }
  const PWC = new Int8Array(10), PBC = new Int8Array(10), PWR = new Int8Array(10), PBR = new Int8Array(10), PL = new Int8Array(64);
  const EC_BITS = 16, EC_MASK = (1 << EC_BITS) - 1, ECK = new Uint32Array(1 << EC_BITS), ECV = new Int16Array(1 << EC_BITS), ECU = new Uint8Array(1 << EC_BITS);
  function kingShelter(b, k, white, own) {
    const kr = k >> 3, kf = k & 7, pawn = white ? 'P' : 'p', step = white ? -1 : 1; let pen = 0;
    if (white ? kr < 6 : kr > 1) return 0;
    for (let f = Math.max(0, kf - 1); f <= Math.min(7, kf + 1); f++) {
      pen += b[(kr + step) * 8 + f] === pawn ? EW.shieldNear : b[(kr + 2 * step) * 8 + f] === pawn ? EW.shieldFar : EW.shieldNone;
      if (!own[f + 1]) pen += EW.kingFileOpen;
    }
    return pen;
  }
  function positional(s, v) {
    const hashed = s.h1 !== undefined, ci = hashed ? s.h1 & EC_MASK : 0;
    if (hashed && ECU[ci] && ECK[ci] === s.h2) return ECV[ci];
    const b = s.b, kw = s.kw, kb = s.kb; let n = 0, mg = 0, eg = 0, wUnits = 0, wAtt = 0, bUnits = 0, bAtt = 0;
    PWC.fill(0); PBC.fill(0); PWR.fill(-1); PBR.fill(8);
    for (let i = 0; i < 64; i++) {
      const p = b[i]; if (!p || p === 'K' || p === 'k') continue;
      if (p === 'P') { const f = (i & 7) + 1; PWC[f]++; if ((i >> 3) > PWR[f]) PWR[f] = i >> 3; }
      else if (p === 'p') { const f = (i & 7) + 1; PBC[f]++; if ((i >> 3) < PBR[f]) PBR[f] = i >> 3; }
      PL[n++] = i;
    }
    for (let j = 0; j < n; j++) {
      const i = PL[j], p = b[i], white = p < 'a', sign = white ? 1 : -1, r = i >> 3, f = (i & 7) + 1;
      if (p === 'P' || p === 'p') {
        const own = white ? PWC : PBC;
        if (own[f] > 1) { mg -= sign * EW.doubled; eg -= sign * EW.doubledE; }
        if (!own[f - 1] && !own[f + 1]) { mg -= sign * EW.isolated; eg -= sign * EW.isolatedE; }
        if (white ? PBR[f - 1] >= r && PBR[f] > r && PBR[f + 1] >= r : PWR[f - 1] <= r && PWR[f] < r && PWR[f + 1] <= r) {
          const k = white ? 6 - r : r - 1; mg += sign * EW.passed[k]; eg += sign * EW.passedE[k];
        }
        continue;
      }
      const zone = white ? ZONE_B : ZONE_W, zk = (white ? kb : kw) * 64; let count = 0, hits = 0;
      if (p === 'N' || p === 'n') {
        const enemyPawn = white ? 'p' : 'P', back = white ? -8 : 8;
        for (const t of NB[i]) {
          const q = b[t]; if (zone[zk + t]) hits++;
          if (q && (q < 'a') === white) continue;
          const tf = t & 7, pr = t + back;
          if (pr >= 0 && pr < 64 && (tf > 0 && b[pr - 1] === enemyPawn || tf < 7 && b[pr + 1] === enemyPawn)) continue;
          count++;
        }
        mg += sign * EW.mobN * (count - 4); eg += sign * EW.mobN * (count - 4);
        if ((white ? r === 7 : r === 0) && (f === 2 || f === 7)) mg -= sign * EW.undeveloped;
        if (hits) { if (white) { wAtt++; wUnits += EW.attack.N; } else { bAtt++; bUnits += EW.attack.N; } }
        continue;
      }
      const type = white ? p : p.toUpperCase();
      if (type !== 'R') for (const ray of RAY_D[i]) for (const t of ray) { const q = b[t]; if (zone[zk + t]) hits++; if (!q) { count++; continue; } if ((q < 'a') !== white) count++; break; }
      if (type !== 'B') for (const ray of RAY_O[i]) for (const t of ray) { const q = b[t]; if (zone[zk + t]) hits++; if (!q) { count++; continue; } if ((q < 'a') !== white) count++; break; }
      if (type === 'B') {
        mg += sign * EW.mobB * (count - 6); eg += sign * EW.mobB * (count - 6);
        if ((white ? r === 7 : r === 0) && (f === 3 || f === 6)) mg -= sign * EW.undeveloped;
      } else if (type === 'R') {
        mg += sign * EW.mobR * (count - 6); eg += sign * EW.mobRe * (count - 6);
        const own = white ? PWC : PBC, other = white ? PBC : PWC;
        if (!own[f]) mg += sign * (other[f] ? EW.rookSemi : EW.rookOpen);
        if (white ? r === 1 && kb < 16 : r === 6 && kw >= 48) { mg += sign * EW.rookSeventh; eg += sign * EW.rookSeventh; }
      } else { mg += sign * EW.mobQ * (count - 12); eg += sign * EW.mobQ * (count - 12); }
      if (hits) { if (white) { wAtt++; wUnits += EW.attack[type]; } else { bAtt++; bUnits += EW.attack[type]; } }
    }
    // King safety counts in the middlegame only: shelter pawns, open files and pieces aiming at the king zone.
    const wk = kingShelter(b, kw, true, PWC) + ((kw & 7) > 2 && (kw & 7) < 5 && kw >= 56 && !s.castle.K && !s.castle.Q ? EW.kingCentre : 0);
    const bk = kingShelter(b, kb, false, PBC) + ((kb & 7) > 2 && (kb & 7) < 5 && kb < 8 && !s.castle.k && !s.castle.q ? EW.kingCentre : 0);
    mg += (v.wq ? bk : bk >> 1) - (v.bq ? wk : wk >> 1);
    const lastAttackWeight = EW.attackCount.length - 1;
    mg += (EW.attackCount[Math.min(lastAttackWeight, wAtt)] * wUnits * (v.wq ? 2 : 1) - EW.attackCount[Math.min(lastAttackWeight, bAtt)] * bUnits * (v.bq ? 2 : 1)) * EW.attackScale / 20000;
    const phase = Math.min(1, v.material / 5000), value = Math.round(mg * phase + eg * (1 - phase));
    if (hashed) { ECU[ci] = 1; ECK[ci] = s.h2; ECV[ci] = value; }
    return value;
  }
  function evaluate(s,analysis=false,alpha,beta) {
    const b = s.b;
    if(analysis){
      const v=s._static||staticData(s),score=(v.material<=2600?v.eg:v.mg)+(v.wb>=2?30:0)-(v.bb>=2?30:0),own=s.turn==='w'?score:-score;
      // Positional terms belong to the scaled analysis evaluation only. Far outside the window they cannot decide.
      if(!v.sc||alpha!==undefined&&(own>=beta+LAZY||own<=alpha-LAZY))return own;
      const pos=positional(s,v);return (s.turn==='w'?score+pos:-score-pos)+EW.tempo;
    }
    let nonPawn = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (p && p !== 'K' && p !== 'k' && p !== 'P' && p !== 'p') nonPawn += VAL[p.toUpperCase()];
    }
    const end = nonPawn <= 2600;
    let score = 0, wb = 0, bb = 0, wk = -1, bk = -1, wn = 0, bn = 0, wh = 0, bh = 0;
    for (let i = 0; i < 64; i++) {
      const p = b[i];
      if (!p) continue;
      const T = p.toUpperCase(), w = isW(p);
      if (T === 'K') { if (w) wk = i; else bk = i; } else if (w) { wn++; if (T === 'Q' || T === 'R') wh++; } else { bn++; if (T === 'Q' || T === 'R') bh++; }
      const idx = w ? i : ((7 - (i >> 3)) << 3) | (i & 7);
      const tbl = T === 'K' ? (end ? PST.KE : PST.K) : PST[T];
      const v = VAL[T] + tbl[idx];
      if (w) { score += v; if (T === 'B') wb++; } else { score -= v; if (T === 'B') bb++; }
    }
    if (wb >= 2) score += 30;
    if (bb >= 2) score -= 30;
    // Endspiel gegen den nackten König mit Dame oder Turm (nur Computergegner, Revision 19): den König an den Rand
    // drängen und den eigenen König heranführen. Sonst findet die begrenzte Suche das Matt oft nicht innerhalb der
    // 50-Züge-Regel. Bauernendspiele und alle anderen Stellungen bewertet sie unverändert.
    if (wk >= 0 && bk >= 0 && (wn === 0) !== (bn === 0) && (bn === 0 ? wh : bh) > 0) {
      const strongW = bn === 0, lone = strongW ? bk : wk, own = strongW ? wk : bk;
      const lf = lone & 7, lr = lone >> 3, edge = Math.max(3 - lf, lf - 4) + Math.max(3 - lr, lr - 4);
      const near = 14 - (Math.abs(lf - (own & 7)) + Math.abs(lr - (own >> 3)));
      score += (strongW ? 1 : -1) * (10 * edge + 16 * near);
    }
    return s.turn === 'w' ? score : -score;
  }

  const TT_BITS = 19, TT_MASK = (1 << TT_BITS) - 1;
  const TTK = new Uint32Array(1 << TT_BITS), TTV = new Uint8Array(1 << TT_BITS), TTD = new Int8Array(1 << TT_BITS),
    TTF = new Uint8Array(1 << TT_BITS), TTS = new Int32Array(1 << TT_BITS), TTM = new Int16Array(1 << TT_BITS), TTH = new Uint8Array(1 << TT_BITS);
  const EXACT = 1, LOWER = 2, UPPER = 3;
  const toTT = (sc, ply) => (sc > MATE - 1000 ? sc + ply : sc < -MATE + 1000 ? sc - ply : sc);
  const fromTT = (sc, ply) => (sc > MATE - 1000 ? sc - ply : sc < -MATE + 1000 ? sc + ply : sc);
  // Analysis TT entries must distinguish all four promotions. Otherwise an
  // exact rook/knight line can be restored as a queen move with the same squares
  // (even when that queen move stalemates). Four 12-bit square-code ranges fit
  // Int16. Keep the legacy computer ordering/history codes unchanged.
  const mcode = (m, analysis = false) => m.f * 64 + m.t +
    (analysis && m.promo ? 'QRBN'.indexOf(m.promo.toUpperCase()) * 4096 : 0);

  // Analysis-only terminal rules. At the fifty-move boundary an actual mate
  // takes precedence, as it does in status(). The common non-terminal path
  // needs no extra move generation; scarce-material scans are guarded by the
  // existing incremental non-pawn total. Computer-level search is unchanged.
  function analysisTerminal(s,ply){
    if(s.half>=100)return inCheck(s)&&!pseudo(s,false).some(m=>legalQuick(s,m))?-MATE+ply:0;
    if((s._static?.material||0)<=330&&insufficient(s.b))return 0;
    return null;
  }
  // Reuse clock-independent bounds only when neither clock can reach 100 in
  // the cached/requested depth plus quiescence. At qd>=10 quiesce makes at most
  // one further evasion: the maximum tail is 11 plies. A different clock near
  // the boundary may still lend move ordering, never its score or displayed PV.
  const tableSalt=(s,ctx)=>ctx.verify?0x5bd1e995:ctx.analysis?0x9e3779b9:(ctx.rep?.salt||0);
  const clockSafe=(s,i,depth)=>TTH[i]===s.half||Math.max(TTH[i],s.half)+Math.max(TTD[i],depth)+11<100;

  function orderScore(m) {
    let sc = 0;
    if (m.cap) sc += 10000 + 10 * VAL[m.cap.toUpperCase()] - VAL[m.p.toUpperCase()];
    if (m.promo) sc += 8000 + VAL[m.promo.toUpperCase()];
    return sc;
  }
  function order(moves) { return moves.sort((a, b) => orderScore(b) - orderScore(a)); }
  function orderSearch(moves, ttMove, ply, ctx) {
    const k = ctx.killers[ply] || [];
    for (const m of moves) {
      const c = mcode(m,ctx.analysis);
      m._o = c === ttMove ? 1e7 : (m.cap || m.promo) ? orderScore(m) + 1e5 : c === k[0] ? 9e4 : c === k[1] ? 8e4 : ctx.hist[c];
    }
    return moves.sort((a, b) => b._o - a._o);
  }

  function quiesce(s, alpha, beta, qd, ctx, ply) {
    if(ctx.pv)ctx.pv[ply]=[];
    if ((++ctx.nodes & (ctx.pv?127:2047)) === 0 && ctx.canAbort && Date.now() > ctx.deadline) throw ABORT;
    if(ctx.rep&&qd>0&&ply<256){
      if(repeats(s,ply,ctx.rep))return repetitionScore(s,ctx.rep);
      ctx.rep.p1[ply]=s.h1;ctx.rep.p2[ply]=s.h2;
    }
    if(ctx.analysis){const terminal=analysisTerminal(s,ply);if(terminal!==null)return terminal;}
    else if(s.half>=100)return 0;
    const w = s.turn === 'w';
    const checked=s._chk??inCheck(s);
    // Short-budget analysis: recognise a legal quiet mate at the first leaf.
    if(ctx.analysis&&ctx.quietMate&&s._afterCheck&&!checked&&qd===0){
      for(const m of pseudo(s,false)){
        if(m.cap||m.promo)continue;
        boardMove(s,m);
        const givesCheck=attacked(s.b,w?s.kb:s.kw,w);
        undoBoard(s,m);
        if(!givesCheck||!legalQuick(s,m))continue;
        const n=analysisMake(s,m);
        if(inCheck(n)&&!pseudo(n,false).some(x=>legalQuick(n,x))){
          if(ctx.pv)ctx.pv[ply]=[m];return Math.max(alpha,Math.min(beta,MATE-ply-1));
        }
      }
    }
    // Analysis only: a stand-pat cutoff needs one legal move, not every capture
    // and checking move. Preserve stalemate and the legacy computer-search path.
    if(ctx.analysis&&!checked){const stand=evaluate(s,true,alpha,beta);if(stand>=beta||qd>=6){if(!pseudo(s,false).some(m=>legalQuick(s,m)))return 0;return stand>=beta?beta:Math.max(alpha,stand);}}
    // Analysis: quiet promotions are tactical moves too. Captures-only
    // generation omits them, so include all four without adding quiet moves
    // elsewhere or changing the computer-level search / existing depth cap.
    let reach=null;
    const capturesOnly=!checked&&!(ctx.verify&&qd===0),candidates=pseudo(s,capturesOnly);
    if(ctx.analysis&&capturesOnly){
      const start=w?8:48,pawn=w?'P':'p',step=w?-8:8;
      for(let f=start;f<start+8;f++)if(s.b[f]===pawn&&!s.b[f+step]){
        for(const promo of (w?'QRBN':'qrbn'))candidates.push({f,t:f+step,p:pawn,cap:null,promo});
      }
    }
    const moves=order(candidates).filter(m=>{
      if(ctx.analysis){if(!legalQuick(s,m))return false;if(ctx.verify&&qd===0&&!checked&&!m.cap&&!m.promo){const n=analysisMake(s,m);return inCheck(n);}return true;}
      const n=make(s,m);return !attacked(n.b,w?n.kw:n.kb,!w);
    });
    if(checked&&!moves.length)return -MATE+ply;
    if(!checked){
      if(!moves.length&&!pseudo(s,false).some(m=>{if(ctx.analysis)return legalQuick(s,m);const n=make(s,m);return !attacked(n.b,w?n.kw:n.kb,!w);}))return 0;
      const stand=evaluate(s,ctx.analysis,alpha,beta);
      if(stand>=beta)return beta;
      if(stand>alpha)alpha=stand;
      if(qd>=6)return alpha;
      if(ctx.prune)reach=stand+200;
    }
    // In check there is no legal "stand pat": include quiet evasions as well.
    // Bound consecutive checking extensions, but still make an actual evasion.
    if(qd>=10)return Math.max(...moves.map(m=>{
      if(!ctx.analysis)return -evaluate(make(s,m),false);
      const child=analysisMake(s,m),terminal=analysisTerminal(child,ply+1);
      return -(terminal??evaluate(child,true));
    }));
    for (const m of moves) {
      // Analysis: a capture that cannot lift the stand-pat score to alpha is skipped.
      if(reach!==null&&m.cap&&!m.promo&&reach+AVAL[m.cap.toUpperCase()]<=alpha)continue;
      const child=ctx.analysis?analysisMake(s,m,true):make(s,m);let sc;
      try{sc=-quiesce(child,-beta,-alpha,qd+1,ctx,ply+1);}finally{if(ctx.analysis)undoBoard(s,m);}
      if (sc >= beta) { if(ctx.pv)ctx.pv[ply]=[m,...(ctx.pv[ply+1]||[])].slice(0,6); return beta; }
      if (sc > alpha) { alpha = sc; if(ctx.pv)ctx.pv[ply]=[m,...(ctx.pv[ply+1]||[])].slice(0,6); }
    }
    return alpha;
  }

  // Computerzug mit Partieverlauf: Eine Stellung, die in der Partie oder auf dem
  // Suchpfad schon vorkam, zählt als Remis mit kleiner Weiterspiel-Präferenz.
  // So wiederholt der Computer nicht schon bei ungefähr gleichem Spiel.
  // Ein rettendes Remis bleibt besser als eine klar verlorene Fortsetzung.
  const repetitionScore=(s,r)=>s.turn===r.rootTurn?-35:35;
  function keyHash(k) {
    if (typeof k !== 'string' || k.length < 66) return null;
    const m = /^([KQkq]*)(-?\d+)$/.exec(k.slice(65));
    if (!m) return null;
    const b = [];
    for (let i = 0; i < 64; i++) b.push(k[i] === '.' ? null : k[i]);
    const c = m[1], s = hashFull({ b, turn: k[64], castle: { K: c.includes('K'), Q: c.includes('Q'), k: c.includes('k'), q: c.includes('q') }, ep: +m[2] });
    return s.h1 + ':' + s.h2;
  }
  function repeats(s, ply, r) {
    // Weniger als vier Halbzüge seit Schlagen oder Bauernzug: keine Wiederholung möglich.
    if (s.half < 4) return false;
    for (let p = ply - 4; p >= 0 && p >= ply - s.half; p -= 2) if (r.p1[p] === s.h1 && r.p2[p] === s.h2) return true;
    return r.seen.has(s.h1 + ':' + s.h2);
  }

  function search(s, depth, alpha, beta, ply, ctx) {
    if(ctx.pv)ctx.pv[ply]=[];
    if ((++ctx.nodes & (ctx.pv?127:2047)) === 0 && ctx.canAbort && Date.now() > ctx.deadline) throw ABORT;
    if (ctx.rep && ply < 256) {
      if (ply > 0 && repeats(s, ply, ctx.rep)) return repetitionScore(s,ctx.rep);
      ctx.rep.p1[ply] = s.h1; ctx.rep.p2[ply] = s.h2;
    }
    if(ctx.analysis){const terminal=analysisTerminal(s,ply);if(terminal!==null)return terminal;}
    else if (s.half >= 100) return 0;
    if (depth <= 0) return ctx.noQ ? evaluate(s,ctx.analysis) : quiesce(s, alpha, beta, 0, ctx, ply);
    const salt=tableSalt(s,ctx),tag=(s.h2^salt)>>>0,idx=(s.h1^salt)&TT_MASK,hit=!ctx.noQ&&TTV[idx]&&TTK[idx]===tag;
    let ttMove = -1;
    // Preliminary scores have different leaf rules. Reuse their move ordering,
    // never their bounds or values, in the stronger pair verification.
    if(ctx.verify&&!hit){const baseSalt=salt^0x5bd1e995^0x9e3779b9,base=(s.h1^baseSalt)&TT_MASK;if(TTV[base]&&TTK[base]===((s.h2^baseSalt)>>>0))ttMove=TTM[base];}
    if (hit) {
      ttMove = TTM[idx];
      if (TTD[idx] >= depth && ply > 0 && (!ctx.analysis||clockSafe(s,idx,depth))) {
        const sc = fromTT(TTS[idx], ply), f = TTF[idx];
        if (f === EXACT) { if(ctx.pv)ctx.pv[ply]=tableLine(s,depth,ctx); return Math.max(alpha, Math.min(beta, sc)); }
        if (f === LOWER && sc >= beta) return beta;
        if (f === UPPER && sc <= alpha) return alpha;
      }
    }
    const white=s.turn==='w';
    // Analysis-only selectivity (ctx.prune). The computer levels never set it.
    const prune=!!ctx.prune,checked=prune&&(s._chk??inCheck(s)),quietWindow=prune&&!checked&&ply>0&&Math.abs(beta)<MATE-1000;
    const stand=quietWindow?evaluate(s,true,alpha,beta):0;
    // Null move: if passing still holds beta, a real move will too. Not in check,
    // not twice in a row, and never with pawns only (zugzwang).
    const cutNode=quietWindow&&(beta-alpha===1||alpha<=-MATE)&&(s._static?.[white?'wm':'bm']||0)>0;
    // Close to the leaves a position far above beta is cut without searching (not with pawns only).
    if(cutNode&&depth<=3&&stand-140*depth>=beta)return beta;
    if(cutNode&&depth>=3&&!s._null&&stand>=beta){
      let h1=s.h1^ZS1,h2=s.h2^ZS2;if(s.ep>=0){h1^=ZE1[s.ep&7];h2^=ZE2[s.ep&7];}
      const pass={b:s.b,turn:white?'b':'w',castle:s.castle,ep:-1,half:s.half,full:s.full,kw:s.kw,kb:s.kb,h1:h1>>>0,h2:h2>>>0,_static:s._static,_null:true,_chk:false};
      const value=-search(pass,depth-1-(depth>=6?3:2)-(stand-beta>=300?1:0),-beta,-beta+1,ply+1,ctx);
      if(ctx.pv)ctx.pv[ply]=[];
      if(value>=beta)return beta;
    }
    const moves=orderSearch(ctx.analysis?pseudo(s,false):legal(s),ttMove,ply,ctx);
    if (!moves.length) return (s._chk??inCheck(s)) ? -MATE + ply : 0;
    const alpha0 = alpha;
    let bestCode = -1;
    let searched=0;
    const horizonEvasion=ctx.quietMate&&depth===1&&(s._chk??inCheck(s));
    const killers=prune?(ctx.killers[ply]||[]):[];
    for (const m of moves) {
      if(ctx.analysis&&!legalQuick(s,m))continue;
      const child=ctx.analysis?analysisMake(s,m,true):make(s,m);let sc;
      if(ctx.quietMate)child._afterCheck=horizonEvasion;
      try{
        if(prune){
          const gives=child._chk=inCheck(child),quiet=!m.cap&&!m.promo&&!gives&&!checked;
          // Frontier futility: a quiet move far below alpha cannot be rescued by one or two plies.
          if(quiet&&searched>0&&depth<=2&&quietWindow&&Math.abs(alpha)<MATE-1000&&stand+(depth===1?150:320)<=alpha){searched++;continue;}
          // A checking move is searched one ply deeper, bounded by the root depth.
          const next=depth-1+(gives&&ply<2*(ctx.rootDepth||depth)?1:0);
          if(searched++>0&&depth>1){
            // Late quiet moves first at reduced depth; anything that beats alpha is searched in full.
            const code=mcode(m,true),late=quiet&&depth>=3&&searched>3&&code!==killers[0]&&code!==killers[1]?(searched>10&&depth>=5?2:1)+(depth>=7&&searched>20?1:0):0;
            sc=-search(child,next-late,-alpha-1,-alpha,ply+1,ctx);
            if(late&&sc>alpha)sc=-search(child,next,-alpha-1,-alpha,ply+1,ctx);
            if(sc>alpha&&sc<beta)sc=-search(child,next,-beta,-alpha,ply+1,ctx);
          }else sc=-search(child,next,-beta,-alpha,ply+1,ctx);
        }else if(ctx.analysis&&searched++>0&&depth>1){
          sc=-search(child,depth-1,-alpha-1,-alpha,ply+1,ctx);
          if(sc>alpha&&sc<beta)sc=-search(child,depth-1,-beta,-alpha,ply+1,ctx);
        }else sc=-search(child,depth-1,-beta,-alpha,ply+1,ctx);
      }finally{if(ctx.analysis)undoBoard(s,m);}
      if (sc >= beta) {
        if(ctx.pv)ctx.pv[ply]=[m,...(ctx.pv[ply+1]||[])].slice(0,6);
        const c = mcode(m,ctx.analysis);
        if (!m.cap && !m.promo) {
          const k = ctx.killers[ply] || (ctx.killers[ply] = [-1, -1]);
          if (k[0] !== c) { k[1] = k[0]; k[0] = c; }
          ctx.hist[c] += depth * depth;
        }
        if(!ctx.noQ){TTV[idx] = 1; TTK[idx] = tag; TTD[idx] = depth; TTH[idx]=s.half; TTF[idx] = LOWER; TTS[idx] = toTT(beta, ply); TTM[idx] = c;}
        return beta;
      }
      if (sc > alpha) { alpha = sc; bestCode = mcode(m,ctx.analysis); if(ctx.pv)ctx.pv[ply]=[m,...(ctx.pv[ply+1]||[])].slice(0,6); }
    }
    if(ctx.analysis&&!searched)return (s._chk??inCheck(s))?-MATE+ply:0;
    if(!ctx.noQ){TTV[idx] = 1; TTK[idx] = tag; TTD[idx] = depth; TTH[idx]=s.half;
    TTF[idx] = alpha > alpha0 ? EXACT : UPPER; TTS[idx] = toTT(alpha, ply); TTM[idx] = alpha > alpha0 ? bestCode : (hit ? ttMove : -1);}
    return alpha;
  }

  // Only exact, sufficiently deep table entries belong to a displayed PV.
  // A missing/replaced entry ends the line; no fresh search is performed.
  function tableLine(state,depth,ctx={}){
    const out=[];let s=state;
    for(let d=depth;d>0&&out.length<6;d--){
      const salt=tableSalt(s,ctx),i=(s.h1^salt)&TT_MASK;
      if(!TTV[i]||TTK[i]!==((s.h2^salt)>>>0)||TTF[i]!==EXACT||TTD[i]<d||s.half>=100)break;
      if(ctx.analysis&&!clockSafe(s,i,d))break;
      const m=legal(s).find(m=>mcode(m,ctx.analysis)===TTM[i]);if(!m)break;
      out.push(m);s=make(s,m);
    }
    return out;
  }
  // Mathematical mappings described at https://lichess.org/page/accuracy .
  // Independently implemented; an engine-derived index, not calibrated odds.
  function winPercent(cp){return 100/(1+Math.exp(-0.00368208*cp));}
  function moveAccuracy(loss){return Math.max(0,Math.min(100,103.1668*Math.exp(-0.04354*Math.max(0,loss))-3.1669));}
  function lossBand(loss){return loss<5?0:loss<10?1:loss<20?2:3;}
  function comparisonMetrics(evBest,evPlayed,turn){
    const sign=turn==='w'?1:-1,b=evBest*sign,p=evPlayed*sign,limit=MATE-1000;
    const winBest=b>=limit?100:b<=-limit?0:winPercent(b),winPlayed=p>=limit?100:p<=-limit?0:winPercent(p);
    // Losing sight of a long mate is not the same as losing the game. These
    // are engine-score bands, not calibrated winning probabilities.
    // With the analysis piece values a clean extra rook is about 93 %; a missed mate there is still an error.
    const winLoss=Math.max(0,winBest-winPlayed),mateError=(b>=limit&&p<limit&&winPlayed<95)||(b>-limit&&p<=-limit&&winBest>5);
    const mateTiming=!mateError&&b>=limit&&(p<limit||b>p)?'win':!mateError&&p<=-limit&&(b>-limit||b>p)?'loss':null;
    return {winBest,winPlayed,winLoss,mateError,mateTiming,accuracy:mateError?0:moveAccuracy(winLoss)};
  }

  // opts: { maxDepth, timeMs, noise, blunder, noQ }
  // noise = Zufall in Centipawns, blunder = Wahrscheinlichkeit für einen bewusst schwachen Zug,
  // noQ = keine Ruhesuche (übersieht dann Schlagabtausche) – so entstehen die leichten Stufen
  function bestMove(s, opts) {
    const o = Object.assign({ maxDepth: 3, timeMs: 2000, noise: 0, blunder: 0, noQ: false }, opts);
    let moves = order(legal(s));
    if (!moves.length) return null;
    if (moves.length === 1) return moves[0];
    if (o.blunder && Math.random() < o.blunder) {
      // schwacher, aber nicht völlig absurder Zug: zufällig aus der unteren Hälfte, Matt in 1 wird nie verschenkt
      const mates = moves.filter(m => { const n = make(s, m); return !legal(n).length && inCheck(n); });
      if (!mates.length || Math.random() < 0.5) return moves[(Math.random() * moves.length) | 0];
    }
    ensureHash(s);
    const ctx = { nodes: 0, deadline: Date.now() + o.timeMs, canAbort: false, noQ: o.noQ, killers: [], hist: new Int32Array(4096) };
    // opts.history: Stellungsschlüssel (key) der bisherigen Partie, einschließlich der aktuellen Stellung
    if (Array.isArray(o.history) && o.history.length) {
      const seen = new Set();
      for (const k of o.history) { const h = keyHash(k); if (h) seen.add(h); }
      // Repetition values depend on this game's history and the computer's
      // colour. Do not reuse bounds from another history or an analysis.
      let salt=s.turn==='w'?0x243f6a88:0x85a308d3;
      for(const h of seen)for(let i=0;i<h.length;i++)salt=Math.imul(salt^h.charCodeAt(i),16777619);
      ctx.rep = { seen, rootTurn:s.turn, salt:(salt>>>0)||1, p1: new Uint32Array(256), p2: new Uint32Array(256) };
      ctx.rep.p1[0] = s.h1; ctx.rep.p2[0] = s.h2;
    }
    let best = moves[0],near=null;
    for (let d = 1; d <= o.maxDepth; d++) {
      ctx.canAbort = d > 1;
      try {
        let alpha = -INF;
        const scored = [];
        for (const m of moves) {
          const sc = -search(make(s, m), d - 1, -INF, o.noise ? INF : -alpha, 1, ctx);
          scored.push({ m, sc, r: sc + (o.noise ? (Math.random() * 2 - 1) * o.noise : 0) });
          if (sc > alpha) alpha = sc;
        }
        scored.sort((a, b) => b.r - a.r);
        best = scored[0].m;
        moves = scored.map(x => x.m);
        if (o.stats) o.stats.depth = d;
        if(o.varietyCp>0&&o.varietyCp<=15&&Math.abs(alpha)<MATE-1000){
          // A root fail-low score is only an upper bound. Verify eligibility
          // with a null-window probe at best-15, within the existing deadline.
          // If probing is interrupted, the completed principal move remains safe.
          const threshold=alpha-o.varietyCp,pool=[scored.find(x=>x.sc===alpha).m];near=pool;
          if(o.stats)o.stats.varietyDepth=d;
          ctx.canAbort=true;
          for(const r of scored)if(r.m!==pool[0]&&r.sc>=threshold){
            // With level noise enabled, the ordinary root search already uses
            // full windows; those scores are exact and need no extra search.
            const value=o.noise?r.sc:-search(make(s,r.m),d-1,-threshold,-threshold+1,1,ctx);
            if(value>=threshold)pool.push(r.m);
          }
          if(o.stats)o.stats.candidates=pool.map(m=>sqName(m.f)+sqName(m.t)+(m.promo?.toLowerCase()||''));
        }else near=null;
        if (alpha > MATE - 1000) break; // Matt gefunden
      } catch (e) {
        if (e !== ABORT) throw e;
        break;
      }
    }
    if(o.stats&&near)o.stats.candidates=near.map(m=>sqName(m.f)+sqName(m.t)+(m.promo?.toLowerCase()||''));
    return near?.length?near[Math.floor(Math.random()*near.length)]:best;
  }

  // Compare actual and recommended moves in the SAME completed root iteration.
  // Search the actual move first with a full window; improving alternatives also
  // have exact scores. Interrupted iterations never replace the last full result.
  function preliminaryComparison(s, played, opts={}) {
    const o=Object.assign({maxDepth:5,timeMs:900},opts),legalMoves=order(legal(s));
    const actual=legalMoves.find(m=>m.f===played.f&&m.t===played.t&&(m.promo||'')===(played.promo||''));
    if(!actual)throw Error('Illegal analysis move');
    ensureHash(s);
    let moves=[actual,...legalMoves.filter(m=>m!==actual)],result={best:actual,evBest:0,evPlayed:0,loss:0,depth:0,uncertain:true,nodes:0,pvPlayed:[],pvBest:[]};
    const analysisRoot={...s,b:s.b.slice(),_static:staticData(s,o.prune!==false)},sign=s.turn==='w'?1:-1,started=Date.now();
    const ctx={nodes:0,deadline:started+o.timeMs,canAbort:false,analysis:true,prune:o.prune!==false,quietMate:o.timeMs<=300,killers:[],hist:new Int32Array(4096),pv:[]};
    const clip=n=>Math.max(-1500,Math.min(1500,n));
    for(let depth=1,limit=o.maxDepth;depth<=limit;depth++){
      ctx.canAbort=true;ctx.rootDepth=depth;
      try{
        let score=-INF,best=actual,playedScore=0,pvPlayed=[],pvBest=[];const ranked=[];
        for(const m of moves){
          if(ctx.canAbort&&Date.now()>ctx.deadline)throw ABORT;
          const child=analysisMake(analysisRoot,m,true);let value;
          try{value=-search(child,depth-1,-INF,-score,1,ctx);}finally{undoBoard(analysisRoot,m);}
          const pv=[m,...(ctx.pv[1]||[])].slice(0,6);
          if(m===actual){playedScore=value;pvPlayed=pv;}
          ranked.push({m,value});if(value>score){score=value;best=m;pvBest=pv;}
        }
        const loss=Math.max(0,clip(score)-clip(playedScore));
        const previous=result;
        const metrics=comparisonMetrics(score*sign,playedScore*sign,s.turn);
        const prev=previous.depth?comparisonMetrics(previous.evBest,previous.evPlayed,s.turn):null;
        const shrinking=prev&&previous.loss-loss>80&&lossBand(metrics.winLoss)<lossBand(prev.winLoss);
        const code=m=>sqName(m.f)+sqName(m.t)+(m.promo?.toLowerCase()||'');
        // Publish only completed iterations, including their own frozen lines.
        result={best,evBest:score*sign,evPlayed:playedScore*sign,loss,depth,...metrics,
          uncertain:depth<3||(!metrics.mateError&&!!shrinking),nodes:ctx.nodes,
          pvPlayed:pvPlayed.map(code),pvBest:pvBest.map(code)};
        ranked.sort((a,b)=>b.value-a.value);
        moves=[actual,...ranked.map(r=>r.m).filter(m=>m!==actual)];
        // An unstable last iteration (a loss that just vanished) gets one more ply while time remains.
        if(ctx.prune&&depth===o.maxDepth&&depth>=3&&result.uncertain)limit=o.maxDepth+1;
      }catch(e){if(e!==ABORT)throw e;break;}
    }
    return {...result,ms:Date.now()-started};
  }

  // A short line can price an attacking sacrifice as a simple trade while
  // missing its quiet continuation. This is a limit on marginal advice, not
  // proof that the sacrificed material is recovered or that the move is best.
  function unresolvedSacrifice(s,line){
    if(!Array.isArray(line)||line.length<2)return false;
    const first=legal(s).find(m=>sqName(m.f)+sqName(m.t)+(m.promo?.toLowerCase()||'')===line[0]);
    if(!first?.cap)return false;
    const side=s.turn,white=side==='w',balance=p=>p.b.reduce((n,x)=>n+(x?(isW(x)===white?1:-1)*VAL[x.toUpperCase()]:0),0),before=balance(s);
    let pos=s,lostPiece=false,ownLost=0,enemyLost=0;
    for(const u of line){
      const m=legal(pos).find(m=>sqName(m.f)+sqName(m.t)+(m.promo?.toLowerCase()||'')===u);
      if(!m)return false;
      const victim=pos.b[m.t];if(victim){const value=VAL[victim.toUpperCase()];if(isW(victim)===white){ownLost+=value;if('NBRQ'.includes(victim.toUpperCase()))lostPiece=true;}else enemyLost+=value;}
      pos=make(pos,m);
    }
    // A plainly hanging piece is not a compensated sacrifice. At least half
    // its material cost must already have been recovered in this legal line.
    return lostPiece&&enemyLost*2>=ownLost&&balance(pos)<=before-100;
  }

  // A short quiet line and a small positional-table preference are not
  // sufficient evidence for advising a different king move. Keep forcing
  // lines, captures, castling and larger evaluated differences eligible.
  function quietKingPreference(s,candidate,playedLine,bestLine){
    if(candidate.p.toUpperCase()!=='K'||candidate.cap||candidate.castle||candidate.promo)return false;
    for(const [index,line] of [playedLine,bestLine].entries()){
      if(!Array.isArray(line)||!line.length)return false;let pos=s;
      for(const u of line){
        const m=legal(pos).find(m=>sqName(m.f)+sqName(m.t)+(m.promo?.toLowerCase()||'')===u);
        if(!m||m.cap||m.promo||m.castle)return false;
        const ours=pos.turn===s.turn;pos=make(pos,m);if(index===1&&ours&&inCheck(pos))return false;
      }
    }
    return true;
  }

  function compareMove(s,played,opts={}){
    const o=Object.assign({maxDepth:5,timeMs:900},opts),started=Date.now(),r=preliminaryComparison(s,played,{...o,timeMs:Math.max(1,o.timeMs*.7)}),baseMs=r.ms;
    const same=r.best&&r.best.f===played.f&&r.best.t===played.t&&(r.best.promo||'')===(played.promo||'');
    if(same)return {...r,baseMs,verificationMs:0,recommendationStatus:'same',recommendationVerified:false};
    const actual=legal(s).find(m=>m.f===played.f&&m.t===played.t&&(m.promo||'')===(played.promo||'')),candidate=r.best,sign=s.turn==='w'?1:-1;
    const suppress=(status,score=r.evPlayed,pv=r.pvPlayed,better=score)=>{
      // Withholding advice is separate from completing a move evaluation.
      // Retain small measured losses; rejected pairs use their common recheck.
      const evidence=status==='similar'?r:{...comparisonMetrics(better,score,s.turn),evBest:better,evPlayed:score,loss:Math.max(0,Math.max(-1500,Math.min(1500,better*sign))-Math.max(-1500,Math.min(1500,score*sign)))};
      const incomplete=status==='unconfirmed';
      return {...r,...evidence,best:actual,accuracy:incomplete?null:evidence.accuracy,uncertain:incomplete,pvBest:pv.slice(),pvPlayed:pv.slice(),baseMs,verificationMs:Date.now()-started-baseMs,ms:Date.now()-started,recommendationStatus:status,recommendationVerified:false};
    };
    // Tiny preferences are not worth presenting as a better alternative. Keep
    // meaningful tactical differences in already won/lost (saturated) scores.
    // With positional terms a stable quiet preference needs a wider margin before it becomes advice;
    // an unstable one above the old margin still goes to the pair verification.
    const nearWin=o.prune!==false?8:5,nearLoss=o.prune!==false?130:80,stable=r.depth>=3&&!r.uncertain;
    if(!r.mateError&&!r.mateTiming&&(r.winLoss<5&&r.loss<80||stable&&r.winLoss<nearWin&&r.loss<nearLoss))return suppress(r.depth<3||r.uncertain?'unconfirmed':'similar');
    if(r.depth<3)return suppress('unconfirmed');
    // maxDepth bounds the primary search. Marginal, undecided recommendations
    // may receive one extra verification ply; the total deadline is unchanged.
    const deepen=!!candidate.cap&&r.depth>=5&&o.timeMs>=500&&!r.mateError&&!r.mateTiming&&r.winLoss>=5&&r.winLoss<20&&r.winBest>10&&r.winBest<90;
    const deadline=started+Math.max(1,o.timeMs)*1.25,target=Math.min(o.maxDepth+(deepen?1:0),Math.max(3,r.depth+(o.timeMs>=500?1:0)));
    let verifiedDepth=target;
    const root={...s,b:s.b.slice(),_static:staticData(s,o.prune!==false)},scores=[],lines=[],code=m=>sqName(m.f)+sqName(m.t)+(m.promo?.toLowerCase()||'');
    try{
      // Both root moves are searched to the same depth. Up to depth 5 the pair is searched once at the
      // target, as before revision 17. Deeper targets are approached step by step: a timeout keeps the
      // last complete pair if it reached depth 5 and is at most one ply short of the primary search.
      const contexts=[0,1].map(()=>({nodes:0,analysis:true,prune:o.prune!==false,rootDepth:target,verify:true,quietMate:o.timeMs<=500,deadline,canAbort:true,killers:[],hist:new Int32Array(4096),pv:[]}));
      const enough=target<=5?target:Math.max(5,r.depth-1);
      let completedDepth=0;
      try{for(let d=deepen?Math.min(3,target):enough;d<=target;d++){
        const nextScores=[],nextLines=[];
        for(const [index,m] of [actual,candidate].entries()){
          const ctx=contexts[index],child=analysisMake(root,m,true),center=scores[index]??((index?r.evBest:r.evPlayed)*sign);let width=64,value;
          try{for(;;){
            if(Date.now()>deadline)throw ABORT;
            const alpha=Math.max(-INF,center-width),beta=Math.min(INF,center+width);
            value=-search(child,d-1,-beta,-alpha,1,ctx);
            if(value>alpha&&value<beta)break;width*=4;
          }
          nextScores.push(value);nextLines.push([m,...(ctx.pv[1]||[])].slice(0,6).map(code));
          }finally{undoBoard(root,m);}
        }
        scores.splice(0,2,...nextScores);lines.splice(0,2,...nextLines);completedDepth=d;
      }
      }catch(e){
        // Only whole, equally deep pairs can survive a timeout. Never retain
        // just one root or an incomplete PV.
        if(e!==ABORT||completedDepth<enough)throw e;
      }
      verifiedDepth=completedDepth;
    }catch(e){if(e!==ABORT)throw e;return {...suppress('unconfirmed'),verificationDepth:0};}
    const [p,b]=scores,metrics=comparisonMetrics(b*sign,p*sign,s.turn),loss=Math.max(0,Math.max(-1500,Math.min(1500,b))-Math.max(-1500,Math.min(1500,p)));
    if(b<=p||!metrics.mateError&&!metrics.mateTiming&&metrics.winLoss<5&&loss<80)return {...suppress('rejected',p*sign,lines[0],Math.max(b,p)*sign),verificationDepth:verifiedDepth};
    if(!metrics.mateError&&!metrics.mateTiming&&metrics.winLoss<25&&metrics.winBest>10&&metrics.winBest<90&&unresolvedSacrifice(s,lines[0]))return {...suppress('rejected',p*sign,lines[0],p*sign),verificationDepth:verifiedDepth,recommendationReason:'unresolved-sacrifice',sacrificeUnresolved:true};
    if(!metrics.mateError&&!metrics.mateTiming&&metrics.winLoss<nearWin&&loss<nearLoss)return {...suppress('rejected',p*sign,lines[0],Math.max(b,p)*sign),verificationDepth:verifiedDepth};
    if(!metrics.mateError&&!metrics.mateTiming&&metrics.winLoss<10&&quietKingPreference(s,candidate,lines[0],lines[1]))return {...suppress('rejected',p*sign,lines[0],p*sign),verificationDepth:verifiedDepth,recommendationReason:'quiet-king-preference',quietKingUnresolved:true};
    return {...r,...metrics,evBest:b*sign,evPlayed:p*sign,loss,uncertain:false,pvPlayed:lines[0],pvBest:lines[1],baseMs,verificationDepth:verifiedDepth,verificationMs:Date.now()-started-baseMs,ms:Date.now()-started,recommendationStatus:'verified',recommendationVerified:true};
  }

  // Standalone position analysis has no played move, grade or accuracy. Reuse
  // the existing root search; its first legal move is an ordering seed only.
  function analysePosition(s,opts={}){
    const end=status(s,[]);
    if(end.over)return {best:null,score:end.result==='w'?MATE:end.result==='b'?-MATE:0,pv:[],depth:0,uncertain:false,terminal:end.reason};
    const r=preliminaryComparison(s,end.moves[0],Object.assign({maxDepth:5,timeMs:900},opts));
    return {best:r.best,score:r.evBest,pv:r.pvBest.slice(),depth:r.depth,uncertain:r.depth<3,forced:end.moves.length===1,terminal:null};
  }

  // Bewertung aus Sicht von Weiß in Centipawns (kurze Suche + Ruhesuche); Matt = ±MATE
  function analyse(s, depth = 2) {
    ensureHash(s);
    const ctx = { nodes: 0, deadline: Infinity, canAbort: false, killers: [], hist: new Int32Array(4096) };
    const moves = legal(s);
    let sc;
    if (!moves.length) sc = inCheck(s) ? -MATE : 0;
    else sc = search(s, depth, -INF, INF, 0, ctx);
    return s.turn === 'w' ? sc : -sc;
  }

  // Erzwungenes Matt in höchstens n Zügen für die Seite am Zug? (für Schachaufgaben)
  function mateIn(s, n) {
    ensureHash(s);
    const ctx = { nodes: 0, deadline: Infinity, canAbort: false, noQ: true, killers: [], hist: new Int32Array(4096) };
    return search(s, 2 * n, -INF, INF, 0, ctx) >= MATE - (2 * n - 1);
  }
  // Ist die Seite am Zug in höchstens n gegnerischen Zügen mattgesetzt (bei bester Verteidigung)?
  function matedIn(s, n) {
    if (!legal(s).length) return inCheck(s);
    ensureHash(s);
    const ctx = { nodes: 0, deadline: Infinity, canAbort: false, noQ: true, killers: [], hist: new Int32Array(4096) };
    // mattgesetzt wird auf Halbzug 2n; dieser Knoten braucht noch Suchtiefe, daher 2n + 1
    return search(s, 2 * n + 1, -INF, INF, 0, ctx) <= -MATE + 2 * n;
  }

  function fromFEN(fen) {
    const [pos, turn, cs = '-', ep = '-', half = '0', full = '1'] = fen.trim().split(/\s+/);
    const b = [];
    for (const ch of pos.replace(/\//g, '')) {
      if (/\d/.test(ch)) for (let i = 0; i < +ch; i++) b.push(null); else b.push(ch);
    }
    const epSq = ep === '-' ? -1 : FILES.indexOf(ep[0]) + (8 - +ep[1]) * 8;
    return hashFull({ b, turn, castle: { K: cs.includes('K'), Q: cs.includes('Q'), k: cs.includes('k'), q: cs.includes('q') },
      ep: epSq, half: +half, full: +full, kw: b.indexOf('K'), kb: b.indexOf('k') });
  }
  function toFEN(s) {
    let out = '';
    for (let r = 0; r < 8; r++) {
      let e = 0;
      for (let c = 0; c < 8; c++) {
        const p = s.b[r * 8 + c];
        if (!p) e++; else { if (e) { out += e; e = 0; } out += p; }
      }
      if (e) out += e;
      if (r < 7) out += '/';
    }
    const cs = (s.castle.K ? 'K' : '') + (s.castle.Q ? 'Q' : '') + (s.castle.k ? 'k' : '') + (s.castle.q ? 'q' : '') || '-';
    return `${out} ${s.turn} ${cs} ${s.ep < 0 ? '-' : sqName(s.ep)} ${s.half} ${s.full}`;
  }

  // Felder der Figuren, die das Feld sq angreifen (z. B. wer gerade Schach gibt)
  function attackers(s, sq, byW) {
    const fake = Object.assign({}, s, { turn: byW ? 'w' : 'b', ep: -1 });
    return pseudo(fake, true).filter(m => m.t === sq).map(m => m.f);
  }

  const sqName = i => FILES[i & 7] + (8 - (i >> 3));

  function toSAN(s, m, legalMoves) {
    let san;
    if (m.castle) san = (m.castle === 'K' || m.castle === 'k') ? 'O-O' : 'O-O-O';
    else {
      const T = m.p.toUpperCase();
      if (T === 'P') {
        san = (m.cap ? FILES[m.f & 7] + 'x' : '') + sqName(m.t) + (m.promo ? '=' + m.promo.toUpperCase() : '');
      } else {
        const others = (legalMoves || legal(s)).filter(o => o.p === m.p && o.t === m.t && o.f !== m.f);
        let dis = '';
        if (others.length) {
          if (others.every(o => (o.f & 7) !== (m.f & 7))) dis = FILES[m.f & 7];
          else if (others.every(o => (o.f >> 3) !== (m.f >> 3))) dis = String(8 - (m.f >> 3));
          else dis = sqName(m.f);
        }
        san = T + dis + (m.cap ? 'x' : '') + sqName(m.t);
      }
    }
    const n = make(s, m);
    if (inCheck(n)) san += legal(n).length ? '+' : '#';
    return german(san);
  }
  // deutsche Figurenbuchstaben: K König, D Dame, T Turm, L Läufer, S Springer
  const SAN_LETTERS = { de: { K: 'K', Q: 'D', R: 'T', B: 'L', N: 'S' }, tr: { K: 'Ş', Q: 'V', R: 'K', B: 'F', N: 'A' }, es: { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' },
    pt: { K: 'R', Q: 'D', R: 'T', B: 'B', N: 'C' }, fr: { K: 'R', Q: 'D', R: 'T', B: 'F', N: 'C' }, it: { K: 'R', Q: 'D', R: 'T', B: 'A', N: 'C' }, pl: { K: 'K', Q: 'H', R: 'W', B: 'G', N: 'S' } };
  // Notation in der Sprache der App (Englisch bleibt KQRBN); das Rochadezeichen O-O enthält keine Figurenbuchstaben
  const german = san => { const L = SAN_LETTERS[root.DA_LANG]; return L ? san.replace(/[KQRBN]/g, ch => L[ch]) : san; };

  const key = s => s.b.map(p => p || '.').join('') + s.turn + (s.castle.K ? 'K' : '') + (s.castle.Q ? 'Q' : '') +
    (s.castle.k ? 'k' : '') + (s.castle.q ? 'q' : '') + s.ep;

  function insufficient(b) {
    const rest = b.filter(p => p && p !== 'K' && p !== 'k');
    if (!rest.length) return true;
    return rest.length === 1 && 'NBnb'.includes(rest[0]);
  }

  // keys: Liste aller bisherigen Stellungsschlüssel (für Stellungswiederholung)
  function status(s, keys) {
    const moves = legal(s);
    if (!moves.length) {
      return inCheck(s)
        ? { over: true, result: s.turn === 'w' ? 'b' : 'w', reason: 'Schachmatt', moves }
        : { over: true, result: 'draw', reason: 'Patt', moves };
    }
    if (s.half >= 100) return { over: true, result: 'draw', reason: '50-Züge-Regel', moves };
    if (insufficient(s.b)) return { over: true, result: 'draw', reason: 'Zu wenig Material', moves };
    if (keys) {
      const k = key(s);
      if (keys.filter(x => x === k).length >= 3) return { over: true, result: 'draw', reason: 'Dreifache Wiederholung', moves };
    }
    return { over: false, moves, check: inCheck(s) };
  }

  root.ChessEngine = { ANALYSIS_VERSION, ENGINE_REVISION, initial, legal, make, inCheck, bestMove, compareMove, analysePosition, comparisonMetrics, winPercent, moveAccuracy, toSAN, sqName, status, key, isW, evaluate, analyse, attackers, MATE, mateIn, matedIn, fromFEN, toFEN, hashFull,notationLetters:()=>({...{K:'K',Q:'Q',R:'R',B:'B',N:'N'},...SAN_LETTERS[root.DA_LANG]}) };
})(typeof self !== 'undefined' ? self : this);
