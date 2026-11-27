// Vor i18n und app-core: ausschließlich den eigenen Sprachschlüssel verwenden.
(() => {
  'use strict';
  const codes = ['de','en','tr','es','pt','fr','it','pl'], key = 'da-demo.chess.v1.lang';
  const query = new URL(location.href).searchParams.get('lang');
  let saved; try { saved = JSON.parse(localStorage.getItem(key)); } catch { /* privater Modus */ }
  const system = (navigator.languages?.[0] || navigator.language || 'en').slice(0,2).toLowerCase();
  const lang = codes.includes(query) ? query : codes.includes(saved) ? saved : codes.includes(system) ? system : 'en';
  // Die erzeugte i18n-Kopie übernimmt diese geprüfte Sprachwahl.
  try { localStorage.setItem(key, JSON.stringify(lang)); } catch { /* Sitzung ohne Speicher */ }
  window.DA_DEMO_LANG = lang;
})();
