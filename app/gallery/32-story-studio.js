// Story Hubs from the Template Studio (step 76): Claude's Story collection (c1–c5) and Gemini's Minimal collection (g1–g3).
// Each template is one long scrolling page drawn from this wedding's own names, events, photos, notes and photographer.
// The template code below comes from the Template Studio (layers prototype); this file adds the bridge to the app:
// - photos: every picture is a numbered "slot" (s58, e0…). The couple can change any slot to any of their wedding photos
//   (Control Panel › Hub layout › the template › Photos, or tap a photo in the editor). Unchosen slots take the cover photos,
//   event highlights and event photos, in that order.
// - the app keeps its own header, bottom bar and Find me button; the template's demo header and bar are left out.
// - tune (saved per template, step 76): { photos: {slot: id}, colors: {light: {var: hex}, dark: {…}}, hide: [layer keys], motion: 'off', names, date }
// - no demo words: blessings come from the wedding's notes, the credit from the photographer (hidden when there is none).
(function pgStoryStudio() {
  'use strict';
  const FONTS = 'https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;1,400&family=Cormorant+Garamond:ital,wght@0,400;0,500;0,600;1,400;1,500&family=Instrument+Serif:ital@0;1&family=Jost:wght@400;500;600;700&family=Marcellus&family=Parisienne&family=Pinyon+Script&display=swap';
  const BLANK = 'data:image/gif;base64,R0lGODlhAQABAAAAACwAAAAAAQABAAA=';
  const esc = s => String(s == null ? '' : s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]);
  const slug = s => String(s || '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40);

  // ---- what the template code reads while it draws (set by mount() for each drawing) ----
  let S = { names: '', date: '' }, STU = '', R = null, OV = '';
  const MOM = [89, 97, 15, 49, 16, 60, 2, 87, 90, 48, 82, 38];   // the studio's "moment" photos: slots like any other
  const CR = [['r', 'Reel', 'to the beat'], ['p', 'Post', 'snaps to a frame'], ['m', 'Add a moment', 'photos → a little film']];
  const ov = x => { OV += x; return ''; };
  const keyOf = n => (typeof n === 'string' ? n : 's' + n);
  function urlOf(k, w) { const id = R ? R.photo(k) : ''; return id ? (window.pgImg ? pgImg(id, w) : 'https://lh3.googleusercontent.com/d/' + id + '=w' + w) : BLANK; }
  const p = (n, w) => { const k = keyOf(n); return urlOf(k, w || 1200); };
  const img = (n, cls = 'cover', st = '') => { const k = keyOf(n); return `<img src="${urlOf(k, /kb/.test(cls) ? 1400 : 700)}" class="${cls}" style="${st}" alt="" data-slot="${k}" loading="lazy" decoding="async" draggable="false">`; };
  const L = (name, html, tag = 'div', attrs = '') => (name === 'Photographer credit' && !STU ? '' : `<${tag} data-l="${name}" ${attrs}>${html}</${tag}>`);
  const nm = () => S.names.split('&amp;').map(s => s.trim());
  const evs = () => (R ? R.events : []);
  const film = () => '';   // the studio's "Wedding film · playing" label: there is no film here, the photo moves gently
  function parts(type, n = 14) {
    let h = ''; const RN = (a, b) => a + Math.random() * (b - a);
    for (let i = 0; i < n; i++) {
      const st = `left:${RN(0, 96)}%;animation-duration:${RN(4, 8)}s;animation-delay:${RN(-8, 0)}s;`;
      if (type === 'petal') h += `<i class="pt" style="${st}width:9px;height:12px;border-radius:80% 0 80% 0;background:${['#F2A400', '#E2581F', '#F6C445'][i % 3]}"></i>`;
      else { const c = type === 'neon' ? ['#FFD54A', '#FF3D8B', '#5CE1FF', '#FF9A3D'][i % 4] : '#FFE2A0'; h += `<i class="tw" style="left:${RN(2, 96)}%;top:${RN(2, 95)}%;width:${RN(2, 5)}px;height:${RN(2, 5)}px;background:${c};box-shadow:0 0 8px ${c};animation-delay:${RN(-2, 0)}s"></i>`; }
    }
    return h;
  }
  // the three live previews of Create (Reel, Post, Add a moment)
  function pv(kind, size, rad = '50%') {
    const s = `width:${size}px;height:${size}px;border-radius:${rad}`;
    if (kind === 'm') return `<div class="lp sm" style="${s}">${img(MOM[0], '')}${img(MOM[1], '')}${img(MOM[2], '')}</div>`;
    if (kind === 'r') return `<div class="lp beat" style="${s}">${img(MOM[3])}<div class="bars"><b></b><b></b><b></b><b></b></div></div>`;
    return `<div class="lp snap" style="${s};background:#0002"><div>${img(MOM[4], '')}</div></div>`;
  }
  // blessings: the wedding's own notes; with none yet, an invitation to write the first one
  const noteOf = i => (R && R.notes[i]) || null;
  const Q = i => { const n = noteOf(i); return n ? '“' + esc(String(n.text).slice(0, 140)) + '”' : '“Write the first blessing for the couple.”'; };
  const QA = (i, up) => { const n = noteOf(i); if (!n || !n.name) return ''; const t = '— ' + esc(n.name); return up ? t.toUpperCase() : t; };
  const QL = () => { const l = (R ? R.notes : []).slice(0, 2).map(n => esc(String(n.text).slice(0, 140)) + (n.name ? ' — ' + esc(n.name) : '')); return l.length ? l : ['Write the first blessing for the couple.']; };

  // ======== templates (from the Template Studio) ========
const ARCH="path('M0,420 V104 Q0,20 115,0 Q230,20 230,104 V420Z')";
const C1={id:'c1',src:'Claude',name:'Darbar Invitation',venue:'Palace / haveli / fort',fd:'Pinyon Script',fb:'Jost',hub:'palace',
 pal:{bg:'#F6EEE2',ink:'#2A1712',acc:'#B08A3E',card:'#FFFDF8',acc2:'#6B1B26',nav:'#6B1B26',navInk:'#F6EEE2',navOn:'#6B1B26',hdrInk:'#6B1B26',glass:'#F6EEE2cc'},
 dpal:{bg:'#1D1210',ink:'#F3E6D2',acc:'#C9A24E',card:'#2A1A16',acc2:'#B8434F',nav:'#2A1410',navInk:'#F3E6D2',navOn:'#2A1410',hdrInk:'#F3E6D2',glass:'#2A1A16cc'},
 motion:[['Names in gold','on load','Only the names show; carved doors are closed inside the jharokha.'],['Doors open, camera goes through the arch','scroll 0→600px','Doors swing open (3D), then the arch grows past the screen edges.'],['Invitation unfolds','in view','Each event is one fold of the card; the line glows gold in the middle.'],['Wax seal Create','tap','Seal breaks open into three live previews. For guests and couple.']],
 render(){const E=evs();const J=`background-image:repeating-linear-gradient(45deg,color-mix(in srgb,var(--acc) 18%,transparent) 0 1px,transparent 1px 18px),repeating-linear-gradient(-45deg,color-mix(in srgb,var(--acc) 18%,transparent) 0 1px,transparent 1px 18px)`;
 return `<section data-stage style="height:${844+620}px;position:relative"><div style="position:sticky;top:0;height:844px;overflow:hidden">
 ${L('Jali pattern','', 'div',`style="position:absolute;inset:0;${J}"`)}
 ${L('Couple names',`<div style="font:400 60px/1 'Pinyon Script';color:var(--acc2)">${nm()[0]}</div><div style="font:italic 22px 'Cormorant Garamond';color:var(--acc);margin:4px 0">&amp;</div><div style="font:400 60px/1 'Pinyon Script';color:var(--acc2)">${nm()[1]||''}</div>`,'div','id="c1n" style="position:absolute;top:100px;left:0;right:0;text-align:center;z-index:3"')}
 <div data-l="Jharokha arch (zooms)" id="c1a" style="position:absolute;left:80px;top:330px;width:230px;height:420px;clip-path:${ARCH};transform-origin:50% 35%">
  ${L('Cover photo',img(58,'cover kb'),'div','style="position:absolute;inset:0"')}
  ${L('Left door',`<div style="position:absolute;inset:24px 16px;border:1px solid #fff3;border-radius:60px 60px 0 0"></div><i style="position:absolute;right:10px;top:50%;width:9px;height:9px;border-radius:50%;background:var(--acc)"></i>`,'div','id="c1dl" style="position:absolute;inset:0 50% 0 0;background:linear-gradient(90deg,#4a0f18,var(--acc2));border-right:1px solid var(--acc);transform-origin:0 50%"')}
  ${L('Right door',`<div style="position:absolute;inset:24px 16px;border:1px solid #fff3;border-radius:60px 60px 0 0"></div><i style="position:absolute;left:10px;top:50%;width:9px;height:9px;border-radius:50%;background:var(--acc)"></i>`,'div','id="c1dr" style="position:absolute;inset:0 0 0 50%;background:linear-gradient(270deg,#4a0f18,var(--acc2));border-left:1px solid var(--acc);transform-origin:100% 50%"')}
 </div>
 ${L('Arch outline',`<svg width="230" height="420" style="overflow:visible"><path d="M1,420 V104 Q1,20 115,1 Q229,20 229,104 V420" fill="none" stroke="currentColor" stroke-width="3"/></svg>`,'div','id="c1o" style="position:absolute;left:80px;top:330px;color:var(--acc);transform-origin:115px 147px;pointer-events:none"')}
 ${L('Film title (after reveal)',`<div style="font:400 44px 'Pinyon Script';color:#F6EEE2">${S.names}</div><div style="font:500 10px Jost;letter-spacing:3px;color:#E9CF8E;margin-top:4px">${S.date.toUpperCase()}</div>`,'div','id="c1t" style="position:absolute;left:0;right:0;bottom:120px;text-align:center;opacity:0;z-index:4"')}
 <div id="c1s" style="position:absolute;inset:auto 0 0 0;height:300px;background:linear-gradient(transparent,#3a0a12dd);opacity:0;z-index:3" data-l="Maroon shade"></div>
 ${L('Hint',`SCROLL TO ENTER ↓`,'div','id="c1h" style="position:absolute;bottom:110px;left:0;right:0;text-align:center;font:600 10px Jost;letter-spacing:3px;color:var(--acc2);animation:pulse 2s infinite"')}
 </div></section>
 <section data-events data-l="Invitation card" style="margin:20px 18px;background:var(--card);border:1px solid var(--acc);padding:22px 18px;position:relative;${J}">
  <div style="position:absolute;inset:8px;border:1px solid color-mix(in srgb,var(--acc) 60%,transparent);pointer-events:none"></div>
  <div data-l="Invitation line" style="text-align:center;font:italic 15px 'Cormorant Garamond';margin-bottom:10px">together with their families request your presence at</div>
  ${E.map((e,i)=>`<div class="fold" data-l="Event · ${e.n}" onclick="PGSS.ev(this,${e.i})" style="display:flex;gap:14px;align-items:center;padding:12px 4px;border-top:1px solid color-mix(in srgb,var(--acc) 40%,transparent);cursor:pointer;transform-origin:top;transition:transform .7s cubic-bezier(.2,.8,.2,1),opacity .7s,background .6s">
   <div style="width:58px;height:74px;flex:none;clip-path:path('M0,74 V26 Q0,6 29,0 Q58,6 58,26 V74Z')">${img(e.ph)}</div>
   <div><div style="font:600 25px 'Cormorant Garamond';color:var(--acc2)">The ${e.n}</div><div style="font:500 10px Jost;letter-spacing:2px;opacity:.75">${e.t.toUpperCase()}</div></div></div>`).join('')}
 </section>
 <section data-l="Create · wax seal" style="text-align:center;padding:26px 0 10px;position:relative;height:330px">
  <div style="font:italic 15px 'Cormorant Garamond';opacity:.8">for guests and the couple</div>
  <div id="c1seal" onclick="this.parentNode.classList.toggle('open')" data-l="Wax seal" style="cursor:pointer;margin:12px auto 0;width:118px;height:118px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#9a2a38,var(--acc2) 60%,#3d0a12);display:grid;place-items:center;color:#F6EEE2;box-shadow:0 10px 24px #6B1B2666,inset 0 0 0 7px #ffffff14;position:relative;z-index:2;transition:transform .4s"><div><div style="font:italic 14px 'Cormorant Garamond'">Add your</div><div style="font:30px 'Pinyon Script';color:#E9CF8E;line-height:.9">moment</div><div style="font:9px Jost;letter-spacing:2px;margin-top:4px;opacity:.8">TAP TO BREAK</div></div></div>
  ${CR.map((x,i)=>`<button data-l="Create · ${x[1]}" class="sealpv" onclick="PGSS.a(this,'${x[0]}')" style="--dx:${[-120,0,120][i]}px;--dy:${[60,120,60][i]}px;position:absolute;left:50%;top:110px;margin-left:-38px;background:none;border:0;cursor:pointer;color:var(--ink);opacity:0;transform:scale(.3);transition:.5s cubic-bezier(.34,1.56,.64,1) ${i*.07}s;display:flex;flex-direction:column;align-items:center;gap:4px">${pv(x[0],76,'14px')}<b style="font-size:11.5px">${x[1]}</b></button>`).join('')}
 </section>
 <style>.open .sealpv{opacity:1!important;transform:translate(var(--dx),var(--dy))!important}.open #c1seal{transform:scale(.7) translateY(-30px)}.fold:not(.in){transform:perspective(700px) rotateX(-70deg);opacity:.15}.fold.in.mid{background:color-mix(in srgb,var(--acc) 16%,transparent)}</style>
 ${L('Blessing card',`<div style="font:italic 16px 'Cormorant Garamond'">${Q(0)}</div><div style="font-size:10px;opacity:.6;margin-top:4px">${QA(0)}</div><div style="font:600 11px Jost;color:var(--acc2);margin-top:10px">Leave a blessing</div>`,'div','style="margin:0 18px;background:var(--card);border:1px solid var(--acc);padding:16px" onclick="PGSS.a(this,\'notes\')"')}
 ${L('Photographer credit',`Photographed by ${STU}`,'div','style="text-align:center;font:italic 14px \'Cormorant Garamond\';opacity:.7;padding:24px 0 110px"')}
 `},
 scroll(vp){const st=vp.querySelector('[data-stage]');if(!st)return;const p=Math.min(1,vp.scrollTop/620),a=Math.min(1,p/.4),z=Math.max(0,(p-.4)/.6);
  const q=id=>vp.querySelector('#'+id);q('c1dl').style.transform=`perspective(600px) rotateY(${-a*100}deg)`;q('c1dr').style.transform=`perspective(600px) rotateY(${a*100}deg)`;
  const s=1+z*z*3.4;q('c1a').style.transform=`translateY(${-z*230}px) scale(${s})`;q('c1o').style.transform=`translateY(${-z*230}px) scale(${s})`;q('c1o').style.opacity=1-z;
  q('c1n').style.opacity=1-z*1.6;q('c1n').style.transform=`translateY(${-z*80}px)`;q('c1h').style.opacity=1-a;q('c1t').style.opacity=Math.max(0,(z-.75)*4);q('c1s').style.opacity=Math.max(0,(z-.6)*2.5);
  const mid=vp.clientHeight/2;vp.querySelectorAll('.fold').forEach(f=>{const r=f.getBoundingClientRect(),o=vp.getBoundingClientRect(),y=r.top-o.top;f.classList.toggle('in',y<vp.clientHeight*.9);f.classList.toggle('mid',Math.abs(y+r.height/2-mid)<60)})}};

const C2={id:'c2',src:'Claude',name:'Tide Journey',venue:'Beach destination',fd:'Marcellus',fb:'Jost',hub:'home',
 pal:{bg:'#EEE3D0',ink:'#123F4A',acc:'#123F4A',acc2:'#E07A5F',card:'#FFFFFF',nav:'#FFFFFF',navInk:'#123F4A',navOn:'#fff',hdrInk:'#fff',sea:'#123F4A',glass:'#ffffff22'},
 dpal:{bg:'#0B2229',ink:'#E7F1EF',acc:'#7FC4C4',acc2:'#E07A5F',card:'#123039',nav:'#123039',navInk:'#E7F1EF',navOn:'#0B2229',hdrInk:'#fff',sea:'#07181D',glass:'#ffffff22'},
 motion:[['The sea covers everything','on load','Four wave layers rise and fall; names float on the water.'],['Tide goes out','scroll 0→560px','Each wave layer slides down at its own speed and uncovers the film.'],['Walk along the shore','swipe sideways','Events are stops on a sideways path; footprints + shell dots show where you are.'],['Message in a bottle','tap','The bottle bobs; tap it and three live previews float out.']],
 render(){const E=evs();const wave=(y,c,op,id)=>`<svg data-l="Wave layer ${id}" class="c2w" data-k="${id}" viewBox="0 0 390 900" preserveAspectRatio="none" style="position:absolute;left:-10px;width:410px;top:${y}px;height:900px"><path d="M0,30 C60,0 130,60 195,30 C260,0 330,60 390,30 V900 H0Z" fill="${c}" opacity="${op}"/></svg>`;
 return `<section data-stage style="height:${844+560}px;position:relative"><div style="position:sticky;top:0;height:844px;overflow:hidden;background:var(--sea)">
 ${L('Cover photo',img(17,'cover kb'),'div','style="position:absolute;inset:0"')}
 ${wave(-40,'#1F5A66',.95,1)}${wave(150,'#2A6A78',.95,2)}${wave(330,'#235F6C',.97,3)}${wave(520,'#123F4A',1,4)}
 ${L('Couple names',`<div style="font:56px/1 Marcellus">${nm()[0]}</div><div style="font:40px Marcellus;opacity:.85">&amp; ${nm()[1]||''}</div><div style="font:500 11px Jost;letter-spacing:4px;margin-top:10px;opacity:.8">${S.date.toUpperCase()}</div>`,'div','id="c2n" style="position:absolute;top:330px;left:0;right:0;text-align:center;color:#fff;z-index:3"')}
 <div id="c2e" style="opacity:0;position:absolute;inset:0;z-index:4;pointer-events:none">
  ${L('Foam line',`<svg viewBox="0 0 390 40" width="390" height="40"><path d="M0,20 C60,0 130,40 195,20 C260,0 330,40 390,20 V40H0Z" fill="#fff" opacity=".9"/></svg>`,'div','class="bob" style="position:absolute;bottom:0;left:0"')}
  ${film('top:100px;left:20px')}
  ${L('Film title',`<div style="font:34px Marcellus">${S.names}</div><div style="font-size:12px;opacity:.85">Three days by the sea</div><div onclick="PGSS.go(this)" style="pointer-events:auto;display:inline-block;margin-top:12px;background:#fff;color:#123F4A;padding:9px 18px;border-radius:20px;font:600 12px Jost;cursor:pointer">Begin the journey →</div>`,'div','style="position:absolute;left:24px;bottom:120px;color:#fff"')}
 </div></div></section>
 <section data-events data-l="Shore (sideways journey)" style="padding:30px 0 10px;position:relative">
  <div style="text-align:center;font:26px Marcellus">Along the shore</div>
  ${L('Shell progress dots',E.map((_,i)=>`<i style="display:inline-block;width:${i?7:10}px;height:${i?7:10}px;border-radius:50%;margin:0 4px;background:${i?'#c8b99c':'var(--acc)'}"></i>`).join(''),'div','id="c2dots" style="text-align:center;margin:10px 0"')}
  <div id="c2t" onscroll="PGSS.c2(this)" style="display:flex;gap:18px;overflow-x:auto;scroll-snap-type:x mandatory;padding:10px 60px 20px;scrollbar-width:none">
   ${E.map((e,i)=>`<div data-l="Event · ${e.n}" style="flex:none;width:270px;scroll-snap-align:center;cursor:pointer" onclick="PGSS.ev(this,${e.i})"><div style="height:330px;border-radius:20px;overflow:hidden;box-shadow:0 14px 30px #0003;transform:rotate(${i%2?2:-2}deg)">${img(e.ph)}</div><div style="font:26px Marcellus;margin-top:14px">${e.n}</div><div style="font:500 11px Jost;letter-spacing:2px;opacity:.7">${e.t.toUpperCase()}</div></div>`).join('')}
  </div>
  ${L('Footprints',`<svg width="390" height="40">${Array.from({length:9}).map((_,i)=>`<ellipse cx="${30+i*42}" cy="${20+(i%2?8:-6)}" rx="5" ry="9" fill="#c8b99c" transform="rotate(70 ${30+i*42} ${20+(i%2?8:-6)})"/>`).join('')}</svg>`)}
 </section>
 <section data-l="Create · bottle" id="c2c" style="background:linear-gradient(#EAF1F0,#BFD9DB);margin-top:10px;padding:30px 0 40px;text-align:center;position:relative;color:#123F4A;height:420px;overflow:hidden">
  <div style="font:28px Marcellus">Send a moment</div><div style="font-size:12px;opacity:.7">guests and the couple · tap the bottle</div>
  <div class="bob" data-l="Bottle" onclick="document.getElementById('c2c').classList.toggle('open')" style="cursor:pointer;margin:26px auto 0;width:150px;position:relative;z-index:2"><svg width="150" height="80" viewBox="0 0 150 80"><g transform="rotate(-16 75 40)"><rect x="18" y="16" width="100" height="52" rx="25" fill="#cfe7e4" stroke="#123F4A" stroke-width="1.5"/><rect x="114" y="31" width="26" height="22" rx="4" fill="#b98c5a"/></g></svg></div>
  ${L('Waves',`<svg viewBox="0 0 390 80" width="390" height="80" style="position:absolute;left:0;top:230px"><path d="M0,30 C60,0 130,60 195,30 C260,0 330,60 390,30 V80H0Z" fill="#9CC7CB"/></svg>`)}
  ${CR.map((x,i)=>`<button data-l="Create · ${x[1]}" class="c2pv" onclick="PGSS.a(this,'${x[0]}')" style="--dx:${[-120,0,120][i]}px;position:absolute;left:50%;top:170px;margin-left:-40px;background:none;border:0;cursor:pointer;color:#123F4A;opacity:0;transform:scale(.2);transition:.6s cubic-bezier(.34,1.56,.64,1) ${i*.1}s;display:flex;flex-direction:column;align-items:center;gap:5px">${pv(x[0],80,'16px')}<b style="font-size:11.5px">${x[1]}</b></button>`).join('')}
 </section><style>#c2c.open .c2pv{opacity:1;transform:translate(var(--dx),110px)}</style>
 ${L('Photographer credit',`Photographed by ${STU}`,'div','style="text-align:center;font:13px Marcellus;opacity:.7;padding:24px 0 110px"')}`},
 scroll(vp){const p=Math.min(1,vp.scrollTop/560);vp.querySelectorAll('.c2w').forEach(w=>{w.style.transform=`translateY(${p*(320+w.dataset.k*160)}px)`});
  const n=vp.querySelector('#c2n');n.style.transform=`translateY(${p*260}px)`;n.style.opacity=1-p*1.3;vp.querySelector('#c2e').style.opacity=Math.max(0,(p-.7)*3.3)}};
function c2dots(t){const i=Math.round(t.scrollLeft/288);document.querySelectorAll('#c2dots i').forEach((d,k)=>{d.style.background=k===i?'var(--acc)':'#c8b99c';d.style.width=d.style.height=(k===i?10:7)+'px'})}

const C3={id:'c3',src:'Claude',name:'Cloud Pages',venue:'Mountain destination',fd:'Instrument Serif',fb:'Jost',hub:'home',
 pal:{bg:'#EEF0EB',ink:'#1E3A2C',acc:'#C9A36B',acc2:'#5D6C70',card:'#FFFFFF',nav:'#1E3A2C',navInk:'#EEF0EB',navOn:'#1E3A2C',hdrInk:'#1E3A2C',glass:'#ffffff99'},
 dpal:{bg:'#101814',ink:'#E6ECE6',acc:'#C9A36B',acc2:'#8A9A9E',card:'#18241D',nav:'#0B120E',navInk:'#E6ECE6',navOn:'#0B120E',hdrInk:'#fff',glass:'#00000044'},
 motion:[['Inside the clouds','on load','Clouds drift slowly; only the date shows.'],['Clouds part, names rise','scroll 0→600px','Clouds slide left/right, mountains move slower (parallax), names rise from the valley.'],['Story pages','swipe up','Each event is one full-screen page with progress bars at the top (like Instagram stories).'],['Drawer from the valley','tap the tab','A mist-coloured drawer slides up with three live previews.']],
 render(){const E=evs();const cl=(x,y,r,k)=>`<g class="c3c" data-d="${k}"><circle cx="${x}" cy="${y}" r="${r}" fill="#fff"/><circle cx="${x+r}" cy="${y+10}" r="${r*.8}" fill="#fff"/><circle cx="${x-r}" cy="${y+14}" r="${r*.7}" fill="#fff"/></g>`;
 return `<section data-stage style="height:${844+600}px;position:relative"><div style="position:sticky;top:0;height:844px;overflow:hidden;background:linear-gradient(#DCE6EA,#EEF0EB)">
 ${L('Mountains (far)',`<svg width="390" height="844"><path d="M0,560 L80,470 L150,520 L230,410 L310,500 L390,450 V844 H0Z" fill="#5D6C70" opacity=".55"/></svg>`,'div','id="c3m1" style="position:absolute;inset:0"')}
 ${L('Mountains (near)',`<svg width="390" height="844"><path d="M0,640 L110,560 L200,620 L290,560 L390,610 V844 H0Z" fill="#1E3A2C"/></svg>`,'div','id="c3m2" style="position:absolute;inset:0"')}
 ${L('Cover photo (in mountain)',img(1,'cover kb'),'div','id="c3f" style="position:absolute;inset:0;clip-path:polygon(0 100%,0 62%,20% 52%,38% 58%,59% 44%,80% 56%,100% 49%,100% 100%);transform:translateY(100%)"')}
 ${L('Clouds',`<svg width="390" height="844" style="overflow:visible">${cl(80,220,90,-1)}${cl(300,300,110,1)}${cl(140,470,120,-1)}${cl(330,560,100,1)}${cl(60,680,110,-1)}${cl(250,760,120,1)}</svg>`,'div','class="c3drift" style="position:absolute;inset:0"')}
 ${L('Couple names',`<div style="font:66px/1 'Instrument Serif'">${nm()[0]}</div><div style="font:italic 50px 'Instrument Serif'">&amp; ${nm()[1]||''}</div>`,'div','id="c3n" style="position:absolute;top:300px;left:0;right:0;text-align:center;color:#1E3A2C;opacity:0"')}
 ${L('Date',S.date.toUpperCase(),'div','id="c3d" style="position:absolute;top:410px;left:0;right:0;text-align:center;font:600 12px Jost;letter-spacing:4px;color:#5D6C70"')}
 </div></section>
 <div data-events></div>
 ${E.map((e,i)=>`<section data-l="Event · ${e.n}" style="height:844px;position:relative;scroll-snap-align:start;color:#fff;overflow:hidden">${img(e.ph,'cover kb')}
  <div style="position:absolute;inset:0;background:linear-gradient(transparent 45%,#000c)"></div>
  <div data-l="Progress bars" style="position:absolute;top:20px;left:16px;right:16px;display:flex;gap:4px">${E.map((_,k)=>`<i style="flex:1;height:3px;border-radius:2px;background:#fff;opacity:${k<=i?1:.35}"></i>`).join('')}</div>
  <div style="position:absolute;left:24px;bottom:290px;font:600 10px Jost;letter-spacing:3px;color:#E9CF8E">PAGE ${i+1}</div>
  <div class="rise" style="position:absolute;left:22px;bottom:220px;font:60px 'Instrument Serif'">${e.n}</div>
  <div data-l="Peek photos" style="position:absolute;left:24px;bottom:146px;display:flex;gap:8px">${[0,1,2,3].map(k=>`<div class="rise" style="width:60px;height:56px;border-radius:8px;overflow:hidden;transition-delay:${.15+k*.07}s">${img(MOM[(i+k)%12])}</div>`).join('')}<div onclick="PGSS.ev(this,${e.i})" style="width:60px;height:56px;border-radius:8px;border:1px solid #fff;display:grid;place-items:center;font:600 12px Jost;cursor:pointer">Open</div></div></section>`).join('')}
 <section data-l="Notes page" style="min-height:500px;padding:120px 26px 140px;scroll-snap-align:start">
  <div style="font:44px 'Instrument Serif'">Words for us</div>
  ${QL().map(q=>`<div class="rise" style="font:italic 20px 'Instrument Serif';margin:22px 0;border-left:2px solid var(--acc);padding-left:14px">${q}</div>`).join('')}
  <div style="font-size:11px;opacity:.6;margin-top:40px">Photographed by ${STU}</div></section>
 ${ov(L('Drawer tab',`↑ Make something`,'div','onclick="document.getElementById(\'c3dr\').classList.add(\'open\')" style="pointer-events:auto;position:absolute;bottom:84px;left:50%;transform:translateX(-50%);z-index:41;background:var(--card);color:var(--ink);padding:8px 18px;border-radius:18px 18px 0 0;font:600 12px Jost;cursor:pointer;box-shadow:0 -4px 14px #0002"'))}
 ${ov(`<div id="c3dr" data-l="Create drawer" style="pointer-events:auto;position:absolute;left:0;right:0;bottom:0;height:470px;z-index:45;background:var(--bg);border-radius:28px 28px 0 0;padding:16px 22px;transform:translateY(100%);transition:transform .5s cubic-bezier(.2,.9,.2,1);box-shadow:0 -10px 40px #0004">
  <div onclick="this.parentNode.classList.remove('open')" style="width:50px;height:5px;border-radius:3px;background:#5D6C7066;margin:0 auto 18px;cursor:pointer"></div>
  <div style="font:34px 'Instrument Serif'">Make something</div><div style="font-size:12px;opacity:.7">from this wedding · guests and the couple</div>
  <div style="display:flex;justify-content:space-between;margin-top:26px">${CR.map(x=>`<button data-l="Create · ${x[1]}" onclick="PGSS.a(this,'${x[0]}')" style="background:none;border:0;cursor:pointer;color:var(--ink);display:flex;flex-direction:column;align-items:flex-start;gap:7px">${pv(x[0],100,'14px')}<b style="font-size:12.5px">${x[1]}</b><small style="opacity:.65;margin-top:-6px">${x[2]}</small></button>`).join('')}</div></div>`)}
 <style>#c3dr.open{transform:none!important}.c3drift{animation:drift 9s ease-in-out infinite}@keyframes drift{50%{transform:translateX(10px)}}</style>`},
 scroll(vp){const p=Math.min(1,vp.scrollTop/600),q=id=>vp.querySelector('#'+id);if(!q('c3n'))return;
  vp.querySelectorAll('.c3c').forEach(c=>c.style.transform=`translateX(${c.dataset.d*p*470}px)`);q('c3d').style.opacity=1-p*3;
  q('c3n').style.opacity=Math.min(1,p*2.5)*(1-Math.max(0,(p-.75)*4));q('c3n').style.transform=`translateY(${(1-Math.min(1,p*2))*60}px)`;
  q('c3m1').style.transform=`translateY(${p*40}px)`;q('c3m2').style.transform=`translateY(${p*90}px)`;q('c3f').style.transform=`translateY(${(1-Math.max(0,(p-.45)/.55))*100}%)`;
  q('c3f').style.clipPath=p>.92?'none':'polygon(0 100%,0 62%,20% 52%,38% 58%,59% 44%,80% 56%,100% 49%,100% 100%)'}};

const blob=(cx,cy,r,seed,k=9,j=.28)=>{let s=seed*9301,R=()=>{s=(s*9301+49297)%233280;return s/233280};const pts=[];for(let i=0;i<k;i++){const a=2*Math.PI*i/k,rr=r*(1+(R()*2-1)*j);pts.push([cx+rr*Math.cos(a),cy+rr*Math.sin(a)])}
 let d='';for(let i=0;i<k;i++){const a=pts[i],b=pts[(i+1)%k],m=[(a[0]+b[0])/2,(a[1]+b[1])/2];d+=i?`Q${a[0].toFixed(1)},${a[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)} `:`M${m[0].toFixed(1)},${m[1].toFixed(1)} `}
 const a=pts[0],m=[(pts[0][0]+pts[1][0])/2,(pts[0][1]+pts[1][1])/2];return d+`Q${a[0].toFixed(1)},${a[1].toFixed(1)} ${m[0].toFixed(1)},${m[1].toFixed(1)}Z`};
const C4={id:'c4',src:'Claude',name:'Haldi Splash',venue:'Farmhouse / garden day wedding',fd:'Parisienne',fb:'Jost',hub:'flower',
 pal:{bg:'#F3EEE3',ink:'#2E2A22',acc:'#C0643B',acc2:'#55623A',card:'#FFFFFF',nav:'#55623A',navInk:'#F3EEE3',navOn:'#fff',hdrInk:'#55623A',glass:'#F3EEE3cc'},
 dpal:{bg:'#1D1B14',ink:'#F0E9DA',acc:'#E07A4E',acc2:'#9BAA72',card:'#2A271E',nav:'#2A271E',navInk:'#F0E9DA',navOn:'#1D1B14',hdrInk:'#F0E9DA',glass:'#2A271Ecc'},
 motion:[['Names written by hand','on load 2s','Script names draw in left-to-right; tiny colour drops fall like powder.'],['Colour splashes open the photo','scroll 0→560px','Turmeric, gulaal and leaf-green splashes grow; the photo is inside them until they join.'],['Collage settles','in view','Scattered prints drift into place; the film plays in a splash-shaped window.'],['Peel a sticker','tap','Each Create option is a sticker with a live preview; tap to peel.']],
 render(){const E=evs(),S3=[[120,300,140,1,'#E8B931'],[280,420,150,2,'#E46E8C'],[150,560,120,3,'#55623A']];
 return `<section data-stage style="height:${844+560}px;position:relative"><div style="position:sticky;top:0;height:844px;overflow:hidden">
 ${L('Colour drops',[[60,200,8,'#E8B931'],[320,260,6,'#E46E8C'],[90,620,7,'#55623A'],[300,680,9,'#E8B931'],[200,150,5,'#E46E8C']].map(([x,y,r,c])=>`<svg style="position:absolute;left:${x-r*2}px;top:${y-r*2}px" width="${r*4}" height="${r*4}" class="bob"><path d="${blob(r*2,r*2,r,x)}" fill="${c}"/></svg>`).join(''))}
 <svg data-l="Splash reveal (photo in splashes)" width="390" height="844" style="position:absolute;inset:0"><defs><clipPath id="c4clip">${S3.map(([x,y,r,s])=>`<path class="c4b" d="${blob(x,y,r,s)}" style="transform-origin:${x}px ${y}px;transform:scale(0)"/>`).join('')}</clipPath></defs>
  <image href="${p(26)}" width="390" height="844" preserveAspectRatio="xMidYMid slice" clip-path="url(#c4clip)"/>
  ${S3.map(([x,y,r,s,c])=>`<path class="c4b" d="${blob(x,y,r*1.05,s)}" fill="none" stroke="${c}" stroke-width="10" opacity=".75" style="transform-origin:${x}px ${y}px;transform:scale(0)"/>`).join('')}</svg>
 ${L('Couple names (handwritten)',`<div><span class="hand" style="font:72px/1.1 Parisienne;color:var(--acc)">${nm()[0]}</span></div><div><span class="hand" style="font:54px/1.1 Parisienne;color:var(--acc2);animation-delay:.7s">&amp; ${nm()[1]||''}</span></div><div style="font:600 10px Jost;letter-spacing:3px;color:var(--acc2);margin-top:10px">A DAY IN THE GARDEN · ${S.date.toUpperCase()}</div>`,'div','id="c4n" style="position:absolute;top:340px;left:0;right:0;text-align:center"')}
 </div></section>
 <section data-l="Collage" style="position:relative;height:620px;margin-top:-120px">
  ${[[28,20,10,150,190,-6],[86,220,0,150,200,5],[29,30,420,160,180,4],[9,210,440,160,190,-5]].map(([n,x,y,w,h,r],i)=>`<div data-l="Collage print ${i+1}" class="scat" style="--r:${r}deg;--sx:${[-90,90,-80,100][i]}px;--sy:${[-60,-80,60,70][i]}px;position:absolute;left:${x}px;top:${y}px;width:${w+12}px;padding:6px 6px 24px;background:#fff;box-shadow:0 8px 20px #0002">${img(n,'cover','height:'+h+'px')}</div>`).join('')}
  <div data-l="Cover photo (splash window)" style="position:absolute;left:85px;top:170px;width:220px;height:280px;clip-path:path('${blob(110,140,125,7,11,.15)}');z-index:2">${img(26,'cover kb')}</div>
  ${film('top:410px;left:136px;z-index:3')}
 </section>
 <section data-events data-l="Sticker events" style="padding:10px 16px 20px"><div style="font:44px Parisienne;color:var(--acc2);margin-left:6px">Our days</div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:18px;margin-top:10px">${E.map((e,i)=>{const c=['#E8B931','#55623A','#E46E8C','#C0643B','#55623A'][i%5];return `<div data-l="Event · ${e.n}" class="rise bob" onclick="PGSS.ev(this,${e.i})" style="animation-delay:${i*.3}s;transition-delay:${(i%2)*.1}s;transform:rotate(${i%2?4:-4}deg);background:#fff;border:3px solid ${c};border-radius:16px;padding:8px;position:relative;cursor:pointer"><i style="position:absolute;top:-10px;left:50px;width:60px;height:18px;background:${c};opacity:.6;transform:rotate(-8deg)"></i><div style="height:130px;border-radius:10px;overflow:hidden">${img(e.ph)}</div><div style="text-align:center;font:26px Parisienne;color:${c}">${e.n}</div></div>`}).join('')}</div></section>
 <section data-l="Create · sticker sheet" style="margin:10px 16px;background:var(--card);border:1px solid #e5dccb;border-radius:18px;padding:16px"><div style="font:36px Parisienne;color:var(--acc2)">Make something</div><div style="font-size:11px;opacity:.6">guests and the couple · tap a sticker to peel it</div>
  <div style="display:flex;justify-content:space-around;margin-top:14px">${CR.map(x=>`<button data-l="Create · ${x[1]}" class="peel" onclick="this.classList.toggle('pl');PGSS.a(this,'${x[0]}')" style="background:#fff;border:2px dashed var(--acc);border-radius:16px;padding:6px 6px 8px;cursor:pointer;color:var(--ink);display:flex;flex-direction:column;align-items:center;gap:4px;transition:.4s;position:relative">${pv(x[0],78,'12px')}<b style="font-size:11.5px">${x[1]}</b><i class="corner"></i></button>`).join('')}</div></section>
 <style>.hand{display:inline-block;clip-path:inset(0 100% 0 0);animation:hand 1.6s ease forwards}@keyframes hand{to{clip-path:inset(0 0 0 0)}}
 .scat{transition:transform 1s cubic-bezier(.34,1.3,.64,1);transform:translate(var(--sx),var(--sy)) rotate(calc(var(--r)*3))}.scat.in{transform:rotate(var(--r))}
 .peel .corner{position:absolute;right:-2px;bottom:-2px;width:18px;height:18px;background:linear-gradient(135deg,transparent 50%,#e9dcc6 50%);border-radius:0 0 14px 0}.peel.pl{transform:rotate(-6deg) translateY(-8px);box-shadow:0 12px 20px #0003}</style>
 ${L('Photographer credit',`Photographed by ${STU}`,'div','style="text-align:center;font:22px Parisienne;color:var(--acc2);padding:20px 0 110px"')}`},
 scroll(vp){const p=Math.min(1,vp.scrollTop/560);vp.querySelectorAll('.c4b').forEach((b,i)=>b.style.transform=`scale(${Math.max(0,p*2.6-(i%3)*.25)})`);
  const n=vp.querySelector('#c4n');if(n){n.style.opacity=1-p*1.6;n.style.transform=`translateY(${-p*120}px)`}
  vp.querySelectorAll('.scat').forEach(s=>{const r=s.getBoundingClientRect(),o=vp.getBoundingClientRect();s.classList.toggle('in',r.top-o.top<vp.clientHeight*.8)})}};

const C5={id:'c5',src:'Claude',name:'Cinema Chapters',venue:'5-star ballroom · party plot · reception',fd:'Bodoni Moda',fb:'Jost',hub:'chand',
 pal:{bg:'#0F0E0D',ink:'#F4EDE2',acc:'#D8C197',acc2:'#C98B7A',card:'#1C1A18',nav:'#24211E',navInk:'#D8C197',navOn:'#0F0E0D',hdrInk:'#D8C197',glass:'#ffffff10'},
 dpal:{bg:'#000',ink:'#F4EDE2',acc:'#D8C197',acc2:'#C98B7A',card:'#141210',nav:'#1a1816',navInk:'#D8C197',navOn:'#000',hdrInk:'#D8C197',glass:'#ffffff10'},
 motion:[['One spotlight in the dark','on load','A warm spotlight fades up; names inside; gold dust floats.'],['Iris opens','scroll 0→560px','The circle of light grows like a camera iris and shows the film.'],['Letterbox','end of reveal','Black bars slide in; credits fade in like a film opening.'],['Chapters','scroll','Each event = full-screen title card (roman numeral) + a film strip that keeps moving.'],['Clapperboard Create','tap','The arm snaps shut and the three live previews open.']],
 render(){const E=evs(),RN=['I','II','III','IV','V','VI','VII','VIII','IX','X','XI','XII'];
 return `<section data-stage style="height:${844+560}px;position:relative"><div style="position:sticky;top:0;height:844px;overflow:hidden;background:#000">
 ${L('Spotlight','', 'div','id="c5g" style="position:absolute;left:25px;top:250px;width:340px;height:340px;border-radius:50%;background:radial-gradient(#D8C19766,transparent 70%)"')}
 ${L('Gold dust',parts('glow',26),'div','style="position:absolute;inset:0"')}
 ${L('Cover photo (iris)',img(83,'cover kb'),'div','id="c5f" style="position:absolute;inset:0;clip-path:circle(0px at 50% 50%)"')}
 ${L('Iris ring',`<div id="c5r" style="width:0;height:0;border-radius:50%;border:2px solid #D8C19788"></div>`,'div','style="position:absolute;left:50%;top:50%;transform:translate(-50%,-50%)"')}
 ${L('Couple names',`<div style="font:500 40px Bodoni Moda;letter-spacing:8px">${nm()[0].toUpperCase()}</div><div style="font:italic 18px Bodoni Moda;color:#D8C197">&amp;</div><div style="font:500 40px Bodoni Moda;letter-spacing:8px">${(nm()[1]||'').toUpperCase()}</div><div style="font:600 9px Jost;letter-spacing:4px;color:#D8C197;margin-top:14px">A FILM IN ${E.length} CHAPTER${E.length>1?'S':''}</div>`,'div','id="c5n" style="position:absolute;top:340px;left:0;right:0;text-align:center;color:#F4EDE2"')}
 ${L('Letterbox top','', 'div','id="c5lt" style="position:absolute;top:0;left:0;right:0;height:0;background:#000;z-index:3"')}
 ${L('Letterbox bottom','', 'div','id="c5lb" style="position:absolute;bottom:0;left:0;right:0;height:0;background:#000;z-index:3"')}
 ${L('Opening credits',`<div style="font:italic 30px Bodoni Moda;color:#F4EDE2">${S.names}</div><div style="font:500 9px Jost;letter-spacing:3px;color:#D8C197;margin-top:6px">${S.date.toUpperCase()}</div>`,'div','id="c5t" style="position:absolute;bottom:150px;left:0;right:0;text-align:center;z-index:4;opacity:0"')}
 </div></section>
 <div data-events></div>
 ${E.map((e,i)=>`<section data-l="Event · ${e.n}" style="padding:80px 0 40px;text-align:center;background:#000;color:#F4EDE2">
  <div class="rise" style="font:600 11px Jost;letter-spacing:6px;color:#D8C197">CHAPTER</div><div class="rise" style="font:110px/1 Bodoni Moda;color:#D8C197;transition-delay:.1s">${RN[i]}</div>
  <div class="rise" style="font:italic 46px Bodoni Moda;transition-delay:.2s">${e.n}</div><div class="rise" style="font-size:11px;color:#D8C197;opacity:.8;transition-delay:.25s">${e.t}</div>
  <div data-l="Film strip (moving)" style="margin-top:34px;background:#211E1B;padding:14px 0;overflow:hidden;position:relative;border-top:6px dashed #000;border-bottom:6px dashed #000" onclick="PGSS.ev(this,${e.i})"><div class="pss-strip" style="display:flex;gap:8px;width:max-content;animation-duration:${18+i}s">${[...Array(2)].map(()=>[0,1,2,3,4].map(k=>`<div style="width:100px;height:130px">${img(k?MOM[(i+k)%12]:e.ph)}</div>`).join('')).join('')}</div></div></section>`).join('')}
 <section data-l="Create · clapperboard" id="c5c" style="background:#000;color:#F4EDE2;text-align:center;padding:40px 0 30px">
  <div onclick="document.getElementById('c5c').classList.toggle('open')" style="cursor:pointer;width:170px;margin:0 auto;position:relative" data-l="Clapperboard"><div id="c5arm" style="height:34px;background:repeating-linear-gradient(110deg,#D8C197 0 18px,#0F0E0D 18px 34px);border-radius:4px;transform-origin:0 100%;transform:rotate(-22deg);transition:transform .25s"></div><div style="height:90px;background:#211E1B;border:1px solid #D8C197;border-radius:4px;display:grid;place-items:center;font:italic 22px Bodoni Moda">Your cut</div></div>
  <div style="font-size:11px;color:#D8C197;margin-top:10px">guests and the couple · tap the board</div>
  <div class="cpv" style="display:flex;justify-content:center;gap:16px;margin-top:20px">${CR.map(x=>`<button data-l="Create · ${x[1]}" onclick="PGSS.a(this,'${x[0]}')" style="background:none;border:0;cursor:pointer;color:#F4EDE2;display:flex;flex-direction:column;align-items:center;gap:6px">${pv(x[0],86,'6px')}<b style="font-size:11.5px">${x[1]}</b></button>`).join('')}</div>
  <div data-l="Toast note" style="margin:26px 20px 0;border:1px solid #D8C197;padding:16px"><div style="font:italic 16px Bodoni Moda">${Q(0)}</div><div style="font-size:10px;color:#D8C197;margin-top:4px">${QA(0)}</div><div style="font:600 10px Jost;letter-spacing:2px;color:#C98B7A;margin-top:10px">RAISE A TOAST · LEAVE A NOTE</div></div>
  <div style="font:500 9px Jost;letter-spacing:3px;color:#D8C197;padding:28px 0 100px">PHOTOGRAPHED BY ${STU.toUpperCase()}</div></section>
 <style>.pss-strip{animation:pss-strip linear infinite}@keyframes pss-strip{to{transform:translateX(-50%)}}.cpv{max-height:0;overflow:hidden;opacity:0;transition:.5s}#c5c.open .cpv{max-height:200px;opacity:1}#c5c.open #c5arm{transform:none}</style>`},
 scroll(vp){const p=Math.min(1,vp.scrollTop/560),q=id=>vp.querySelector('#'+id);if(!q('c5f'))return;const r=p*560;
  q('c5f').style.clipPath=`circle(${r}px at 50% 50%)`;q('c5r').style.width=q('c5r').style.height=2*r+'px';q('c5r').parentNode.style.opacity=p<.95?1:0;
  q('c5n').style.opacity=1-p*1.8;q('c5g').style.opacity=1-p;const lb=Math.max(0,(p-.75)*4)*200;q('c5lt').style.height=lb+'px';q('c5lb').style.height=lb+'px';q('c5t').style.opacity=Math.max(0,(p-.85)*6.6)}};
const G1={id:'g1',col:'gemini',src:'Gemini',name:'Heritage Courtyard · Dusk',venue:'Historic haveli · evening courtyard',fd:'Cormorant Garamond',fb:'Jost',hub:'palace',
 pal:{bg:'#F6F2EC',ink:'#1E1B18',acc:'#B8925A',card:'#EFE8DC',acc2:'#7A5A32',nav:'#171C26',navInk:'#F9F7F3',navOn:'#171C26',hdrInk:'#1E1B18',glass:'#F6F2ECb8'},
 dpal:{bg:'#12151C',ink:'#F9F7F3',acc:'#CFA86E',card:'#1B202B',acc2:'#E5C38E',nav:'#0B0D12',navInk:'#F9F7F3',navOn:'#0B0D12',hdrInk:'#F9F7F3',glass:'#12151Cb8'},
 motion:[
   ['Architectural Aperture','scroll 0→440px','A 1px antique-brass keyhole arch expands smoothly from center, unveiling the muted wedding film.'],
   ['Dusk Luminance Shift','scroll 360→780px','Background shifts continuously from sunlit limestone (#F6F2EC) into twilight indigo (#171C26).'],
   ['Plumb Line & Stagger','in view · 0.9s','A 1px brass thread draws downward; borderless event frames glide upward 18px with zero bounce.'],
   ['Editorial Create Bar','live micro-previews','Frosted hairline strip with subtle beat pulse, gallery mat snap, and gentle cross-dissolve.']
 ],
 render(){const E=evs();
 const f1=E[0]||{n:'Celebration',t:'Day 1',ph:58};
 return `
 <section data-stage style="height:${844+440}px;position:relative">
  <div id="g1bg" style="position:sticky;top:0;height:844px;overflow:hidden;background:var(--bg);transition:background .25s linear">
   ${L('Couple names (opening)',`<div style="font:400 10px Jost;letter-spacing:3.5px;color:var(--acc);margin-bottom:10px">YOU ARE INVITED TO CELEBRATE</div><div style="font:500 44px/1.04 'Cormorant Garamond';letter-spacing:-0.02em;color:var(--ink)">${nm()[0]}</div><div style="font:italic 22px 'Cormorant Garamond';color:var(--acc);margin:2px 0">&amp;</div><div style="font:500 44px/1.04 'Cormorant Garamond';letter-spacing:-0.02em;color:var(--ink)">${nm()[1]||''}</div><div style="font:500 10px Jost;letter-spacing:2.6px;color:var(--ink);opacity:.65;margin-top:14px">${S.date.toUpperCase()}</div>`,'div','id="g1n" style="position:absolute;top:116px;left:24px;right:24px;text-align:center;z-index:3"')}
   <div data-l="Keyhole arch aperture" id="g1a" style="position:absolute;left:55px;top:338px;width:280px;height:440px;border-radius:140px 140px 16px 16px;overflow:hidden;border:1px solid var(--acc);transform-origin:50% 42%;box-shadow:0 24px 60px #00000018">
    ${L('Cover photo (muted loop)',img(58,'cover kb'),'div','style="position:absolute;inset:0"')}
    <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 58%,#0d101799)"></div>
    ${film(58,'bottom:14px;left:14px')}
   </div>
   ${L('Scroll cue','SCROLL TO ENTER','div','id="g1h" style="position:absolute;bottom:92px;left:0;right:0;text-align:center;font:500 9px Jost;letter-spacing:3px;color:var(--acc)"')}
  </div>
 </section>
 <section id="g1dusk" data-l="Dusk Courtyard Story" style="background:#171C26;color:#F9F7F3;padding:44px 0 110px;position:relative">
  <div data-l="Brass plumb line" style="position:absolute;left:50%;top:0;bottom:140px;width:1px;background:linear-gradient(180deg,#B8925A,#B8925A33 85%,transparent);pointer-events:none"></div>
  <div style="text-align:center;padding:0 24px 36px;position:relative;z-index:2">
   <div style="display:inline-block;background:#171C26;padding:6px 14px">
    <div style="font:500 9.5px Jost;letter-spacing:3px;color:#CFA86E">THE CELEBRATIONS</div>
    <div style="font:italic 26px 'Cormorant Garamond';color:#F9F7F3;margin-top:4px">Moments under the evening sky</div>
   </div>
  </div>
  <div data-events data-l="Staggered chapters" style="padding:0 22px;position:relative;z-index:2">
   ${E.length===1?`
    <div class="rise" data-l="Event · ${f1.n}" onclick="PGSS.ev(this,${f1.i})" style="cursor:pointer;background:#1F2533;border:0.5px solid #CFA86E55;border-radius:18px;overflow:hidden">
     <div style="height:260px;overflow:hidden">${img(f1.ph,'cover kb')}</div>
     <div style="padding:18px 20px;display:flex;justify-content:space-between;align-items:baseline">
      <div style="font:500 24px 'Cormorant Garamond';color:#F9F7F3">${f1.n}</div>
      <div style="font:500 10px Jost;letter-spacing:1.8px;color:#CFA86E">${f1.t.toUpperCase()}</div>
     </div>
    </div>
   `:`
    ${E.length>6?`<div data-l="Chapter index rail" style="display:flex;gap:8px;overflow-x:auto;padding-bottom:18px;margin-bottom:10px;scrollbar-width:none">${E.map((e,i)=>`<span onclick="PGSS.ev(this,${e.i})" style="flex:none;padding:6px 12px;border-radius:20px;border:0.5px solid #CFA86E55;background:#171C26;font:500 10px Jost;letter-spacing:1px;color:#E5C38E;cursor:pointer">${e.n}</span>`).join('')}</div>`:''}
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;align-items:start">
     ${E.map((e,i)=>`<div class="rise" data-l="Event · ${e.n}" onclick="PGSS.ev(this,${e.i})" style="cursor:pointer;margin-top:${i%2?28:0}px;transition-delay:${Math.min(i,5)*.08}s">
      <div style="height:196px;border-radius:14px;overflow:hidden;border:0.5px solid #CFA86E44;box-shadow:0 14px 30px #0004">${img(e.ph,'cover')}</div>
      <div style="padding:10px 4px 0">
       <div style="font:500 19px/1.15 'Cormorant Garamond';color:#F9F7F3">${e.n}</div>
       <div style="font:400 10px Jost;letter-spacing:1.2px;color:#CFA86E;margin-top:3px">${e.t}</div>
      </div>
     </div>`).join('')}
    </div>
   `}
  </div>
  <div data-l="Quiet Create Bar" style="margin:44px 20px 0;padding:12px;border-radius:18px;background:#ffffff0a;backdrop-filter:blur(14px);border:0.5px solid #CFA86E44;position:relative;z-index:2">
   <div style="font:500 9px Jost;letter-spacing:2.5px;color:#CFA86E;text-align:center;margin-bottom:10px">CONTRIBUTE TO THE GALLERY</div>
   <div style="display:flex;gap:8px">
    ${CR.map(x=>`<button data-l="Create · ${x[1]}" onclick="PGSS.a(this,'${x[0]}')" style="flex:1;background:#171C26cc;border:0.5px solid #CFA86E33;border-radius:12px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;color:#F9F7F3;cursor:pointer">${pv(x[0],34,'8px')}<span style="font:500 10px Jost;letter-spacing:.4px">${x[1]}</span></button>`).join('')}
   </div>
  </div>
  <div data-l="Root Moment Contact Sheet" style="margin-top:44px;position:relative;z-index:2">
   <div style="padding:0 22px 12px;display:flex;justify-content:space-between;align-items:baseline">
    <div style="font:500 22px 'Cormorant Garamond';color:#F9F7F3">Root Moment</div>
    <div onclick="PGSS.a(this,'moments')" style="font:500 10px Jost;letter-spacing:1.8px;color:#CFA86E;cursor:pointer">VIEW FEED →</div>
   </div>
   <div style="display:grid;grid-template-columns:1.25fr 1fr;gap:4px;padding:0 20px">
    <div onclick="PGSS.a(this,'moments')" style="height:224px;border-radius:12px 0 0 12px;overflow:hidden;cursor:pointer">${img(MOM[0],'cover')}</div>
    <div style="display:grid;grid-template-rows:1fr 1fr;gap:4px;height:224px">
     <div onclick="PGSS.a(this,'moments')" style="border-radius:0 12px 0 0;overflow:hidden;cursor:pointer">${img(MOM[1],'cover')}</div>
     <div onclick="PGSS.a(this,'moments')" style="border-radius:0 0 12px 0;overflow:hidden;cursor:pointer">${img(MOM[5],'cover')}</div>
    </div>
   </div>
  </div>
  <div data-l="Guest Blessing" style="margin:44px 28px 0;text-align:center;position:relative;z-index:2">
   <div style="width:28px;height:0.5px;background:#CFA86E;margin:0 auto 14px"></div>
   <div style="font:italic 20px/1.4 'Cormorant Garamond';color:#F9F7F3">${Q(0)}</div>
   <div style="font:400 10px Jost;letter-spacing:2px;color:#CFA86E;margin-top:8px">${QA(0,1)}</div>
   <div onclick="PGSS.a(this,'notes')" style="display:inline-block;margin-top:14px;font:500 10px Jost;letter-spacing:2px;color:#F9F7F3;border-bottom:0.5px solid #CFA86E;padding-bottom:3px;cursor:pointer">LEAVE A BLESSING</div>
  </div>
  <div data-l="Photographer credit" style="text-align:center;margin-top:42px;font:400 9.5px Jost;letter-spacing:2.6px;color:#CFA86E;opacity:.85">PHOTOGRAPHED BY ${STU.toUpperCase()}</div>
 </section>
 `},
 scroll(vp){
  const p=Math.min(1,vp.scrollTop/440),q=id=>vp.querySelector('#'+id);
  if(!q('g1a'))return;
  const sc=1+p*0.42,ty=-p*160;
  q('g1a').style.transform=`translateY(${ty}px) scale(${sc})`;
  q('g1a').style.borderRadius=`${Math.max(0,140*(1-p))}px ${Math.max(0,140*(1-p))}px ${Math.max(0,16*(1-p))}px ${Math.max(0,16*(1-p))}px`;
  q('g1n').style.opacity=Math.max(0,1-p*1.9);
  q('g1n').style.transform=`translateY(${-p*36}px)`;
  q('g1h').style.opacity=Math.max(0,1-p*3);
 }
};

const G2={id:'g2',col:'gemini',src:'Gemini',name:'Misty Tea Estate · Morning',venue:'Munnar / Coorg hills & estate',fd:'Instrument Serif',fb:'Jost',hub:'palm',
 pal:{bg:'#F4F6F2',ink:'#18261E',acc:'#4B6B56',card:'#E8EDE6',acc2:'#8C9E90',nav:'#18261E',navInk:'#F4F6F2',navOn:'#18261E',hdrInk:'#18261E',glass:'#F4F6F2c4'},
 dpal:{bg:'#0F1713',ink:'#ECF1EC',acc:'#7FA38B',card:'#18241E',acc2:'#567360',nav:'#090E0B',navInk:'#ECF1EC',navOn:'#090E0B',hdrInk:'#ECF1EC',glass:'#0F1713c4'},
 motion:[
   ['Morning Mist Parting','scroll 0→420px','Two translucent mist veils drift outward left and right, unveiling the couple in soft focus-to-sharp clarity.'],
   ['Horizontal Terrace Path','horizontal scroll','Events sit along a serene horizontal gallery rail with gentle parallax captions.'],
   ['Floating Create Pill','in view · 0.8s','An understated frosted-glass dock floats into place below the terrace path.'],
   ['Botanical Calm','continuous','Zero bounce, zero clutter—every transition uses a 1.1s ease-out curve.']
 ],
 render(){const E=evs();
 return `
 <section data-stage style="height:${844+420}px;position:relative">
  <div style="position:sticky;top:0;height:844px;overflow:hidden;background:var(--bg)">
   ${L('Cover photo (full-bleed)',img(12,'cover kb','object-position:50% 35%'),'div','id="g2f" style="position:absolute;inset:0;filter:blur(6px) brightness(1.04);transform:scale(1.06)"')}
   <div style="position:absolute;inset:0;background:linear-gradient(180deg,var(--bg) 0%,transparent 34%,transparent 62%,var(--bg) 100%)"></div>
   <div id="g2ml" data-l="Mist veil left" style="position:absolute;inset:0 45% 0 0;background:linear-gradient(90deg,var(--bg) 55%,transparent);pointer-events:none"></div>
   <div id="g2mr" data-l="Mist veil right" style="position:absolute;inset:0 0 0 45%;background:linear-gradient(270deg,var(--bg) 55%,transparent);pointer-events:none"></div>
   ${L('Couple names',`<div style="font:500 9.5px Jost;letter-spacing:3.2px;color:var(--acc);margin-bottom:8px">IN THE HIGH HILLS</div><div style="font:400 46px/1 'Instrument Serif';color:var(--ink)">${S.names}</div><div style="font:400 10.5px Jost;letter-spacing:2.2px;color:var(--ink);opacity:.7;margin-top:10px">${S.date.toUpperCase()}</div>`,'div','id="g2n" style="position:absolute;top:290px;left:24px;right:24px;text-align:center;z-index:4"')}
   ${film(12,'bottom:112px;left:22px')}
  </div>
 </section>
 <section data-l="Estate Terrace Journey" style="padding:28px 0 110px;background:var(--bg)">
  <div data-events style="padding:0 22px 14px;display:flex;justify-content:space-between;align-items:baseline">
   <div>
    <div style="font:500 9.5px Jost;letter-spacing:2.8px;color:var(--acc)">THE TERRACE PATH</div>
    <div style="font:400 28px 'Instrument Serif';color:var(--ink);margin-top:2px">Gatherings in the mist</div>
   </div>
   <div style="font:400 10px Jost;letter-spacing:1.4px;color:var(--acc)">${E.length>1?'SWIPE →':'SINGLE DAY'}</div>
  </div>
  <div data-l="Horizontal event rail" style="display:flex;gap:14px;overflow-x:auto;padding:4px 22px 16px;scroll-snap-type:x mandatory;scrollbar-width:none">
   ${E.map((e,i)=>`<div class="rise" data-l="Event · ${e.n}" onclick="PGSS.ev(this,${e.i})" style="flex:0 0 ${E.length===1?'346px':'244px'};scroll-snap-align:center;cursor:pointer;transition-delay:${Math.min(i,4)*.07}s">
    <div style="height:300px;border-radius:20px;overflow:hidden;border:0.5px solid color-mix(in srgb,var(--acc) 35%,transparent);position:relative">
     ${img(e.ph,'cover')}
     <div style="position:absolute;inset:0;background:linear-gradient(180deg,transparent 55%,#0e1712b8)"></div>
     <div style="position:absolute;left:18px;right:18px;bottom:18px;color:#F4F6F2">
      <div style="font:400 9.5px Jost;letter-spacing:2px;opacity:.8">${e.t.toUpperCase()}</div>
      <div style="font:400 26px/1.1 'Instrument Serif';margin-top:3px">${e.n}</div>
     </div>
    </div>
   </div>`).join('')}
  </div>
  <div data-l="Frosted Create Bar" class="rise" style="margin:26px 22px 0;padding:12px 14px;border-radius:18px;background:var(--card);border:0.5px solid color-mix(in srgb,var(--acc) 30%,transparent);display:flex;align-items:center;justify-content:space-between;gap:8px">
   ${CR.map(x=>`<button data-l="Create · ${x[1]}" onclick="PGSS.a(this,'${x[0]}')" style="flex:1;background:var(--bg);border:0.5px solid color-mix(in srgb,var(--acc) 25%,transparent);border-radius:12px;padding:8px 6px;display:flex;flex-direction:column;align-items:center;gap:5px;color:var(--ink);cursor:pointer">${pv(x[0],34,'8px')}<span style="font:500 10px Jost">${x[1]}</span></button>`).join('')}
  </div>
  <div data-l="Root Moment Editorial" class="rise" style="margin:36px 22px 0">
   <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
    <div style="font:400 26px 'Instrument Serif';color:var(--ink)">Root Moment</div>
    <div onclick="PGSS.a(this,'moments')" style="font:500 10px Jost;letter-spacing:1.8px;color:var(--acc);cursor:pointer">ALL MOMENTS →</div>
   </div>
   <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div onclick="PGSS.a(this,'moments')" style="height:176px;border-radius:16px;overflow:hidden;cursor:pointer">${img(MOM[2],'cover')}</div>
    <div onclick="PGSS.a(this,'moments')" style="height:176px;border-radius:16px;overflow:hidden;cursor:pointer">${img(MOM[6],'cover')}</div>
   </div>
  </div>
  <div data-l="Guest Note" class="rise" style="margin:36px 24px 0;padding:22px 20px;border-radius:18px;background:var(--card);text-align:center">
   <div style="font:italic 21px/1.35 'Instrument Serif';color:var(--ink)">${Q(0)}</div>
   <div style="font:500 9.5px Jost;letter-spacing:2px;color:var(--acc);margin-top:8px">${QA(0,1)}</div>
   <div onclick="PGSS.a(this,'notes')" style="display:inline-block;margin-top:12px;font:500 10px Jost;letter-spacing:1.8px;color:var(--ink);border-bottom:0.5px solid var(--acc);padding-bottom:2px;cursor:pointer">ADD YOUR NOTE</div>
  </div>
  <div data-l="Photographer credit" style="text-align:center;margin-top:34px;font:400 9.5px Jost;letter-spacing:2.5px;color:var(--acc)">PHOTOGRAPHED BY ${STU.toUpperCase()}</div>
 </section>
 `},
 scroll(vp){
  const p=Math.min(1,vp.scrollTop/420),q=id=>vp.querySelector('#'+id);
  if(!q('g2f'))return;
  q('g2ml').style.transform=`translateX(${-p*110}%)`;
  q('g2mr').style.transform=`translateX(${p*110}%)`;
  q('g2f').style.filter=`blur(${Math.max(0,6*(1-p))}px) brightness(1)`;
  q('g2f').style.transform=`scale(${1.06-p*0.06})`;
  q('g2n').style.transform=`translateY(${p*170}px)`;
  q('g2n').style.opacity=Math.max(0.15,1-p*0.85);
 }
};

const G3={id:'g3',col:'gemini',src:'Gemini',name:'Alabaster Gallery · Minimal Luxury',venue:'Modern banquet · architectural hall',fd:'Bodoni Moda',fb:'Jost',hub:'chand',
 pal:{bg:'#FAF9F6',ink:'#141413',acc:'#8E795E',card:'#F1EFEA',acc2:'#C5B8A5',nav:'#141413',navInk:'#FAF9F6',navOn:'#141413',hdrInk:'#141413',glass:'#FAF9F6cc'},
 dpal:{bg:'#0E0E0D',ink:'#F5F4F0',acc:'#BFA98A',card:'#191917',acc2:'#5C554B',nav:'#050505',navInk:'#F5F4F0',navOn:'#050505',hdrInk:'#F5F4F0',glass:'#0E0E0Dcc'},
 motion:[
   ['Gallery Frame Unveil','scroll 0→400px','A museum-mat border retracts smoothly to expand the couple portrait to full architectural width.'],
   ['Monograph Index','in view · 0.8s','Events are presented as numbered museum plates (01–12) with crisp hairline dividers.'],
   ['Tactile Create Drawer','tap to expand','A sleek architectural bar at the base of the plates unfolds the three live-preview tools.'],
   ['iPhone-Grade Restraint','continuous','Pure typography, balanced negative space, and effortless 60fps scroll physics.']
 ],
 render(){const E=evs();
 return `
 <section data-stage style="height:${844+400}px;position:relative">
  <div style="position:sticky;top:0;height:844px;overflow:hidden;background:var(--bg)">
   ${L('Monograph title',`<div style="font:500 9px Jost;letter-spacing:3.5px;color:var(--acc);margin-bottom:8px">MONOGRAPH · ${S.date.toUpperCase()}</div><div style="font:400 38px/1.08 'Bodoni Moda';letter-spacing:-0.02em;color:var(--ink)">${S.names}</div>`,'div','id="g3n" style="position:absolute;top:106px;left:24px;right:24px;text-align:center;z-index:3"')}
   <div id="g3m" data-l="Museum mat frame" style="position:absolute;left:36px;right:36px;top:216px;height:510px;border-radius:12px;overflow:hidden;border:0.5px solid color-mix(in srgb,var(--acc) 45%,transparent);box-shadow:0 20px 50px #00000012">
    ${L('Cover photo',img(59,'cover kb'),'div','style="position:absolute;inset:0"')}
    ${film(59,'bottom:14px;left:14px')}
   </div>
  </div>
 </section>
 <section data-l="Curated Plates" style="padding:20px 24px 110px;background:var(--bg)">
  <div data-events style="display:flex;justify-content:space-between;align-items:baseline;padding-bottom:14px;border-bottom:0.5px solid color-mix(in srgb,var(--acc) 40%,transparent)">
   <div style="font:500 10px Jost;letter-spacing:2.8px;color:var(--acc)">ORDER OF EVENTS</div>
   <div style="font:italic 15px 'Bodoni Moda';color:var(--ink)">Curated Chapters</div>
  </div>
  <div data-l="Event plates">
   ${E.map((e,i)=>`<div class="rise" data-l="Plate · ${e.n}" onclick="PGSS.ev(this,${e.i})" style="display:flex;align-items:center;gap:14px;padding:16px 0;border-bottom:0.5px solid color-mix(in srgb,var(--acc) 25%,transparent);cursor:pointer;transition-delay:${Math.min(i,5)*.06}s">
    <div style="font:400 13px 'Bodoni Moda';color:var(--acc);width:22px">${String(i+1).padStart(2,'0')}</div>
    <div style="width:54px;height:68px;border-radius:8px;overflow:hidden;flex:none">${img(e.ph,'cover')}</div>
    <div style="flex:1;min-width:0">
     <div style="font:500 20px/1.15 'Bodoni Moda';color:var(--ink)">${e.n}</div>
     <div style="font:400 10.5px Jost;letter-spacing:1px;color:var(--acc);margin-top:3px">${e.t}</div>
    </div>
    <div style="font:400 14px Jost;color:var(--acc)">→</div>
   </div>`).join('')}
  </div>
  <div data-l="Create Strip" class="rise" style="margin-top:32px;padding:14px;border-radius:16px;background:var(--card);border:0.5px solid color-mix(in srgb,var(--acc) 30%,transparent)">
   <div style="display:flex;gap:8px">
    ${CR.map(x=>`<button data-l="Create · ${x[1]}" onclick="PGSS.a(this,'${x[0]}')" style="flex:1;background:var(--bg);border:0.5px solid color-mix(in srgb,var(--acc) 25%,transparent);border-radius:11px;padding:9px 6px;display:flex;flex-direction:column;align-items:center;gap:6px;color:var(--ink);cursor:pointer">${pv(x[0],34,'6px')}<span style="font:500 10px Jost">${x[1]}</span></button>`).join('')}
   </div>
  </div>
  <div data-l="Root Moment Triptych" class="rise" style="margin-top:36px">
   <div style="display:flex;justify-content:space-between;align-items:baseline;margin-bottom:12px">
    <div style="font:500 21px 'Bodoni Moda';color:var(--ink)">Root Moment</div>
    <div onclick="PGSS.a(this,'moments')" style="font:500 9.5px Jost;letter-spacing:2px;color:var(--acc);cursor:pointer">EXPLORE →</div>
   </div>
   <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:6px">
    ${[MOM[3],MOM[4],MOM[8]].map(m=>`<div onclick="PGSS.a(this,'moments')" style="height:126px;border-radius:8px;overflow:hidden;cursor:pointer">${img(m,'cover')}</div>`).join('')}
   </div>
  </div>
  <div data-l="Guest Note" class="rise" style="margin-top:36px;padding:24px 16px;border-top:0.5px solid color-mix(in srgb,var(--acc) 35%,transparent);border-bottom:0.5px solid color-mix(in srgb,var(--acc) 35%,transparent);text-align:center">
   <div style="font:italic 19px/1.4 'Bodoni Moda';color:var(--ink)">${Q(0)}</div>
   <div style="font:500 9.5px Jost;letter-spacing:2.2px;color:var(--acc);margin-top:8px">${QA(0,1)}</div>
   <div onclick="PGSS.a(this,'notes')" style="display:inline-block;margin-top:12px;font:500 9.5px Jost;letter-spacing:2px;color:var(--ink);text-decoration:underline;text-underline-offset:4px;cursor:pointer">SIGN THE GUESTBOOK</div>
  </div>
  <div data-l="Photographer credit" style="text-align:center;margin-top:32px;font:400 9px Jost;letter-spacing:2.8px;color:var(--acc)">PHOTOGRAPHED BY ${STU.toUpperCase()}</div>
 </section>
 `},
 scroll(vp){
  const p=Math.min(1,vp.scrollTop/400),q=id=>vp.querySelector('#'+id);
  if(!q('g3m'))return;
  const inset=Math.max(0,36*(1-p));
  q('g3m').style.left=inset+'px';
  q('g3m').style.right=inset+'px';
  q('g3m').style.top=(216-p*130)+'px';
  q('g3m').style.height=(510+p*150)+'px';
  q('g3m').style.borderRadius=Math.max(0,12*(1-p))+'px';
  q('g3n').style.opacity=Math.max(0,1-p*2.2);
 }
};

  // ---------------- the bridge ----------------
  const T = { c1: C1, c2: C2, c3: C3, c4: C4, c5: C5, g1: G1, g2: G2, g3: G3 };
  // the colours a couple may change (the rest are the studio's own header / bar colours, which the app does not use)
  const COLOR_NAMES = { bg: 'Background', ink: 'Text', acc: 'Accent', acc2: 'Second accent', card: 'Cards', sea: 'Sea' };
  function palOf(kind, dark, tune) {
    const t = T[kind], base = Object.assign({}, dark ? t.dpal : t.pal), own = ((tune || {}).colors || {})[dark ? 'dark' : 'light'] || {};
    Object.keys(own).forEach(k => { if (k in COLOR_NAMES && k in base && /^#[0-9a-f]{3,8}$/i.test(own[k])) base[k] = own[k]; });
    return base;
  }
  function paint(el, pal) { Object.keys(pal).forEach(k => el.style.setProperty('--' + k, pal[k])); el.style.setProperty('--fd', "'" + (el._fd || 'Cormorant Garamond') + "',serif"); }

  function ensureFonts() {
    if (document.getElementById('pssFonts')) return;
    const l = document.createElement('link'); l.id = 'pssFonts'; l.rel = 'stylesheet'; l.href = FONTS; document.head.appendChild(l);
  }
  const CSS = `
.pss{position:relative;z-index:1;width:390px;margin:0 auto;background:var(--bg);color:var(--ink);font:13px/1.45 Jost,system-ui,sans-serif;overflow-x:clip;isolation:isolate;-webkit-tap-highlight-color:transparent}
.pss *,.pss *:before,.pss *:after{box-sizing:border-box}
.pss button{font:inherit;color:inherit}
.pss img,.pss svg{max-width:none}
.pss .cover{width:100%;height:100%;object-fit:cover;display:block}
.pss .kb{animation:pss-kb 12s ease-in-out infinite}@keyframes pss-kb{50%{transform:scale(1.1) translate(-2%,-1%)}}
.pss .lp{position:relative;overflow:hidden}
.pss .lp.sm img{position:absolute;inset:0;width:100%;height:100%;object-fit:cover;opacity:0}
.pss .lp.sm img:nth-child(1){animation:pss-f1 1.2s steps(1) infinite}.pss .lp.sm img:nth-child(2){animation:pss-f2 1.2s steps(1) infinite}.pss .lp.sm img:nth-child(3){animation:pss-f3 1.2s steps(1) infinite}
@keyframes pss-f1{0%{opacity:1;transform:rotate(-4deg)}33%,100%{opacity:0}}@keyframes pss-f2{0%,32%{opacity:0}33%{opacity:1;transform:rotate(3deg)}66%,100%{opacity:0}}@keyframes pss-f3{0%,65%{opacity:0}66%{opacity:1;transform:rotate(-2deg)}100%{opacity:0}}
.pss .lp.beat img{animation:pss-beat .6s cubic-bezier(.34,1.56,.64,1) infinite}@keyframes pss-beat{25%{transform:scale(1.1)}50%{transform:scale(.96)}75%{transform:scale(1.07)}}
.pss .lp .bars{position:absolute;left:4px;right:4px;bottom:3px;display:flex;gap:2px;align-items:flex-end;height:12px}.pss .lp .bars b{flex:1;background:#fff;border-radius:1px;animation:pss-bar .6s ease-in-out infinite alternate}
.pss .lp .bars b:nth-child(2){animation-delay:.15s}.pss .lp .bars b:nth-child(3){animation-delay:.3s}.pss .lp .bars b:nth-child(4){animation-delay:.45s}@keyframes pss-bar{from{height:3px}to{height:12px}}
.pss .lp.snap>div{position:absolute;inset:4px;background:#fff;padding:2px;border-radius:4px;animation:pss-snap 1.8s cubic-bezier(.22,1,.36,1) infinite}@keyframes pss-snap{0%,100%{transform:scale(1.25) rotate(8deg);opacity:.7}35%,80%{transform:none;opacity:1}}
.pss .lp.snap img{width:100%;height:100%;object-fit:cover;border-radius:2px}
.pss .pt{position:absolute;pointer-events:none;z-index:6;top:-20px;animation:pss-fall linear infinite}
@keyframes pss-fall{0%{transform:translate(0,0) rotate(0);opacity:0}10%{opacity:.95}100%{transform:translate(30px,520px) rotate(380deg);opacity:0}}
.pss .tw{position:absolute;border-radius:50%;animation:pss-tw 1.6s ease-in-out infinite;pointer-events:none}@keyframes pss-tw{50%{opacity:.25;transform:scale(.6)}}
.pss .bob{animation:pss-bob 3.4s ease-in-out infinite}@keyframes pss-bob{50%{transform:translateY(-6px) rotate(1deg)}}
.pss .sway{animation:pss-sway 4s ease-in-out infinite;transform-origin:top center}@keyframes pss-sway{50%{transform:rotate(3deg)}}
.pss .rise{opacity:0;transform:translateY(30px);transition:opacity .7s,transform .8s cubic-bezier(.2,.8,.2,1)}.pss .rise.in{opacity:1;transform:none}
@keyframes pulse{50%{opacity:.3;transform:scale(.7)}}
.pss [onclick],.pss-ov [onclick]{cursor:pointer}
.pss-fit{position:absolute;left:50%;top:0;width:390px;height:844px;margin-left:-195px;transform-origin:50% 0}
.pss-ov{position:fixed;inset:0;pointer-events:none;z-index:70}
.pss-ov.in-frame{position:absolute}
.pss-still *,.pss-still *:before,.pss-still *:after{animation:none!important;transition:none!important}
.pss-still .rise{opacity:1;transform:none}
.pss-bd{display:none}
@media (min-width:600px){.pss-wide .pss-bd{display:block;position:fixed;inset:0;z-index:0;background-size:cover;background-position:center;filter:blur(28px) brightness(.55) saturate(1.15);transform:scale(1.15)}
 .pss-wide .pss{box-shadow:0 0 0 1px #ffffff22,0 30px 60px #0008}}
.pss [data-slot].pss-pick{outline:3px solid #ff4d8d;outline-offset:-3px;cursor:copy}
.pss-hide{display:none!important}
@media (prefers-reduced-motion:reduce){.pss *,.pss *:before,.pss *:after{animation:none!important;transition:none!important}.pss .rise{opacity:1;transform:none}}`;
  function ensureCss() { if (document.getElementById('pssCss')) return; const s = document.createElement('style'); s.id = 'pssCss'; s.textContent = CSS; document.head.appendChild(s); }

  // ---- photos: tune.photos first, then the cover photos, the couple, event highlights and event photos ----
  function photoSource(data, tune) {
    const seen = {}, pool = [], add = id => { if (id && !seen[id]) { seen[id] = 1; pool.push(id); } };
    (data.cover || []).forEach(add);
    if (data.couple) { add(data.couple.bride); add(data.couple.groom); }
    (data.pool || []).forEach(add);
    const evs = data.events || [], hlOnly = !!data.demo && evs.some(e => (e.featured || []).length);   // a demo wedding shows only its highlights
    evs.forEach(e => (e.featured || []).slice(0, hlOnly ? 40 : 4).forEach(add));
    if (!hlOnly) for (let k = 0; k < 6; k++) evs.forEach(e => { const ph = (e.photos || [])[k] || (e.teaser || [])[k]; if (ph) add(ph.id || ph); });
    const own = Object.assign({}, (tune || {}).photos || {}), given = {};
    let next = 0;
    return k => {
      if (own[k]) return own[k];
      if (given[k] != null) return given[k];
      const m = /^e(\d+)$/.exec(k);
      if (m) { const e = evs[+m[1]]; const id = e && (((e.featured || [])[0]) || (hlOnly ? '' : ((e.photos || [])[0] || {}).id || ((e.teaser || [])[0] || {}).id)); if (id) return (given[k] = id); }
      return (given[k] = pool.length ? pool[next++ % pool.length] : '');
    };
  }

  // ---- one drawing of one template ----
  const INST = new WeakMap();
  function mount(kind, box, data, act, opts) {
    const t = T[kind]; if (!t) throw new Error('No template ' + kind);
    opts = opts || {}; const tune = opts.tune || {};
    ensureFonts(); ensureCss();
    const scroller = opts.scroller || null;   // the editor's phone; else the page itself
    const notes = (data.notes || []).filter(n => n && n.text);
    R = { photo: photoSource(data, tune), notes, events: (data.events || []).map((e, i) => ({ n: esc(e.name), t: '', ph: 'e' + i, i, name: e.name })) };
    if (!R.events.length) R.events = [{ n: 'Our wedding', t: '', ph: 'e0', i: 0, name: '' }];
    S = { names: esc(tune.names || data.names || ''), date: esc(tune.date != null && tune.date !== '' ? tune.date : [data.date, data.place].filter(Boolean).join(' · ')) };
    STU = esc(data.studio && data.studio !== 'Your photographer' && !(window.GALLERY && GALLERY.credit === false) ? data.studio : ''); OV = '';
    let html; try { html = t.render(); } finally { R = Object.assign({}, R); }
    const photoFn = R.photo, events = R.events;
    const root = document.createElement('div'); root.className = 'pss pss-' + kind; root.innerHTML = html; root._fd = t.fd;
    const ovEl = document.createElement('div'); ovEl.className = 'pss-ov' + (scroller ? ' in-frame' : ''); ovEl.innerHTML = OV;
    const bd = document.createElement('div'); bd.className = 'pss-bd';
    box.classList.add('pss-box'); if (!scroller) box.classList.add('pss-wide');
    box.append(bd, root, ovEl);
    (opts.ovHost || box).appendChild(ovEl);
    // the credit: gone when the wedding has no photographer name
    if (!STU) root.querySelectorAll('[data-l="Photographer credit"]').forEach(x => x.remove());
    // hidden layers
    const hide = new Set((tune.hide || []).map(String));
    const layers = () => [...root.querySelectorAll('[data-l]'), ...ovEl.querySelectorAll('[data-l]')];
    const applyHide = () => layers().forEach(x => x.classList.toggle('pss-hide', hide.has(slug(x.dataset.l))));
    applyHide();
    // step 79: photos framed by the couple (moved inside their holder / zoomed)
    const frames = tune.frame || {};
    if (window.PGFrame && Object.keys(frames).length) [...root.querySelectorAll('img[data-slot]'), ...ovEl.querySelectorAll('img[data-slot]')].forEach(x => { if (frames[x.dataset.slot]) PGFrame.apply(x, frames[x.dataset.slot]); });
    if (tune.motion === 'off') { root.classList.add('pss-still'); ovEl.classList.add('pss-still'); }
    // colours (light / dark follows the app)
    const isDark = () => (opts.dark != null ? !!opts.dark : document.documentElement.getAttribute('data-tkg-theme') === 'dark');
    const recolour = () => { const pal = palOf(kind, isDark(), tune); paint(root, pal); paint(ovEl, pal); };
    recolour();
    const mo = opts.dark == null ? new MutationObserver(recolour) : null; if (mo) mo.observe(document.documentElement, { attributes: true, attributeFilter: ['data-tkg-theme'] });
    const cover = photoFn('s58') || photoFn('e0'); if (cover && window.pgImg) bd.style.backgroundImage = 'url("' + pgImg(cover, 800) + '")';
    // the opening stage: a 390 × 844 design, scaled down on shorter screens so nothing hides under the bottom bar
    const zoomOf = () => Math.min(1, (scroller ? scroller.clientWidth : (window.innerWidth || 390)) / 390);
    function fit() {
      const z = zoomOf(); root.style.zoom = z === 1 ? '' : z; ovEl.style.zoom = root.style.zoom;
      const H = (scroller ? scroller.clientHeight : window.innerHeight) / z;
      root.querySelectorAll('[data-stage] > div:first-child').forEach(st => {
        let f = st.querySelector(':scope > .pss-fit'); if (st._h0 == null) st._h0 = st.style.height;
        if (H >= 844) { st.style.height = st._h0; if (f) f.style.transform = ''; return; }
        if (!f) { f = document.createElement('div'); f.className = 'pss-fit'; [...st.childNodes].forEach(c => f.appendChild(c)); st.appendChild(f); }
        st.style.height = H + 'px'; f.style.transform = 'scale(' + (H / 844) + ')';
      });
    }
    fit();
    // the scrolling "viewport" the template code expects (the studio scrolled a 390 × 844 box)
    const vp = scroller ? {
      get scrollTop() { return scroller.scrollTop; }, get clientHeight() { return scroller.clientHeight; },
      getBoundingClientRect: () => scroller.getBoundingClientRect(),
      querySelector: s => root.querySelector(s) || ovEl.querySelector(s), querySelectorAll: s => root.querySelectorAll(s),
      scrollTo: o => scroller.scrollTo(o)
    } : {
      get scrollTop() { return Math.max(0, -root.getBoundingClientRect().top / zoomOf()); }, get clientHeight() { return window.innerHeight / zoomOf(); },
      getBoundingClientRect: () => ({ top: 0, left: 0, right: window.innerWidth, bottom: window.innerHeight, width: window.innerWidth, height: window.innerHeight }),
      querySelector: s => root.querySelector(s) || ovEl.querySelector(s), querySelectorAll: s => root.querySelectorAll(s),
      scrollTo: o => window.scrollTo({ top: root.getBoundingClientRect().top + window.scrollY + (o.top || 0) * zoomOf(), behavior: o.behavior })
    };
    let raf = 0;
    function tick() {
      raf = 0; try { if (t.scroll) t.scroll(vp); } catch (e) {}
      const lim = (scroller ? scroller.getBoundingClientRect().bottom : window.innerHeight) - 30;
      root.querySelectorAll('.rise:not(.in)').forEach(x => { if (x.getBoundingClientRect().top < lim) x.classList.add('in'); });
    }
    const onScroll = () => { if (!raf) raf = requestAnimationFrame(tick); };
    const onResize = () => { fit(); onScroll(); };
    const sc = scroller || window; sc.addEventListener('scroll', onScroll, { passive: true }); window.addEventListener('resize', onResize);
    tick(); setTimeout(tick, 400);
    // tap a photo in the editor = change it
    const pickCap = e => { if (!opts.pick) return; const s = e.target.closest && e.target.closest('[data-slot]'); if (!s) return; e.preventDefault(); e.stopPropagation(); opts.pick(s.dataset.slot, s); };
    root.addEventListener('click', pickCap, true);
    const inst = {
      kind, root, ov: ovEl, vp, act: act || (() => {}), events, photo: photoFn,
      slots() {   // every photo of the page, top to bottom: { k, label, id }
        const out = [], seen = {};
        root.querySelectorAll('[data-slot]').forEach(x => { const k = x.dataset.slot; if (seen[k]) return; seen[k] = 1; const l = x.closest('[data-l]'); out.push({ k, label: l ? l.dataset.l : 'Photo', id: photoFn(k) }); });
        return out;
      },
      layers() { return layers().filter((x, i, a) => a.findIndex(y => y.dataset.l === x.dataset.l) === i).map(x => ({ key: slug(x.dataset.l), name: x.dataset.l, depth: depthOf(x) })); },
      refresh: tick,
      destroy() { sc.removeEventListener('scroll', onScroll); window.removeEventListener('resize', onResize); if (mo) mo.disconnect(); if (raf) cancelAnimationFrame(raf); root.removeEventListener('click', pickCap, true); bd.remove(); root.remove(); ovEl.remove(); box.classList.remove('pss-wide'); }
    };
    function depthOf(x) { let d = 0, n = x.parentElement; while (n && n !== root && n !== ovEl) { if (n.dataset && n.dataset.l) d++; n = n.parentElement; } return d; }
    INST.set(root, inst); INST.set(ovEl, inst);
    return inst;
  }
  // the template's buttons call these (inline handlers, as in the studio)
  const instOf = el => { const r = el && el.closest && el.closest('.pss, .pss-ov'); return r ? INST.get(r) : null; };
  const ACT = { r: 'reel', p: 'post', m: 'memory', moments: 'moments', notes: 'notes' };
  window.PGSS = {
    ev(el, i) { const I = instOf(el); if (!I) return; const e = I.events[i]; if (e && e.name) I.act('event', e.name); },
    a(el, k) { const I = instOf(el); if (I) I.act(ACT[k] || k); },
    go(el) { const I = instOf(el); if (!I) return; const e = I.root.querySelector('[data-events]'); if (e) I.vp.scrollTo({ top: e.offsetTop - 90, behavior: 'smooth' }); },
    c2(el) { c2dots(el); }
  };
  // one module per template for the Hub's story registry (15-layout.js): render(box, data, act, opts) + destroy()
  const mods = {};
  Object.keys(T).forEach(kind => {
    let live = null;
    mods[kind] = {
      render(box, data, act, opts) { if (live) live.destroy(); live = mount(kind, box, data, act, opts); return live; },
      destroy() { if (live) live.destroy(); live = null; }
    };
  });
  window.PGStoryStudio = {
    kinds: Object.keys(T), mods, mount, COLOR_NAMES,
    info: kind => (T[kind] ? { id: kind, name: T[kind].name, venue: T[kind].venue, pal: T[kind].pal, dpal: T[kind].dpal, fd: T[kind].fd, motion: T[kind].motion } : null),
    colors: (kind, dark) => { const p = T[kind] && (dark ? T[kind].dpal : T[kind].pal); return p ? Object.keys(COLOR_NAMES).filter(k => k in p).map(k => ({ k, name: COLOR_NAMES[k], value: p[k] })) : []; }
  };
})();
