
const $ = (sel, ctx=document) => ctx.querySelector(sel);
const $$ = (sel, ctx=document) => Array.from(ctx.querySelectorAll(sel));
const PASSCODE = window.KULSUM.PASSCODE;

function pad(n){ return n<10 ? "0"+n : ""+n }
function fmtCount(diffMs){
  const s = Math.floor(diffMs/1000);
  const years = Math.floor(s/(365*24*3600));
  const daysR = s - years*365*24*3600;
  const months = Math.floor(daysR/(30*24*3600));
  const days = Math.floor((daysR - months*30*24*3600)/(24*3600));
  const hours = Math.floor((s % (24*3600)) / 3600);
  const mins = Math.floor((s % 3600) / 60);
  const secs = s % 60;
  let parts = [];
  if(years) parts.push(`${years} year${years>1?'s':''}`);
  if(months) parts.push(`${months} month${months>1?'s':''}`);
  if(days) parts.push(`${days} day${days>1?'s':''}`);
  parts.push(`${pad(hours)}h:${pad(mins)}m:${pad(secs)}s`);
  return parts.join(" • ");
}
function niceDate(d){
  return d.toLocaleDateString(undefined, {weekday:'long', year:'numeric', month:'long', day:'numeric'});
}

/* Seeded RNG */
function xorshift32(seed){
  let x = seed || 2463534242;
  return function(){
    x ^= x << 13; x >>>= 0;
    x ^= x >> 17; x >>>= 0;
    x ^= x << 5;  x >>>= 0;
    return (x >>> 0) / 4294967296;
  }
}
function seededChoice(arr, rnd){ return arr[Math.floor(rnd()*arr.length)] }

/* Lock screen */
const lock = $("#lock");
const app = $("#app");
const dots = $("#dots");
const keypad = $(".keypad", lock);
document.body.classList.add("no-scroll");
const lockClock = document.getElementById('lockClock');
function tickLockBigClock(){ const n=new Date(); const h=pad(n.getHours()); const m=pad(n.getMinutes()); if(lockClock) lockClock.textContent = `${h}:${m}`; }
setInterval(tickLockBigClock, 1000); tickLockBigClock();
let code = "";
let firstInteraction = false;


function pressFeedback(btn){
  // Web Animations springy press
  try{
    btn.animate([{transform:'scale(1)'},{transform:'scale(.94)'},{transform:'scale(1)'}],
      {duration:180, easing:'cubic-bezier(.2,.9,.2,1)'});
  }catch(_){}
  // Ripple
  const rip = document.createElement('span');
  rip.style.position='absolute'; rip.style.inset='0'; rip.style.borderRadius='inherit';
  rip.style.background='radial-gradient(100% 100% at 50% 50%, #ffffff55, transparent 55%)';
  rip.style.opacity='0.6'; rip.style.pointerEvents='none';
  btn.appendChild(rip);
  setTimeout(()=> rip.remove(), 180);
}

function updateDots(){
  $$("#dots span").forEach((s, i)=> s.classList.toggle("filled", i < code.length));
}
function tickLockClock(){
  const now = new Date();
  lockTime.textContent = `${pad(now.getHours())}:${pad(now.getMinutes())}`;
  lockDate.textContent = now.toLocaleDateString(undefined, { weekday:'long', month:'long', day:'numeric' });
}


// Autoplay strategy: prime audio muted on first keypad tap; unmute & fade in on unlock
const audio = $("#bgm");
audio.preload = "auto";
function primeAudio(){
  if(firstInteraction) return;
  firstInteraction = true;
  try{
    audio.muted = true;
    audio.play().then(()=>{/* primed */}).catch(()=>{});
  }catch(e){}
}
keypad.addEventListener("click", (e)=>{
  const btn = e.target.closest("button");
  if(!btn) return;
  primeAudio();
  const digit = btn.getAttribute("data-digit");
  const action = btn.getAttribute("data-action");
  if(digit){
    if(code.length<6){ code += digit; updateDots(); }
    if(code.length===6){
      if(code===PASSCODE){ unlock(); }
      else{
        dots.classList.add("shake");
        setTimeout(()=> dots.classList.remove("shake"), 500);
        code=""; updateDots();
      }
    }
  } else if(action==="clear"){
    code=""; updateDots();
  } else if(action==="delete"){
    code = code.slice(0,-1); updateDots();
  }
}, {passive:true});

