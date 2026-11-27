/* Eigener Website-Einstieg. Kein Konto, Backend, Kauf- oder Werbemodul. */
(() => {
  'use strict';
  const lang = LANG, text = window.DA_DEMO_COPY[lang], view = document.getElementById('view');
  document.documentElement.lang = lang;
  document.title = T('Schach') + ' · DenkArena';
  for (const el of document.querySelectorAll('[data-copy]')) el.textContent = text[el.dataset.copy];
  document.getElementById('demo-language').value = lang;
  document.getElementById('demo-language').setAttribute('aria-label', text.language);
  document.getElementById('demo-settings').innerHTML = Icon('gear');
  document.getElementById('demo-settings').setAttribute('aria-label', T('Anzeige und Ton'));
  document.getElementById('demo-game-title').textContent = T('Schach');
  const play = new URL('https://play.google.com/store/apps/details');
  play.searchParams.set('id', 'io.github.denkarena'); play.searchParams.set('hl', lang);
  play.searchParams.set('referrer', 'utm_source=web-chess&utm_medium=referral&utm_campaign=chess-demo');
  for (const a of document.querySelectorAll('[data-play]')) a.href = play.href;
  document.getElementById('demo-privacy').href = '../' + (lang === 'de' ? 'datenschutz.html' : 'privacy.html');
  document.getElementById('demo-legal').href = '../' + (lang === 'de' ? 'impressum.html' : 'legal-notice.html');
  function applyDisplay() {
    const root = document.documentElement;
    for (const [cls, key] of [['big-text','bigText'],['hi-vis','strong'],['high-contrast','contrast'],['color-patterns','patterns']]) root.classList.toggle(cls, Store.get('a11y.' + key, false) === true);
    Sound.on = Store.get('sound', true); Haptic.on = false;
    Pieces.refresh(view); window.dispatchEvent(new Event('resize'));
  }
  let displayDone = null;
  async function display() {
    if (displayDone || UI.isModalOpen()) return;
    let release;
    displayDone = new Promise(resolve => { release = resolve; });
    const fields = [['sound', T('Sound'), Sound.on], ['a11y.bigText', T('Große Schrift'), Store.get('a11y.bigText', false)],
      ['a11y.strong', T('Figuren und Brett verstärken'), Store.get('a11y.strong', false)], ['a11y.contrast', T('Mehr Kontrast'), Store.get('a11y.contrast', false)],
      ['a11y.patterns', T('Farben durch Muster ergänzen'), Store.get('a11y.patterns', false)]];
    UI._held = true;
    try { await UI.modal({ title:T('Anzeige und Ton'), cls:'settings-modal display-modal', html:`<div class="set-card">${fields.map(([key,label,on])=>`<label class="set-row"><span class="set-l"><b>${UI.esc(label)}</b></span><input type="checkbox" data-pref="${key}"${on?' checked':''}></label>`).join('')}</div>`,
      buttons:[{label:T('Fertig'),value:null,primary:true}], onOpen(card) { card.querySelectorAll('[data-pref]').forEach(input => input.onchange = () => { Store.set(input.dataset.pref, input.checked); applyDisplay(); }); } });
    } finally { UI._held = false; displayDone = null; release(); }
  }
  const ctx = Object.freeze({
    webdemo:true, isPremium:()=>false, refreshPremium:async()=>false,
    modal:async o=>{ if (displayDone) await displayDone; return UI.modal(o); }, beforeNewGame:async()=>{},
    recordResult:()=>{}, hintGate:async()=>true, rewarded:async()=>true, hintCost:()=>'', openDisplay:display,
    // In der Demo wird kein anderer Spiel-Einstieg angeboten, auch nicht über gespeicherte Optionen.
    openGame:()=>{}, back:()=>{}, home:()=>{}, requireAccount:async()=>false, paywall:async()=>false
  });
  applyDisplay();
  Games.chess.mount(view, ctx, { resume:true });
  document.getElementById('demo-start').onclick = () => {
    if (UI.isModalOpen()) return;
    const button = view.querySelector('.lobby:not(.hidden) .lb-start') || view.querySelector('.match:not(.hidden) [data-a=new]');
    button?.click(); view.scrollIntoView({block:'nearest'});
  };
  document.getElementById('demo-settings').onclick = display;
  document.getElementById('demo-language').onchange = event => {
    const next = event.target.value;
    if (!Object.hasOwn(window.DA_DEMO_COPY, next)) return;
    Store.set('lang', next);
    const url = new URL(location.href); url.searchParams.set('lang', next); location.assign(url);
  };
  let warned = false;
  const warn = () => { if (!warned) { warned = true; UI.toast(text.failed, 6000); } };
  addEventListener('da:store-failed', warn); if (Store.failed) warn();
  addEventListener('pagehide', () => Games.chess.unmount());
})();
