/* Original PGN reader/writer. Main-line moves are always checked against our
 * legal generator; comments, ratings and annotations never influence analysis. */
(function(root){
 'use strict';
 const E=root.ChessEngine,MAX_BYTES=5*1048576,MAX_PLIES=1200,MAX_GAMES=200;
 const INITIAL='rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
 const resultToPgn={w:'1-0',b:'0-1',draw:'1/2-1/2'},resultFromPgn={'1-0':'w','0-1':'b','1/2-1/2':'draw','*':null};
 const code=m=>E.sqName(m.f)+E.sqName(m.t)+(m.promo?.toLowerCase()||'');
 const has=(o,k)=>Object.prototype.hasOwnProperty.call(o,k);
 const fail=(kind,move=null,ply=null)=>{const e=Error(kind);e.code=kind;e.move=move;e.ply=ply;throw e;};
 function hasStandardMaterial(b){
  for(const white of [true,false]){
   const own=b.filter(p=>p&&E.isW(p)===white),count=t=>own.filter(p=>p.toUpperCase()===t).length,pawns=count('P'),bishops=[0,0];
   b.forEach((p,i)=>{if(p&&E.isW(p)===white&&p.toUpperCase()==='B')bishops[((i>>3)+(i&7))&1]++;});
   const promotions=Math.max(0,count('Q')-1)+Math.max(0,count('R')-2)+Math.max(0,count('N')-2)+bishops.reduce((n,k)=>n+Math.max(0,k-1),0);
   if(own.length>16||pawns>8||promotions>8-pawns)return false;
  }
  return true;
 }
 function initial(fen=INITIAL,{freeMaterial=false}={}){
  const fields=String(fen).trim().split(/\s+/),ranks=fields[0]?.split('/');
  if(fields.length!==6||ranks.length!==8||ranks.some(r=>!/^[prnbqkPRNBQK1-8]+$/.test(r)||[...r].reduce((n,c)=>n+(+c||1),0)!==8)||!['w','b'].includes(fields[1])||!/^(-|K?Q?k?q?)$/.test(fields[2])||!/^(-|[a-h][36])$/.test(fields[3])||!/^\d{1,4}$/.test(fields[4])||!/^\d{1,4}$/.test(fields[5])||+fields[5]<1)fail('pgn-fen');
  const s=E.fromFEN(fields.join(' '));
  if(s.b.filter(p=>p==='K').length!==1||s.b.filter(p=>p==='k').length!==1||s.b.slice(0,8).some(p=>p==='P'||p==='p')||s.b.slice(56).some(p=>p==='P'||p==='p'))fail('pgn-fen');
  if(!freeMaterial&&!hasStandardMaterial(s.b))fail('pgn-fen');
  if(Math.max(Math.abs((s.kw&7)-(s.kb&7)),Math.abs((s.kw>>3)-(s.kb>>3)))<=1||E.inCheck({...s,turn:s.turn==='w'?'b':'w'}))fail('pgn-fen');
  const pieces={K:[60,'K',63,'R'],Q:[60,'K',56,'R'],k:[4,'k',7,'r'],q:[4,'k',0,'r']};
  for(const [right,[k,kp,r,rp]] of Object.entries(pieces))if(s.castle[right]&&(s.b[k]!==kp||s.b[r]!==rp))fail('pgn-fen');
  if(s.ep>=0&&(s.b[s.ep]||(s.ep>>3)!==(s.turn==='w'?2:5)||s.b[s.ep+(s.turn==='w'?8:-8)]!==(s.turn==='w'?'p':'P')))fail('pgn-fen');
  return s;
 }
 function san(s,m,legal){
  const letters=E.notationLetters(),english=Object.fromEntries(Object.entries(letters).map(([a,b])=>[b,a]));
  return E.toSAN(s,m,legal).replace(/^[A-ZŞ]/u,c=>english[c]||c).replace(/=([A-ZŞ])/u,(_,c)=>'='+(english[c]||c));
 }
 const normalized=s=>s.replace(/0/g,'O').replace(/[!?]+$/,'').replace(/[+#]+$/,'').replace(/([a-h][18])([QRBN])$/,'$1=$2');
 // Linear scanner with bounded nesting, no regex evaluation of untrusted input.
 function* tokens(text){
  let i=0,variation=0;
  while(i<text.length){
   const offset=i,c=text[i];if(/\s|\uFEFF/.test(c)){i++;continue;}
   if(c==='{'||c===';'||c==='%'&&(i===0||text[i-1]==='\n')){
    if(c!=='{'){while(i<text.length&&text[i]!=='\n')i++;continue;}
    let n=1;i++;while(i<text.length&&n){if(text[i]==='{')n++;if(text[i]==='}')n--;if(n>32)fail('pgn-format');i++;}if(n)fail('pgn-format');continue;
   }
   if(c==='('){if(++variation>64)fail('pgn-format');i++;continue;}if(c===')'){if(!variation)fail('pgn-format');variation--;i++;continue;}
   if(variation){i++;continue;}
   if(c==='['){
    i++;while(/\s/.test(text[i]||'')&&i<text.length)i++;let key='';while(i<text.length&&/[A-Za-z0-9_]/.test(text[i]))key+=text[i++];
    while(i<text.length&&/\s/.test(text[i]))i++;if(!key||key.length>64||text[i++]!=='"')fail('pgn-format');let value='',closed=false;
    while(i<text.length){const t=text[i++];if(t==='"'){closed=true;break;}if(t==='\\'){if(i>=text.length)fail('pgn-format');value+=text[i++];}else value+=t;if(value.length>1024)fail('pgn-format');}
    while(i<text.length&&/\s/.test(text[i]))i++;if(!closed||text[i++]!==']')fail('pgn-format');yield{tag:key,value,offset,end:i};continue;
   }
   let token='';while(i<text.length&&!/[\s{}();\[\]]/.test(text[i]))token+=text[i++];if(!token)fail('pgn-format');
   token=token.replace(/^\d+(?:\.(?:\.\.)?|…)/,'');if(!token||/^(?:\.{1,3}|…+)$/.test(token)||/^\$\d+$/.test(token)||/^e\.?p\.?$/i.test(token))continue;
   token=token.replace(/\$\d+$/,'');if(token)yield{move:token,offset,end:i};
  }
  if(variation)fail('pgn-format');
 }
 function parse(text,options={}){
  text=String(text||'');if(text.length>MAX_BYTES||new TextEncoder().encode(text).length>MAX_BYTES)fail('pgn-size');
  const limit=Math.min(1000,Math.max(1,options.maxGames||MAX_GAMES)),games=[];let tags=Object.create(null),moves=[],state=null,keys=[],ended=false;
  const start=()=>{if(tags.Variant&&!/^(standard|chess|from position|fromposition)$/i.test(tags.Variant))fail('pgn-variant');if(tags.SetUp==='1'&&!tags.FEN)fail('pgn-fen');state=initial(tags.FEN||INITIAL);keys=[E.key(state)];};
  const finish=result=>{
   if(!moves.length){if(Object.keys(tags).length)fail('pgn-empty');return;}
   const tagged=tags.Result;if(tagged&&!has(resultFromPgn,tagged))fail('pgn-result');if(tagged&&result&&tagged!==result)fail('pgn-result');
   result=result||tagged||'*';const actual=E.status(state,keys),winner=resultFromPgn[result];if(actual.over&&['Schachmatt','Patt','Zu wenig Material'].includes(actual.reason)&&winner&&winner!==actual.result)fail('pgn-result');
   const date=/^(\d{4})\.(\d{2})\.(\d{2})$/.exec(tags.Date||''),when=date?Date.UTC(+date[1],+date[2]-1,+date[3]):null;
   const validDate=when!==null&&new Date(when).toISOString().slice(0,10)===date.slice(1).join('-'),tc=/^(\d+)\+(\d+)$/.exec(tags.TimeControl||''),clock=tc&&+tc[1]%60===0?String(+tc[1]/60)+(+tc[2]?'+'+(+tc[2]):''):'none';
   const knownClock=['1','2+1','3','3+2','5','5+3','10','10+5','15+10','30'].includes(clock)?clock:'none';
   games.push({names:{w:tags.White||'',b:tags.Black||''},result:winner||null,mode:'imported',you:null,reason:actual.over?actual.reason:tags.DenkArenaTermination==='resignation'?'Aufgabe':/time forfeit/i.test(tags.Termination||'')?'Zeit abgelaufen':'',clock:knownClock,date:validDate?when:null,initialFen:tags.FEN?E.toFEN(initial(tags.FEN)):undefined,moves:moves.slice(),imported:true,pgn:{tags:{...tags}}});
   if(games.length>limit)fail('pgn-count');tags=Object.create(null);moves=[];state=null;keys=[];ended=true;
  };
  for(const t of tokens(text)){
   if(t.tag){if(moves.length)finish(null);tags[t.tag]=t.value;if(Object.keys(tags).length>128)fail('pgn-format');ended=false;continue;}
   if(has(resultFromPgn,t.move)){if(!state)start();finish(t.move);continue;}
   if(ended)ended=false;if(!state)start();if(moves.length>=MAX_PLIES)fail('pgn-plies');
   const token=t.move.replace(/[!?]+$/,''),L=E.legal(state),lan=/^([KQRBN])([a-h][1-8])([-x]?)([a-h][1-8])(?:=?([QRBN]))?[+#]?$/.exec(token);
   const matches=L.filter(m=>normalized(san(state,m,L))===normalized(token)||code(m)===token.toLowerCase()||lan&&m.p.toUpperCase()===lan[1]&&E.sqName(m.f)===lan[2]&&E.sqName(m.t)===lan[4]&&(!lan[3]||lan[3]!=='x'||m.cap)&&(m.promo||'')===(lan[5]||''));
   if(matches.length!==1)fail('pgn-move',t.move,moves.length+1);const m=matches[0],label=san(state,m,L);
   if(token.includes('#')&&!label.includes('#')||token.includes('+')&&!/[+#]/.test(label))fail('pgn-move',t.move,moves.length+1);
   moves.push(code(m));state=E.make(state,m);keys.push(E.key(state));
  }
  if(moves.length)finish(null);else if(Object.keys(tags).length)fail('pgn-empty');if(!games.length)fail('pgn-empty');return games;
 }
 // Recovery only at actual top-level game boundaries, never at text resembling
 // a header inside comments/variations. Malformed lexical structure stays an
 // error for the file: guessing a boundary could import invented games.
 function read(text,options={}){
  text=String(text||'');if(text.length>MAX_BYTES||new TextEncoder().encode(text).length>MAX_BYTES)fail('pgn-size');
  const limit=Math.min(1000,Math.max(1,options.maxGames||MAX_GAMES)),parts=[];let start=0,moved=false,touched=false;
  const end=at=>{if(touched){parts.push(text.slice(start,at));if(parts.length>limit)fail('pgn-count');}start=at;moved=false;touched=false;};
  for(const t of tokens(text)){
   if(t.tag){if(moved)end(t.offset);touched=true;}
   else{touched=true;moved=true;if(has(resultFromPgn,t.move))end(t.end);}
  }
  end(text.length);if(!parts.length)fail('pgn-empty');
  const games=[],skipped=[];
  parts.forEach((part,index)=>{try{games.push(...parse(part,{maxGames:1}));}catch(e){skipped.push({index:index+1,code:e.code||'pgn-format',move:e.move,ply:e.ply});}});
  return {games,skipped,total:parts.length};
 }
 const safe=s=>String(s??'').replace(/[\r\n\u0000-\u001f]/g,' ').replace(/\\/g,'\\\\').replace(/"/g,'\\"');
 function write(game){
  if(!game||!Array.isArray(game.moves)||game.moves.length>MAX_PLIES)fail('pgn-format');
  const tags={...game.pgn?.tags},date=Number.isFinite(game.date)?new Date(game.date).toISOString().slice(0,10).replace(/-/g,'.'):'????.??.??',result=resultToPgn[game.result]||'*';
  Object.assign(tags,{Event:tags.Event||'DenkArena',Site:tags.Site||'?',Date:tags.Date||date,Round:tags.Round||'-',White:game.names?.w||(game.mode==='solo'?'DenkArena (level '+((game.level||0)+1)+')':'?'),Black:game.names?.b||(game.mode==='solo'?'DenkArena (level '+((game.level||0)+1)+')':'?'),Result:result});
  if(game.initialFen&&E.toFEN(initial(game.initialFen))!==INITIAL){tags.SetUp='1';tags.FEN=E.toFEN(initial(game.initialFen));}else{delete tags.SetUp;delete tags.FEN;}
  if(!tags.TimeControl){if(game.clock&&game.clock!=='none'){const [m,inc='0']=game.clock.split('+');tags.TimeControl=String(+m*60)+'+'+inc;}else tags.TimeControl='-';}
  if(game.reason==='Aufgabe')tags.DenkArenaTermination='resignation';
  let s=initial(game.initialFen||INITIAL);const words=[];
  for(let i=0;i<game.moves.length;i++){const L=E.legal(s),m=L.find(m=>code(m)===game.moves[i]);if(!m)fail('pgn-move',game.moves[i],i+1);if(s.turn==='w'||i===0)words.push(s.full+(s.turn==='w'?'.':'...'));words.push(san(s,m,L));s=E.make(s,m);}
  words.push(result);const lines=[];let line='';for(const w of words){if(line.length+w.length+1>80){lines.push(line);line='';}line+=(line?' ':'')+w;}if(line)lines.push(line);
  const order=['Event','Site','Date','Round','White','Black','Result',...Object.keys(tags).filter(k=>!['Event','Site','Date','Round','White','Black','Result'].includes(k)).sort()];
  return order.filter(k=>/^[A-Za-z][A-Za-z0-9_]*$/.test(k)).map(k=>'['+k+' "'+safe(tags[k])+'"]\n').join('')+'\n'+lines.join('\n')+'\n';
 }
 root.ChessPgn=Object.freeze({parse,read,write,initial,hasStandardMaterial,san,MAX_BYTES,MAX_GAMES,MAX_PLIES,INITIAL});
})(typeof self!=='undefined'?self:window);
