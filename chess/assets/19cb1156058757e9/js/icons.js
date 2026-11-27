/* Eigenes Strich-Icon-Set (SVG) und Illustrationen der Spielkarten – keine Emojis */
(function () {
  'use strict';
  const P = {
    back: '<path d="M15.5 5l-7 7 7 7"/>',
    chart: '<path d="M4 20h16"/><path d="M7 16.5v-5M12 16.5V6.5M17 16.5v-8"/>',
    help: '<circle cx="12" cy="12" r="8.5"/><path d="M9.6 9.4a2.5 2.5 0 0 1 4.8.9c0 1.7-2.4 2.2-2.4 3.7"/><path d="M12 17.2v.1"/>',
    restart: '<path d="M4.5 12a7.5 7.5 0 1 0 2.2-5.3"/><path d="M4 4.5V8h3.5"/>',
    undo: '<path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 0 11H11"/>',
    hint: '<path d="M9.5 18h5M10.5 21h3"/><path d="M12 3a6 6 0 0 0-3.6 10.8c.7.6 1.1 1.3 1.1 2.2h5c0-.9.4-1.6 1.1-2.2A6 6 0 0 0 12 3z"/>',
    palette: '<path d="M12 3a9 9 0 1 0 0 18c.9 0 1.4-.6 1.4-1.4 0-.8-.6-1.2-.6-2 0-.8.7-1.4 1.5-1.4H17a4 4 0 0 0 4-4C21 7 17 3 12 3z"/><circle cx="7.5" cy="11.5" r="1"/><circle cx="10" cy="7.5" r="1"/><circle cx="14.5" cy="7.5" r="1"/>',
    flip: '<path d="M7 20V4M4 7l3-3 3 3M17 4v16M14 17l3 3 3-3"/>',
    erase: '<path d="M20 6H9l-6 6 6 6h11a1 1 0 0 0 1-1V7a1 1 0 0 0-1-1z"/><path d="M12.5 9.5l5 5M17.5 9.5l-5 5"/>',
    pencil: '<path d="M4 20l1-4.2L16.2 4.6a1.4 1.4 0 0 1 2 0l1.2 1.2a1.4 1.4 0 0 1 0 2L8.2 19 4 20z"/><path d="M14.5 6.3l3.2 3.2"/>',
    flag: '<path d="M6 21V4"/><path d="M6 4h11l-2.5 4L17 12H6"/>',
    more: '<circle cx="5" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.5" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.5" fill="currentColor" stroke="none"/>',
    // Remis = ½: 1 und 2 mit gleichem Abstand zum Bruchstrich
    half: '<path d="M6.2 6.3L8 5v7"/><path d="M18 4L6 20"/><path d="M15.5 14.1a2.1 2.1 0 1 1 3.7 1.4L15.5 19.5h4.3"/>',
    reveal: '<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="2.2"/>',
    gear: '<path d="M18.85 10.54 L21.22 10.79 L21.22 13.21 L18.85 13.46 L17.87 15.81 L19.37 17.67 L17.67 19.37 L15.81 17.87 L13.46 18.85 L13.21 21.22 L10.79 21.22 L10.54 18.85 L8.19 17.87 L6.33 19.37 L4.63 17.67 L6.13 15.81 L5.15 13.46 L2.78 13.21 L2.78 10.79 L5.15 10.54 L6.13 8.19 L4.63 6.33 L6.33 4.63 L8.19 6.13 L10.54 5.15 L10.79 2.78 L13.21 2.78 L13.46 5.15 L15.81 6.13 L17.67 4.63 L19.37 6.33 L17.87 8.19Z" stroke-linejoin="round"/><circle cx="12" cy="12" r="2.8"/>',
    sliders: '<path d="M4 7h9M17 7h3M4 17h3M11 17h9"/><circle cx="15" cy="7" r="2"/><circle cx="9" cy="17" r="2"/>',
    lock: '<rect x="5" y="11" width="14" height="9" rx="2"/><path d="M8.5 11V8a3.5 3.5 0 0 1 7 0v3"/>',
    check: '<path d="M5 12.5l4.2 4.2L19 7"/>',
    close: '<path d="M6 6l12 12M18 6L6 18"/>',
    crown: '<path d="M3.5 8.5l4.2 3.8L12 5.5l4.3 6.8 4.2-3.8-1.8 10H5.3z"/><path d="M5.5 21h13"/>',
    trophy: '<path d="M8 4h8v5a4 4 0 0 1-8 0V4z"/><path d="M8 6H5a3 3 0 0 0 3 4M16 6h3a3 3 0 0 1-3 4M12 13v4M8.5 20.5h7"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4.5 21a7.5 7.5 0 0 1 15 0"/>',
    cpu: '<rect x="6.5" y="6.5" width="11" height="11" rx="2"/><path d="M10 3v3.5M14 3v3.5M10 17.5V21M14 17.5V21M3 10h3.5M3 14h3.5M17.5 10H21M17.5 14H21"/><rect x="10" y="10" width="4" height="4"/>',
    users: '<circle cx="9" cy="8" r="3.5"/><path d="M2.5 20a6.5 6.5 0 0 1 13 0"/><path d="M16 4.6a3.5 3.5 0 0 1 0 6.8M18 14.2a6.5 6.5 0 0 1 3.5 5.8"/>',
    dice: '<rect x="4" y="4" width="16" height="16" rx="3"/><circle cx="9" cy="9" r="1.1"/><circle cx="15" cy="15" r="1.1"/><circle cx="15" cy="9" r="1.1"/><circle cx="9" cy="15" r="1.1"/>',
    play: '<path d="M8 5.5v13l10.5-6.5z"/>',
    clock: '<circle cx="12" cy="12" r="8.5"/><path d="M12 7.5V12l3 2"/>',
    sound: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M15.5 9a4 4 0 0 1 0 6M18 6.5a7.5 7.5 0 0 1 0 11"/>',
    mute: '<path d="M4 9.5v5h3.5L12 18.5v-13L7.5 9.5H4z"/><path d="M16 9.5l5 5M21 9.5l-5 5"/>',
    chevron: '<path d="M8.5 5l7 7-7 7"/>',
    chat: '<path d="M4 5.5h16v10H9l-5 4z"/>',
    mail: '<rect x="3.5" y="5.5" width="17" height="13" rx="2"/><path d="M4 7l8 6 8-6"/>',
    copy: '<rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5.5A1.5 1.5 0 0 0 14.5 4h-9A1.5 1.5 0 0 0 4 5.5v9A1.5 1.5 0 0 0 5.5 16H8"/>',
    code: '<rect x="2.5" y="7" width="19" height="10" rx="2.5"/><circle cx="7" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="10.5" cy="12" r=".9" fill="currentColor" stroke="none"/><circle cx="14" cy="12" r=".9" fill="currentColor" stroke="none"/><path d="M17.5 10v4"/>',
    first: '<path d="M17 5l-7 7 7 7M7 5v14"/>',
    last: '<path d="M7 5l7 7-7 7M17 5v14"/>',
    mine: '<circle cx="12" cy="12" r="5.2" fill="currentColor"/><path d="M12 3.5v3M12 17.5v3M3.5 12h3M17.5 12h3M6 6l2.1 2.1M15.9 15.9L18 18M6 18l2.1-2.1M15.9 8.1L18 6"/>',
    ad: '<rect x="3" y="5" width="18" height="14" rx="2"/><path d="M7.5 15l2.2-6 2.3 6M8.3 13h2.9M14.5 9v6h1.3a2.2 2.2 0 0 0 2.2-2.2v-1.6A2.2 2.2 0 0 0 15.8 9z"/>'
  };
  window.Icon = (name, cls = '') =>
    `<svg class="ico ${cls}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${P[name] || ''}</svg>`;

  // Illustrationen für die Spielkarten (Messing-Strichzeichnung)
  const ART = {
    chess: () => `<svg viewBox="0 0 96 96" aria-hidden="true">
      <g stroke="currentColor" stroke-width="1.2">${[0, 1, 2, 3, 4].map(i => `<rect x="${10 + i * 15.2}" y="74" width="15.2" height="10" fill="${i % 2 ? 'currentColor' : 'none'}" fill-opacity=".35"/>`).join('')}</g>
      ${window.Pieces?`<svg x="14" y="10" width="68" height="68" class="art-pc">${Pieces.mono('N')}</svg>`:''}</svg>`,
    metamorph: () => `<svg viewBox="0 0 96 96" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="1.2" opacity=".35">${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${18 + c * 20}" y="${18 + r * 20}" width="20" height="20" fill="${(r + c) % 2 ? 'currentColor' : 'none'}" fill-opacity=".22"/>`).join('')).join('')}</g>
      ${window.Pieces?`<svg x="16" y="52" width="24" height="24" class="art-pc">${Pieces.mono('N')}</svg>`:''}
      ${window.Pieces?`<svg x="56" y="12" width="24" height="24" class="art-pc">${Pieces.mono('R')}</svg>`:''}
      <path d="M33 56 C 40 40, 52 34, 60 33" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="3 3"/>
      <circle cx="48" cy="48" r="4" fill="currentColor"/><circle cx="68" cy="68" r="4" fill="currentColor"/><circle cx="28" cy="28" r="4" fill="currentColor" opacity=".55"/></svg>`,
    puzzles: () => `<svg viewBox="0 0 96 96" aria-hidden="true">
      <g fill="none" stroke="currentColor" stroke-width="1.2" opacity=".4">${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${18 + c * 20}" y="${18 + r * 20}" width="20" height="20" fill="${(r + c) % 2 ? 'currentColor' : 'none'}" fill-opacity=".25"/>`).join('')).join('')}</g>
      ${window.Pieces?`<svg x="50" y="41" width="36" height="36" class="art-pc">${Pieces.mono('K')}</svg>`:''}
      <path d="M24 74L52 50" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"/><path d="M45 49l8.5 0.5-1 8.4" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    sudoku: `<svg viewBox="0 0 96 96" aria-hidden="true"><g fill="none" stroke="currentColor">
      <rect x="14" y="14" width="68" height="68" rx="3" stroke-width="2"/>
      <path d="M36.7 14v68M59.3 14v68M14 36.7h68M14 59.3h68" stroke-width="1.2" opacity=".6"/></g>
      <g class="art-num" text-anchor="middle" font-size="15"><text x="25.3" y="30.6">5</text><text x="48" y="53.3">9</text><text x="70.7" y="76">3</text><text x="70.7" y="30.6" opacity=".45">7</text><text x="25.3" y="76" opacity=".45">1</text></g></svg>`,
    mines: `<svg viewBox="0 0 96 96" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.4">
      ${[0, 1, 2].map(r => [0, 1, 2].map(c => `<rect x="${16 + c * 22}" y="${16 + r * 22}" width="20" height="20" rx="2.5" opacity="${(r + c) % 3 ? '.35' : '.7'}"/>`).join('')).join('')}
      <path d="M44 34V22M44 22h8l-2 3 2 3h-8" stroke-width="1.6"/></g>
      <g class="art-num" text-anchor="middle" font-size="12"><text x="26" y="52">1</text><text x="70" y="52">2</text><text x="48" y="74">1</text></g>
      <circle cx="70" cy="70" r="4.5" fill="currentColor"/></svg>`,
    connect4: `<svg viewBox="0 0 96 96" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="1.3" opacity=".35">
      ${[0, 1, 2, 3].map(r => [0, 1, 2, 3].map(c => `<circle cx="${21 + c * 18}" cy="${21 + r * 18}" r="7"/>`).join('')).join('')}</g>
      ${[0, 1, 2, 3].map(i => `<circle cx="${21 + i * 18}" cy="${75 - i * 18}" r="7" fill="currentColor"/>`).join('')}</svg>`
  };
  window.Art = id => (typeof ART[id] === 'function' ? ART[id]() : ART[id]) || '';
  // Logo: die Wandelfigur – links Springer (Elfenbein), rechts Turm (Messing), getrennt durch eine feine Naht.
  // Ausschnitt so gewählt, dass der Fuß (x 34–86) mittig steht, nicht die breitere Kopfpartie
  const KN = 'M58.5 92H34v-6h6.5L44.5 58C42.5 55 41 52.5 40.5 50L30 52.5l-4-2.5 4.5-3-6 .2-1.5-7L36.5 26c4-4.5 9.5-7 14-8l3.5-6 4.5 3.5z';
  const RK = 'M61.5 92H86v-6h-6.5l-4.5-30V43l6-5V19h-5.5v6H71v-6h-4.5v6h-5z';
  window.LOGO_PATHS = { KN, RK };
  window.Logo = (size = 28, cls = '') => `<svg class="logo ${cls}" width="${size}" height="${size}" viewBox="16 13 88 88" aria-hidden="true">
    <path class="lg-kn" d="${KN}" fill="#ece5d5"/><circle class="lg-eye" cx="44" cy="28" r="2.7" fill="#0f1513"/><circle class="lg-eye" cx="27.5" cy="41.5" r="1.3" fill="#0f1513"/>
    <path class="lg-rk" d="${RK}" fill="#c9a45c"/></svg>`;
  window.Wordmark = () => `<span class="wordmark">Denk<span>Arena</span></span>`;

})();
