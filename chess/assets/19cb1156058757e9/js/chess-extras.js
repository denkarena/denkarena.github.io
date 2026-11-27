/* Private chess archive and legal-on-execution premoves. No client result
 * from this archive is ever used for ratings or leaderboard points. */
(function () {
 'use strict';
 const key=()=> 'chess.archive.'+(window.Cloud&&Cloud.uid&&Cloud.uid()||'device'),LIMIT=200;
 const placeholders=new Set(['Spieler','Player','Oyuncu','Jugador','Jogador','Joueur','Giocatore','Gracz']);
 const profileName=()=>{const n=String(Store.get('profile.name','')||'').trim();return n&&!placeholders.has(n)&&window.NameCheck?.gameDisplay(n,'')===n?n:'';};
 // Only repair the owner's computer archive. Never rename an imported game or an opponent.
 function withProfileName(g,own=false){
  const name=profileName();if(!own||!g||g.mode!=='solo'||!['w','b'].includes(g.you)||!name)return g;
  const old=g.names?.[g.you];if(old&&!placeholders.has(old))return g;
  return {...g,names:{...g.names,[g.you]:name}};
 }
 async function ensureProfileName(){
  if(profileName()||!window.Cloud?.enabled()||!Cloud.uid?.())return;
  const owner=key();try{const r=await request('name_status');if(key()===owner&&r&&!r.locked&&r.name&&!placeholders.has(r.name)&&window.NameCheck?.gameDisplay(r.name,'')===r.name)Store.set('profile.name',r.name);}catch(e){/* Offline: retain the recorded name, never guess another player's identity. */}
 }
 async function request(name){const controller=new AbortController();let timer;try{return await Promise.race([Cloud.rpc(name,{}, {signal:controller.signal}),new Promise((_,reject)=>{timer=setTimeout(()=>{controller.abort();reject(Error('timeout'));},5000);})]);}finally{clearTimeout(timer);controller.abort();}}
 const fingerprint=g=>g.mode==='online'&&g.code?'online:'+g.code+':'+g.moves.join('.') : g.id;
 function valid(g){return g&&Array.isArray(g.moves)&&g.moves.length>0&&g.moves.length<=1200&&g.moves.every(u=>/^[a-h][1-8][a-h][1-8][qrbn]?$/.test(u))&&(['w','b','draw'].includes(g.result)||g.imported&&g.result===null);}
 function save(g){if(!valid(g))return;g=withProfileName(g,true);const id=fingerprint(g)||String(Date.now())+Math.random().toString(36).slice(2);const list=local().filter(x=>x.id!==id);list.push({...g,id});Store.set(key(),list.sort((a,b)=>(b.importedAt||b.date||0)-(a.importedAt||a.date||0)).slice(0,LIMIT));}
 function local(){return Store.get(key(),[]).filter(valid).map(g=>withProfileName(g,true));}
 function playerName(g,c){
  // Private PGN metadata is not a public account name. Keep names such as
  // "Carlsen, Magnus" intact; callers escape HTML or use textContent.
  if(g.imported&&g.names?.[c])return String(g.names[c]).replace(/[\u0000-\u001f\u007f]/g,' ').trim()||T(c==='w'?'Weiß':'Schwarz');
  if(g.names?.[c])return NameCheck.gameDisplay(g.names[c],T(c==='w'?'Weiß':'Schwarz'));
  if(g.mode==='solo'&&['w','b'].includes(g.you)&&g.you!==c)return Number.isFinite(g.level)?T('Computer · Stufe {n}',{n:g.level+1}):T('Computer');
  return T(c==='w'?'Weiß':'Schwarz');
 }
 // Name zum Teilen: gegen den Computer ist nur die Seite des Gegners „Computer“; ist bei älteren Partien
 // ohne Namen nicht bekannt, wer der Spieler war, steht einfach Weiß und Schwarz da (nie „Computer gegen Computer“).
 function shareName(g,c){
  if(g.names?.[c])return NameCheck.gameDisplay(g.names[c],T('Spieler'));
  if(g.mode!=='solo')return T(c==='w'?'Weiß':'Schwarz');
  const you=['w','b'].includes(g.you)?g.you:g.names?.w&&!g.names?.b?'w':g.names?.b&&!g.names?.w?'b':null;
  return you&&you!==c?T('Computer · Stufe {n}',{n:(Number(g.level)||0)+1}):T(c==='w'?'Weiß':'Schwarz');
 }
 function ending(g){
  if(g?.reason==='Aufgabe')return {kind:'resign',text:['w','b'].includes(g.result)?T('{n} hat aufgegeben.',{n:playerName(g,g.result==='w'?'b':'w')}):T('Aufgabe')};
  if(['Schachmatt','Patt','Zeit abgelaufen','Verbindung verloren','Remis vereinbart','50-Züge-Regel','Zu wenig Material','Dreifache Wiederholung'].includes(g?.reason))return {kind:'finish',text:T(g.reason)};
  return null;
 }
 function resultText(g){
  return ['w','b'].includes(g?.result)?T('{n} gewinnt.',{n:playerName(g,g.result)}):g?.result==='draw'?T('Remis'):'';
 }
 function importRecords(games){
  const id=g=>{const str=JSON.stringify([g.initialFen||'',g.moves,g.names,g.pgn?.tags?.Date||'',g.result]);let a=2166136261,b=2246822519;for(let i=0;i<str.length;i++){a=Math.imul(a^str.charCodeAt(i),16777619);b=Math.imul(b^str.charCodeAt(i),3266489917);}return 'pgn:'+(a>>>0).toString(16)+(b>>>0).toString(16);};
  let added=0;const existing=local(),known=new Set(existing.map(g=>g.id)),incoming=new Set(games.map(id));
  if(existing.length+[...incoming].filter(k=>!known.has(k)).length>LIMIT)throw Object.assign(Error('pgn-capacity'),{code:'pgn-capacity'});
  const next=existing.slice();
  for(const game of games){const g={...game,id:id(game),importedAt:Date.now()};if(!known.has(g.id)){if(!valid(g))throw Object.assign(Error('pgn-format'),{code:'pgn-format'});next.push(g);known.add(g.id);added++;}}
  if(added){Store.set(key(),next.sort((a,b)=>(b.importedAt||b.date||0)-(a.importedAt||a.date||0)));const stored=new Set(local().map(g=>g.id));if(next.some(g=>!stored.has(g.id)))throw Object.assign(Error('pgn-storage'),{code:'pgn-storage'});}
  return added;
 }
 function removeLocal(id){const before=local(),game=before.find(g=>g.id===id);if(!game||game.mode==='online')return false;Store.set(key(),before.filter(g=>g.id!==id));return !local().some(g=>g.id===id);}
 // Teilen direkt aus „Meine Partien“: wie „Partie teilen“ nach dem Spiel (Link zum Nachspielen),
 // importierte Partien, eigene Startstellungen und sehr lange Partien als PGN.
 async function shareRecord(game){
  if(game.mode==='imported'||game.imported||game.initialFen||game.moves.length>600)return ChessPgnUI.exportGames([game]);
  if(game.mode==='solo')await ensureProfileName();
  const g=withProfileName(game,true),url=GameLink.url(GameLink.encode(g));
  const nm=c=>shareName(g,c);
  await App.share([T('Schachpartie bei DenkArena: {w} gegen {b}. Hier kannst du sie Zug für Zug nachspielen:',{w:nm('w'),b:nm('b')}),url,T('Welchen Zug hättest du gespielt?')].join('\n\n'),null,{gameUrl:url});
 }
 // PGN-Export: Partien auswählen (am Anfang keine), „Alle auswählen“ oben
 async function pickGames(games){
  if(!games.length){UI.toast(T('Keine Partien vorhanden.'));return null;}
  const label=n=>n===0?T('Partien auswählen'):n===1?T('1 Partie exportieren'):T('{n} Partien exportieren',{n});
  const kind=g=>g.mode==='imported'?T('Importierte Partie'):g.mode==='online'?T('Online-Partie'):g.mode==='solo'?T('Gegen den Computer'):T('Partie zu zweit');
  let chosen=[];
  const row=(g,i)=>{const n=Math.ceil(g.moves.length/2);return `<label class="pgn-pick"><input type="checkbox" data-pick="${i}"><span><b>${UI.esc(playerName(g,'w')+' · '+playerName(g,'b'))}</b><small>${g.date?new Date(g.date).toLocaleDateString(LOCALE):T('Datum unbekannt')} · ${UI.esc(kind(g))} · ${n===1?T('1 Zug'):T('{n} Züge',{n})}</small></span></label>`;};
  const r=await UI.modal({title:T('PGN exportieren'),cls:'pgn-dialog pgn-select',
   html:`<p class="muted small">${T('Wähle die Partien, die du exportieren möchtest.')}</p><label class="pgn-pick pgn-all"><input type="checkbox" data-pick-all><span><b>${T('Alle auswählen')}</b><small>${games.length===1?T('1 Partie'):T('{n} Partien',{n:games.length})}</small></span></label><div class="pgn-picks">${games.map(row).join('')}</div>`,
   buttons:[{label:T('Abbrechen'),value:null},{label:label(0),value:'go',primary:true,cls:'pgn-pick-go'}],
   onOpen(card){
    const boxes=[...card.querySelectorAll('[data-pick]')],all=card.querySelector('[data-pick-all]'),go=card.querySelector('.pgn-pick-go');
    const sync=()=>{const n=boxes.filter(b=>b.checked).length;all.checked=n===boxes.length;all.indeterminate=n>0&&n<boxes.length;go.textContent=label(n);go.disabled=n===0;};
    all.onchange=()=>{boxes.forEach(b=>b.checked=all.checked);sync();};boxes.forEach(b=>b.onchange=sync);sync();
    go.addEventListener('click',()=>{chosen=boxes.filter(b=>b.checked).map(b=>games[+b.dataset.pick]).filter(Boolean);},{capture:true});
   }});
  return r==='go'&&chosen.length?chosen:null;
 }
 async function show(options={}){
  const viewState=options.state||options,active=()=>!options.isCurrent||options.isCurrent();
  let tab=viewState.tab==='online'?'online':'local';
  viewState.tab=tab;
  const owner=key();
  let list=local(),unavailable=false;
  if(window.Cloud&&Cloud.enabled()){
   try{const remote=await request('chess_archive_list');if(key()!==owner)return null;for(const g of remote||[])save(g);list=local();}
   catch(e){unavailable=true;}
  }
  if(!active())return null;
  const nm=playerName;
  const time=g=>{if(!g.clock||g.clock==='none')return T('Ohne Uhr');const parts=String(g.clock).split('+');return UI.esc(T('{n} Min',{n:parts[0]}))+(parts[1]?' + '+UI.esc(T('{s} s',{s:parts[1]})):'');};
  return UI.modal({title:T('Meine Partien'),cls:'chess-archive',html:
   `<div class="seg archive-tabs" role="tablist" aria-label="${UI.esc(T('Partien auswählen'))}"><button type="button" role="tab" id="archive-local-tab" data-archive-tab="local" aria-controls="archive-panel">${T('Lokal')}</button><button type="button" role="tab" id="archive-online-tab" data-archive-tab="online" aria-controls="archive-panel">${T('Online')}</button></div><div class="pgn-actions"><button type="button" class="btn" data-pgn="import">${T('PGN importieren')}</button><button type="button" class="btn" data-pgn="export" ${list.length?'':'disabled'}>${T('PGN exportieren')}</button><button type="button" class="btn archive-fen" data-pgn="fen">${T('Stellung einfügen (FEN)')}</button></div><div id="archive-panel" role="tabpanel"></div>`,
   buttons:[{label:T('Schließen'),value:null,primary:true},list.length?{label:T('Archiv leeren'),value:'clear'}:null].filter(Boolean),
   onOpen(card){
    card.querySelectorAll('[data-pgn]').forEach(b=>b.onclick=()=>UI.closeModal('pgn-'+b.dataset.pgn));
    const body=card.querySelector('.modal-body')||card;
    const scroller=()=>body.scrollHeight>body.clientHeight?body:card;
    const remember=()=>{viewState.tab=tab;viewState.scroll=card.querySelector('.archive-list')?.scrollTop||0;viewState.outerScroll=scroller().scrollTop;};
    for(const sc of new Set([body,card]))sc.addEventListener('scroll',remember,{passive:true});
    const render=()=>{viewState.tab=tab;
     const filtered=list.filter(g=>tab==='online'?g.mode==='online':g.mode!=='online');
     card.querySelectorAll('[data-archive-tab]').forEach(b=>{const on=b.dataset.archiveTab===tab;b.classList.toggle('on',on);b.setAttribute('aria-selected',String(on));b.tabIndex=on?0:-1;});
     const panel=card.querySelector('#archive-panel');panel.setAttribute('aria-labelledby','archive-'+tab+'-tab');
     panel.innerHTML=`<p class="muted small">${UI.esc(tab==='local'?T('Computerpartien, Partien zu zweit und importierte Partien auf diesem Gerät.'):T('Deine Online-Partien, unabhängig davon, ob du sie öffentlich zeigst.'))}</p>`+
      (tab==='online'?`${unavailable?`<p role="status">${T('Das Kontoarchiv ist gerade nicht erreichbar. Angezeigt werden die Partien auf diesem Gerät.')}</p>`:''}<button type="button" class="btn archive-public-settings">${T('Veröffentlichung einstellen')}${Icon('chevron')}</button>`:'')+
      (filtered.length?`<div class="archive-list">${filtered.map((g,i)=>{const d=g.ratingChange,n=Math.ceil(g.moves.length/2),end=ending(g);return `<div class="archive-entry ${g.mode!=='online'?'can-remove':''}"><button class="archive-row" data-game="${i}"><strong>${UI.esc(nm(g,'w'))} · ${UI.esc(nm(g,'b'))}</strong><span>${T(g.result==='draw'?'Remis':!g.result?'Partie nicht beendet':g.you?(g.result===g.you?'Sieg':'Niederlage'):g.result==='w'?'Weiß gewinnt':'Schwarz gewinnt')}${d&&[d.delta,d.before,d.after].every(Number.isFinite)?` · ${d.before} → ${d.after} (${d.delta>0?'+':''}${d.delta})`:''}</span>${end?`<span class="archive-ending ${end.kind==='resign'?'archive-resigned':''}">${end.kind==='resign'?Icon('flag'):''}<span>${UI.esc(end.text)}</span></span>`:''}<small>${g.date?new Date(g.date).toLocaleDateString(LOCALE):T('Datum unbekannt')} · ${g.mode==='imported'?T('Importierte Partie'):g.mode==='online'?T('Online-Partie'):g.mode==='solo'?T('Gegen den Computer'):T('Partie zu zweit')} · ${time(g)} · ${n===1?T('1 Zug'):T('{n} Züge',{n})}</small></button><span class="archive-acts"><button type="button" class="archive-act archive-share" data-share="${i}" aria-label="${UI.esc(T('Partie teilen')+': '+nm(g,'w')+' · '+nm(g,'b'))}" title="${UI.esc(T('Partie teilen'))}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><circle cx="18" cy="5" r="2.6"/><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="19" r="2.6"/><path d="M8.3 10.8l7.4-4.3M8.3 13.2l7.4 4.3"/></svg></button>${g.mode!=='online'?`<button type="button" class="archive-act archive-remove" data-remove="${i}" aria-label="${UI.esc(T('Partie entfernen')+': '+nm(g,'w')+' · '+nm(g,'b'))}" title="${UI.esc(T('Partie entfernen'))}"><svg viewBox="0 0 24 24" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"><path d="M4 7h16M9 7V4h6v3M6 7l1 13h10l1-13M10 10v7M14 10v7"/></svg></button>`:''}</span></div>`;}).join('')}</div>`:`<p class="archive-empty">${T('Noch keine beendeten Partien im Archiv.')}</p>`)+
      `<details class="archive-storage"><summary>${T('Speicherung')}</summary><p class="muted small">${T('Hier findest du deine letzten 200 beendeten Partien. Online-Partien werden zusätzlich in deinem Konto gespeichert, Computerpartien auf diesem Gerät.')}</p><p class="muted small">${T('Das Kontoarchiv umfasst bis zu 200 Partien. Bei knappem Serverspeicher werden ältere Partien automatisch entfernt. Auf diesem Gerät gespeicherte Partien bleiben erhalten.')}</p></details>`;
     panel.querySelectorAll('[data-game]').forEach(b=>b.onclick=()=>{remember();UI.closeModal({...filtered[+b.dataset.game],archived:true});});
     panel.querySelectorAll('[data-remove]').forEach(b=>b.onclick=()=>{remember();UI.closeModal({archiveDelete:filtered[+b.dataset.remove].id});});
     panel.querySelectorAll('[data-share]').forEach(b=>b.onclick=()=>{remember();UI.closeModal({archiveShare:filtered[+b.dataset.share]});});
     const listBox=panel.querySelector('.archive-list');if(listBox)listBox.addEventListener('scroll',remember,{passive:true});
     const listPos=Number(viewState.scroll)||0,outerPos=Number(viewState.outerScroll)||0;
     requestAnimationFrame(()=>{if(!active()||!card.isConnected)return;scroller().scrollTop=outerPos;if(listBox)listBox.scrollTop=listPos;});
     const settings=panel.querySelector('.archive-public-settings');if(settings)settings.onclick=()=>UI.closeModal('publication');
    };
    card.querySelectorAll('[data-archive-tab]').forEach(b=>{
     b.onclick=()=>{tab=b.dataset.archiveTab;viewState.scroll=0;viewState.outerScroll=0;render();scroller().scrollTop=0;};
     b.onkeydown=e=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(e.key))return;e.preventDefault();viewState.scroll=0;viewState.outerScroll=0;tab=e.key==='Home'?'local':e.key==='End'?'online':tab==='local'?'online':'local';render();card.querySelector('[aria-selected="true"]').focus();};
    });render();
   }
  }).then(async g=>{
   if(key()!==owner||!active())return null;
   if(g?.archiveDelete){const game=local().find(x=>x.id===g.archiveDelete&&x.mode!=='online');if(game){const ok=await UI.modal({title:T('Partie entfernen?'),html:`<p>${UI.esc(['w','b'].map(c=>playerName(game,c)).join(' · '))}</p><p>${T('Die Partie wird nur von diesem Gerät entfernt. Wertungen und Statistiken bleiben erhalten.')}</p>`,buttons:[{label:T('Abbrechen'),value:false},{label:T('Entfernen'),value:true,danger:true}]});if(key()!==owner||!active())return null;if(ok&&!removeLocal(game.id))UI.toast(T('Die Partie konnte nicht entfernt werden. Bitte versuche es erneut.'));}return show({...options,state:viewState});}
   if(g==='pgn-import'){const games=await ChessPgnUI.importGames();if(key()!==owner||!active())return null;if(games){let n;try{n=importRecords(games);}catch(e){UI.toast(e.code==='pgn-capacity'?T('Dein Archiv ist voll. Exportiere es zuerst als PGN, bevor du Platz für weitere Partien schaffst.'):T('Die Partien konnten nicht auf diesem Gerät gespeichert werden. Bitte prüfe den freien Speicher.'),6000);return show({...options,state:viewState});}UI.toast(n===0?T('Diese Partien sind bereits im Archiv.'):n===1?T('1 neue Partie importiert.'):T('{n} neue Partien importiert.',{n}),3000);viewState.tab='local';viewState.scroll=0;}return show({...options,state:viewState});}
   if(g?.archiveShare){await shareRecord(g.archiveShare);if(key()!==owner||!active())return null;return show({...options,state:viewState});}
   if(g==='pgn-export'){const chosen=await pickGames(list.filter(x=>viewState.tab==='online'?x.mode==='online':x.mode!=='online'));if(key()!==owner||!active())return null;if(chosen?.length)await ChessPgnUI.exportGames(chosen);if(key()!==owner||!active())return null;return show({...options,state:viewState});}
   if(g==='pgn-fen'){await ChessFenUI.importPosition({isCurrent:()=>key()===owner&&active()});if(key()!==owner||!active())return null;return show({...options,state:viewState});}
   if(g==='publication'){await window.Ranking?.historySettings?.();if(key()!==owner)return null;return show({...options,state:viewState});}
   if(g!=='clear')return g;
   const ok=await UI.modal({title:T('Archiv leeren?'),html:`<p>${T('Die gespeicherten Partien werden aus deinem Archiv entfernt. Wertungen und Statistiken bleiben erhalten.')}</p><p class="muted small">${T('Die Löschung betrifft beide Reiter: Lokal und Online.')}</p>`,buttons:[{label:T('Abbrechen'),value:false},{label:T('Leeren'),value:true,danger:true}]});
   if(ok){try{if(window.Cloud&&Cloud.enabled())await request('chess_archive_clear');if(key()!==owner)return null;Store.del(owner);window.ChessAnalysis?.clear();}catch(e){UI.toast(T('Keine Verbindung zum Server. Bitte später noch einmal versuchen.'));}}
   return show({...options,state:viewState});
  });
 }

 // Geometric destinations only; legality is checked against the actual new
 // position after the opponent's move. No engine evaluation is used here.
 function targets(s,f,color){
  const p=s.b[f];if(!p||(ChessEngine.isW(p)?'w':'b')!==color)return [];
  const type=p.toUpperCase(),row=f>>3,col=f&7,out=[];
  for(let t=0;t<64;t++){
   if(t===f)continue;const own=s.b[t]&&(ChessEngine.isW(s.b[t])?'w':'b')===color;if(own||s.b[t]?.toUpperCase()==='K')continue;
   const dy=(t>>3)-row,dx=(t&7)-col,ay=Math.abs(dy),ax=Math.abs(dx);
   let ok=type==='N'?ax*ay===2:type==='K'?Math.max(ax,ay)===1||dy===0&&ax===2&&col===4:type==='P'?(dy===(color==='w'?-1:1)&&ax<=1)||(dx===0&&dy===(color==='w'?-2:2)&&row===(color==='w'?6:1)):type==='B'?ax===ay:type==='R'?dx===0||dy===0:dx===0||dy===0||ax===ay;
   if(ok&&['B','R','Q'].includes(type)){const step=Math.sign(dy)*8+Math.sign(dx);for(let at=f+step;at!==t;at+=step)if(s.b[at]){ok=false;break;}}
   let castle;
   if(ok&&type==='K'&&ax===2){castle=color==='w'?(dx>0?'K':'Q'):(dx>0?'k':'q');const home=color==='w'?60:4,rf=dx>0?home+3:home-4;if(f!==home||!s.castle[castle]||s.b[rf]!== (color==='w'?'R':'r'))ok=false;for(let at=f+Math.sign(dx);ok&&at!==rf;at+=Math.sign(dx))if(s.b[at])ok=false;}
   const ep=type==='P'&&ax===1&&!s.b[t]&&s.ep===t;
   if(ok)out.push({f,t,p,cap:ep?s.b[t+(color==='w'?8:-8)]:s.b[t]||undefined,ep,castle,dbl:type==='P'&&ay===2,promo:type==='P'&&(t>>3)===(color==='w'?0:7)?(color==='w'?'Q':'q'):undefined});
  }return out;
 }
 // Hypothetical own moves only: never evaluate a position or guess an opponent move.
 // Hashes are omitted because this state exists solely for planning and painting.
 function projectPremoves(s,queue,color){
  let view={...s,b:s.b.slice(),castle:{...s.castle},h1:undefined,h2:undefined};
  for(const next of queue){if(view.b[next.f]!==next.p)return null;const m=targets(view,next.f,color).find(m=>m.t===next.t&&(m.promo||null)===(next.promo||null));if(!m)return null;view=ChessEngine.make(view,m);}
  return view;
 }
 const phrases=()=>({goodluck:T('Viel Erfolg!'),wellplayed:T('Gut gespielt.'),thanks:T('Danke für die Partie.')});
 function material(s,plies,color,ply=plies.length){const values={P:1,N:3,B:3,R:5,Q:9,K:0},captures={};let value=0;for(const p of s.b)if(p&&(ChessEngine.isW(p)?'w':'b')===color)value+=values[p.toUpperCase()];for(const {m} of plies.slice(0,ply))if(m.cap&&(ChessEngine.isW(m.p)?'w':'b')===color){const key=m.cap.toUpperCase();captures[key]=(captures[key]||0)+1;}return {value,captures};}
 async function find(source){
  if(!source)return null;
  const owner=key(),match=g=>source.id?g.id===source.id:source.code&&g.code===source.code&&Math.abs((g.date||0)-(source.date||0))<86400000;
  let game=local().find(match);if(game)return game;
  if(window.Cloud?.enabled())try{const rows=await request('chess_archive_list');if(key()!==owner)return null;for(const g of rows||[])save(g);game=local().find(match);}catch(e){/* The exercise remains available without its source game. */}
  return game||null;
 }
 window.ChessExtras={save,show,find,local,importRecords,removeLocal,playerName,names:g=>['w','b'].map(c=>playerName(g,c)).join(' · '),ending,resultText,targets,projectPremoves,phrases,material,withProfileName,ensureProfileName,shareName};
})();
