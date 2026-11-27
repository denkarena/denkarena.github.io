/* Basis-Helfer: Speicher, Sound, Dialoge, Konfetti */
(function () {
  'use strict';

  // Speicher voll: nur Daten wegräumen, die die App jederzeit neu erzeugen kann (Analyse-Zwischenspeicher,
  // Tagesdaten älter als 30 Tage). Archiv, Entwürfe, Fehlerübungen, laufende Spiele, Sitzung und Fortschritt bleiben immer.
  const isQuota = e => !!e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22 || e.code === 1014);
  const OLD_DAY = /^da-demo\.chess\.v1\.(?:daily\.(\d{4}-\d{2}-\d{2})(?:\.[a-z]+)?|sudoku\.daily\.(\d{4}-\d{2}-\d{2})|mm\.daily\.(\d{4}-\d{2}-\d{2}))$/;
  function freeSpace() {
    let freed = 0;
    try {
      const drop = [], limit = Date.now() - 30 * 86400000;
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i), m = k && k.match(OLD_DAY);
        if (k === 'da-demo.chess.v1.chess.analysis.local') drop.push(k);
        else if (m) { const t = Date.parse((m[1] || m[2] || m[3]) + 'T12:00:00Z'); if (t < limit) drop.push(k); }
      }
      for (const k of drop) { localStorage.removeItem(k); freed++; }
    } catch (e) { /* kein Zugriff */ }
    return freed;
  }
  // Die Sitzung darf nach einem Schreibfehler nicht verloren gehen, sonst entstünde bei jedem Aufruf ein neues Gastkonto.
  // Ebenso die frische Server-Einstellung (sonst bliebe etwa ein Pflicht-Update aktiv, obwohl es aufgehoben wurde).
  const KEEP_IN_MEMORY = new Set(['cloud.session', 'cloud.config']), memory = new Map();
  const Store = {
    failed: 0,
    get(k, d) {
      if (memory.has(k)) return JSON.parse(memory.get(k));
      try { const v = localStorage.getItem('da-demo.chess.v1.' + k); return v == null ? d : JSON.parse(v); }
      catch (e) { return d; }
    },
    // true = gespeichert. Bei vollem Speicher wird einmal aufgeräumt und genau einmal wiederholt.
    set(k, v) {
      let text;
      try { text = JSON.stringify(v); localStorage.setItem('da-demo.chess.v1.' + k, text); memory.delete(k); return true; }
      catch (e) {
        if (text !== undefined && isQuota(e) && freeSpace()) {
          try { localStorage.setItem('da-demo.chess.v1.' + k, text); memory.delete(k); return true; } catch (e2) { /* weiter unten */ }
        }
      }
      if (KEEP_IN_MEMORY.has(k) && text !== undefined) memory.set(k, text);
      // Ein reiner Zwischenspeicher ist kein Fortschritt: kein Hinweis
      if (k === 'chess.analysis.local') return false;
      this.failed++;
      try { window.dispatchEvent(new CustomEvent('da:store-failed', { detail: { key: k } })); } catch (e) { /* sehr früh beim Start */ }
      return false;
    },
    del(k) { memory.delete(k); try { localStorage.removeItem('da-demo.chess.v1.' + k); } catch (e) { /* ignorieren */ } }
  };

  // Fühlbare Rückmeldung: in der App über Capacitor Haptics, im Browser über navigator.vibrate
  const Haptic = {
    on: Store.get('haptic', true),
    _native() { const C = window.Capacitor; return C && C.isNativePlatform && C.isNativePlatform() && C.Plugins && C.Plugins.Haptics; },
    fire(kind) {
      if (!this.on) return;
      try {
        const H = this._native();
        if (H) {
          if (kind === 'sel') H.selectionChanged ? H.selectionChanged() : H.impact({ style: 'LIGHT' });
          else if (kind === 'light' || kind === 'medium' || kind === 'heavy') H.impact({ style: kind.toUpperCase() });
          else H.notification({ type: { ok: 'SUCCESS', warn: 'WARNING', bad: 'ERROR' }[kind] });
          return;
        }
        const pat = { sel: 6, light: 10, medium: 18, heavy: 32, ok: [12, 60, 24], warn: [24, 40, 24], bad: [36, 50, 36] }[kind];
        // Browser erlauben Vibration erst nach einer Berührung
        if (pat && navigator.vibrate && (!navigator.userActivation || navigator.userActivation.hasBeenActive)) navigator.vibrate(pat);
      } catch (e) { /* kein Vibrationsmotor */ }
    },
    forSound(name) {
      const k = { move: 'light', place: 'light', capture: 'medium', check: 'medium', pop: 'medium', error: 'warn', win: 'ok', lose: 'bad', boom: 'heavy' }[name];
      if (k) this.fire(k);
    }
  };

  // Klangdesign: alles live per WebAudio erzeugt (keine Audiodateien).
  // Holzklick = gefiltertes Rauschen + tiefer Körper, Töne = Marimba-artige Sinus-Partials, dazu dezenter Raumhall.
  const Sound = {
    ctx: null, out: null, rev: null, noise: null,
    on: Store.get('sound', true),
    init() {
      if (this.ctx) return this.ctx;
      const c = new (window.AudioContext || window.webkitAudioContext)();
      const comp = c.createDynamicsCompressor();
      comp.threshold.value = -18; comp.ratio.value = 4;
      const master = c.createGain(); master.gain.value = 0.8;
      master.connect(comp).connect(c.destination);
      // künstlicher Raumhall aus abklingendem Rauschen
      const len = c.sampleRate * 1.4, ir = c.createBuffer(2, len, c.sampleRate);
      for (let ch = 0; ch < 2; ch++) {
        const d = ir.getChannelData(ch);
        for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.2);
      }
      const rev = c.createConvolver(); rev.buffer = ir;
      const revOut = c.createGain(); revOut.gain.value = 0.22;
      rev.connect(revOut).connect(master);
      const nb = c.createBuffer(1, c.sampleRate * 0.5, c.sampleRate), nd = nb.getChannelData(0);
      for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;
      Object.assign(this, { ctx: c, out: master, rev, noise: nb });
      return c;
    },
    _route(node, wet) {
      node.connect(this.out);
      if (wet) { const g = this.ctx.createGain(); g.gain.value = wet; node.connect(g).connect(this.rev); }
    },
    // kurzer, trockener Anschlag (Holz, Klick)
    knock(t, freq, vol, dur, q = 5, wet = 0.15) {
      const c = this.ctx, src = c.createBufferSource(), bp = c.createBiquadFilter(), g = c.createGain();
      src.buffer = this.noise; bp.type = 'bandpass'; bp.frequency.value = freq; bp.Q.value = q;
      g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      src.connect(bp).connect(g); this._route(g, wet);
      src.start(t); src.stop(t + dur + 0.02);
    },
    // Körper / Resonanz mit leichtem Tonhöhenabfall
    body(t, freq, vol, dur, wet = 0.1) {
      const c = this.ctx, o = c.createOscillator(), g = c.createGain();
      o.type = 'sine'; o.frequency.setValueAtTime(freq * 1.35, t); o.frequency.exponentialRampToValueAtTime(freq, t + 0.03);
      g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol, t + 0.004); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
      o.connect(g); this._route(g, wet);
      o.start(t); o.stop(t + dur + 0.02);
    },
    // Marimba-/Glockenton aus Grundton + Obertönen
    note(t, freq, vol, dur, wet = 0.35, bright = 1) {
      const c = this.ctx;
      [[1, 1], [3.9, 0.22 * bright], [9.2, 0.06 * bright]].forEach(([m, a]) => {
        const o = c.createOscillator(), g = c.createGain();
        o.type = 'sine'; o.frequency.value = freq * m;
        const d = dur / (m > 1 ? m * 0.7 : 1);
        g.gain.setValueAtTime(0.0001, t); g.gain.linearRampToValueAtTime(vol * a, t + 0.006); g.gain.exponentialRampToValueAtTime(0.0006, t + d);
        o.connect(g); this._route(g, wet);
        o.start(t); o.stop(t + d + 0.02);
      });
    },
    play(name) {
      Haptic.forSound(name);
      if (!this.on) return;
      try {
        const c = this.init();
        if (c.state === 'suspended') c.resume();
        const t = c.currentTime + 0.005, r = (a, b) => a + Math.random() * (b - a);
        switch (name) {
          case 'tap': this.knock(t, 3400, 0.09, 0.025, 3, 0); break;
          case 'move': this.knock(t, r(1250, 1450), 0.55, 0.06, 6); this.body(t, r(165, 185), 0.32, 0.09); break;
          case 'capture':
            this.knock(t, 1150, 0.6, 0.07, 6); this.body(t, 140, 0.4, 0.1);
            this.knock(t + 0.05, 2100, 0.3, 0.05, 7); break;
          case 'check': this.note(t, 784, 0.16, 0.9, 0.5, 0.6); this.note(t + 0.07, 1175, 0.1, 0.9, 0.5, 0.4); break;
          case 'pop': this.note(t, r(640, 700), 0.2, 0.35, 0.25); break;
          case 'place': this.knock(t, 900, 0.35, 0.05, 4); this.body(t, 220, 0.3, 0.12); break;
          case 'error': this.body(t, 105, 0.45, 0.18, 0); this.knock(t, 500, 0.2, 0.08, 2, 0); break;
          case 'win': [523.3, 659.3, 784, 1046.5].forEach((f, i) => this.note(t + i * 0.11, f, 0.17, 1.6, 0.55));
            this.note(t + 0.5, 1318.5, 0.08, 2, 0.7, 0.3); break;
          case 'lose': [392, 311.1, 261.6].forEach((f, i) => this.note(t + i * 0.16, f, 0.15, 1.2, 0.5, 0.4)); break;
          case 'boom': {
            const src = c.createBufferSource(), lp = c.createBiquadFilter(), g = c.createGain();
            src.buffer = this.noise; lp.type = 'lowpass'; lp.frequency.setValueAtTime(1400, t); lp.frequency.exponentialRampToValueAtTime(120, t + 0.5);
            g.gain.setValueAtTime(0.7, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.55);
            src.connect(lp).connect(g); this._route(g, 0.4); src.start(t); src.stop(t + 0.56);
            this.body(t, 55, 0.6, 0.4); break;
          }
        }
      } catch (e) { /* kein Audio verfügbar */ }
    },
    // Vibration läuft über Haptic (respektiert die Einstellung)
    vibrate() { Haptic.fire('medium'); }
  };
  // Mobile Browser geben Audio erst nach einer Berührung frei
  document.addEventListener('pointerdown', () => { try { if (Sound.on) { const c = Sound.init(); if (c.state === 'suspended') c.resume(); } } catch (e) { /* egal */ } }, { once: true, capture: true });

  const esc = s => String(s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));

  let modalResolve = null, listCancel = null, listSequence = 0;
  const UI = {
    esc,
    // A short visual acknowledgement, independent of board input and drag handling.
    pieceRipple(cell) {
      if(!cell||UI.reducedMotion())return;
      cell.querySelector('.piece-ripple')?.remove();
      const ring=document.createElement('span');ring.className='piece-ripple';ring.setAttribute('aria-hidden','true');
      cell.appendChild(ring);ring.addEventListener('animationend',()=>ring.remove(),{once:true});
      setTimeout(()=>ring.remove(),450);
    },
    // Dialog mit Knöpfen; Promise liefert value des gedrückten Knopfs (null = geschlossen)
    modal({ title = '', html = '', buttons = [{ label: 'OK', value: true, primary: true }], dismissable = true, cls = '', onOpen } = {}) {
      UI.closeModal(null);
      UI.clearToast();
      const m = document.getElementById('modal');
      m._returnFocus=document.activeElement;
      m.className = 'modal ' + cls;
      m.classList.toggle('motion-calm', !UI.reducedMotion());
      m.setAttribute('role', 'dialog'); m.setAttribute('aria-modal', 'true');
      m.innerHTML = `<div class="modal-card" tabindex="-1">
        ${title ? `<h2>${title}</h2>` : ''}
        <div class="modal-body">${html}</div>
        <div class="modal-btns">${buttons.map((b, i) =>
          `<button data-i="${i}" class="btn ${b.primary ? 'primary' : ''} ${b.danger ? 'danger' : ''} ${b.cls || ''} ${b.hint?'has-hint':''}" ${b.hint?`aria-label="${esc(b.label)}" aria-describedby="modal-hint-${i}"`:''}>${b.label}${b.hint?`<small id="modal-hint-${i}" class="modal-action-hint">${esc(b.hint)}</small>`:''}</button>`).join('')}</div>
      </div>`;
      const heading=m.querySelector('h2');
      if(heading){heading.id='modal-heading';m.setAttribute('aria-labelledby',heading.id);}else m.removeAttribute('aria-labelledby');
      m.onkeydown=e=>{
        if(e.key==='Escape'&&dismissable){e.preventDefault();e.stopPropagation();UI.closeModal(null);}
        if(e.key!=='Tab')return;
        const fields=[...m.querySelectorAll('button:not(:disabled),a[href],input:not(:disabled),select:not(:disabled),textarea:not(:disabled),summary,[tabindex="0"]')].filter(f=>{const closed=f.closest('details:not([open])');return f.getClientRects().length&&!f.closest('[inert]')&&(!closed||closed.querySelector('summary')===f);});
        const first=fields[0],last=fields[fields.length-1];
        if(!first){e.preventDefault();m.querySelector('.modal-card').focus();}
        else if(e.shiftKey&&(document.activeElement===first||!fields.includes(document.activeElement))){e.preventDefault();last.focus();}
        else if(!e.shiftKey&&(document.activeElement===last||!fields.includes(document.activeElement))){e.preventDefault();first.focus();}
      };
      return new Promise(res => {
        modalResolve = res;
        m.querySelectorAll('.modal-btns button').forEach(btn => {
          btn.onclick = () => { Sound.play('tap'); UI.closeModal(buttons[+btn.dataset.i].value); };
        });
        m.onclick = e => { if (e.target === m && dismissable) UI.closeModal(null); };
        m.dataset.dismissable = dismissable ? '1' : '';
        requestAnimationFrame(() => m.classList.add('show'));
        document.dispatchEvent(new CustomEvent('da:modal', { detail: true })); // z. B. Werbebanner ausblenden
        // ein Fehler in onOpen darf das Fenster nicht unbedienbar machen; gemeldet wird er trotzdem (Fehlerberichte im Admin)
        if (onOpen) { try { onOpen(m.querySelector('.modal-card')); } catch (e) { setTimeout(() => { throw e; }); } }
        if (!m.contains(document.activeElement)) { try { m.querySelector('.modal-card').focus({ preventScroll: true }); } catch (e) { /* egal */ } }
      });
    },
    isModalOpen() { return !document.getElementById('modal').classList.contains('hidden'); },
    // „Anzeige und Ton“ im Spiel ist offen: Gegenzüge und Offline-Schachuhr warten, bis es geschlossen ist
    held() { return !!UI._held && !document.getElementById('modal').classList.contains('hidden'); },
    loader(label=T('Einen Moment …'),{inline=true,decorative=false}={}) {
      return `<span class="ui-mini-loader${inline?' ui-inline-loader':''}" data-motion="${UI.reducedMotion()?'off':'on'}" ${decorative?'aria-hidden="true"':`role="progressbar" aria-label="${esc(label)}"`}><i class="ui-load-coin"></i><i class="ui-load-coin"></i><i class="ui-load-coin"></i><span class="ui-load-path" aria-hidden="true">${['N','B','R'].map(t=>`<span class="ui-load-piece">${window.Pieces?Pieces.icon(t,'w',{set:'turnier'}):''}</span>`).join('')}</span></span>`;
    },
    waiting(label=T('Lade …')) { return `<div class="ui-wait" role="status">${UI.loader(label,{decorative:true})}<span>${esc(label)}</span></div>`; },
    // Vor einem Fenster auf den Server warten: solange sind Eingaben gesperrt (sonst öffnet man inzwischen etwas anderes
    // und das verspätete Fenster schiebt sich darüber). Ladekreis erst nach kurzer Zeit, nach höchstens 10 s Abbruch (Fehler).
    async load(p, ms = 10000) {
      let ov = document.getElementById('ui-loading');
      if (!ov) { ov = document.createElement('div'); ov.id = 'ui-loading';
        ov.innerHTML = UI.loader(T('Einen Moment …'),{inline:false});
        document.body.appendChild(ov); }
      ov.dataset.motion=UI.reducedMotion()?'off':'on';
      UI._loads = (UI._loads || 0) + 1;
      ov.classList.add('block');
      const t = setTimeout(() => ov.classList.add('show'), 150);
      let to;
      try {
        return await Promise.race([Promise.resolve(p), new Promise((_, rej) => { to = setTimeout(() => rej(new Error('timeout')), ms); })]);
      } finally {
        clearTimeout(t); clearTimeout(to);
        if (--UI._loads <= 0) { UI._loads = 0; ov.classList.remove('block', 'show'); }
      }
    },
    isLoading() { return (UI._loads || 0) > 0; },
    // Real list placeholder, cancellable: closing it must never open a late result.
    async loadList(p, title) {
      if(listCancel)listCancel();
      const sequence=String(++listSequence);let done=false,opening=false,delay,timeout;
      let cancel;const cancelled=new Promise(resolve=>{cancel=()=>resolve(null);});listCancel=cancel;
      const own=()=>document.querySelector(`#modal .modal-card[data-list-request="${sequence}"]`);
      const otherModal=e=>{if(e.detail&&!opening)cancel();};
      const hidden=()=>{if(document.hidden)cancel();};
      document.addEventListener('da:modal',otherModal);document.addEventListener('visibilitychange',hidden);
      UI._loads=(UI._loads||0)+1;
      delay=setTimeout(()=>{
        if(done)return;opening=true;
        const modal=UI.modal({title,cls:'list-loading'+(UI.reducedMotion()?' list-static':''),
          html:`<div class="ui-list-skeleton" role="progressbar" aria-label="${esc(T('Einen Moment …'))}">${Array.from({length:5},()=>'<div aria-hidden="true"><i></i><span><b></b><small></small></span><em></em></div>').join('')}</div>`,
          buttons:[{label:T('Abbrechen'),value:null}],onOpen(card){card.dataset.listRequest=sequence;card.querySelector('.ui-list-skeleton').setAttribute('aria-busy','true');}});
        opening=false;modal.then(()=>{if(!done)cancel();});
      },150);
      try{return await Promise.race([Promise.resolve(p),cancelled,new Promise((_,reject)=>{timeout=setTimeout(()=>reject(new Error('timeout')),10000);})]);}
      finally{
        done=true;clearTimeout(delay);clearTimeout(timeout);
        document.removeEventListener('da:modal',otherModal);document.removeEventListener('visibilitychange',hidden);
        if(own())UI.closeModal(null);if(listCancel===cancel)listCancel=null;
        UI._loads=Math.max(0,(UI._loads||0)-1);
      }
    },
    dialogState(card) {
      return {top:card.scrollTop,details:[...card.querySelectorAll('details')].map(d=>d.open),strips:[...card.querySelectorAll('.sh-chips')].map(s=>s.scrollLeft)};
    },
    restoreDialog(card,state) {
      if(!state||!card.isConnected)return;
      card.querySelectorAll('details').forEach((d,i)=>d.open=!!state.details?.[i]);
      card.querySelectorAll('.sh-chips').forEach((s,i)=>s.scrollLeft=state.strips?.[i]||0);
      card.scrollTop=state.top||0;
    },
    replaceModalBody(card,html,onOpen) {
      if(!card?.isConnected||document.querySelector('#modal .modal-card')!==card)return false;
      const top=card.scrollTop;
      card.querySelector('.modal-body').innerHTML=html;
      onOpen?.(card);card.scrollTop=top;return true;
    },
    closeModal(value) {
      const m = document.getElementById('modal');
      if (m.classList.contains('hidden')) return;
      m.className = 'modal hidden';
      m.innerHTML = '';
      const returnFocus=m._returnFocus;m._returnFocus=null;
      if(returnFocus?.isConnected&&returnFocus!==document.body){try{returnFocus.focus({preventScroll:true});}catch(e){/* removed or unavailable control */}}
      document.dispatchEvent(new CustomEvent('da:modal', { detail: false }));
      const r = modalResolve; modalResolve = null;
      if (r) r(value);
    },
    clearToast() {
      clearTimeout(UI._tt);
      const t=document.getElementById('toast');
      if(t){t.classList.remove('show');t.hidden=true;}
    },
    toast(msg, ms = 1800, kind = '') {
      const t = document.getElementById('toast');
      t.hidden=false;
      if(UI.isModalOpen()&&kind==='reward')return;
      t.textContent = msg;
      t.classList.remove('toast-reward', 'toast-saved', 'motion-calm');
      if (kind === 'reward' || kind === 'saved') {
        t.classList.add('toast-' + kind);
        if (!UI.reducedMotion()) { void t.offsetWidth; t.classList.add('motion-calm'); }
      }
      t.classList.add('show');
      clearTimeout(UI._tt);
      // lange Meldungen bleiben länger stehen, damit man sie ganz lesen kann (ca. 15 Zeichen pro Sekunde)
      UI._tt = setTimeout(() => t.classList.remove('show'), Math.min(4000,Math.max(ms, 1200 + String(msg).length * 45)));
    },
    // App-owned choices: never use a native select/picker for app settings.
    choose({title,options,value,hint=''}) {
      return UI.modal({title,cls:'choice-modal',
        html:`${hint?`<p class="muted small">${UI.esc(hint)}</p>`:''}<div class="app-choice-list">${options.map(([v,label])=>`<button type="button" class="app-choice-option" data-choice="${UI.esc(v)}" aria-pressed="${String(v)===String(value)}"><span>${UI.esc(label)}</span><span class="app-choice-check" aria-hidden="true">${String(v)===String(value)?Icon('check'):''}</span></button>`).join('')}</div>`,
        buttons:[{label:T('Abbrechen'),value:null}],
        onOpen(card){card.querySelectorAll('[data-choice]').forEach(b=>b.onclick=()=>UI.closeModal(b.dataset.choice));}
      });
    },
    // Segment-Auswahl als HTML; Werte werden als String in data-v abgelegt
    seg(key, options, value) {
      return `<div class="seg" data-k="${key}">${options.map(([v, label, locked]) =>
        `<button type="button" data-v="${v}" aria-pressed="${String(v)===String(value)}" class="${String(v) === String(value) ? 'on' : ''} ${locked ? 'locked' : ''}">${label}${locked ? ' ' + Icon('lock', 'lock') : ''}</button>`).join('')}</div>`;
    },
    // onPick(key, value, button) -> true/false/Promise<bool> (false = Auswahl verweigern)
    bindSeg(root, onPick) {
      root.querySelectorAll('.seg').forEach(seg => {
        seg.querySelectorAll('button').forEach(b => {
          b.onclick = async () => {
            Sound.play('tap');
            const ok = await onPick(seg.dataset.k, b.dataset.v, b);
            if (ok === false) return;
            seg.querySelectorAll('button').forEach(x => {x.classList.toggle('on', x === b);x.setAttribute('aria-pressed',String(x===b));});
          };
        });
      });
    },
    reducedMotion() { return Store.get('a11y.motion', null) === 'reduce' || (Store.get('a11y.motion', null) !== 'full' && !!(window.matchMedia && matchMedia('(prefers-reduced-motion: reduce)').matches)); },
    mineSize(){const saved=Store.get('a11y.mineSize',null);return ['fit','large','xlarge'].includes(saved)?saved:document.documentElement.classList.contains('hi-vis')?'large':'fit';},
    applyMineSize(){const size=UI.mineSize(),px={fit:0,large:46,xlarge:60}[size],root=document.documentElement;root.classList.toggle('mines-expanded',px>0);root.style.setProperty('--mn-cell-size',px+'px');document.querySelectorAll('.mn-size-value').forEach(s=>s.textContent={fit:T('Ganzes Brett'),large:T('Große Felder'),xlarge:T('Sehr große Felder')}[size]);document.querySelectorAll('[data-k="mineSize"] button').forEach(b=>{b.classList.toggle('on',b.dataset.v===size);b.setAttribute('aria-pressed',String(b.dataset.v===size));});},
    chessFieldLabel(sq,p){const names={K:T('König'),Q:T('Dame'),R:T('Turm'),B:T('Läufer'),N:T('Springer'),P:T('Bauer')};return T('Feld {f}: {p}',{f:'abcdefgh'[sq%8]+(8-Math.floor(sq/8)),p:p?names[p.toUpperCase()]+', '+T(p===p.toUpperCase()?'Weiß':'Schwarz'):T('Leer')});},
    boardKeys(root,selector,cols,activate){
      root._boardKeys={selector,cols,activate};root.setAttribute('role','group');
      const fields=[...root.querySelectorAll(selector)];fields.forEach((f,i)=>{if(f.tagName!=='BUTTON')f.setAttribute('role','button');f.tabIndex=i===0?0:-1;});
      if(root._keysBound)return;root._keysBound=true;
      root.addEventListener('focusin',e=>{const cfg=root._boardKeys,f=e.target.closest(cfg.selector);if(f)root.querySelectorAll(cfg.selector).forEach(n=>n.tabIndex=n===f?0:-1);});
      root.addEventListener('click',e=>{const cfg=root._boardKeys,f=e.target.closest(cfg.selector);if(e.detail===0&&f&&f.tagName!=='BUTTON')cfg.activate?.(f);});
      root.addEventListener('keydown',e=>{const cfg=root._boardKeys,f=e.target.closest(cfg.selector);if(!f)return;const fields=[...root.querySelectorAll(cfg.selector)],i=fields.indexOf(f),delta={ArrowLeft:-1,ArrowRight:1,ArrowUp:-cfg.cols,ArrowDown:cfg.cols}[e.key];
        if(delta){e.preventDefault();e.stopPropagation();const next=i+delta;if(next>=0&&next<fields.length&&(Math.abs(delta)!==1||Math.floor(i/cfg.cols)===Math.floor(next/cfg.cols)))fields[next].focus();}
        else if(f.tagName!=='BUTTON'&&(e.key==='Enter'||e.key===' ')){e.preventDefault();e.stopPropagation();f.click();}
      });
    },
    confetti(count = 90) {
      if (UI.reducedMotion()) return;
      const cv = document.createElement('canvas');
      cv.className = 'confetti';
      document.body.appendChild(cv);
      const dpr = window.devicePixelRatio || 1;
      const W = cv.width = innerWidth * dpr, H = cv.height = innerHeight * dpr;
      const ctx = cv.getContext('2d');
      const colors = ['#c9a45c', '#e6cf96', '#efe8d8', '#8a6d33', '#6f9a7c'];
      const parts = Array.from({ length: count }, () => ({
        x: W / 2 + (Math.random() - 0.5) * W * 0.3, y: H * 0.35,
        vx: (Math.random() - 0.5) * 18 * dpr, vy: (-Math.random() * 16 - 6) * dpr,
        s: (4 + Math.random() * 6) * dpr, r: Math.random() * 6, vr: (Math.random() - 0.5) * 0.4,
        c: colors[(Math.random() * colors.length) | 0]
      }));
      const start = performance.now();
      (function frame(now) {
        const t = now - start;
        ctx.clearRect(0, 0, W, H);
        for (const p of parts) {
          p.vy += 0.45 * dpr; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
          ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.r);
          ctx.globalAlpha = Math.max(0, 1 - t / 2800);
          ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 4, p.s, p.s / 2);
          ctx.restore();
        }
        if (t < 2800) requestAnimationFrame(frame); else cv.remove();
      })(start);
    },
    fmtTime(sec) {
      const m = Math.floor(sec / 60), s = sec % 60;
      return String(m).padStart(2, '0') + ':' + String(s).padStart(2, '0');
    }
  };

  window.Store = Store;
  window.Sound = Sound;
  window.Haptic = Haptic;
  window.UI = UI;
  window.Games = window.Games || {};
})();
