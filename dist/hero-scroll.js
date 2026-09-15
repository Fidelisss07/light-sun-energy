// Source video: 240 frames at 24 fps. One standard wheel notch = three frames.
const root = document.querySelector('.hero-scroll');
const hero = root.querySelector('.hero');
const canvas = root.querySelector('.hero-film');
const ctx = canvas.getContext('2d', { alpha: false });
const reduced = matchMedia('(prefers-reduced-motion: reduce)');
const COUNT = 240, LAST = COUNT - 1, STEP = 3, NOTCH = 100;
const DISTANCE = LAST / STEP * NOTCH;
const cache = new Map(), pending = new Map();
let target = 0, position = 0, painted = -1, raf = 0, lastTime = 0;
let ready = false, active = true, direction = 1, generation = 0;
let width = 1, height = 1, queue = [];
const clamp = n => Math.max(0, Math.min(LAST, n));
const url = n => `assets/hero-frames/frame-${String(n).padStart(3, '0')}.webp?v=2`;

function trimCache() {
  if (cache.size <= 12) return;
  const center = Math.round(target);
  const farthest = [...cache.keys()].sort((a,b) => Math.abs(b-center)-Math.abs(a-center));
  for (const n of farthest) {
    if (cache.size <= 12) break;
    if (n === painted) continue;
    cache.get(n).close(); cache.delete(n);
  }
}
function load(n) {
  if (cache.has(n)) return Promise.resolve(cache.get(n));
  if (pending.has(n)) return pending.get(n);
  const promise = fetch(url(n)).then(r => {
    if (!r.ok) throw new Error(`Frame ${n}: ${r.status}`);
    return r.blob();
  }).then(createImageBitmap).then(bitmap => {
    cache.set(n, bitmap); trimCache();
    return bitmap;
  }).finally(() => pending.delete(n));
  pending.set(n, promise);
  return promise;
}
function prefetch() {
  const center = Math.round(target);
  queue = [center];
  for (let d=1; d<=6; d++) queue.push(center+d*direction,center-d*direction);
  queue = [...new Set(queue.filter(n=>n>=0 && n<COUNT))];
  pump();
}
function pump() {
  while (pending.size < 4 && queue.length) {
    const n = queue.shift();
    if (cache.has(n) || pending.has(n)) continue;
    load(n).then(()=>{ schedule(); pump(); }).catch(()=>pump());
  }
}
function paint(n) {
  const bitmap = cache.get(n);
  if (!bitmap) return false;
  // Preserve the entire source frame: never crop a portrait film to a landscape viewport.
  const scale = Math.min(width/bitmap.width,height/bitmap.height);
  const w=bitmap.width*scale, h=bitmap.height*scale;
  const landscape=width/height>1.15;
  const x=landscape ? width-w-Math.min(width*.06,(width-w)/2) : (width-w)/2;
  ctx.fillStyle='#101211';ctx.fillRect(0,0,width,height);
  ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';
  ctx.drawImage(bitmap,x,(height-h)/2,w,h);
  painted=n; canvas.dataset.frame=String(n);
  canvas.classList.add('is-ready');
  return true;
}
function schedule() { if (!raf && active && ready && !document.hidden) raf=requestAnimationFrame(tick); }
function tick(time) {
  raf=0;
  const elapsed = lastTime ? Math.min(48,time-lastTime) : 16;
  lastTime=time;
  position += (target-position)*(1-Math.exp(-elapsed/42));
  if (Math.abs(target-position)<.025) position=target;
  const n=Math.round(position);
  if (n!==painted) {
    if (!paint(n)) {
      // Hold the last valid image during loading; never draw a blank frame.
      load(n).then(()=>{schedule();pump();}).catch(()=>{});
    }
  }
  if (position!==target) schedule();
}
function sync() {
  const start=window.scrollY+root.getBoundingClientRect().top;
  const next=clamp((window.scrollY-start)/DISTANCE*LAST);
  direction=next>=target ? 1 : -1;
  target=next; canvas.dataset.targetFrame=String(Math.round(target));
  hero.style.setProperty('--film-progress',String(target/LAST));
  hero.style.setProperty('--film-copy-opacity',String(Math.max(0,1-target/35)));
  if (ready) { prefetch(); schedule(); }
}
function resize() {
  const rect=hero.getBoundingClientRect(), dpr=Math.min(devicePixelRatio||1,2);
  width=Math.round(rect.width*dpr);height=Math.round(rect.height*dpr);
  canvas.width=width;canvas.height=height;
  if (painted>=0) paint(painted);
  sync();
}
function wheel(e) {
  if (!ready || reduced.matches || e.ctrlKey || Math.abs(e.deltaX)>Math.abs(e.deltaY) || !e.deltaY) return;
  if (document.querySelector('dialog[open]') || !document.querySelector('#mobile-nav').hidden) return;
  const y=scrollY, start=y+root.getBoundingClientRect().top;
  if (y<start-1 || y>start+DISTANCE+1 || (y<=start && e.deltaY<0) || (y>=start+DISTANCE && e.deltaY>0)) return;
  // Discrete mouse input is normalized to a notch; small touchpad deltas stay continuous.
  let delta;
  if (e.deltaMode===1) delta=e.deltaY/3*NOTCH;
  else if (e.deltaMode===2) delta=Math.sign(e.deltaY)*NOTCH;
  else if (Math.abs(e.deltaY)>=40 && Number.isInteger(e.deltaY)) delta=Math.sign(e.deltaY)*Math.max(1,Math.round(Math.abs(e.deltaY)/NOTCH))*NOTCH;
  else delta=e.deltaY;
  e.preventDefault();
  window.scrollTo({top:Math.max(start,y+delta),behavior:'instant'});
  sync();
}
async function enable() {
  const version=++generation;
  if (reduced.matches || !ctx || !('createImageBitmap' in window)) {
    ready=false;root.classList.remove('is-film');canvas.classList.remove('is-ready');
    root.querySelector('.hero-scroll-hint').textContent='Seu espaço. Sua energia.';
    return;
  }
  try {
    await load(0);
    if (version!==generation) return;
    ready=true;
    root.style.setProperty('--film-distance',`${DISTANCE}px`);
    root.classList.add('is-film');
    resize();paint(0);prefetch();schedule();
  } catch { root.classList.remove('is-film'); }
}
window.addEventListener('wheel',wheel,{passive:false});
window.addEventListener('scroll',sync,{passive:true});
new ResizeObserver(resize).observe(hero);
new IntersectionObserver(([entry])=>{active=entry.isIntersecting;if(active){sync();schedule();}},{rootMargin:'100px'}).observe(root);
document.addEventListener('visibilitychange',()=>{lastTime=0;schedule();});
reduced.addEventListener('change',enable);
enable();
