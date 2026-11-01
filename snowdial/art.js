"use strict";
// generated from web/snowdial-game.js by website-upload/build_site.py
const PHASES = {
  R: { dx: 1, dy: 0, name: "Morgen", color: "#FFA24D", ang: 0 },
  Z: { dx: 0, dy: 1, name: "Mittag", color: "#FFD447", ang: 90, noon: true },
  S: { dx: -1, dy: 0, name: "Abend", color: "#FF7A90", ang: 180 },
  N: { dx: 0, dy: 0, name: "Nacht", color: "#3E4C8F", night: true },
};
const shadowLen = (ph, h) => (PHASES[ph].night ? 0 : PHASES[ph].noon ? (h + 1) >> 1 : h);
const TER = {
  ".": { h: 0, walk: true, crate: true }, b: { h: 1 }, r: { h: 1 }, t: { h: 2 }, h: { h: 3 },
  "~": { h: 0 }, i: { h: 0, walk: true, crate: true, ice: true }, p: { h: 0, walk: true, always: true },
  g: { h: 0, grill: true }, O: { h: 0, walk: true, always: true, igloo: true },
  _: { h: 0, walk: true, sw: true }, "#": { h: 2, gate: true }, "@": { h: 0, walk: true, portal: true },
  "^": { h: 0, walk: true, crate: true, wind: [0, -1] }, v: { h: 0, walk: true, crate: true, wind: [0, 1] },
  "<": { h: 0, walk: true, crate: true, wind: [-1, 0] }, ">": { h: 0, walk: true, crate: true, wind: [1, 0] },
};
const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };
const gcd = (a, b) => (b ? gcd(b, a % b) : a);
const mod = (a, n) => ((a % n) + n) % n;

function parseLevel(line) {
  const f = {};
  for (const part of line.split(";")) { const i = part.indexOf("="); if (i > 0) f[part.slice(0, i)] = part.slice(i + 1); }
  const w = +f.w, h = +f.h;
  const cell = (s) => { const [x, y] = s.split(",").map(Number); return y * w + x; };
  const list = (k) => (f[k] ? f[k].split(" ").filter(Boolean).map(cell) : []);
  const sched = [];
  for (let i = 0; i < f.sun.length; i += 2) sched.push({ ph: f.sun[i], moves: +f.sun[i + 1] });
  return {
    w, h, terr: f.map.split("/").join("").split(""), sched, start: cell(f.start),
    flakes: list("flakes"), crates: list("crates"), portals: list("portals"),
    buddy: f.buddy ? cell(f.buddy) : -1, gatesOpen: f.gates === "open",
    clouds: f.clouds ? f.clouds.split(" ").map((c) => { const p = c.split(",").map(Number); return { x: p[0], y: p[1], w: p[2], h: p[3], dx: p[4], dy: p[5] }; }) : [],
    par: +(f.par || 0), rating: +(f.rating || 0),
  };
}


// ================================================================ looks (port of ui/Theme.kt)
const F0 = ["#2B6E31", "#3B9043", "#52AE52", "#7CCB66"];
const LOOKS = [
  { name: "Garten", skyTop: "#8ED2FF", skyBottom: "#FFF4D9", hillFar: "#A9D98A", hillNear: "#86C463", gA: "#ADDA6C", gB: "#A3D163", lip: "#79AE47", soil: "#9A6A40", soilDark: "#6F4A2C", deco: "flowers", pine: false, roof: "#E0554F", fol: F0 },
  { name: "Hinterhof", skyTop: "#FFC98F", skyBottom: "#FFF0DA", hillFar: "#E7C792", hillNear: "#D3AE74", gA: "#E8D1A6", gB: "#E1C899", lip: "#B79566", soil: "#8E6A45", soilDark: "#654A31", deco: "paving", pine: false, roof: "#4F7FC4", fol: F0 },
  { name: "Eissee", skyTop: "#B9E2FF", skyBottom: "#F3FAFF", hillFar: "#E4EFF8", hillNear: "#D2E4F2", gA: "#F1F7FC", gB: "#E7F1F8", lip: "#C9DFEE", soil: "#8FB2CD", soilDark: "#66879F", deco: "snow", pine: true, roof: "#6A8FB3", fol: F0 },
  { name: "Wolkenwiese", skyTop: "#C9B8FF", skyBottom: "#FFE6F2", hillFar: "#B7E09B", hillNear: "#98CF7C", gA: "#BDE6A3", gB: "#B2DD97", lip: "#86BC66", soil: "#9A6A40", soilDark: "#6F4A2C", deco: "daisies", pine: false, roof: "#E0554F", fol: F0 },
  { name: "Grillfest", skyTop: "#FF9F6B", skyBottom: "#FFE3B8", hillFar: "#9CC86A", hillNear: "#7FB353", gA: "#A2D472", gB: "#99CB69", lip: "#6E9F45", soil: "#8F6038", soilDark: "#66432A", deco: "lawn", pine: false, roof: "#E0554F", fol: F0 },
  { name: "Gipfel", skyTop: "#6FB0EE", skyBottom: "#DDEEFF", hillFar: "#B8C6D8", hillNear: "#9FAFC4", gA: "#D3CCC0", gB: "#C9C2B6", lip: "#A59E92", soil: "#857E73", soilDark: "#615B52", deco: "gravel", pine: true, roof: "#7A5544", mountains: true, fol: F0 },
  { name: "Zauberwald", skyTop: "#5FC7C0", skyBottom: "#E6FFF4", hillFar: "#5E9E73", hillNear: "#468A5E", gA: "#8CC46E", gB: "#84BC66", lip: "#5E9446", soil: "#7D5A3C", soilDark: "#573C27", deco: "moss", pine: false, roof: "#8E5BD6", fol: ["#1F5A4A", "#2E7D63", "#3F9C78", "#7FD6A8"] },
  { name: "Windküste", skyTop: "#7FD3FF", skyBottom: "#FFF6E0", hillFar: "#59B8E0", hillNear: "#3DA5D6", gA: "#F4DFAE", gB: "#EFD8A2", lip: "#D9BD80", soil: "#B48A55", soilDark: "#8A6539", deco: "sand", pine: false, roof: "#2FA3A0", sea: true, fol: F0 },
  { name: "Burggarten", skyTop: "#B5A8FF", skyBottom: "#FFF1E6", hillFar: "#9DCB86", hillNear: "#7DB56B", gA: "#D7D2C8", gB: "#CDC7BC", lip: "#7FAE5E", soil: "#8B7B6B", soilDark: "#62564A", deco: "cobble", pine: false, roof: "#7A3E9D", fol: F0 },
  { name: "Pinguinbucht", skyTop: "#6CC2F0", skyBottom: "#EAF8FF", hillFar: "#8CCFEA", hillNear: "#6BBBE0", gA: "#EFF7FC", gB: "#E3F0F8", lip: "#BFDCEC", soil: "#7FA8C4", soilDark: "#557C98", deco: "snow", pine: true, roof: "#E0554F", sea: true, fol: F0 },
  { name: "Leuchtturm", skyTop: "#FF9E8A", skyBottom: "#FFEBD1", hillFar: "#4FA7D8", hillNear: "#3B93C8", gA: "#9FD276", gB: "#95C96B", lip: "#6E9F4A", soil: "#9C8A78", soilDark: "#716254", deco: "flowers", pine: false, roof: "#D9433F", sea: true, fol: F0 },
  { name: "Polarlicht", skyTop: "#2B3A80", skyBottom: "#FFD9E8", hillFar: "#8C9CC9", hillNear: "#7586B8", gA: "#EAF2FF", gB: "#DEE9FA", lip: "#B7C8E6", soil: "#7B88AE", soilDark: "#55607F", deco: "crystal", pine: true, roof: "#5B6FD6", mountains: true, aurora: true, fol: F0 },
];
const SHADE = "#1B3A63";

