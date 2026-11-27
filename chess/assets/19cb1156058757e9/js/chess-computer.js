/* Computer-only move selection. Never used for online moves, analysis or hints. */
(function(root){
 'use strict';
 const E=root.ChessEngine,O=root.ChessOpenings;
 const code=m=>E.sqName(m.f)+E.sqName(m.t)+(m.promo?.toLowerCase()||'');
 // Stored scores are already relative to the defender, including Black.
 const score=v=>Number.isFinite(v?.value)?v.type==='cp'?v.value:v.type==='mate'&&v.value!==0?Math.sign(v.value)*(E.MATE-Math.abs(v.value)*2):null:null;
 const weighted=(rows,rng)=>{let n=rng()*rows.reduce((n,r)=>n+r.weight,0);for(const r of rows){n-=r.weight;if(n<0)return r.move;}return rows.at(-1)?.move;};
 // Persönliche Gewichte (Schalter „Computer stellt sich auf mich ein“): Faktor je Stellung+Buchzug, aus dem Spielergedächtnis
 // im Hauptthread. Nur zwischen geprüften Buchzügen, begrenzt auf 0,35–2, damit Abwechslung und Spielstärke erhalten bleiben.
 const adjust=(rows,s,prefer)=>{if(!prefer||typeof prefer!=='object'||!rows.length)return rows;const k=O.key(s);
  return rows.map(r=>{const f=Number(prefer[k+'|'+code(r.move)]);return {move:r.move,weight:r.weight*(Number.isFinite(f)&&f>0?Math.min(2,Math.max(0.35,f)):1)};});};
 // Eröffnungsbuch allein (Meisterstufen: Buch der stärksten Stufe, danach Stockfish). null = kein Buchzug.
 function opening(s,level,opts={},rng=Math.random){if(!O||!E.legal(s).length)return null;const b=adjust(O.book(s,level),s,opts.prefer);return b.length?weighted(b,rng):null;}
 function choose(s,level,opts={},rng=Math.random){
  const policy=O?.policy?.levels[level],legal=E.legal(s);if(!legal.length)return null;if(!policy)return E.bestMove(s,opts);
  const find=u=>legal.find(m=>code(m)===u),facts=O.trapChoices(s);
  const defend=facts.filter(p=>p.role==='defend');
  if(defend.length){
   const wrong=defend.map(p=>find(p.mistake)).filter(Boolean);
   if(wrong.length&&policy.fall>0&&rng()<policy.fall)return wrong[Math.floor(rng()*wrong.length)];
   const denied=new Set(defend.map(p=>p.mistake)),safe=defend.flatMap(p=>p.safe).filter(u=>!denied.has(u)).map(find).filter(Boolean);
   if(level>=5){
    const scored=new Map();for(const fact of defend)for(const u of fact.safe){const value=score(fact.scores?.[u]);if(value===null||denied.has(u)||!find(u))continue;scored.set(u,scored.has(u)?Math.min(scored.get(u),value):value);}
    const best=Math.max(...scored.values()),book=new Map(O.book(s,level).map(p=>[code(p.move),p.weight]));
    const pool=[...scored].filter(([,value])=>best-value<=15).map(([u,value])=>({move:find(u),weight:(book.get(u)||1)*(16-(best-value))}));
    // Generated data guarantees a scored defence. Never silently select an
    // unreferenced move if incomplete/corrupt facts are supplied instead.
    return pool.length?weighted(pool,rng):null;
   }
   if(safe.length)return safe[Math.floor(rng()*safe.length)];
  }
  const attack=facts.filter(p=>p.role==='punish'||p.role==='recover');
  if(attack.length&&rng()<policy.punish){const m=find(attack[0].move);if(m)return m;}
  const setup=facts.filter(p=>p.role==='setup');if(setup.length&&rng()<policy.attempt){const m=find(setup[Math.floor(rng()*setup.length)].move);if(m)return m;}
  const book=adjust(O.book(s,level),s,opts.prefer);if(book.length&&rng()<policy.book)return weighted(book,rng);
  // Preserve the deliberately broader beginner noise/blunder behaviour.
  return E.bestMove(s,{...opts,...(level>=5&&s.full<=12?{varietyCp:15}:{})});
 }
 root.ChessComputer=Object.freeze({choose,opening});
})(typeof self!=='undefined'?self:window);