function unlock(){
  // Unmute & fade-in music
  try{
    audio.muted = false;
    audio.volume = 0;
    const tgt = 0.7;
    audio.play().catch(()=>{});
    const fade = () => {
      audio.volume = Math.min(tgt, (audio.volume + 0.05));
      if(audio.volume < tgt) requestAnimationFrame(fade);
    };
    requestAnimationFrame(fade);
  }catch(e){}

  document.body.classList.remove('no-scroll');
  // Animate away lock
  lock.style.transition = "opacity .6s ease, transform .6s ease";
  lock.style.opacity = "0";
  lock.style.transform = "scale(1.04) translateY(-10px)";
  setTimeout(()=>{
    lock.classList.add("hidden");
    app.classList.remove("hidden");
    initApp();
  }, 620);
}

/* Main app */
function initApp(){
  // Auto theme rotation
  const themes = window.KULSUM.THEMES;
  let idx = (new Date().getHours()) % themes.length;
  function applyTheme(i){
    themes.forEach(t => document.body.classList.remove(t));
    document.body.classList.add(themes[i]);
  }
  applyTheme(idx);
  setInterval(()=>{
    idx = (idx + 1) % themes.length;
    applyTheme(idx);
  }, 20000); // rotate every 20s

  // Footer year
  $("#year").textContent = new Date().getFullYear();

  // Countup
  const start = new Date(window.KULSUM.START_DATE_ISO);
  function tick(){
    const diff = Date.now() - start.getTime();
    $("#countup").textContent = fmtCount(diff);
  }
  setInterval(tick, 1000); tick();

  // Nicknames marquee
  const names = window.KULSUM.NICKNAMES.join("   •   ");
  const scroller = $("#nickScroller");
  scroller.textContent = names + "   •   " + names;
  scroller.setAttribute("data-text", scroller.textContent);

  // Daily content now and at midnight without reloading
  renderDaily();
  scheduleMidnight(renderDaily);

  // Light 3D tilt on non-touch only
  if(window.matchMedia("(hover: hover) and (pointer: fine)").matches){
    $$(".tilt").forEach(el=>{
      let raf = null;
      el.addEventListener("mousemove", (e)=>{
        if(raf) return;
        raf = requestAnimationFrame(()=>{
          const r = el.getBoundingClientRect();
          const dx = (e.clientX - (r.left + r.width/2))/r.width;
          const dy = (e.clientY - (r.top + r.height/2))/r.height;
          el.style.transform = `perspective(800px) rotateX(${dy*-8}deg) rotateY(${dx*8}deg) translateZ(6px)`;
          raf = null;
        });
      }, {passive:true});
      el.addEventListener("mouseleave", ()=>{ el.style.transform = ""; }, {passive:true});
    });
  }
}

function scheduleMidnight(cb){
  const now = new Date();
  const next = new Date(now);
  next.setHours(24,0,0,0);
  setTimeout(()=>{
    cb();
    scheduleMidnight(cb);
  }, next - now + 1000);
}

