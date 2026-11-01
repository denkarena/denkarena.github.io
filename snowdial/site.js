"use strict";
// Snowdial page: the sky follows the day while you scroll, a little island where you drag the sun,
// moving world cards, a playable demo, and Snowdi in the corner. Art comes from art.js (the
// drawing code of the browser game), texts from window.SD_TEXT (set by each page).
(() => {
  const T = window.SD_TEXT;
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  const $ = (id) => document.getElementById(id);
  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
  const lerp = (a, b, f) => a + (b - a) * f;
  const easeIO = (x) => (x < 0.5 ? 2 * x * x : 1 - Math.pow(-2 * x + 2, 2) / 2);
  const easeOut = (x) => 1 - Math.pow(1 - x, 3);
  const hex = (a, b, f) => "#" + hexRgb(a).map((v, i) => Math.round(v + (hexRgb(b)[i] - v) * f).toString(16).padStart(2, "0")).join("");
  const ramp = (stops, p) => {
    for (let i = 1; i < stops.length; i++) if (p <= stops[i][0]) {
      const [p0, ...a] = stops[i - 1], [p1, ...b] = stops[i], f = (p - p0) / (p1 - p0 || 1);
      return a.map((c, k) => hex(c, b[k], f));
    }
    return stops[stops.length - 1].slice(1);
  };
  const fit = (cv, maxDpr = 2) => {
    const r = cv.getBoundingClientRect(), d = Math.min(window.devicePixelRatio || 1, maxDpr);
    const w = Math.max(1, Math.round(r.width * d)), h = Math.max(1, Math.round(r.height * d));
    if (cv.width !== w || cv.height !== h) { cv.width = w; cv.height = h; return true; }
    return false;
  };
  const visible = new Set();
  const io = new IntersectionObserver((es) => es.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target))), { rootMargin: "80px" });

  // ------------------------------------------------------------- the sky follows the day while you scroll
  const SKY = [[0, "#7FC4F7", "#FFE3C2"], [0.38, "#5FB6F5", "#DCF2FF"], [0.66, "#8D9FE8", "#FFC9A8"], [0.83, "#3E4A9C", "#F49AB3"], [1, "#121A44", "#2A3A82"]];
  const sky = $("skybg"), sg = sky.getContext("2d");
  const stars = Array.from({ length: 80 }, (_, i) => ({ x: hash01(i, 1), y: hash01(i, 2) * 0.75, r: 0.6 + hash01(i, 3) * 1.7, ph: hash01(i, 4) * 6 }));
  let scrollP = 0;
  const sunAt = (p) => { const ang = clamp(p / 0.76, 0, 1) * 180, day = 1 - clamp((p - 0.76) / 0.12, 0, 1); return { ang, day, noon: Math.max(0, Math.sin(ang * DEG)), drop: 1 - day }; };
  function readScroll() {
    const max = document.documentElement.scrollHeight - innerHeight;
    scrollP = max > 0 ? clamp(scrollY / max, 0, 1) : 0;
    document.body.classList.toggle("night", scrollP > 0.84);
  }
  function drawSky(t) {
    if (sky.width !== innerWidth || sky.height !== innerHeight) { sky.width = innerWidth; sky.height = innerHeight; }
    const W = sky.width, H = sky.height, [top, bot] = ramp(SKY, scrollP), sk = sunAt(scrollP);
    const gr = sg.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, top); gr.addColorStop(1, bot); sg.fillStyle = gr; sg.fillRect(0, 0, W, H);
    if (sk.day < 0.7) for (const s of stars) { sg.globalAlpha = (1 - sk.day / 0.7) * (0.55 + 0.45 * Math.sin(t * 1.8 + s.ph)); circ(sg, s.x * W, s.y * H, s.r, "#fff"); }
    sg.globalAlpha = 1;
    const R = Math.min(W, H) * 0.06 + 18, cx = W / 2, hy = H * 0.96, rx = W * 0.47, ry = H * 0.8;
    if (sk.day < 1) { sg.save(); sg.globalAlpha = 1 - sk.day; moonIcon(sg, W * 0.8, H * 0.18, R * 0.75, top); sg.restore(); }
    if (sk.day > 0) {
      const a = (sk.ang + 180) * DEG;
      sunIcon(sg, cx + Math.cos(a) * rx, hy + Math.sin(a) * ry + sk.drop * ry * 0.5, R, t, hex("#FFA43D", "#FFD23D", sk.noon), sk.day, 2.6);
    }
    for (let k = 0; k < 4; k++) {
      const w = Math.min(W * 0.42, 420) * (0.7 + 0.15 * k), x = ((t * (7 + k * 3) + k * W * 0.37) % (W + w)) - w, y = H * (0.07 + 0.15 * k);
      cloud(sg, x, y, w, w * 0.3, (0.35 + 0.5 * sk.day) * (k % 2 ? 0.8 : 1));
    }
  }

  // ------------------------------------------------------------- the island toy: drag the sun, tap a tile
  const toy = $("toy"), range = $("dayRange"), status = $("toyStatus"), hint = $("toyHint");
  const MAP = ["......", ".h..t.", "......", "..b...", ".....O"], MW = 6, MH = 5, TALL = { h: 3, t: 2, b: 1 };
  const PHASE_ANG = { R: 0, Z: 90, S: 180 };
  const toyState = { u: 0.12, angV: 0, dayV: 1, pos: { x: 2, y: 1 }, from: { x: 2, y: 1 }, to: { x: 2, y: 1 }, hop: 1, melt: 0, facing: 1, cheer: 0, touched: false, drag: false, autoPh: "", autoAt: 0, status: "" };
  const islandCv = document.createElement("canvas"), shadowCv = document.createElement("canvas");
  let geo = null;
  const phaseOf = (u) => { const d = u < 0 ? 1 + u / 0.15 : u > 1 ? 1 - (u - 1) / 0.15 : 1, ang = clamp(u, 0, 1) * 180; return d < 0.5 ? "N" : ang < 60 ? "R" : ang < 120 ? "Z" : "S"; };
  const dayOf = (u) => clamp(u < 0 ? 1 + u / 0.15 : u > 1 ? 1 - (u - 1) / 0.15 : 1, 0, 1);
  const walkable = (x, y) => x >= 0 && y >= 0 && x < MW && y < MH && !TALL[MAP[y][x]];
  function shaded(x, y, ph) {
    if (ph === "N" || MAP[y][x] === "O") return true;
    const d = { R: [1, 0], Z: [0, 1], S: [-1, 0] }[ph];
    for (let oy = 0; oy < MH; oy++) for (let ox = 0; ox < MW; ox++) {
      const h = TALL[MAP[oy][ox]]; if (!h) continue;
      for (let k = 1; k <= shadowLen(ph, h); k++) if (ox + d[0] * k === x && oy + d[1] * k === y) return true;
    }
    return false;
  }
  function toyLayout() {
    if (!toy) return;
    fit(toy);
    const W = toy.width, H = toy.height, head = 1.75, depth = 0.45;
    const cs = Math.min(W / (MW + 0.9), H / (MH + head + depth + 0.5)), ox = (W - cs * MW) / 2, oy = H - cs * (MH + depth + 0.3);
    const pad = cs * 0.16, top = { l: ox - pad, t: oy - pad, r: ox + cs * MW + pad, b: oy + cs * MH + pad }, corner = cs * 0.42;
    const sunR = cs * 0.36, hy = top.t - cs * 0.15, rx = Math.min(W / 2 - sunR * 2.2, (top.r - top.l) * 0.56), ry = Math.max(cs * 0.6, hy - sunR * 2.2);
    geo = { W, H, cs, ox, oy, top, corner, depth: cs * depth, sunR, hy, rx, ry, cx: W / 2 };
    islandCv.width = W; islandCv.height = H; shadowCv.width = W; shadowCv.height = H;
    const ig = islandCv.getContext("2d"); ig.clearRect(0, 0, W, H);
    islandBase(ig, top, LOOKS[0], geo.depth, corner, 41);
    ig.save(); ig.beginPath(); ig.roundRect(top.l, top.t, top.r - top.l, top.b - top.t, corner); ig.clip();
    for (let y = -1; y <= MH; y++) for (let x = -1; x <= MW; x++) groundTile(ig, ox + x * cs, oy + y * cs, cs, LOOKS[0], x, y, y * 977 + x * 31 + 5);
    ig.restore();
  }
  function setU(u, byUser) {
    toyState.u = clamp(u, -0.15, 1.15);
    range.value = Math.round(toyState.u * 100);
    if (byUser) touch();
  }
  function touch() { if (!toyState.touched) { toyState.touched = true; hint && hint.classList.add("gone"); } }
  function moveTo(x, y) {
    const s = toyState; if (!walkable(x, y) || (x === s.to.x && y === s.to.y)) return;
    s.from = { x: s.pos.x, y: s.pos.y }; s.to = { x, y }; s.hop = 0; s.facing = x > s.pos.x ? 1 : x < s.pos.x ? -1 : s.facing;
  }
  function hand(g, x, y, s, press) {
    g.save(); g.translate(x, y); g.rotate(-0.35); g.scale(1 - press * 0.08, 1 - press * 0.08);
    const ink = "#263449", lw = s * 0.05;
    const shape = (fill) => { rrect(g, -s * 0.1, 0, s * 0.2, s * 0.5, s * 0.1, fill); rrect(g, -s * 0.24, s * 0.3, s * 0.5, s * 0.42, s * 0.18, fill); };
    g.lineWidth = lw * 2; g.strokeStyle = ink; g.beginPath(); g.roundRect(-s * 0.1, 0, s * 0.2, s * 0.5, s * 0.1); g.roundRect(-s * 0.24, s * 0.3, s * 0.5, s * 0.42, s * 0.18); g.stroke();
    shape("#fff");
    g.restore();
  }
  function drawToy(t, dt) {
    if (!geo) return;
    const s = toyState, g = toy.getContext("2d"), { W, H, cs, ox, oy, top, corner, sunR, hy, rx, ry, cx } = geo;
    if (!s.touched && !s.drag) setU(-0.06 + 1.12 * (0.5 - 0.5 * Math.cos(t * 0.45)), false);
    const ph = phaseOf(s.u), day = dayOf(s.u), angS = clamp(s.u, 0, 1) * 180;
    if (ph !== "N") s.angV = lerp(s.angV, PHASE_ANG[ph], clamp(dt * 7, 0, 1));
    s.dayV = lerp(s.dayV, ph === "N" ? 0 : 1, clamp(dt * 5, 0, 1));
    // the auto demo: Snowdi thinks along and hops into the next shadow
    if (!s.touched && ph !== s.autoPh) { s.autoPh = ph; s.autoAt = t + 0.7; }
    if (!s.touched && s.autoAt && t > s.autoAt) { s.autoAt = 0; const goal = { R: [2, 1], Z: [1, 2], S: [2, 1] }[ph]; if (goal) moveTo(goal[0], goal[1]); }
    // hop
    if (s.hop < 1) { s.hop = Math.min(1, s.hop + dt / 0.38); const f = easeIO(s.hop); s.pos.x = lerp(s.from.x, s.to.x, f); s.pos.y = lerp(s.from.y, s.to.y, f); if (s.hop >= 1) s.cheer = 1; }
    const cell = { x: s.to.x, y: s.to.y }, safe = s.hop < 1 || shaded(cell.x, cell.y, ph);
    s.melt = safe ? Math.max(0, s.melt - dt * 1.4) : Math.min(1, s.melt + dt * 0.5);
    s.cheer = Math.max(0, s.cheer - dt * 1.2);
    // sky
    const sk = [hex("#18225A", hex(hex("#86C8FF", "#62B8FF", Math.sin(angS * DEG)), "#9C8FE0", clamp((angS - 120) / 60, 0, 1)), day), hex("#3A4C9A", hex(hex("#FFE1BA", "#E1F4FF", Math.sin(angS * DEG)), "#FFC0A0", clamp((angS - 120) / 60, 0, 1)), day)];
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, sk[0]); gr.addColorStop(0.75, sk[1]); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    if (day < 1) for (const st of stars.slice(0, 30)) { g.globalAlpha = (1 - day) * (0.5 + 0.5 * Math.sin(t * 2 + st.ph)); circ(g, st.x * W, st.y * hy, st.r * cs * 0.025, "#fff"); }
    g.globalAlpha = 1;
    if (day < 1) { g.save(); g.globalAlpha = 1 - day; moonIcon(g, cx + rx * 0.55, hy - ry * 0.7, sunR * 0.8, sk[0]); g.restore(); }
    const a = (angS + 180) * DEG, sx = cx + Math.cos(a) * rx, sy = hy + Math.sin(a) * ry + (1 - day) * ry * 0.9;
    if (day > 0) sunIcon(g, sx, sy, sunR, reduce ? 0 : t, hex("#FFA43D", "#FFD23D", Math.sin(angS * DEG)), day, 2.4);
    g.drawImage(islandCv, 0, 0);
    // shadows, like in the game: rounded caps turned away from the sun
    g.save(); g.beginPath(); g.roundRect(top.l, top.t, top.r - top.l, top.b - top.t, corner); g.clip();
    const sh = shadowCv.getContext("2d"); sh.clearRect(0, 0, W, H);
    const noonV = Math.max(0, Math.sin(s.angV * DEG));
    for (let y = 0; y < MH; y++) for (let x = 0; x < MW; x++) { const h = TALL[MAP[y][x]]; if (!h) continue;
      sh.save(); sh.translate(ox + (x + 0.5) * cs, oy + (y + 0.5) * cs); sh.rotate(s.angV * DEG); rrect(sh, 0, -cs * 0.45, lenFor({ noon: noonV }, h) * cs + cs * 0.45, cs * 0.9, cs * 0.3, SHADE); sh.restore(); }
    g.globalAlpha = 0.42 * s.dayV; g.drawImage(shadowCv, 0, 0); g.globalAlpha = 1;
    if (day > 0) { const sa = (s.angV + 180) * DEG, half = (top.r - top.l) / 2, mx = (top.l + top.r) / 2, my = (top.t + top.b) / 2;
      const wg = g.createLinearGradient(mx + Math.cos(sa) * half, my + Math.sin(sa) * half, mx - Math.cos(sa) * half * 0.2, my - Math.sin(sa) * half * 0.2);
      wg.addColorStop(0, `rgba(255,216,107,${0.34 * s.dayV})`); wg.addColorStop(1, `rgba(255,233,166,${0.04 * s.dayV})`); g.fillStyle = wg; g.fillRect(top.l, top.t, top.r - top.l, top.b - top.t); }
    if (!safe && s.hop >= 1) { const pulse = 0.35 + 0.25 * Math.sin(t * 8); rrect(g, ox + cell.x * cs + cs * 0.06, oy + cell.y * cs + cs * 0.06, cs * 0.88, cs * 0.88, cs * 0.2, `rgba(255,138,46,${pulse})`); }
    g.restore();
    // objects and Snowdi, back to front
    const sRow = Math.round(s.pos.y);
    for (let y = 0; y < MH; y++) {
      for (let x = 0; x < MW; x++) { const c = MAP[y][x], qx = ox + x * cs, qy = oy + y * cs;
        if (c === "h") house(g, qx, qy, cs, LOOKS[0], t); else if (c === "t") tree(g, qx, qy, cs, LOOKS[0], t); else if (c === "b") bush(g, qx, qy, cs); else if (c === "O") igloo(g, qx, qy, cs, t); }
      if (y === 3) flake(g, ox + 0.5 * cs, oy + 3.5 * cs + Math.sin(t * 2.2) * cs * 0.05 - cs * 0.1, cs * 0.25, t * 22, 1, 0.5 + 0.5 * Math.sin(t * 3));
      if (y === sRow) {
        const jump = Math.sin(Math.min(1, s.hop) * Math.PI) * cs * 0.35 + (s.cheer > 0 ? Math.abs(Math.sin(t * 9)) * cs * 0.08 * s.cheer : 0);
        snowman(g, ox + (s.pos.x + 0.5) * cs, oy + (s.pos.y + 0.86) * cs - jump, cs * 0.98, { t, facing: s.facing, melt: s.melt > 0.05 ? s.melt * 0.95 : 0, sweat: safe ? 0 : 1, mood: safe ? "happy" : "worried", cheer: s.cheer });
      }
    }
    if (!s.touched && !reduce) { const press = 0.5 + 0.5 * Math.sin(t * 3); hand(g, sx + sunR * 0.45, sy + sunR * 0.55, cs * 0.9, press); }
    // status line
    const key = ph === "N" ? "night" : MAP[cell.y][cell.x] === "O" ? "igloo" : safe ? "safe" : s.melt >= 1 ? "melted" : "hot";
    const label = ph + key;
    if (label !== s.status) { s.status = label; status.innerHTML = `<b>${T.phases[ph]}</b> · <span class="${key === "hot" || key === "melted" ? "hot" : "ok"}">${T[key]}</span>`; }
  }
  if (toy) {
    io.observe(toy);
    const local = (e) => { const r = toy.getBoundingClientRect(), d = toy.width / r.width; return [(e.clientX - r.left) * d, (e.clientY - r.top) * d]; };
    toy.addEventListener("pointerdown", (e) => {
      if (!geo) return; const [x, y] = local(e), { ox, oy, cs, top, cx, rx } = geo;
      const gx = Math.floor((x - ox) / cs), gy = Math.floor((y - oy) / cs);
      if (y > top.t && gx >= 0 && gy >= 0 && gx < MW && gy < MH) { touch(); moveTo(gx, gy); return; }
      toyState.drag = true; toy.setPointerCapture(e.pointerId); touch(); setU((x - (cx - rx)) / (2 * rx), true);
    });
    toy.addEventListener("pointermove", (e) => { if (!toyState.drag) return; const [x] = local(e); setU((x - (geo.cx - geo.rx)) / (2 * geo.rx), true); });
    const end = () => { toyState.drag = false; }; toy.addEventListener("pointerup", end); toy.addEventListener("pointercancel", end);
    range.addEventListener("input", () => { touch(); toyState.u = range.value / 100; });
    toy.addEventListener("keydown", (e) => { const d = { ArrowLeft: [-1, 0], ArrowRight: [1, 0], ArrowUp: [0, -1], ArrowDown: [0, 1] }[e.key]; if (d) { e.preventDefault(); touch(); moveTo(toyState.to.x + d[0], toyState.to.y + d[1]); } });
  }

  // ------------------------------------------------------------- world cards: each mechanic as a little loop
  const WORLD_ANIM = {
    crate: { look: 1, draw(g, c, p, t) { const f = easeIO(clamp((p - 0.15) / 0.35, 0, 1)); crate(g, c.x(1 + f), c.y, c.s); c.snow(0.02 + f, { mood: "happy" }); } },
    ice: { look: 2, ice: [1, 2, 3], draw(g, c, p, t) { const f = easeOut(clamp((p - 0.15) / 0.4, 0, 1)); if (f > 0 && f < 1) for (let k = 1; k < 4; k++) circ(g, c.x(f * 3 - k * 0.18) + c.s / 2, c.y + c.s * 0.8, c.s * 0.04 * (4 - k), "rgba(255,255,255,.7)"); c.snow(f * 3, { mood: "happy", squash: f > 0 && f < 1 ? -0.06 : 0 }); } },
    portal: { look: 6, draw(g, c, p, t) { portal(g, c.x(1), c.y, c.s, t, 0); portal(g, c.x(3), c.y, c.s, t, 0);
      if (p < 0.3) c.snow(easeIO(clamp(p / 0.3, 0, 1)), {}); else if (p < 0.42) c.snow(1, { scale: 1 - (p - 0.3) / 0.12 }); else if (p < 0.55) c.snow(3, { scale: (p - 0.42) / 0.13 }); else c.snow(3, { mood: "happy" }); } },
    wind: { look: 7, wind: [1, 2], draw(g, c, p, t) { const f = clamp((p - 0.15) / 0.35, 0, 1); c.snow(easeIO(f) * 3, { squash: f > 0 && f < 1 ? 0.08 : 0, mood: f >= 1 ? "happy" : "shocked" }); } },
    gate: { look: 8, draw(g, c, p, t) { const open = easeIO(clamp((p - 0.3) / 0.15, 0, 1)), walk = p < 0.3 ? easeIO(p / 0.3) : 1 + easeIO(clamp((p - 0.5) / 0.3, 0, 1)) * 2;
      switchTile(g, c.x(1), c.y, c.s, open, t); c.snow(walk, { mood: open ? "happy" : "normal" }); gate(g, c.x(3), c.y, c.s, open, LOOKS[8]); } },
    pino: { look: 9, draw(g, c, p, t) { const f = easeIO(clamp((p - 0.08) / 0.75, 0, 1)) * 2.6 + 0.4, hop = Math.abs(Math.sin(t * 7)) * c.s * 0.06;
      penguin(g, c.x(f - 0.95) + c.s / 2, c.y + c.s * 0.88 - hop, c.s * 0.9, { t, facing: 1, mood: "happy" }); c.snow(f, { mood: "happy", lift: hop }); } },
  };
  const worldCvs = [...document.querySelectorAll("canvas[data-anim]")];
  worldCvs.forEach((cv) => io.observe(cv));
  function drawWorld(cv, t) {
    fit(cv); const a = WORLD_ANIM[cv.dataset.anim], g = cv.getContext("2d"), W = cv.width, H = cv.height, look = LOOKS[a.look];
    const s = Math.min(W / 4.5, H / 1.75), ox = (W - 4 * s) / 2, oy = (H - s * 1.45) / 2 + s * 0.1, pad = s * 0.14;
    const top = { l: ox - pad, t: oy - pad, r: ox + 4 * s + pad, b: oy + s + pad };
    const gr = g.createLinearGradient(0, 0, 0, H); gr.addColorStop(0, look.skyTop); gr.addColorStop(1, look.skyBottom); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    islandBase(g, top, look, s * 0.4, s * 0.32, 7);
    g.save(); g.beginPath(); g.roundRect(top.l, top.t, top.r - top.l, top.b - top.t, s * 0.32); g.clip();
    for (let x = -1; x <= 4; x++) { const px = ox + x * s; if (a.ice && a.ice.includes(x)) iceTile(g, px, oy, s, x * 7); else groundTile(g, px, oy, s, look, x, 0, x * 31 + 3); if (a.wind && a.wind.includes(x)) windTile(g, px, oy, s, t, 1, 0, x); }
    groundTile(g, ox - s, oy - s, s, look, 0, 1, 1); g.restore();
    const P = 3.4, p = reduce ? 0.7 : (t % P) / P, alpha = p > 0.9 ? (1 - p) / 0.1 : p < 0.05 ? p / 0.05 : 1;
    const c = { s, y: oy, x: (i) => ox + i * s, snow: (i, o = {}) => { const sc = o.scale == null ? 1 : clamp(o.scale, 0, 1); if (sc < 0.03) return; g.save(); g.globalAlpha = alpha;
      snowman(g, ox + (i + 0.5) * s, oy + s * 0.88 - (o.lift || 0), s * 0.95 * sc, { t, facing: 1, mood: o.mood || "normal", squash: o.squash || 0 }); g.restore(); } };
    a.draw(g, c, p, t);
  }

  // ------------------------------------------------------------- Snowdi in the corner
  const mascot = $("mascot"), mcv = mascot && mascot.querySelector("canvas"), bubble = $("bubble");
  const M = { facing: -1, cheer: 0, jump: 0, clicks: 0, line: 0, bubbleUntil: 0 };
  function say(text, ms = 4200) { if (!bubble) return; bubble.textContent = text; bubble.classList.add("show"); M.bubbleUntil = performance.now() + ms; }
  function drawMascot(t, dt) {
    if (!mcv) return; fit(mcv, 2.5);
    const g = mcv.getContext("2d"), W = mcv.width, H = mcv.height, sk = sunAt(scrollP), hot = sk.day > 0.6 && sk.noon > 0.8;
    M.cheer = Math.max(0, M.cheer - dt * 0.9); M.jump = Math.max(0, M.jump - dt * 2.4);
    g.clearRect(0, 0, W, H);
    const lift = Math.sin(M.jump * Math.PI) * H * 0.12;
    snowman(g, W / 2, H * 0.97 - lift, H * 0.8, { t: reduce ? 0 : t, facing: M.facing, cheer: M.cheer, sweat: hot ? 1 : 0, mood: M.cheer > 0 ? "happy" : hot ? "worried" : sk.day < 0.3 ? "happy" : "normal" });
    if (bubble && M.bubbleUntil && performance.now() > M.bubbleUntil) { bubble.classList.remove("show"); M.bubbleUntil = 0; }
  }
  if (mascot) {
    addEventListener("pointermove", (e) => { const r = mascot.getBoundingClientRect(); M.facing = e.clientX < r.left + r.width / 2 ? -1 : 1; }, { passive: true });
    mascot.addEventListener("click", () => {
      M.cheer = 1; M.jump = 1; M.clicks++;
      if (M.clicks >= 5) { M.clicks = 0; snowfall(); say(T.snowNow); return; }
      const sk = sunAt(scrollP);
      say(M.clicks === 4 ? T.oneMore : sk.day < 0.3 ? T.lines.night : sk.noon > 0.8 ? T.lines.hot : T.lines.list[M.line++ % T.lines.list.length]);
    });
    // on phones the greeting would cover the page; there Snowdi only talks when tapped
    if (matchMedia("(min-width: 901px)").matches) setTimeout(() => say(T.lines.hello, 5200), 3200);
  }

  // ------------------------------------------------------------- snowfall (click Snowdi five times, or type "snow")
  let snow = null;
  function snowfall() {
    if (reduce) return;
    if (!snow) { const cv = document.createElement("canvas"); cv.id = "snow"; document.body.appendChild(cv); snow = { cv, flakes: [], until: 0 }; }
    snow.until = performance.now() + 9000;
    snow.flakes = Array.from({ length: 150 }, (_, i) => ({ x: Math.random(), y: -Math.random() * 1.2, r: 4 + Math.random() * 10, v: 0.05 + Math.random() * 0.09, w: Math.random() * 6, rot: Math.random() * 360 }));
  }
  function drawSnow(t, dt) {
    if (!snow || !snow.flakes.length) return;
    const cv = snow.cv; if (cv.width !== innerWidth || cv.height !== innerHeight) { cv.width = innerWidth; cv.height = innerHeight; }
    const g = cv.getContext("2d"), W = cv.width, H = cv.height, left = snow.until - performance.now(), a = clamp(left / 1500, 0, 1);
    g.clearRect(0, 0, W, H);
    if (left <= 0) { snow.flakes = []; return; }
    for (const f of snow.flakes) { f.y += f.v * dt; if (f.y > 1.05) { f.y = -0.05; f.x = Math.random(); } flake(g, (f.x + Math.sin(t + f.w) * 0.015) * W, f.y * H, f.r, f.rot + t * 40, a); }
  }
  let typed = "";
  addEventListener("keydown", (e) => { if (e.key.length !== 1) return; typed = (typed + e.key.toLowerCase()).slice(-8); if (typed.endsWith("schnee") || typed.endsWith("snow")) { typed = ""; snowfall(); } });

  // ------------------------------------------------------------- counters, reveal, gallery, menu, demo
  const counters = new IntersectionObserver((es) => es.forEach((e) => {
    if (!e.isIntersecting) return; counters.unobserve(e.target);
    const el = e.target, n = +el.dataset.count, t0 = performance.now();
    if (reduce) { el.textContent = n; return; }
    const step = (now) => { const f = clamp((now - t0) / 1300, 0, 1); el.textContent = Math.round(easeOut(f) * n); if (f < 1) requestAnimationFrame(step); };
    requestAnimationFrame(step);
  }), { threshold: 0.6 });
  document.querySelectorAll("[data-count]").forEach((el) => { el.textContent = "0"; counters.observe(el); });
  const reveal = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add("in"); reveal.unobserve(e.target); } }), { threshold: 0.12 });
  document.querySelectorAll(".reveal").forEach((el) => reveal.observe(el));

  const shots = document.querySelector(".shots");
  if (shots) {
    let dragX = null, start = 0, moved = 0;
    shots.addEventListener("pointerdown", (e) => { if (e.pointerType !== "mouse") return; dragX = e.clientX; start = shots.scrollLeft; moved = 0; shots.classList.add("drag"); shots.setPointerCapture(e.pointerId); });
    shots.addEventListener("pointermove", (e) => { if (dragX == null) return; moved = e.clientX - dragX; shots.scrollLeft = start - moved; });
    const stop = () => { dragX = null; shots.classList.remove("drag"); };
    shots.addEventListener("pointerup", stop); shots.addEventListener("pointercancel", stop);
    const tilt = () => { const r = shots.getBoundingClientRect(), mid = r.left + r.width / 2;
      for (const f of shots.children) { const fr = f.getBoundingClientRect(), off = clamp((fr.left + fr.width / 2 - mid) / (r.width / 2), -1.2, 1.2);
        f.style.transform = reduce ? "" : `rotateY(${-off * 22}deg) scale(${1 - Math.abs(off) * 0.1}) translateY(${Math.abs(off) * 14}px)`; } };
    shots.addEventListener("scroll", () => requestAnimationFrame(tilt), { passive: true }); addEventListener("resize", tilt); tilt();
  }
  document.querySelectorAll(".mobile-menu nav a").forEach((a) => a.addEventListener("click", () => a.closest("details").removeAttribute("open")));

  const phone = document.querySelector(".demo-phone"), dlg = $("demoDlg");
  function startDemo() {
    if (!phone) return;
    const src = phone.dataset.src;
    if (matchMedia("(min-width: 901px)").matches) {
      if (!phone.querySelector("iframe")) { phone.innerHTML = `<iframe src="${src}" title="${T.demoTitle}" allow="fullscreen"></iframe>`; }
      phone.querySelector("iframe").focus();
    } else {
      dlg.querySelector(".frame").innerHTML = `<iframe src="${src}" title="${T.demoTitle}"></iframe>`;
      dlg.showModal(); mascot && (mascot.hidden = true);
    }
  }
  document.querySelectorAll("[data-demo]").forEach((b) => b.addEventListener("click", (e) => {
    if (b.tagName === "A") { e.preventDefault(); $("probe").scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "center" }); }
    startDemo();
  }));
  if (dlg) {
    dlg.querySelector(".demo-close").addEventListener("click", () => dlg.close());
    dlg.addEventListener("close", () => { dlg.querySelector(".frame").innerHTML = ""; mascot && (mascot.hidden = false); });
  }
  addEventListener("message", (e) => { if (e.origin === location.origin && e.data === "snowdial-demo-close" && dlg && dlg.open) dlg.close(); });

  // ------------------------------------------------------------- one loop for everything that moves
  let last = performance.now(), lastSky = 0;
  function frame(now) {
    const t = now / 1000, dt = Math.min(0.05, (now - last) / 1000); last = now;
    if (now - lastSky > (reduce ? 400 : 33)) { lastSky = now; drawSky(reduce ? 0 : t); }
    if (toy && visible.has(toy)) drawToy(t, dt);
    for (const cv of worldCvs) if (visible.has(cv)) drawWorld(cv, t);
    drawMascot(t, dt); drawSnow(t, dt);
    requestAnimationFrame(frame);
  }
  addEventListener("scroll", readScroll, { passive: true });
  addEventListener("resize", () => { readScroll(); toyLayout(); });
  readScroll(); toyLayout();
  document.fonts && document.fonts.ready.then(() => { readScroll(); });
  requestAnimationFrame(frame);
})();