// ================================================================ drawing helpers
const TAU = Math.PI * 2, DEG = Math.PI / 180;
function hexRgb(h) { const n = parseInt(h.slice(1), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
function mix(h, to, f) { const a = hexRgb(h), b = to === "w" ? [255, 255, 255] : [0, 0, 0]; return "#" + a.map((v, i) => Math.round(v + (b[i] - v) * f).toString(16).padStart(2, "0")).join(""); }
const dark = (h, f) => mix(h, "k", f), light = (h, f) => mix(h, "w", f);
function rgba(h, a) { const c = hexRgb(h); return `rgba(${c[0]},${c[1]},${c[2]},${a})`; }
function hash01(a, b = 0) { let h = Math.imul(a, 374761393) + Math.imul(b, 668265263); h = Math.imul(h ^ (h >>> 13), 1274126177); h = h ^ (h >>> 16); return (h & 0xffff) / 65535; }
function circ(g, x, y, r, fill) { g.beginPath(); g.arc(x, y, Math.max(0, r), 0, TAU); g.fillStyle = fill; g.fill(); }
function oval(g, cx, cy, rx, ry, fill) { g.beginPath(); g.ellipse(cx, cy, Math.max(0, rx), Math.max(0, ry), 0, 0, TAU); g.fillStyle = fill; g.fill(); }
function rrect(g, x, y, w, h, r, fill) { g.beginPath(); g.roundRect(x, y, Math.max(0, w), Math.max(0, h), Math.max(0, Math.min(r, Math.abs(w) / 2, Math.abs(h) / 2))); g.fillStyle = fill; g.fill(); }
function line(g, x1, y1, x2, y2, w, col, cap = "round") { g.beginPath(); g.moveTo(x1, y1); g.lineTo(x2, y2); g.lineWidth = w; g.strokeStyle = col; g.lineCap = cap; g.stroke(); }
function poly(g, pts, fill) { g.beginPath(); g.moveTo(pts[0], pts[1]); for (let i = 2; i < pts.length; i += 2) g.lineTo(pts[i], pts[i + 1]); g.closePath(); g.fillStyle = fill; g.fill(); }
function ao(g, cx, by, w, s, a = 0.22) {
  const cy = by - s * 0.02, gr = g.createRadialGradient(0, 0, 0, 0, 0, 1);
  gr.addColorStop(0, `rgba(0,0,0,${a})`); gr.addColorStop(0.5, `rgba(0,0,0,${a * 0.5})`); gr.addColorStop(1, "rgba(0,0,0,0)");
  g.save(); g.translate(cx, cy); g.scale(w / 2, s * 0.1); circ(g, 0, 0, 1, gr); g.restore();
}

function bush(g, x, y, s) {
  const cx = x + s / 2, by = y + s - s * 0.08; ao(g, cx, by, s * 0.92, s); const cy = by - s * 0.3;
  const parts = [[-0.22, 0.04, 0.22], [0.22, 0.04, 0.22], [0, -0.08, 0.27], [0, 0.08, 0.24]];
  for (const [dx, dy, r] of parts) circ(g, cx + dx * s, cy + dy * s, s * (r + 0.025), "#2F7A34");
  for (const [dx, dy, r] of parts) circ(g, cx + dx * s, cy + dy * s, s * r, "#45A047");
  circ(g, cx - s * 0.07, cy - s * 0.13, s * 0.15, "#66BE5C"); circ(g, cx - s * 0.24, cy - s * 0.01, s * 0.1, "#66BE5C"); circ(g, cx - s * 0.11, cy - s * 0.18, s * 0.06, "#8ED97A");
  const pet = ["#FF7FA8", "#FFE066", "#fff"];
  for (let k = 0; k < 3; k++) { const fx = cx + s * (-0.16 + k * 0.17), fy = cy + s * (k === 1 ? -0.02 : 0.08); circ(g, fx, fy, s * 0.045, pet[k]); circ(g, fx, fy, s * 0.018, "#FFB13D"); }
}
function tree(g, x, y, s, look, t) {
  const cx = x + s / 2, by = y + s - s * 0.06; ao(g, cx, by, s * 0.7, s);
  const tw = s * 0.15; rrect(g, cx - tw / 2, by - s * 0.44, tw, s * 0.42, s * 0.05, "#8A5A33"); rrect(g, cx + tw * 0.08, by - s * 0.44, tw * 0.42, s * 0.42, s * 0.05, "#6B4226");
  if (look.pine) {
    for (let k = 0; k < 3; k++) {
      const top = by - s * (1.24 - k * 0.23), half = s * (0.21 + k * 0.085), h = s * 0.44;
      poly(g, [cx, top - s * 0.03, cx + half + s * 0.03, top + h + s * 0.02, cx - half - s * 0.03, top + h + s * 0.02], "#1F5E3B");
      poly(g, [cx, top, cx + half, top + h, cx - half, top + h], "#2F8050");
      poly(g, [cx, top, cx + half, top + h, cx + half * 0.2, top + h], "#256B43");
      g.beginPath(); g.moveTo(cx, top); g.lineTo(cx + half * 0.5, top + h * 0.42);
      g.bezierCurveTo(cx + half * 0.25, top + h * 0.5, cx + half * 0.1, top + h * 0.36, cx - half * 0.05, top + h * 0.46);
      g.bezierCurveTo(cx - half * 0.2, top + h * 0.56, cx - half * 0.35, top + h * 0.4, cx - half * 0.5, top + h * 0.42); g.closePath(); g.fillStyle = "#fff"; g.fill();
    }
    return;
  }
  const sway = Math.sin(t * 1.4 + x * 0.013) * s * 0.012, cy = by - s * 0.8;
  const parts = [[-0.19, 0.08, 0.27], [0.19, 0.08, 0.27], [0, -0.13, 0.31], [0, 0.12, 0.27]];
  const [f0, f1, f2, f3] = look.fol || F0;
  for (const [dx, dy, r] of parts) circ(g, cx + dx * s + sway, cy + dy * s, s * (r + 0.03), f0);
  for (const [dx, dy, r] of parts) circ(g, cx + dx * s + sway, cy + dy * s, s * r, f1);
  circ(g, cx - s * 0.07 + sway, cy - s * 0.15, s * 0.21, f2); circ(g, cx - s * 0.22 + sway, cy + s * 0.04, s * 0.13, f2);
  circ(g, cx - s * 0.13 + sway, cy - s * 0.24, s * 0.09, f3); circ(g, cx - s * 0.27 + sway, cy - s * 0.02, s * 0.05, f3);
  if (look.deco === "moss") for (const [dx, dy] of [[0.16, 0.06], [-0.12, 0.14], [0.02, -0.26]]) circ(g, cx + dx * s + sway, cy + dy * s, s * 0.03, `rgba(232,216,255,${0.5 + 0.5 * Math.sin(t * 2.5 + dx * 10)})`);
  else if (look.deco !== "paving" && look.deco !== "cobble" && look.deco !== "sand") for (const [dx, dy] of [[0.14, 0.1], [-0.16, -0.02], [0.05, -0.2]]) { circ(g, cx + dx * s + sway, cy + dy * s, s * 0.05, "#E23E3E"); circ(g, cx + dx * s + sway - s * 0.015, cy + dy * s - s * 0.018, s * 0.016, "rgba(255,255,255,0.7)"); }
}
function rock(g, x, y, s, snowy) {
  const by = y + s - s * 0.08; ao(g, x + s / 2, by, s * 0.9, s);
  const body = [x + s * 0.1, by - s * 0.04, x + s * 0.14, by - s * 0.38, x + s * 0.38, by - s * 0.62, x + s * 0.7, by - s * 0.56, x + s * 0.9, by - s * 0.26, x + s * 0.88, by - s * 0.03];
  poly(g, body, "#8C939C");
  poly(g, [x + s * 0.56, by - s * 0.34, x + s * 0.7, by - s * 0.56, x + s * 0.9, by - s * 0.26, x + s * 0.88, by - s * 0.03, x + s * 0.5, by - s * 0.04], "#6E757E");
  poly(g, [x + s * 0.14, by - s * 0.38, x + s * 0.38, by - s * 0.62, x + s * 0.7, by - s * 0.56, x + s * 0.56, by - s * 0.34], snowy ? "#fff" : "#B4BAC2");
  g.beginPath(); g.moveTo(body[0], body[1]); for (let i = 2; i < body.length; i += 2) g.lineTo(body[i], body[i + 1]); g.closePath(); g.lineWidth = s * 0.022; g.strokeStyle = "#4F555D"; g.lineJoin = "round"; g.stroke();
}
function house(g, x, y, s, look, t) {
  const cx = x + s / 2, by = y + s - s * 0.06; ao(g, cx, by, s * 1.02, s);
  const wall = look.deco === "gravel" ? "#C2B9AA" : "#FBEBCB", wt = by - s * 0.6;
  g.fillStyle = wall; g.fillRect(cx - s * 0.38, wt, s * 0.76, s * 0.6); g.fillStyle = dark(wall, 0.12); g.fillRect(cx + s * 0.18, wt, s * 0.2, s * 0.6);
  g.fillStyle = "#B0574A"; g.fillRect(cx + s * 0.16, by - s * 1.12, s * 0.12, s * 0.3); g.fillStyle = "#8E4136"; g.fillRect(cx + s * 0.14, by - s * 1.15, s * 0.16, s * 0.05);
  for (let k = 0; k < 3; k++) { const ph = (t * 0.35 + k / 3) % 1; circ(g, cx + s * 0.22 + Math.sin(ph * 5 + k) * s * 0.06, by - s * (1.2 + ph * 0.5), s * (0.05 + 0.07 * ph), `rgba(231,235,240,${0.6 * (1 - ph)})`); }
  poly(g, [cx - s * 0.5, wt + s * 0.06, cx, by - s * 1.22, cx, wt + s * 0.06], look.roof);
  poly(g, [cx, by - s * 1.22, cx + s * 0.5, wt + s * 0.06, cx, wt + s * 0.06], dark(look.roof, 0.15));
  for (let k = 1; k <= 3; k++) { const f = k / 4, yy = by - s * 1.22 + (wt + s * 0.06 - (by - s * 1.22)) * f; line(g, cx - s * 0.5 * f, yy, cx + s * 0.5 * f, yy, s * 0.018, dark(look.roof, 0.28), "butt"); }
  if (look.pine) poly(g, [cx, by - s * 1.24, cx + s * 0.22, by - s * 0.98, cx, by - s * 0.95, cx - s * 0.22, by - s * 0.98], "#fff");
  rrect(g, cx - s * 0.1, by - s * 0.36, s * 0.2, s * 0.36, s * 0.08, "#8A5A33"); circ(g, cx + s * 0.05, by - s * 0.17, s * 0.017, "#FFC53D");
  for (const wx of [cx - s * 0.3, cx + s * 0.16]) {
    rrect(g, wx - s * 0.01, by - s * 0.5, s * 0.16, s * 0.15, s * 0.02, "#6B4A33"); g.fillStyle = "#9FD8FF"; g.fillRect(wx, by - s * 0.49, s * 0.14, s * 0.13);
    line(g, wx + s * 0.02, by - s * 0.4, wx + s * 0.07, by - s * 0.47, s * 0.016, "rgba(255,255,255,0.8)");
    rrect(g, wx - s * 0.015, by - s * 0.36, s * 0.17, s * 0.04, s * 0.02, "#5DA347"); circ(g, wx + s * 0.03, by - s * 0.37, s * 0.022, "#FF7FA8"); circ(g, wx + s * 0.11, by - s * 0.37, s * 0.022, "#FFE066");
  }
}
function crate(g, x, y, s) {
  const by = y + s - s * 0.08; ao(g, x + s / 2, by, s * 0.95, s);
  const l = x + s * 0.1, w = s * 0.66, h = s * 0.56, d = s * 0.14, ft = by - h;
  const top = [l, ft, l + d, ft - d * 0.9, l + w + d, ft - d * 0.9, l + w, ft], side = [l + w, ft, l + w + d, ft - d * 0.9, l + w + d, by - d * 0.9, l + w, by];
  poly(g, top, "#E9B575"); poly(g, side, "#A9692F"); g.fillStyle = "#D08F4A"; g.fillRect(l, ft, w, h);
  for (let k = 1; k <= 2; k++) line(g, l, ft + (h * k) / 3, l + w, ft + (h * k) / 3, s * 0.014, "#B8773A", "butt");
  g.lineWidth = s * 0.05; g.strokeStyle = "#7A4A1E"; g.strokeRect(l, ft, w, h);
  line(g, l + s * 0.03, ft + s * 0.03, l + w - s * 0.03, by - s * 0.03, s * 0.05, "#7A4A1E");
  for (const p of [top, side]) { g.beginPath(); g.moveTo(p[0], p[1]); for (let i = 2; i < p.length; i += 2) g.lineTo(p[i], p[i + 1]); g.closePath(); g.lineWidth = s * 0.03; g.lineJoin = "round"; g.strokeStyle = "#7A4A1E"; g.stroke(); }
  for (const [nx, ny] of [[l + s * 0.05, ft + s * 0.05], [l + w - s * 0.05, ft + s * 0.05], [l + s * 0.05, by - s * 0.05], [l + w - s * 0.05, by - s * 0.05]]) circ(g, nx, ny, s * 0.022, "#C9CED6");
}
function igloo(g, x, y, s, t) {
  const cx = x + s / 2, by = y + s - s * 0.06; ao(g, cx, by, s, s, 0.18);
  const gr = g.createRadialGradient(cx - s * 0.15, by - s * 0.6, 0, cx - s * 0.15, by - s * 0.6, s * 0.7); gr.addColorStop(0, "#fff"); gr.addColorStop(0.6, "#E3F0FA"); gr.addColorStop(1, "#BCD6EC");
  g.beginPath(); g.ellipse(cx, by - s * 0.32, s * 0.46, s * 0.46, 0, Math.PI, 0); g.lineTo(cx + s * 0.46, by - s * 0.02); g.lineTo(cx - s * 0.46, by - s * 0.02); g.closePath(); g.fillStyle = gr; g.fill();
  g.lineWidth = s * 0.02; g.strokeStyle = "#A8C9E4"; g.stroke();
  [[by - s * 0.16, 0.46], [by - s * 0.36, 0.43], [by - s * 0.55, 0.3]].forEach(([yy, half], k) => { line(g, cx - s * half, yy, cx + s * half, yy, s * 0.02, "#A8C9E4", "butt"); const n = 4 - k; for (let j = 0; j < n; j++) { const xx = cx - s * half + (2 * s * half * (j + 0.5 + (k % 2) * 0.5)) / (n + 0.5); line(g, xx, yy, xx, yy - s * 0.18, s * 0.02, "#A8C9E4", "butt"); } });
  g.beginPath(); g.ellipse(cx, by - s * 0.16, s * 0.22, s * 0.3, 0, Math.PI, 0); g.lineTo(cx + s * 0.22, by - s * 0.02); g.lineTo(cx - s * 0.22, by - s * 0.02); g.closePath(); g.fillStyle = "#F4F9FD"; g.fill(); g.lineWidth = s * 0.02; g.strokeStyle = "#A8C9E4"; g.stroke();
  g.beginPath(); g.ellipse(cx, by - s * 0.1, s * 0.13, s * 0.2, 0, Math.PI, 0); g.lineTo(cx + s * 0.13, by - s * 0.02); g.lineTo(cx - s * 0.13, by - s * 0.02); g.closePath(); g.fillStyle = "#1E2C40"; g.fill();
  circ(g, cx, by - s * 0.08, s * 0.1, `rgba(255,196,107,${0.22 + 0.08 * Math.sin(t * 3)})`);
  const pt = by - s * 1.08; line(g, cx + s * 0.05, by - s * 0.76, cx + s * 0.05, pt, s * 0.03, "#8A6A4A");
  const wv = Math.sin(t * 5) * s * 0.03; g.beginPath(); g.moveTo(cx + s * 0.06, pt); g.bezierCurveTo(cx + s * 0.16, pt - s * 0.02 + wv, cx + s * 0.22, pt + s * 0.04 - wv, cx + s * 0.3, pt + s * 0.06 + wv); g.lineTo(cx + s * 0.06, pt + s * 0.16); g.closePath(); g.fillStyle = "#E5484D"; g.fill();
}
function flake(g, cx, cy, r, rot, a = 1, glint = 0) {
  g.save(); g.globalAlpha = a;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * 1.6); gr.addColorStop(0, "rgba(207,235,255,0.75)"); gr.addColorStop(1, "rgba(207,235,255,0)"); circ(g, cx, cy, r * 1.6, gr);
  g.translate(cx, cy); g.rotate(rot * DEG);
  for (let k = 0; k < 6; k++) {
    const an = k * 60 * DEG, dx = Math.cos(an), dy = Math.sin(an);
    line(g, 0, 0, dx * r, dy * r, r * 0.24, "#2E86D1"); line(g, 0, 0, dx * r, dy * r, r * 0.13, "#6CC0F7");
    const mx = dx * r * 0.56, my = dy * r * 0.56;
    for (const sg of [-1, 1]) { const b = an + sg * 50 * DEG, ex = mx + Math.cos(b) * r * 0.32, ey = my + Math.sin(b) * r * 0.32; line(g, mx, my, ex, ey, r * 0.18, "#2E86D1"); line(g, mx, my, ex, ey, r * 0.09, "#6CC0F7"); }
  }
  g.rotate(-rot * DEG); circ(g, 0, 0, r * 0.2, "#fff");
  if (glint > 0) { const l = r * 0.55 * glint; line(g, r * 0.45 - l, -r * 0.5, r * 0.45 + l, -r * 0.5, r * 0.1, "#fff"); line(g, r * 0.45, -r * 0.5 - l, r * 0.45, -r * 0.5 + l, r * 0.1, "#fff"); }
  g.restore();
}
function parasolPole(g, x, y, s) { const by = y + s - s * 0.1; oval(g, x + s / 2, by - s * 0.01, s * 0.13, s * 0.04, "#8A6A4A"); line(g, x + s / 2, by, x + s / 2, y - s * 0.1, s * 0.05, "#B79B78"); }
function parasolTop(g, x, y, s, a) {
  const cx = x + s / 2, top = y - s * 0.36, rim = y + s * 0.08, l = cx - s * 0.58, r = cx + s * 0.58; g.save(); g.globalAlpha = a;
  for (let k = 0; k < 8; k++) { const x0 = l + ((r - l) * k) / 8, x1 = l + ((r - l) * (k + 1)) / 8; g.beginPath(); g.moveTo(cx, top); g.lineTo(x1, rim); g.bezierCurveTo(x1 - (x1 - x0) * 0.25, rim + s * 0.07, x0 + (x1 - x0) * 0.25, rim + s * 0.07, x0, rim); g.closePath(); const base = k % 2 ? "#FFF6EA" : "#F2545B"; g.fillStyle = k >= 4 ? dark(base, 0.1) : base; g.fill(); }
  circ(g, cx, top, s * 0.05, "#F2545B"); g.restore();
}
function grill(g, x, y, s, t) {
  const cx = x + s / 2, by = y + s - s * 0.08; ao(g, cx, by, s * 0.8, s, 0.28);
  g.beginPath(); g.ellipse(cx - s * 0.11, by - s * 0.79, s * 0.25, s * 0.21, 0, Math.PI, 0); g.closePath(); g.fillStyle = "#3A3A42"; g.fill();
  for (const [x1, x2, y2] of [[-0.22, -0.12, 0.38], [0.22, 0.12, 0.38], [0, 0, 0.38]]) line(g, cx + s * x1, by, cx + s * x2, by - s * y2, s * 0.05, "#2E2E34");
  const gr = g.createLinearGradient(0, by - s * 0.72, 0, by - s * 0.2); gr.addColorStop(0, "#4A4A54"); gr.addColorStop(1, "#1E1E24");
  g.beginPath(); g.ellipse(cx, by - s * 0.46, s * 0.36, s * 0.28, 0, 0, Math.PI); g.closePath(); g.fillStyle = gr; g.fill();
  oval(g, cx, by - s * 0.46, s * 0.33, s * 0.04, `rgba(255,90,31,${0.65 + 0.35 * Math.sin(t * 9)})`);
  for (let k = 0; k < 5; k++) circ(g, cx - s * 0.24 + k * s * 0.12, by - s * 0.46, s * 0.02, `rgba(255,193,77,${0.5 + 0.5 * Math.sin(t * 7 + k * 1.7)})`);
  rrect(g, cx - s * 0.36, by - s * 0.5, s * 0.72, s * 0.03, s * 0.015, "#B0B6BF");
  for (let k = 0; k < 2; k++) rrect(g, cx - s * 0.2 + k * s * 0.22, by - s * 0.57, s * 0.17, s * 0.07, s * 0.035, "#C0583C");
  for (let k = 0; k < 3; k++) { const ph = (t * 0.55 + k / 3) % 1; circ(g, cx + Math.sin(ph * 6 + k) * s * 0.12, by - s * (0.66 + ph * 0.8), s * (0.06 + 0.09 * ph), `rgba(213,217,224,${0.55 * (1 - ph)})`); }
}
function heatTile(g, x, y, s, t) {
  const gr = g.createRadialGradient(x + s / 2, y + s / 2, 0, x + s / 2, y + s / 2, s * 0.75); gr.addColorStop(0, "rgba(255,122,61,0.62)"); gr.addColorStop(1, "rgba(255,78,42,0.42)");
  rrect(g, x + s * 0.03, y + s * 0.03, s * 0.94, s * 0.94, s * 0.18, gr);
  for (let k = 0; k < 3; k++) { const xx = x + s * (0.24 + k * 0.26), ph = (t * 0.8 + k * 0.33) % 1, y0 = y + s - s * 0.15 - ph * s * 0.2; g.beginPath(); g.moveTo(xx, y0); g.bezierCurveTo(xx - s * 0.07, y0 - s * 0.14, xx + s * 0.07, y0 - s * 0.26, xx, y0 - s * 0.4); g.lineWidth = s * 0.045; g.strokeStyle = `rgba(255,230,194,${0.75 * (1 - ph)})`; g.lineCap = "round"; g.stroke(); }
}
function waterTile(g, x, y, s, t, seed) {
  const gr = g.createLinearGradient(0, y, 0, y + s); gr.addColorStop(0, "#6BC2F0"); gr.addColorStop(1, "#3E9DDB"); g.fillStyle = gr; g.fillRect(x, y, s + 0.5, s + 0.5);
  for (let k = 0; k < 2; k++) { const yy = y + s * (0.32 + k * 0.38), sh = Math.sin(t * 1.8 + k + seed) * s * 0.08; g.beginPath(); g.moveTo(x + s * 0.18 + sh, yy); g.bezierCurveTo(x + s * 0.3 + sh, yy - s * 0.07, x + s * 0.4 + sh, yy - s * 0.07, x + s * 0.5 + sh, yy); g.bezierCurveTo(x + s * 0.6 + sh, yy + s * 0.07, x + s * 0.7 + sh, yy + s * 0.07, x + s * 0.82 + sh, yy); g.lineWidth = s * 0.035; g.strokeStyle = "rgba(255,255,255,0.6)"; g.lineCap = "round"; g.stroke(); }
  if (hash01(seed, 7) > 0.6) circ(g, x + s * 0.68, y + s * 0.62, s * 0.13, "#4FAE58");
}
function iceTile(g, x, y, s, seed) {
  const gr = g.createLinearGradient(x, y, x + s, y + s); gr.addColorStop(0, "#DDF4FF"); gr.addColorStop(1, "#B4E1F8"); g.fillStyle = gr; g.fillRect(x, y, s + 0.5, s + 0.5);
  line(g, x + s * 0.18, y + s * 0.6, x + s * 0.46, y + s * 0.32, s * 0.05, "rgba(255,255,255,0.9)"); line(g, x + s * 0.5, y + s * 0.72, x + s * 0.64, y + s * 0.58, s * 0.035, "rgba(255,255,255,0.9)");
  if (hash01(seed, 3) > 0.5) { g.beginPath(); g.moveTo(x + s * 0.62, y + s * 0.2); g.lineTo(x + s * 0.72, y + s * 0.34); g.lineTo(x + s * 0.68, y + s * 0.44); g.moveTo(x + s * 0.72, y + s * 0.34); g.lineTo(x + s * 0.84, y + s * 0.38); g.lineWidth = s * 0.016; g.strokeStyle = "#8CC7E6"; g.stroke(); }
  g.lineWidth = s * 0.02; g.strokeStyle = "rgba(255,255,255,0.35)"; g.strokeRect(x, y, s, s);
}
function cloud(g, x, y, w, h, a) {
  const s = Math.min(w, h), cy = y + h / 2, n = Math.max(2, Math.floor(w / (s * 0.42))); g.save(); g.globalAlpha = a;
  rrect(g, x + s * 0.06, cy - s * 0.02, w - s * 0.12, s * 0.36, s * 0.18, "#CFDDEE");
  for (let k = 0; k < n; k++) circ(g, x + s * 0.24 + ((w - s * 0.48) * k) / Math.max(1, n - 1), cy - s * 0.02, s * (0.25 + 0.07 * ((k + 1) % 2)), "#CFDDEE");
  for (let k = 0; k < n; k++) circ(g, x + s * 0.24 + ((w - s * 0.48) * k) / Math.max(1, n - 1), cy - s * 0.07, s * (0.23 + 0.07 * ((k + 1) % 2)), "#fff");
  rrect(g, x + s * 0.08, cy - s * 0.1, w - s * 0.16, s * 0.3, s * 0.15, "#fff"); g.restore();
}
function grassTuft(g, cx, cy, s, col) { for (let k = -1; k <= 1; k++) line(g, cx, cy, cx + k * s * 0.05, cy - s * (0.09 - 0.02 * k * k), s * 0.022, col); }
function flower(g, cx, cy, r, petal) { for (let k = 0; k < 5; k++) { const a = k * 72 * DEG; circ(g, cx + Math.cos(a) * r * 0.6, cy + Math.sin(a) * r * 0.6, r * 0.55, petal); } circ(g, cx, cy, r * 0.4, "#FFB33D"); }
function sparkle(g, cx, cy, r, col) { line(g, cx - r, cy, cx + r, cy, r * 0.28, col); line(g, cx, cy - r, cx, cy + r, r * 0.28, col); }
function groundTile(g, x, y, s, look, gx, gy, seed) {
  const base = (gx + gy) % 2 === 0 ? look.gA : look.gB, v = (hash01(seed, 1) - 0.5) * 0.05;
  g.fillStyle = v > 0 ? light(base, v) : dark(base, -v); g.fillRect(x, y, s + 0.6, s + 0.6);
  const tuft = dark(look.lip, 0.05);
  if (look.deco === "paving") {
    const grout = dark(look.gA, 0.12), split = (gx + gy) % 2 === 0 ? 0.5 : 0.38 + 0.24 * hash01(seed, 2);
    line(g, x, y + s * split, x + s, y + s * split, s * 0.03, grout, "butt");
    line(g, x + s * 0.5, y + (gy % 2 === 0 ? 0 : s * split), x + s * 0.5, y + (gy % 2 === 0 ? s * split : s), s * 0.03, grout, "butt");
    if (hash01(seed, 4) > 0.82) grassTuft(g, x + s * 0.5, y + s * split, s * 0.5, "#7FA650");
  } else if (look.deco === "snow") {
    oval(g, x + s * (0.3 + 0.4 * hash01(seed, 2)), y + s * (0.26 + 0.5 * hash01(seed, 3)), s * 0.15, s * 0.06, "rgba(255,255,255,0.7)");
    if (hash01(seed, 5) > 0.55) sparkle(g, x + s * hash01(seed, 6), y + s * hash01(seed, 7), s * 0.05, "#fff");
  } else if (look.deco === "crystal") {
    oval(g, x + s * (0.3 + 0.4 * hash01(seed, 2)), y + s * (0.26 + 0.5 * hash01(seed, 3)), s * 0.15, s * 0.06, "rgba(255,255,255,0.7)");
    if (hash01(seed, 4) > 0.7) { const cx = x + s * (0.25 + 0.5 * hash01(seed, 5)), cy = y + s * (0.3 + 0.4 * hash01(seed, 6)); poly(g, [cx, cy - s * 0.12, cx + s * 0.04, cy, cx, cy + s * 0.03, cx - s * 0.04, cy], "rgba(184,168,255,0.85)"); }
    if (hash01(seed, 8) > 0.55) sparkle(g, x + s * hash01(seed, 9), y + s * hash01(seed, 10), s * 0.05, "#E8E0FF");
  } else if (look.deco === "sand") {
    for (let k = 0; k < 2; k++) { const yy = y + s * (0.3 + 0.35 * k + 0.1 * hash01(seed, k)); g.beginPath(); g.ellipse(x + s * 0.4, yy, s * 0.25, s * 0.06, 0, 200 * DEG, 340 * DEG); g.lineWidth = s * 0.02; g.strokeStyle = dark(look.gA, 0.08); g.stroke(); }
    const pick = hash01(seed, 5), cx = x + s * (0.25 + 0.5 * hash01(seed, 6)), cy = y + s * (0.3 + 0.45 * hash01(seed, 7));
    if (pick > 0.86) for (let k = 0; k < 5; k++) { const a = (k * 72 - 90) * DEG; line(g, cx, cy, cx + Math.cos(a) * s * 0.08, cy + Math.sin(a) * s * 0.08, s * 0.035, "#FF8A65"); }
    else if (pick > 0.72) { g.beginPath(); g.ellipse(cx, cy, s * 0.06, s * 0.05, 0, Math.PI, TAU); g.fillStyle = "#FFC1D0"; g.fill(); }
  } else if (look.deco === "cobble") {
    for (let k = 0; k < 4; k++) { const cx = x + s * (0.25 + 0.5 * (k % 2)), cy = y + s * (0.25 + 0.5 * ((k / 2) | 0)); rrect(g, cx - s * 0.2, cy - s * 0.18, s * 0.4, s * 0.36, s * 0.1, dark(look.gA, 0.06)); rrect(g, cx - s * 0.16, cy - s * 0.15, s * 0.18, s * 0.06, s * 0.03, "rgba(255,255,255,0.3)"); }
  } else if (look.deco === "moss") {
    if (hash01(seed, 2) > 0.5) oval(g, x + s * (0.26 + 0.5 * hash01(seed, 3)), y + s * (0.27 + 0.5 * hash01(seed, 4)), s * 0.16, s * 0.07, "rgba(111,174,82,0.5)");
    grassTuft(g, x + s * (0.2 + 0.6 * hash01(seed, 5)), y + s * (0.3 + 0.5 * hash01(seed, 6)), s, tuft);
    if (hash01(seed, 7) > 0.78) { const mx = x + s * (0.2 + 0.6 * hash01(seed, 8)), my = y + s * (0.35 + 0.4 * hash01(seed, 9)); rrect(g, mx - s * 0.02, my - s * 0.05, s * 0.04, s * 0.07, 1, "#F3E9D2"); g.beginPath(); g.ellipse(mx, my - s * 0.05, s * 0.07, s * 0.06, 0, Math.PI, TAU); g.fillStyle = "#E5484D"; g.fill(); circ(g, mx - s * 0.025, my - s * 0.07, s * 0.012, "#fff"); }
  } else if (look.deco === "gravel") {
    for (let k = 0; k < 5; k++) { const px = x + s * (0.1 + 0.8 * hash01(seed, 10 + k)), py = y + s * (0.1 + 0.8 * hash01(seed, 20 + k)), pr = s * (0.025 + 0.03 * hash01(seed, 30 + k)); oval(g, px, py, pr, pr * 0.7, dark(look.gA, 0.22)); oval(g, px - pr * 0.25, py - pr * 0.2, pr * 0.45, pr * 0.25, light(look.gA, 0.25)); }
  } else {
    if (look.deco === "lawn" && gx % 2 === 0) { g.fillStyle = "rgba(255,255,255,0.06)"; g.fillRect(x, y, s * 0.5, s); }
    grassTuft(g, x + s * (0.15 + 0.3 * hash01(seed, 2)), y + s * (0.25 + 0.5 * hash01(seed, 3)), s, tuft);
    if (look.deco !== "lawn" && hash01(seed, 4) > 0.45) grassTuft(g, x + s * (0.55 + 0.3 * hash01(seed, 5)), y + s * (0.35 + 0.5 * hash01(seed, 6)), s * 0.8, tuft);
    const chance = look.deco === "daisies" ? 0.55 : 0.72;
    if (look.deco !== "lawn" && hash01(seed, 7) > chance) flower(g, x + s * (0.2 + 0.6 * hash01(seed, 8)), y + s * (0.2 + 0.6 * hash01(seed, 9)), s * 0.07, ["#ffffff", "#FF9EC0", "#FFE27A"][Math.floor(hash01(seed, 10) * 3) % 3]);
  }
  g.lineWidth = s * 0.015; g.strokeStyle = "rgba(0,0,0,0.045)"; g.strokeRect(x, y, s, s);
}
function islandBase(g, top, look, depth, corner, seed) {
  const w = top.r - top.l, cx = (top.l + top.r) / 2;
  const sg = g.createRadialGradient(0, 0, 0, 0, 0, 1); sg.addColorStop(0, "rgba(32,48,72,0.25)"); sg.addColorStop(1, "rgba(32,48,72,0)");
  g.save(); g.translate(cx, top.b + depth * 2.1); g.scale(w * 0.46, depth * 0.7); circ(g, 0, 0, 1, sg); g.restore();
  const sideG = g.createLinearGradient(0, top.t + (top.b - top.t) * 0.5, 0, top.b + depth); sideG.addColorStop(0, look.soil); sideG.addColorStop(1, look.soilDark);
  rrect(g, top.l, top.t + corner, w, top.b + depth - top.t - corner, corner, sideG);
  const lipH = depth * 0.34; rrect(g, top.l, top.b - corner, w, corner + lipH, corner, look.lip);
  const drips = Math.max(3, Math.floor(w / (depth * 1.1)));
  for (let k = 0; k < drips; k++) { const x = top.l + corner * 0.6 + ((w - corner * 1.2) * (k + 0.5)) / drips, h = lipH * (0.35 + 0.65 * hash01(seed, k)); rrect(g, x - depth * 0.16, top.b + lipH * 0.5, depth * 0.32, h, depth * 0.16, look.lip); }
  const stones = Math.max(3, Math.floor(w / depth));
  for (let k = 0; k < stones; k++) { const x = top.l + corner + (w - 2 * corner) * hash01(seed + 3, k), y = top.b + lipH + (depth - lipH) * (0.35 + 0.45 * hash01(seed + 5, k)), r = depth * (0.07 + 0.06 * hash01(seed + 7, k)); oval(g, x, y, r * 1.3, r, dark(look.soilDark, 0.15)); oval(g, x - r * 0.35, y - r * 0.45, r * 0.55, r * 0.4, light(look.soil, 0.18)); }
}

// ================================================================ sun, moon, Snowdi, Pino and the new mechanics
function sunIcon(g, cx, cy, r, t, col = "#FFC93D", a = 1, glow = 2.4) {
  g.save(); g.globalAlpha = a;
  const gr = g.createRadialGradient(cx, cy, 0, cx, cy, r * glow); gr.addColorStop(0, rgba(col, 0.45)); gr.addColorStop(1, rgba(col, 0)); circ(g, cx, cy, r * glow, gr);
  for (let k = 0; k < 12; k++) { const an = k * 30 * DEG + t * 0.31, len = k % 2 ? 1.42 : 1.62; line(g, cx + Math.cos(an) * r * 1.22, cy + Math.sin(an) * r * 1.22, cx + Math.cos(an) * r * len, cy + Math.sin(an) * r * len, r * 0.16, col); }
  const g2 = g.createRadialGradient(cx - r * 0.3, cy - r * 0.3, 0, cx - r * 0.3, cy - r * 0.3, r * 1.3); g2.addColorStop(0, light(col, 0.45)); g2.addColorStop(0.6, col); g2.addColorStop(1, dark(col, 0.08)); circ(g, cx, cy, r, g2);
  g.restore();
}
function moonIcon(g, cx, cy, r, back) { circ(g, cx, cy, r * 1.6, "rgba(255,243,176,0.25)"); circ(g, cx, cy, r, "#FFF3B0"); circ(g, cx + r * 0.45, cy - r * 0.28, r * 0.86, back); }
function drop(g, x, y, r, col) {
  g.beginPath(); g.moveTo(x, y - r * 1.3); g.bezierCurveTo(x + r, y - r * 0.2, x + r * 0.8, y + r * 0.8, x, y + r * 0.8); g.bezierCurveTo(x - r * 0.8, y + r * 0.8, x - r, y - r * 0.2, x, y - r * 1.3); g.fillStyle = col; g.fill();
}
function topHat(g, hx, top, rh, s) {
  rrect(g, hx - rh, top - s * 0.025, rh * 2, s * 0.055, s * 0.03, "#26262C"); rrect(g, hx - rh * 0.62, top - s * 0.26, rh * 1.24, s * 0.25, s * 0.02, "#26262C"); g.fillStyle = "#E5484D"; g.fillRect(hx - rh * 0.62, top - s * 0.075, rh * 1.24, s * 0.045);
}

/** Snowdi, port of drawSnowman: base = bottom centre, s = tile size. */
function snowman(g, bx, by, s, o) {
  const { t = 0, squash = 0, melt = 0, sweat = 0, facing = 1, alpha = 1, mood = "normal", cheer = 0, hat = false } = o;
  if (melt > 0) { meltingSnowman(g, bx, by, s, melt, { t, facing, alpha, hat }); return; }
  g.save(); g.globalAlpha = alpha;
  ao(g, bx, by + s * 0.02, s * 0.66, s, 0.22);
  g.translate(bx, by); g.scale(1 + squash * 0.6, 1 - squash); g.translate(-bx, -by);
  const rb = s * 0.29, rh = s * 0.21, bodyY = by - rb, headY = by - 2 * rb - rh * 0.7;
  const snow = () => { const gr = g.createRadialGradient(bx - s * 0.14, by - s * 0.6, s * 0.02, bx - s * 0.14, by - s * 0.6, s * 0.72); gr.addColorStop(0, "#fff"); gr.addColorStop(0.55, "#E2EDF7"); gr.addColorStop(1, "#B9CEE3"); return gr; };
  const armY = bodyY - rb * 0.3;
  for (const side of [-1, 1]) {
    const wave = cheer > 0 ? Math.sin(t * 14 + side) * 12 * cheer : Math.sin(t * 1.6 + side) * 3;
    const ang = ((side < 0 ? 200 - 75 * cheer : -20 + 75 * cheer) + wave * side) * DEG;
    const sx = bx + side * rb * 0.75, ex = sx + Math.cos(ang) * s * 0.3, ey = armY - Math.sin(ang) * s * 0.3;
    line(g, sx, armY, ex, ey, s * 0.035, "#7A5230");
    for (const f of [-0.6, 0.6]) { const fa = ang + Math.PI + f; line(g, ex, ey, ex - Math.cos(fa) * s * 0.07, ey + Math.sin(fa) * s * 0.07, s * 0.025, "#7A5230"); }
  }
  circ(g, bx, bodyY, rb, snow());
  g.beginPath(); g.arc(bx, bodyY, rb * 0.86, -60 * DEG, 20 * DEG); g.lineWidth = s * 0.02; g.strokeStyle = "rgba(255,255,255,0.7)"; g.lineCap = "round"; g.stroke();
  for (let k = 0; k < 2; k++) circ(g, bx + facing * s * 0.01, bodyY + rb * 0.38 * k, s * 0.032, "#2B2B30");
  const scarf = "#E5484D", neck = by - 2 * rb + s * 0.015;
  rrect(g, bx - rh * 0.98, neck - s * 0.06, rh * 1.96, s * 0.115, s * 0.05, scarf);
  rrect(g, bx - facing * rh * 0.5 - s * 0.05, neck, s * 0.1, s * 0.22, s * 0.04, dark(scarf, 0.08));
  circ(g, bx, headY, rh, snow());
  g.beginPath(); g.arc(bx, headY, rh * 0.82, -70 * DEG, 10 * DEG); g.lineWidth = s * 0.016; g.strokeStyle = "rgba(255,255,255,0.7)"; g.stroke();
  const look = facing * rh * 0.12, ex = rh * 0.36, ey = headY - rh * 0.1, ink = "#1C1C22";
  const blush = mood === "worried" || sweat > 0 ? 0.55 : 0.32;
  circ(g, bx - ex * 1.35 + look, ey + rh * 0.42, s * 0.04, mood === "sad" ? "rgba(143,184,255,0.35)" : `rgba(255,143,163,${blush})`); circ(g, bx + ex * 1.35 + look, ey + rh * 0.42, s * 0.04, mood === "sad" ? "rgba(143,184,255,0.35)" : `rgba(255,143,163,${blush})`);
  const blink = mood !== "sad" && (t + bx * 0.001) % 3.6 < 0.12;
  for (const sd of [-1, 1]) {
    const exx = bx + sd * ex + look;
    if (mood === "happy") { g.beginPath(); g.arc(exx, ey + s * 0.012, s * 0.032, 200 * DEG, 340 * DEG); g.lineWidth = s * 0.018; g.strokeStyle = ink; g.stroke(); }
    else if (blink) line(g, exx - s * 0.03, ey, exx + s * 0.03, ey, s * 0.016, ink);
    else if (mood === "shocked") { circ(g, exx, ey, s * 0.04, "#fff"); circ(g, exx, ey, s * 0.024, ink); }
    else { oval(g, exx, ey, s * 0.028, s * 0.036, ink); circ(g, exx + s * 0.008, ey - s * 0.014, s * 0.012, "#fff"); }
  }
  if (mood === "worried" || mood === "shocked") for (const sd of [-1, 1]) { const bxx = bx + sd * ex + look; line(g, bxx - sd * s * 0.035, ey - s * 0.07, bxx + sd * s * 0.03, ey - s * 0.05, s * 0.014, ink); }
  if (mood === "sad") { for (const sd of [-1, 1]) { const bxx = bx + sd * ex + look; line(g, bxx + sd * s * 0.035, ey - s * 0.045, bxx - sd * s * 0.03, ey - s * 0.078, s * 0.014, ink); } const ph = (t * 0.8) % 1; drop(g, bx - ex + look, ey + s * 0.05 + ph * s * 0.12, s * 0.022, `rgba(79,174,240,${1 - ph * 0.6})`); }
  const ny = headY + rh * 0.14, nb = bx + look * 0.5;
  poly(g, [nb, ny - s * 0.038, nb + facing * s * 0.21, ny + s * 0.008, nb, ny + s * 0.038], "#FF8A2A");
  poly(g, [nb, ny + s * 0.005, nb + facing * s * 0.21, ny + s * 0.008, nb, ny + s * 0.038], "#E0661A");
  const mx = bx + look * 0.4, my = headY + rh * 0.48;
  if (mood === "happy") { g.beginPath(); g.moveTo(mx - s * 0.07, my - s * 0.02); g.bezierCurveTo(mx - s * 0.06, my + s * 0.07, mx + s * 0.06, my + s * 0.07, mx + s * 0.07, my - s * 0.02); g.closePath(); g.fillStyle = "#3A2427"; g.fill(); oval(g, mx, my + s * 0.03, s * 0.03, s * 0.015, "#FF7A8A"); }
  else if (mood === "shocked") oval(g, mx, my + s * 0.01, s * 0.025, s * 0.03, "#3A2427");
  else if (mood === "sad") { g.beginPath(); g.ellipse(mx, my + s * 0.035, s * 0.055, s * 0.035, 0, 205 * DEG, 335 * DEG); g.lineWidth = s * 0.018; g.strokeStyle = ink; g.stroke(); }
  else if (mood === "worried") { g.beginPath(); g.moveTo(mx - s * 0.05, my + s * 0.01); g.bezierCurveTo(mx - s * 0.025, my - s * 0.02, mx - s * 0.005, my + s * 0.03, mx + s * 0.02, my); g.bezierCurveTo(mx + s * 0.035, my - s * 0.015, mx + s * 0.045, my + s * 0.01, mx + s * 0.055, my + s * 0.005); g.lineWidth = s * 0.016; g.strokeStyle = ink; g.stroke(); }
  else { g.beginPath(); g.ellipse(mx, my - s * 0.02, s * 0.06, s * 0.04, 0, 25 * DEG, 155 * DEG); g.lineWidth = s * 0.018; g.strokeStyle = ink; g.stroke(); }
  if (hat) topHat(g, bx, headY - rh * 0.78, rh, s);
  g.restore();
  if (sweat > 0) { const hy = by - s * 0.58 - s * 0.21 * 0.7; for (let k = 0; k < 2; k++) { const ph = (t * 1.3 + k * 0.5) % 1, x = bx + (k ? 1 : -1) * s * 0.27, y = hy - s * 0.14 + ph * s * 0.24; drop(g, x, y, s * 0.04, `rgba(79,174,240,${sweat * (1 - ph) * alpha})`); } }
}

/**
 * Snowdi melts (port of Melt.kt): sad face, drips, his body sags into a puddle, the hat slides
 * off, arms and scarf drop, and in the end only a puddle with his coal eyes, carrot nose and a
 * sad coal mouth is left, next to his scarf, hat and twig arms.
 */
function meltingSnowman(g, bx, by, s, m, o) {
  const { t = 0, facing = 1, alpha = 1, hat = false } = o;
  const seg = (a, b) => Math.min(1, Math.max(0, (m - a) / (b - a))), smooth = (x) => x * x * (3 - 2 * x);
  const fall = (a, b, x, hop = 0) => [a[0] + (b[0] - a[0]) * x, a[1] + (b[1] - a[1]) * x * x - Math.sin(x * Math.PI) * hop * s];
  const rb = s * 0.29, rh = s * 0.21, k = smooth(seg(0.06, 0.8)), gone = smooth(seg(0.7, 0.92)), grow = smooth(seg(0.03, 0.86)), hatSide = -facing;
  g.save(); g.globalAlpha = alpha;
  // puddle
  const pc = [bx, by - s * 0.03], pw = s * (0.42 + 0.9 * grow), ph = pw * 0.34;
  for (const [lx, ly, lw] of [[-0.36, 0.12, 0.42], [0.34, 0.18, 0.38], [0.05, 0.32, 0.5], [-0.1, -0.3, 0.36]]) oval(g, pc[0] + lx * pw, pc[1] + ly * ph, pw * lw / 2, pw * lw * 0.17, "rgba(109,183,232,0.9)");
  oval(g, pc[0], pc[1], pw / 2, ph / 2, "rgba(109,183,232,0.9)");
  const wg = g.createRadialGradient(pc[0] - pw * 0.12, pc[1] - ph * 0.15, 0, pc[0] - pw * 0.12, pc[1] - ph * 0.15, pw * 0.6); wg.addColorStop(0, "#E4F5FF"); wg.addColorStop(0.5, "#B5E0FA"); wg.addColorStop(1, "#8CCBF2");
  oval(g, pc[0], pc[1], pw * 0.47, ph * 0.43, wg);
  oval(g, pc[0] - pw * 0.19, pc[1] - ph * 0.21, pw * 0.15, ph * 0.09, "rgba(255,255,255,0.55)");
  if (grow > 0.2) for (let j = 0; j < 3; j++) { const p0 = (t * 0.55 + j / 3) % 1, rw = pw * (0.18 + 0.62 * p0); g.beginPath(); g.ellipse(pc[0], pc[1], rw / 2, rw * 0.17, 0, 0, TAU); g.lineWidth = s * 0.012; g.strokeStyle = `rgba(255,255,255,${(1 - p0) * 0.45 * grow})`; g.stroke(); }
  // resting places
  const eyeL = [pc[0] - 0.1 * s, pc[1] - 0.055 * s], eyeR = [pc[0] + 0.1 * s, pc[1] - 0.055 * s], noseB = [pc[0] - facing * 0.01 * s, pc[1] - 0.005 * s];
  const mouth = [[pc[0] - 0.1 * s, pc[1] + 0.085 * s], [pc[0], pc[1] + 0.035 * s], [pc[0] + 0.1 * s, pc[1] + 0.085 * s]];
  const scarfRest = [pc[0] + facing * 0.36 * s, pc[1] + 0.07 * s], hatRest = [pc[0] + hatSide * 0.52 * s, pc[1] - 0.02 * s];
  // body
  const bw = 2 * rb * (1 + 0.8 * k), bh = 2 * rb * (1 - 0.74 * k) * (1 - 0.9 * gone), hr = rh * (1 - 0.5 * k) * (1 - gone);
  const head = [bx + hatSide * s * 0.04 * k, by - bh - hr * (0.7 - 0.35 * k)], snowA = 1 - gone;
  const snow = () => { const gr = g.createRadialGradient(bx - s * 0.12, by - bh * 0.9, s * 0.02, bx - s * 0.12, by - bh * 0.9, s * 0.7); gr.addColorStop(0, k > 0.5 ? "#EFF8FF" : "#fff"); gr.addColorStop(0.55, k > 0.5 ? "#CFE8F8" : "#E2EDF7"); gr.addColorStop(1, k > 0.5 ? "#9CC8E6" : "#B9CEE3"); return gr; };
  const armFall = smooth(seg(0.36, 0.56));
  for (const side of [-1, 1]) {
    const droop = 20 + 45 * k, ang = (side < 0 ? 180 + droop : -droop) * DEG;
    const s0 = [bx + side * bw * 0.42, by - bh * 0.62], e0 = [s0[0] + Math.cos(ang) * s * 0.3, s0[1] - Math.sin(ang) * s * 0.3];
    const s1 = [pc[0] + side * 0.4 * s, pc[1] - 0.035 * s], e1 = [pc[0] + side * 0.68 * s, pc[1] + 0.03 * s];
    const st = armFall > 0 ? fall(s0, s1, armFall) : s0, en = armFall > 0 ? fall(e0, e1, armFall, 0.08) : e0;
    line(g, st[0], st[1], en[0], en[1], s * 0.035, "#7A5230");
  }
  if (snowA > 0.01) {
    g.save(); g.globalAlpha = alpha * snowA;
    for (const [dx, wf] of [[-0.62, 0.5], [0.58, 0.46], [0, 0.7]]) { const lw = bw * wf * k; if (lw > 1) oval(g, bx + dx * bw * 0.5, by - s * 0.035 * k - s * 0.01, lw / 2, s * 0.065 * k + s * 0.01, snow()); }
    oval(g, bx, by - bh / 2, bw / 2, bh / 2 + s * 0.008, snow());
    for (let i = 0; i < 6; i++) { const t0 = 0.08 + i * 0.09, x = seg(t0, t0 + 0.2); if (x <= 0 || x >= 1) continue; const side = i % 2 ? 1 : -1, dx = side * bw * (0.22 + 0.18 * hash01(i, 7)), y0 = by - bh * (0.75 - 0.1 * hash01(i, 3)); drop(g, bx + dx, y0 + (by - s * 0.03 - y0) * x * x, s * 0.05, `rgba(203,233,251,${1 - x * x * x})`); }
    g.restore();
  }
  // scarf (behind the head while high), head, scarf (in front once it falls)
  const scarfFall = smooth(seg(0.34, 0.58)), neck = [bx, by - bh + s * 0.01];
  const band = (p, w) => { rrect(g, p[0] - w / 2, p[1] - s * 0.055, w, s * 0.105, s * 0.05, "#E5484D"); rrect(g, p[0] - facing * w * 0.25 - s * 0.05, p[1], s * 0.1, s * 0.2, s * 0.04, "#D2353A"); };
  if (scarfFall < 0.5) band(scarfFall > 0 ? fall(neck, scarfRest, scarfFall) : neck, rh * 1.96 * (1 - 0.3 * k) * (1 - 0.4 * scarfFall));
  if (snowA > 0.01 && hr > s * 0.02) { g.save(); g.globalAlpha = alpha * snowA; circ(g, head[0], head[1], hr, snow()); g.restore(); }
  if (scarfFall >= 0.5) {
    if (scarfFall < 1) band(fall(neck, scarfRest, scarfFall), rh * 1.96 * (1 - 0.3 * k) * (1 - 0.4 * scarfFall));
    else { g.beginPath(); g.ellipse(scarfRest[0], scarfRest[1], s * 0.17, s * 0.065, 0, 0, TAU); g.lineWidth = s * 0.05; g.strokeStyle = "#E5484D"; g.stroke(); line(g, scarfRest[0] + facing * s * 0.12, scarfRest[1], scarfRest[0] + facing * s * 0.27, scarfRest[1] + s * 0.1, s * 0.06, "#D2353A"); }
  }
  // buttons -> mouth
  const coal = (p, r, flat) => { oval(g, p[0], p[1], r, r * (1 - 0.3 * flat), "#26262C"); oval(g, p[0] - r * 0.25, p[1] - r * 0.4, r * 0.3, r * 0.2, "rgba(255,255,255,0.45)"); };
  const btn = smooth(seg(0.5, 0.68));
  for (let j = 0; j < 2; j++) { const on = [bx + facing * s * 0.01, by - bh * (0.55 - 0.25 * j)]; coal(btn > 0 ? fall(on, mouth[j * 2], btn) : on, s * 0.032, btn); }
  // face
  const faceFall = smooth(seg(0.5, 0.7)), f = Math.min(1, Math.max(0, hr / rh)), eyeDx = rh * 0.36 * Math.max(f, 0.5), eyeY = head[1] - hr * 0.1;
  if (faceFall <= 0) {
    const look = facing * hr * 0.1, ink = "#1C1C22";
    for (const sd of [-1, 1]) { const ex = head[0] + sd * eyeDx + look; circ(g, ex, eyeY, s * 0.036 * Math.max(f, 0.6), "#26262C"); circ(g, ex + s * 0.01, eyeY - s * 0.012, s * 0.011, "#fff"); line(g, ex + sd * s * 0.035, eyeY - s * 0.045, ex - sd * s * 0.028, eyeY - s * 0.075, s * 0.014, ink); const p0 = (t * 0.9 + (sd > 0 ? 0.5 : 0)) % 1; drop(g, ex, eyeY + s * 0.04 + p0 * hr * 0.9, s * 0.022, `rgba(79,174,240,${1 - p0 * 0.7})`); }
    const ny = head[1] + hr * 0.14, nb = head[0] + look * 0.5;
    poly(g, [nb, ny - s * 0.036, nb + facing * s * 0.2, ny + s * 0.045, nb, ny + s * 0.036], "#FF8A2A");
    const mx = head[0] + look * 0.4, my = head[1] + hr * 0.5; g.beginPath(); g.ellipse(mx, my + s * 0.035, s * 0.055, s * 0.035, 0, 205 * DEG, 335 * DEG); g.lineWidth = s * 0.018; g.strokeStyle = ink; g.stroke();
  } else {
    coal(fall([head[0], head[1] + hr * 0.48], mouth[1], faceFall), s * 0.028, faceFall);
    coal(fall([head[0] - eyeDx, eyeY], eyeL, faceFall, 0.05), s * 0.036, faceFall);
    coal(fall([head[0] + eyeDx, eyeY], eyeR, faceFall, 0.05), s * 0.036, faceFall);
    const nb = fall([head[0], head[1] + hr * 0.14], noseB, faceFall, 0.08);
    poly(g, [nb[0], nb[1] - s * 0.038, nb[0] + facing * s * 0.21, nb[1] + s * 0.008 + faceFall * s * 0.02, nb[0], nb[1] + s * 0.038 * (1 - 0.4 * faceFall)], "#FF8A2A");
  }
  // hat slides off
  if (hat) {
    const hf = smooth(seg(0.16, 0.46));
    if (hf <= 0) topHat(g, head[0], head[1] - rh * 0.78, rh * Math.max(f, 0.6), s);
    else { const p = fall([head[0], head[1] - rh * 0.78], hatRest, hf, 0.22); g.save(); g.translate(p[0], p[1]); g.rotate(hatSide * 100 * hf * DEG); topHat(g, 0, 0, rh, s); g.restore(); }
  }
  g.restore();
}

/** Pino the penguin: smaller than Snowdi, blue bobble hat. */
function penguin(g, bx, by, s, o = {}) {
  const { t = 0, facing = 1, mood = "normal", cheer = 0, squash = 0 } = o;
  ao(g, bx, by + s * 0.02, s * 0.5, s, 0.22);
  g.save(); g.translate(bx, by); g.scale(1 + squash * 0.6, 1 - squash); g.translate(-bx, -by);
  const bodyH = s * 0.56, bodyW = s * 0.42, top = by - bodyH - s * 0.03, ink = "#223047", inkL = "#3A4D6E";
  for (const side of [-1, 1]) oval(g, bx + side * s * 0.1, by - s * 0.015, s * 0.07, s * 0.035, "#FF9A2E");
  for (const side of [-1, 1]) { const flap = cheer > 0 ? Math.sin(t * 16 + side) * 35 * cheer + 40 * cheer : Math.sin(t * 2 + side) * 4; g.save(); g.translate(bx + side * bodyW * 0.42, top + bodyH * 0.38); g.rotate(side * (12 + flap) * DEG); oval(g, 0, s * 0.13, s * 0.045, s * 0.13, inkL); g.restore(); }
  const bg = g.createRadialGradient(bx - bodyW * 0.2, top + bodyH * 0.3, 0, bx - bodyW * 0.2, top + bodyH * 0.3, bodyW); bg.addColorStop(0, inkL); bg.addColorStop(1, ink);
  oval(g, bx, top + bodyH / 2, bodyW / 2, bodyH / 2, bg);
  oval(g, bx + facing * s * 0.015, top + bodyH * 0.63, bodyW * 0.33, bodyH * 0.33, "#F8FBFF");
  const fx = bx + facing * s * 0.03, fy = top + bodyH * 0.27;
  oval(g, fx, fy, s * 0.12, s * 0.085, "#F8FBFF");
  for (const sd of [-1, 1]) { const ex = fx + sd * s * 0.055, ey = fy - s * 0.01;
    if (mood === "happy") { g.beginPath(); g.arc(ex, ey + s * 0.01, s * 0.022, 200 * DEG, 340 * DEG); g.lineWidth = s * 0.016; g.strokeStyle = ink; g.stroke(); }
    else { circ(g, ex, ey, s * 0.024, ink); circ(g, ex + s * 0.007, ey - s * 0.008, s * 0.008, "#fff"); }
    if (mood === "sad") line(g, ex - sd * s * 0.028, ey - s * 0.035, ex + sd * s * 0.02, ey - s * 0.05, s * 0.012, ink); }
  poly(g, [fx - s * 0.035, fy + s * 0.02, fx + facing * s * 0.08, fy + s * 0.035, fx + s * 0.035, fy + s * 0.02, fx, fy + s * 0.06], "#FF9A2E");
  const hc = [bx, top + s * 0.03];
  g.beginPath(); g.ellipse(hc[0], hc[1], s * 0.15, s * 0.12, 0, Math.PI, TAU); g.fillStyle = "#3D7FE0"; g.fill();
  rrect(g, hc[0] - s * 0.16, hc[1] - s * 0.015, s * 0.32, s * 0.05, s * 0.025, "#2E66B8"); circ(g, hc[0], hc[1] - s * 0.13, s * 0.04, "#fff");
  g.restore();
}

const PORTAL_COLORS = [["#8B4DFF", "#E2CCFF"], ["#14B5C9", "#C4F7FF"], ["#FF6FB0", "#FFD3E8"]];
function portal(g, x, y, s, t, pair) {
  const [rim, glow] = PORTAL_COLORS[pair % 3], cx = x + s / 2, cy = y + s / 2 + s * 0.06, w = s * 0.86, h = s * 0.56;
  const gg = g.createRadialGradient(cx, cy, 0, cx, cy, s * 0.62); gg.addColorStop(0, rgba(glow, 0.6)); gg.addColorStop(1, rgba(glow, 0)); oval(g, cx, cy, s * 0.62, s * 0.44, gg);
  oval(g, cx, cy + s * 0.03, w / 2, h / 2, "#5B5470"); oval(g, cx, cy, w / 2, h / 2, "#8E87A6");
  for (let k = 0; k < 8; k++) { const a = (k * 45 + 22) * DEG; circ(g, cx + Math.cos(a) * w * 0.42, cy + Math.sin(a) * h * 0.42, s * 0.022, rgba(glow, 0.6 + 0.4 * Math.sin(t * 3 + k))); }
  const iw = w * 0.74, ih = h * 0.7, ig = g.createRadialGradient(cx, cy, 0, cx, cy, iw * 0.55); ig.addColorStop(0, "#fff"); ig.addColorStop(0.35, glow); ig.addColorStop(0.75, rim); ig.addColorStop(1, dark(rim, 0.35));
  oval(g, cx, cy, iw / 2, ih / 2, ig);
  g.save(); g.translate(cx, cy); g.scale(1, ih / iw); g.rotate((t * 110 + pair * 60) * DEG);
  for (let k = 0; k < 3; k++) { g.beginPath(); g.arc(0, 0, iw * 0.36, k * 120 * DEG, (k * 120 + 80) * DEG); g.lineWidth = s * 0.035; g.strokeStyle = "rgba(255,255,255,0.55)"; g.lineCap = "round"; g.stroke(); }
  g.restore();
  for (let k = 0; k < 4; k++) { const p = (t * 0.6 + k * 0.25 + pair * 0.13) % 1; circ(g, cx + Math.sin(k * 2.1 + t * 1.5) * s * 0.18, cy - p * s * 0.7, s * (0.03 - 0.015 * p), rgba(glow, (1 - p) * 0.9)); }
}
function windTile(g, x, y, s, t, dx, dy, seed) {
  const cx = x + s / 2, cy = y + s / 2;
  rrect(g, x + s * 0.05, y + s * 0.05, s * 0.9, s * 0.9, s * 0.22, "rgba(191,230,255,0.75)");
  g.lineWidth = s * 0.03; g.strokeStyle = "rgba(255,255,255,0.8)"; g.beginPath(); g.roundRect(x + s * 0.05, y + s * 0.05, s * 0.9, s * 0.9, s * 0.22); g.stroke();
  g.save(); g.translate(cx, cy); g.rotate(Math.atan2(dy, dx));
  for (let k = 0; k < 2; k++) { const px = -s * 0.13 + k * s * 0.24, pulse = 0.55 + 0.45 * Math.sin(t * 6 - k * 1.4);
    for (const [col, wd] of [["rgba(62,142,208,0.8)", 0.1], [`rgba(255,255,255,${pulse})`, 0.055]]) { g.beginPath(); g.moveTo(px - s * 0.1, -s * 0.18); g.lineTo(px + s * 0.07, 0); g.lineTo(px - s * 0.1, s * 0.18); g.lineWidth = s * wd; g.strokeStyle = col; g.lineCap = "round"; g.lineJoin = "round"; g.stroke(); } }
  for (let k = 0; k < 3; k++) { const p = (t * 1.6 + k * 0.37 + hash01(seed, k) * 0.5) % 1, yy = (k - 1) * s * 0.3, x0 = -s * 0.7 + p * s * 1.2; g.beginPath(); g.moveTo(x0, yy); g.quadraticCurveTo(x0 + s * 0.18, yy - s * 0.06, x0 + s * 0.36, yy); g.lineWidth = s * 0.035; g.strokeStyle = `rgba(255,255,255,${Math.sin(p * Math.PI) * 0.95})`; g.stroke(); }
  g.restore();
}
const lerpCol = (a, b, f) => { const A = hexRgb(a), B = hexRgb(b); return `rgb(${A.map((v, i) => Math.round(v + (B[i] - v) * f)).join(",")})`; };
function switchTile(g, x, y, s, open, t) {
  const cx = x + s / 2, cy = y + s / 2 + s * 0.16, lamp = lerpCol("#E5484D", "#4FD15A", open);
  ao(g, cx, cy + s * 0.16, s * 0.86, s, 0.2);
  oval(g, cx, cy + s * 0.05, s * 0.38, s * 0.17, "#4E535B"); oval(g, cx, cy - s * 0.03, s * 0.38, s * 0.17, "#8E959F");
  oval(g, cx, cy - s * 0.04, s * 0.3, s * 0.12, lamp); oval(g, cx, cy - s * 0.045, s * 0.24, s * 0.09, "#C3C9D1");
  const px = cx, py = cy - s * 0.05;
  g.save(); g.translate(px, py); g.rotate((-40 + 80 * open) * DEG);
  line(g, 0, 0, 0, -s * 0.55, s * 0.09, "#2E3238"); circ(g, 0, -s * 0.58, s * 0.16, lamp.replace("rgb", "rgba").replace(")", ",0.3)")); circ(g, 0, -s * 0.58, s * 0.11, "#26262C"); circ(g, 0, -s * 0.58, s * 0.095, lamp); circ(g, -s * 0.032, -s * 0.61, s * 0.032, "rgba(255,255,255,0.75)");
  g.restore(); oval(g, px, py, s * 0.1, s * 0.05, "#2E3238");
}
function gate(g, x, y, s, open, look) {
  const by = y + s - s * 0.06, l = x + s * 0.02, rr = x + s - s * 0.02, pw = s * 0.2, ph = s * 1.3, lamp = lerpCol("#E5484D", "#4FD15A", open), stone = look.deco === "cobble" ? "#B9B1A3" : "#C9B9A0";
  ao(g, x + s / 2, by, s, s, 0.22);
  const inL = l + pw, inR = rr - pw, half = (inR - inL) / 2, wing = half * (1 - 0.85 * open), top = by - s;
  for (const side of [-1, 1]) {
    const x0 = side < 0 ? inL : inR - wing, x1 = x0 + wing;
    line(g, x0, by - s * 0.12, x1, by - s * 0.12, s * 0.05, "#2F3440", "butt"); line(g, x0, top + s * 0.18, x1, top + s * 0.18, s * 0.05, "#2F3440", "butt");
    for (let k = 0; k <= 3; k++) { const bxx = x0 + wing * (k + 0.5) / 4; line(g, bxx, by - s * 0.06, bxx, top + s * 0.04, s * 0.045, "#2F3440"); poly(g, [bxx, top - s * 0.06, bxx + s * 0.035, top + s * 0.03, bxx - s * 0.035, top + s * 0.03], "#2F3440"); }
    if (open < 0.5) { const sx = side < 0 ? x1 - s * 0.05 : x0 + s * 0.05; circ(g, sx, top + s * 0.5, s * 0.055, "#fff"); circ(g, sx, top + s * 0.5, s * 0.045, "#E5484D"); }
  }
  for (const px of [l, rr - pw]) {
    rrect(g, px, by - ph, pw, ph, s * 0.03, dark(stone, 0.22)); rrect(g, px, by - ph, pw * 0.7, ph, s * 0.03, stone);
    for (let k = 1; k <= 4; k++) line(g, px, by - ph * k / 5, px + pw, by - ph * k / 5, s * 0.012, dark(stone, 0.3), "butt");
    rrect(g, px - s * 0.03, by - ph - s * 0.07, pw + s * 0.06, s * 0.09, s * 0.03, light(stone, 0.2));
    circ(g, px + pw / 2, by - ph - s * 0.15, s * 0.1, lamp.replace("rgb", "rgba").replace(")", ",0.35)")); circ(g, px + pw / 2, by - ph - s * 0.15, s * 0.055, lamp);
  }
}


// The sun only moves forward through the day and never below the island.
function skyBetween(a, b, p) {
  const fa = PHASES[a].night ? null : PHASES[a].ang, fb = PHASES[b].night ? null : PHASES[b].ang, noon = (ang) => Math.max(0, Math.sin(ang * DEG));
  if (fa != null && fb != null && fb >= fa) { const ang = fa + (fb - fa) * p; return { ang, day: 1, noon: noon(ang), drop: 0 }; }
  if (fa != null && fb != null) return p < 0.5 ? { ang: fa, day: 1 - 2 * p, noon: noon(fa), drop: 2 * p } : { ang: fb, day: 2 * p - 1, noon: noon(fb), drop: 2 - 2 * p };
  if (fa != null) return { ang: fa, day: 1 - p, noon: noon(fa), drop: p };
  if (fb != null) return { ang: fb, day: p, noon: noon(fb), drop: 1 - p };
  return { ang: 90, day: 0, noon: 1, drop: 1 };
}
const lenFor = (sk, h) => h + (((h + 1) >> 1) - h) * sk.noon;
function skyBodies(gg, sk, cx, hy, rx, ry, r, t) {
  if (sk.day > 0.001) { const a = (sk.ang + 180) * DEG, col = lerpCol("#FFA43D", "#FFD23D", sk.noon); const m = col.match(/\d+/g).map(Number); sunIcon(gg, cx + Math.cos(a) * rx, hy + Math.sin(a) * ry + sk.drop * ry * 0.7, r, t, "#" + m.map((v) => v.toString(16).padStart(2, "0")).join(""), sk.day, 1.9); }
  if (sk.day < 0.999) { gg.save(); gg.globalAlpha = 1 - sk.day; circ(gg, cx, hy - ry * 0.85, r * 1.9, "rgba(255,243,176,0.22)"); circ(gg, cx, hy - ry * 0.85, r * 0.8, "#FFF3B0"); for (let k = 0; k < 6; k++) { const tw = 0.5 + 0.5 * Math.sin(t * 2.3 + k * 1.7); circ(gg, cx + (hash01(k, 41) - 0.5) * rx * 2.2, hy - ry * (0.2 + 0.9 * hash01(k, 43)), r * 0.08 * (1 + tw), `rgba(255,248,214,${0.5 + 0.5 * tw})`); } gg.restore(); }
}