async function renderDaily(){
  const today = new Date();
  const dayKey = today.toISOString().slice(0,10);
  const seed = parseInt(dayKey.replace(/-/g,""), 10);
  const rnd = xorshift32(seed);

  const nick = seededChoice(window.KULSUM.NICKNAMES, rnd);
  $("#nicknameTag").textContent = `Today you are my “${nick}”.`;
  $("#poemDate").textContent = niceDate(today);

  const styles = ["Ghazal", "Free Verse", "Qasida", "Nazm", "Rubāʿī"];
  const style = seededChoice(styles, rnd);
  $("#styleTag").textContent = style;

  const poem = composePoem(style, nick, rnd);
  typeLines($("#poem"), poem.lines, 28, 180); // smooth line-by-line fade

  try{
    const q = await fetch("data/quotes.json").then(r=>r.json());
    const qPick = q[Math.floor(rnd()*q.length)];
    $("#quote .quote-text").textContent = qPick.text;
    $("#quote .quote-author").textContent = qPick.author ? qPick.author : "—";
  }catch(e){
    $("#quote .quote-text").textContent = "Every day with you rewrites the meaning of beauty.";
    $("#quote .quote-author").textContent = "";
  }
}

function composePoem(style, nickname, rnd){
  const openings = [
    "O Kulsum,","Beloved,","My moon,","Light of my nights,","My quiet star,"
  ];
  const images = [
    "your beauty is a garden at midnight, where roses open only for the moon.",
    "your smile folds the night into silk.",
    "your eyes carry the hush of jasmine after rain.",
    "your hair is a river of velvet shadows.",
    "your grace is the patience of desert sands."
  ];
  const coupletsA = [
    "When you breathe, the air becomes perfume;",
    "One glance and my heart forgets its own name;",
    "Your footsteps teach the earth to bloom;",
    "The sky borrows colour from your laughter;",
    "In your palm, time slows to listen;"
  ];
  const coupletsB = [
    "the night itself leans closer to listen.",
    "longing falls quiet and learns to pray.",
    "every silence turns to music.",
    "and even stars grow shy.",
    "and every road becomes a ribbon home."
  ];
  const vows = [
    `I call you ${nickname}, and the world softens.`,
    `Say “${nickname}”, and watch the morning kneel.`,
    `Be my ${nickname} and I will be your faithful sky.`,
    `To you, ${nickname}, I bring a crown of ordinary days turned gold.`
  ];
  const endings = [
    "If poets of old had seen you, they would have set down their pens.",
    "Beauty, in your presence, remembers its first meaning.",
    "Even the moon envies the script your lashes write.",
    "Between heartbeats, I find the home you made of me.",
    "I gather your name and wear it like light."
  ];

  let lines = [];
  if(style === "Ghazal"){
    lines.push(seededChoice(openings, rnd) + " " + seededChoice(images, rnd));
    for(let i=0;i<3;i++){
      lines.push(seededChoice(coupletsA, rnd) + " " + seededChoice(coupletsB, rnd));
    }
    lines.push(seededChoice(vows, rnd));
    lines.push(seededChoice(endings, rnd));
  } else if(style === "Qasida"){
    lines.push(seededChoice(openings, rnd) + " hear how the dunes keep your secret.");
    lines.push("Camels of starlight kneel where your shadow passes.");
    lines.push(seededChoice(coupletsA, rnd) + " " + seededChoice(coupletsB, rnd));
    lines.push(seededChoice(vows, rnd));
    lines.push(seededChoice(endings, rnd));
  } else if(style === "Nazm"){
    lines.push("Because of you, the hours learn mercy.");
    lines.push("Because of you, the map of me finds north.");
    lines.push(seededChoice(images, rnd));
    lines.push(seededChoice(vows, rnd));
  } else if(style === "Rubāʿī"){
    lines.push(seededChoice(images, rnd));
    lines.push(seededChoice(coupletsA, rnd) + " " + seededChoice(coupletsB, rnd));
    lines.push(seededChoice(vows, rnd));
    lines.push(seededChoice(endings, rnd));
  } else { // Free Verse
    lines.push(seededChoice(openings, rnd) + " " + seededChoice(images, rnd));
    for(let i=0;i<2;i++){ lines.push(seededChoice(coupletsA, rnd) + " " + seededChoice(coupletsB, rnd)); }
    lines.push(seededChoice(vows, rnd));
  }
  return { lines };
}

