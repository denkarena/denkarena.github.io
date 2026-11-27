/* Private visual notes. Never stored, evaluated or sent to an opponent. */
(function () {
  'use strict';
  let serial=0;
  const ns='http://www.w3.org/2000/svg';
  const point=(sq,flipped)=>({x:(flipped?7-sq%8:sq%8)+.5,y:(flipped?7-(sq>>3):sq>>3)+.5});
  function path(from,to,flipped=false){
    const a=point(from,flipped),b=point(to,flipped),dx=b.x-a.x,dy=b.y-a.y;
    if(Math.abs(dx)*Math.abs(dy)===2){
      if(Math.abs(dx)===1)return `M${a.x} ${a.y} H${b.x} V${b.y-Math.sign(dy)*.14}`;
      return `M${a.x} ${a.y} V${b.y} H${b.x-Math.sign(dx)*.14}`;
    }
    const length=Math.hypot(dx,dy)||1;
    return `M${a.x} ${a.y} L${b.x-dx/length*.14} ${b.y-dy/length*.14}`;
  }
  function attach(board,{after=board.parentElement,toolbar=null,flipped=()=>false,beforeDraw=()=>{}}={}){
    const notes=new Map(),id='board-note-head-'+(++serial),listeners=[];
    let active=false,gesture=null,dead=false,positionKey=null;
    const layer=document.createElementNS(ns,'svg');layer.classList.add('board-notes-layer');layer.setAttribute('viewBox','0 0 8 8');layer.setAttribute('aria-hidden','true');
    const tools=document.createElement('div');tools.className='board-notes-tools';
    tools.innerHTML=`<button type="button" class="bn-toggle" aria-pressed="false">${Icon('pencil')}<span>${T('Zeichnen')}</span></button><button type="button" class="bn-clear hidden">${Icon('erase')}<span>${T('Alle löschen')}</span></button><button type="button" class="bn-done hidden">${Icon('check')}<span>${T('Fertig')}</span></button>`;
    const note=document.createElement('p');note.className='board-notes-note hidden';note.setAttribute('role','status');note.setAttribute('aria-live','polite');
    if(toolbar){toolbar.insertBefore(tools,toolbar.querySelector('[data-a=resign]'));tools.classList.add('bn-integrated');after.after(note);}else{after.after(tools);tools.after(note);}
    const toggle=tools.querySelector('.bn-toggle'),clearButton=tools.querySelector('.bn-clear'),done=tools.querySelector('.bn-done');
    toggle.setAttribute('aria-label',T('Zeichnen'));
    toggle.title=T('Pfeile ziehen oder Felder antippen. Am Computer auch mit der rechten Maustaste.');
    function render(){
      if(dead)return;
      if(!board.contains(layer))board.append(layer);
      const all=[...notes.values()];if(gesture&&gesture.to>=0)all.push({from:gesture.from,to:gesture.to,draft:true});
      layer.innerHTML=`<defs><marker id="${id}" markerWidth=".43" markerHeight=".43" refX=".35" refY=".215" orient="auto" markerUnits="userSpaceOnUse"><path d="M.02 .025 .38 .215 .02 .405 .10 .215Z" fill="var(--note-gold)" stroke="var(--note-outline)" stroke-width=".025" stroke-linejoin="round"/></marker></defs>`+all.map(m=>{
        const p=point(m.from,flipped()),cls=m.draft?' bn-draft':'';
        if(m.from===m.to)return `<g class="bn-ring${cls}" data-from="${m.from}" data-to="${m.to}"><circle class="bn-ring-edge" cx="${p.x}" cy="${p.y}" r=".39"/><circle cx="${p.x}" cy="${p.y}" r=".39"/></g>`;
        const d=path(m.from,m.to,flipped());return `<g class="bn-arrow${cls}" data-from="${m.from}" data-to="${m.to}"><path class="bn-outline" d="${d}"/><path class="bn-line" d="${d}" marker-end="url(#${id})"/></g>`;
      }).join('');
      board.classList.toggle('board-notes-active',active);board.classList.toggle('board-notes-present',notes.size>0||!!gesture);
      toggle.classList.toggle('on',active);toggle.setAttribute('aria-pressed',String(active));
      tools.classList.toggle('bn-expanded',active||notes.size>0);
      clearButton.classList.toggle('hidden',!active&&!notes.size);clearButton.disabled=!notes.size;
      clearButton.querySelector('span').textContent=!active&&notes.size?T('{n} Markierungen löschen',{n:notes.size}):T('Alle löschen');
      done.classList.toggle('hidden',!active);note.classList.toggle('hidden',!active&&!notes.size);
      note.textContent=active?T('Nur für dich · Figuren im Zeichenmodus gesperrt'):notes.size?T('Eigene Markierungen · nur für dich'):'';
    }
    function cancel(){if(gesture){const g=gesture;gesture=null;try{board.releasePointerCapture(g.id);}catch(e){}}}
    function setActive(value){cancel();active=value;if(active)beforeDraw();render();}
    function clear(exit=true){cancel();notes.clear();if(exit)active=false;render();}
    function mark(from,to){const key=from+':'+to;if(notes.has(key))notes.delete(key);else notes.set(key,{from,to});render();}
    function square(e){const r=board.getBoundingClientRect(),x=Math.floor((e.clientX-r.left)/r.width*8),y=Math.floor((e.clientY-r.top)/r.height*8);return x<0||x>7||y<0||y>7?-1:flipped()?63-(y*8+x):y*8+x;}
    const eat=e=>{e.preventDefault();e.stopImmediatePropagation();};
    function listen(type,fn,opts=true){board.addEventListener(type,fn,opts);listeners.push([type,fn,opts]);}
    listen('contextmenu',e=>e.preventDefault());
    listen('pointerdown',e=>{
      if(e.button!==2&&!(active&&e.button===0))return;
      eat(e);if(gesture)return;const sq=square(e);if(sq<0)return;
      beforeDraw();gesture={id:e.pointerId,from:sq,to:sq,x:e.clientX,y:e.clientY};
      try{board.setPointerCapture(e.pointerId);}catch(err){}render();
    });
    listen('pointermove',e=>{
      if(!gesture||gesture.id!==e.pointerId)return;
      eat(e);gesture.to=square(e);render();
    });
    listen('pointerup',e=>{
      if(!gesture||gesture.id!==e.pointerId)return;
      eat(e);const g=gesture,to=square(e);cancel();if(to>=0)mark(g.from,to);else render();
    });
    for(const type of ['pointercancel','lostpointercapture'])listen(type,e=>{if(gesture?.id===e.pointerId){cancel();render();}});
    listen('keydown',e=>{
      if(!active)return;
      if(e.key==='Escape'){eat(e);setActive(false);toggle.focus();return;}
      if(e.key!=='Enter'&&e.key!==' ')return;
      const field=e.target.closest('[data-sq]');if(!field)return;
      eat(e);const sq=Number(field.dataset.sq);mark(sq,sq);
    });
    toggle.onclick=()=>setActive(!active);clearButton.onclick=()=>clear(false);done.onclick=()=>{setActive(false);toggle.focus();};
    render();
    return {get active(){return active;},get size(){return notes.size;},clear,render,
      placeToolbar(target){if(target&&tools.parentElement!==target)target.insertBefore(tools,target.querySelector('[data-a=resign]'));},
      sync(key){const changed=positionKey!==null&&key!==positionKey;positionKey=key;if(changed)clear();else render();},
      destroy(){dead=true;cancel();for(const [type,fn,opts] of listeners)board.removeEventListener(type,fn,opts);board.classList.remove('board-notes-active','board-notes-present');layer.remove();tools.remove();note.remove();}
    };
  }
  window.BoardNotes={attach,path};
})();
