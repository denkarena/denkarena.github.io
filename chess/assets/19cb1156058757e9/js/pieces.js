/* Figurensätze – eine Quelle für alle Schachfiguren der App.
 * Standard ist der eigene DenkArena-Satz „turnier“ (erzeugt von scripts/figuren/build-figuren.py).
 * Klassisch, Messing und die verstärkte Darstellung nutzen dieselben Formen in eigenen Farben (style.css, .pc-std);
 * Silhouetten und Origami sind eigene Shop-Sätze nur fürs Brett.
 *   Pieces.inner(t, set)      Figur für das Brett (<span class="g">…</span>), Farbe kommt von .piece.w/.piece.b
 *   Pieces.icon(t, color)     Figur außerhalb des Bretts (Umwandlung, Serie, Ladeanzeige, Wandelzug-Folge …)
 *   Pieces.mono(t)            einfarbige Figur in currentColor (Avatar, Titel, Illustrationen)
 * Für CSS-Hintergründe stehen die Umrisse als --pc-mask-K … --pc-mask-P bereit. */
(function () {
  'use strict';
  // viewBox 0 0 100 100; Klassen: b = Körper, d = Details in Kontrastfarbe, c = Schnitt (Linie)
  const SETS = {
    /*FIGUREN-START*/ // erzeugt von scripts/figuren/build-figuren.py – nicht von Hand ändern
    turnier: { view: '-3.191 -1.064 106.383 106.383', base: '<path class="b" d="M16 91V87Q16 80.5 24 80H76Q84 80.5 84 87V91Z"/>',
      K: '<path class="b" d="M25 80C33 72 37 64 37 57H34Q31 57 31 54Q31 51 34 51H36C30 43 27 35 31 30C35 25 42 26 46.5 31V23H41.5Q40 23 40 21.5V18.5Q40 17 41.5 17H46.5V11Q46.5 9 48 9H52Q53.5 9 53.5 11V17H58.5Q60 17 60 18.5V21.5Q60 23 58.5 23H53.5V31C58 26 65 25 69 30C73 35 70 43 64 51H66Q69 51 69 54Q69 57 66 57H63C63 64 67 72 75 80Z"/><path class="c" d="M37 44H63"/>',
      Q: '<path class="b" d="M25 80C33 72 37 64 37 57H34Q31 57 31 54Q31 51 34 51H37L26 27L35 36L42 22L50 34L58 22L65 36L74 27L63 51H66Q69 51 69 54Q69 57 66 57H63C63 64 67 72 75 80Z"/><circle class="b" cx="26" cy="23.5" r="4.8"/><circle class="b" cx="42" cy="18" r="4.8"/><circle class="b" cx="58" cy="18" r="4.8"/><circle class="b" cx="74" cy="23.5" r="4.8"/>',
      R: '<path class="b" d="M25 80C32 73 35 64 35 46L30 42V22Q30 20 32 20H38.5Q40.5 20 40.5 22V26H45.5V22Q45.5 20 47.5 20H52.5Q54.5 20 54.5 22V26H59.5V22Q59.5 20 61.5 20H68Q70 20 70 22V42L65 46C65 64 68 73 75 80Z"/><path class="c" d="M36 46H64"/>',
      B: '<g transform="matrix(1 0 0 0.97 0 2.4)"><path class="b" d="M25 80C33 72 39 63 39 54H35Q32 54 32 51Q32 48 35 48H39C32 37 35 29 42 23L51 34L54 31L45.5 20.5Q47.5 19.5 50 18.5C63 26 67 37 61 48H65Q68 48 68 51Q68 54 65 54H61C61 63 67 72 75 80Z"/><circle class="b" cx="50" cy="14.5" r="4.4"/></g>',
      N: '<g transform="matrix(1 0 0 0.96 0 3.2)"><path class="b" d="M32 80C32.7 74.5 36.5 70.7 44 67C51 63 56 57 54 50C50 54 44 56 36 56Q33 56 31 58L29 60Q27 61 24 60L21 58Q17 56 17 52L18 46L32 28C36 23 41 20 46 18L48 10Q49 8 51 11L57 18C70 21 79 34 80 48C81 61 78 72 73 80Z"/><circle class="d" cx="41" cy="30" r="1.75"/><circle class="d" cx="23" cy="49" r="1.45"/></g>',
      P: '<path class="b" d="M25 80C32 72 38 63 38 55H34Q31 55 31 52.5Q31 50 34 50H44.5A13.5 13.5 0 1 1 55.5 50H66Q69 50 69 52.5Q69 55 66 55H62C62 63 68 72 75 80Z"/>'
    },
    /*FIGUREN-END*/
    club: {
      base: '<rect class="b" x="22" y="84" width="56" height="9" rx="2"/>',
      P: '<path class="b" d="M36 84L41 58H59L64 84Z"/><rect class="b" x="35" y="51" width="30" height="8" rx="2"/><circle class="b" cx="50" cy="37" r="13"/>',
      R: '<path class="b" d="M33 84L37 46H63L67 84Z"/><path class="b" d="M29 46V20H37.5V28H45.5V20H54.5V28H62.5V20H71V46Z"/>',
      B: '<path class="b" d="M36 84L41 58H59L64 84Z"/><rect class="b" x="34" y="51" width="32" height="8" rx="2"/><path class="b" d="M50 14C41 23 34 31 34 39C34 47 41 51 50 51C59 51 66 47 66 39C66 31 59 23 50 14Z"/><circle class="b" cx="50" cy="11" r="4.5"/><path class="c" d="M53 26L62 35"/>',
      N: '<path class="b" d="M70 84L66 58C72 48 72 32 64 22L60 16L54 10.5L50 18C45 19 39 22 35 27L22 41L23.5 48L29.5 47.8L25 50.8L29 53.3L39.5 50.8C40 53 41.5 55.5 43.5 58.5L39.5 84Z"/><circle class="d" cx="43" cy="29" r="2.8"/><circle class="d" cx="26.5" cy="42.5" r="1.4"/>',
      Q: '<path class="b" d="M35 84L41 52H59L65 84Z"/><rect class="b" x="32" y="45" width="36" height="8" rx="2"/><path class="b" d="M32 45L27 21L39 33L44 15L50 29L56 15L61 33L73 21L68 45Z"/><circle class="b" cx="27" cy="18" r="3.6"/><circle class="b" cx="44" cy="12" r="3.6"/><circle class="b" cx="56" cy="12" r="3.6"/><circle class="b" cx="73" cy="18" r="3.6"/>',
      K: '<path class="b" d="M35 84L41 52H59L65 84Z"/><rect class="b" x="32" y="45" width="36" height="8" rx="2"/><path class="b" d="M33 45C33 33 40 27 50 27C60 27 67 33 67 45Z"/><rect class="b" x="46.5" y="5" width="7" height="22" rx="1"/><rect class="b" x="40" y="11" width="20" height="7" rx="1"/>'
    },
    // gefaltete Figuren: Licht von links, Schattenflächen (s) rechts, Kanten wie Papierfalze
    origami: {
      base: '<path class="b" d="M22 93L27 84H73L78 93Z"/><path class="s" d="M50 84H73L78 93H50Z"/>',
      P: '<path class="b" d="M39 84L45 54H55L61 84Z"/><path class="s" d="M50 54H55L61 84H50Z"/><path class="b" d="M50 20L61 27L64 38L58 48L50 52L42 48L36 38L39 27Z"/><path class="s" d="M50 20L61 27L64 38L58 48L50 52Z"/><path class="f" d="M39 27L50 36L61 27M50 36V52"/>',
      R: '<path class="b" d="M32 84L36 45H64L68 84Z"/><path class="s" d="M50 45H64L68 84H50Z"/><path class="b" d="M28 45L30 18H38.5L39.5 26H46L46.5 18H53.5L54 26H60.5L61.5 18H70L72 45Z"/><path class="s" d="M50 18H53.5L54 26H60.5L61.5 18H70L72 45H50Z"/><path class="f" d="M30 33H70"/>',
      B: '<path class="b" d="M38 84L44 54H56L62 84Z"/><path class="s" d="M50 54H56L62 84H50Z"/><path class="b" d="M50 7L64 26L65 41L50 52L35 41L36 26Z"/><path class="s" d="M50 7L64 26L65 41L50 52Z"/><path class="c" d="M52 21L61 32"/><path class="f" d="M36 26L50 33L64 26M50 33V52"/>',
      N: '<path class="b" d="M41 84L45 60L40 55L29 53L22 45L25 36L38 22L48 17L53 7L59 16L68 29L71 46L66 58L69 84Z"/><path class="s" d="M59 16L68 29L71 46L66 58L69 84H55L57 46L53 24Z"/><path class="f" d="M25 36L38 38L48 17M38 38L45 60"/><path class="d" d="M41 28L47 27L44 31Z"/>',
      Q: '<path class="b" d="M37 84L43 51H57L63 84Z"/><path class="s" d="M50 51H57L63 84H50Z"/><path class="b" d="M30 50L25 19L38 33L44 9L50 28L56 9L62 33L75 19L70 50Z"/><path class="s" d="M50 28L56 9L62 33L75 19L70 50H50Z"/><path class="f" d="M30 50L38 33M70 50L62 33M44 9L50 50L56 9"/>',
      K: '<path class="b" d="M37 84L43 51H57L63 84Z"/><path class="s" d="M50 51H57L63 84H50Z"/><path class="b" d="M31 50L29 31L41 24L50 27L59 24L71 31L69 50Z"/><path class="s" d="M50 27L59 24L71 31L69 50H50Z"/><path class="b" d="M46.5 5H53.5V12H60V19H53.5V26H46.5V19H40V12H46.5Z"/><path class="s" d="M50 5H53.5V12H60V19H53.5V26H50Z"/><path class="f" d="M29 31L50 39L71 31M50 39V50"/>'
    }
  };
  // Dieselben Formen, andere Farben: Klassisch, Messing und die verstärkte Darstellung (hi-vis)
  const STD = ['turnier', 'klassik', 'messing', 'clear'];
  SETS.klassik = SETS.messing = SETS.clear = SETS.turnier;
  const viewOf = set => SETS[set].view || '0 0 100 100';
  const shape = (t, set = 'turnier') => SETS[set].base + SETS[set][t];
  // Ranglistenpartien: alle spielen mit dem Standardsatz, egal was im Shop ausgewählt ist.
  let locked = null;
  const setOf = () => {
    if (document.documentElement.classList.contains('hi-vis')) return 'clear';
    if (locked) return locked;
    const id = window.Shop && Shop.equipped('pieces'); const s = id ? id.split('.')[1] : 'turnier';
    return SETS[s] ? s : 'turnier';
  };
  // Außerhalb des Bretts: der gewählte Satz, wenn er unsere Formen nutzt, sonst der Standardsatz
  const iconSet = set => { const s = set || setOf(); return STD.includes(s) ? s : 'turnier'; };
  // auto: Figur folgt dem aktuellen Satz (Shop-Auswahl, Verstärkung), damit Pieces.refresh sie beim Umschalten neu zeichnen kann
  const svg = (t, set, extra = '', auto = '') => `<svg class="pc-svg pc-${set}${STD.includes(set) ? ' pc-std' : ''}${extra}" data-t="${t}"${auto ? ` data-auto="${auto}"` : ''} viewBox="${viewOf(set)}" aria-hidden="true" focusable="false">${shape(t, set)}</svg>`;
  // Umriss als Bild für CSS-Masken (Details ausgespart)
  const maskUrl = t => {
    const m = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${viewOf('turnier')}"><style>.b{fill:#fff;stroke:#fff;stroke-width:2.6;stroke-linejoin:round}.c{fill:none;stroke:#000;stroke-width:2.6;stroke-linecap:round}.d{fill:#000}</style><mask id="m">${shape(t)}</mask><rect x="-20" y="-20" width="140" height="140" mask="url(#m)"/></svg>`;
    return `url("data:image/svg+xml,${encodeURIComponent(m)}")`;
  };
  const Pieces = {
    SETS, STD,
    svg: (t, set) => svg(t, SETS[set] ? set : 'turnier'),
    inner(t, set) { const s = set || setOf(); return svg(t, SETS[s] ? s : 'turnier', '', set ? '' : 'inner'); },
    icon(t, color = 'w', { set, cls = '' } = {}) { return svg(t, iconSet(set), ` pc-icon is-${color === 'b' ? 'b' : 'w'}${cls ? ' ' + cls : ''}`, set ? '' : 'icon'); },
    mono(t, cls = '') { return `<svg class="pc-mono${cls ? ' ' + cls : ''}" viewBox="${viewOf('turnier')}" aria-hidden="true" focusable="false">${shape(t)}</svg>`; },
    maskUrl,
    cls(set) { const s = set || setOf(); return (set ? '' : ' pcs-auto') + (s === 'turnier' ? '' : ' pcs-' + s); },
    // Nach dem Umschalten der Verstärkung (oder des Satzes) bereits gezeichnete Figuren und Bretter anpassen
    refresh(root = document) {
      const now = setOf(), inner = SETS[now] ? now : 'turnier', icon = iconSet();
      root.querySelectorAll('.pcs-auto').forEach(el => { el.className = el.className.replace(/\s*pcs-(?!auto)\S+/g, '') + (now === 'turnier' ? '' : ' pcs-' + now); });
      root.querySelectorAll('svg.pc-svg[data-auto]').forEach(el => {
        const t = el.dataset.t;
        if (!SETS.turnier[t]) return;
        if (el.dataset.auto === 'icon') {
          if (el.classList.contains('pc-' + icon)) return;
          for (const s of STD) el.classList.remove('pc-' + s);
          el.classList.add('pc-' + icon);
        } else if (!el.classList.contains('pc-' + inner)) el.outerHTML = svg(t, inner, '', 'inner');
      });
    },
    lock(set) { locked = set || null; },
    locked: () => locked
  };
  window.Pieces = Pieces;
  try { const st = document.documentElement.style; for (const t of 'KQRBNP') st.setProperty('--pc-mask-' + t, maskUrl(t)); } catch (e) { /* ohne Masken bleiben nur CSS-Hintergründe leer */ }
})();