// Line-by-line typing with fade-in
function typeLines(container, lines, charDelay=22, lineDelay=160){
  container.innerHTML = "";
  let i = 0;
  const renderLine = () => {
    if(i>=lines.length) return;
    const line = document.createElement("div");
    line.className = "line";
    container.appendChild(line);
    typeWriter(line, lines[i], charDelay, ()=>{
      i++; setTimeout(renderLine, lineDelay);
    });
  };
  renderLine();
}
function typeWriter(el, text, delay, cb){
  let i=0;
  const step = () => {
    el.textContent = text.slice(0, i++);
    if(i<=text.length){ setTimeout(step, delay); }
    else { cb && cb(); }
  };
  step();
}

document.addEventListener("DOMContentLoaded", ()=>{ initHearts();
  // focus first keypad button for quick input; helps mobile too
  setTimeout(()=>{ const first = $(".keypad button"); first && first.focus(); }, 300);
});


/* ===== Hearts Background ===== */
(function heartsBG(){
  const canvas = document.getElementById('hearts');
  if(!canvas) return;
  const ctx = canvas.getContext('2d');
  const DPR = Math.min(window.devicePixelRatio || 1, 2);
  let w, h, hearts = [], running = true;

  function resize(){
    w = canvas.clientWidth; h = canvas.clientHeight;
    canvas.width = Math.floor(w * DPR);
    canvas.height = Math.floor(h * DPR);
    ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
  }
  window.addEventListener('resize', resize, {passive:true});
  resize();

  const HEARTS_COUNT = window.matchMedia('(min-width:700px)').matches ? 50 : 30;
  function spawn(){
    hearts = new Array(HEARTS_COUNT).fill(0).map(()=> ({
      x: Math.random()*w,
      y: h + Math.random()*h,
      s: 0.6 + Math.random()*1.2, // size
      a: 0.2 + Math.random()*0.6, // alpha
      v: 12 + Math.random()*24,   // speed
      t: Math.random()*Math.PI*2  // sway phase
    }));
  }
  spawn();

  function drawHeart(x, y, size){
    ctx.beginPath();
    const s = size;
    ctx.moveTo(x, y);
    ctx.bezierCurveTo(x, y-3*s, x-5*s, y-3*s, x-5*s, y);
    ctx.bezierCurveTo(x-5*s, y+4*s, x, y+6*s, x, y+9*s);
    ctx.bezierCurveTo(x, y+6*s, x+5*s, y+4*s, x+5*s, y);
    ctx.bezierCurveTo(x+5*s, y-3*s, x, y-3*s, x, y);
    ctx.closePath();
  }

  function step(ts){
    if(!running) return;
    ctx.clearRect(0,0,w,h);
    for(const p of hearts){
      p.t += 0.01;
      p.y -= p.v * 0.016;
      p.x += Math.sin(p.t) * 0.4;
      if(p.y < -20){ p.y = h + 20; p.x = Math.random()*w; }
      ctx.save();
      ctx.globalAlpha = p.a;
      ctx.fillStyle = ctx.createLinearGradient(p.x-6, p.y-6, p.x+6, p.y+10);
      ctx.fillStyle.addColorStop(0,'#ff99bb');
      ctx.fillStyle.addColorStop(1,'#ff4d88');
      drawHeart(p.x, p.y, p.s*3);
      ctx.fill();
      ctx.restore();
    }
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);

  // Swap wallpaper class if photo exists
  fetch('assets/rose-wallpaper.jpg', {method:'HEAD'}).then(r=>{
    if(r.ok){
      const wp = document.querySelector('.rose-wallpaper');
      wp && wp.classList.add('has-photo');
    }
  }).catch(()=>{});
})();
