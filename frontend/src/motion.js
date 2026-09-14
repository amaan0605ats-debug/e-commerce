// Progressive enhancement: no CSS ever hides content while waiting for JavaScript.
const ease = 'cubic-bezier(.22,1,.36,1)';
let dispose = () => {};
export function cleanupMotion() { dispose(); dispose = () => {}; }
export function initMotion() {
  cleanupMotion();
  const root = document.getElementById('app-content');
  if (!root || document.body.classList.contains('admin-view')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const pointer = matchMedia('(hover: hover) and (pointer: fine)');
  const events = new AbortController();
  const running = new Set();
  const seen = new WeakSet();
  const restored = [];
  let observer, frame = 0, progress;
  const play = (element, frames, options = {}) => {
    if (reduce.matches || !element?.animate) return;
    try {
      const animation = element.animate(frames, {duration:650, easing:ease, fill:'backwards', ...options});
      running.add(animation);
      const release = () => running.delete(animation);
      animation.finished.then(release, release);
      return animation;
    } catch { /* The unanimated DOM remains visible and usable. */ }
  };
  const reveal = element => {
    if (seen.has(element) || element.hidden) return;
    seen.add(element);
    const siblings = [...element.parentElement.children];
    const delay = Math.min(siblings.indexOf(element), 3) * 65;
    if (element.matches('h1') && element.querySelector('br') && !element.querySelector('a,button')) {
      // Keep real text and emphasis, with no visual clones or ARIA duplication.
      const original = element.innerHTML;
      const groups = [[]];
      for (const node of [...element.childNodes]) {
        if (node.nodeName === 'BR') groups.push([]); else groups.at(-1).push(node);
      }
      element.replaceChildren();
      groups.forEach((nodes, index) => {
        const line = document.createElement('span');
        line.className = 'motion-heading-line';
        line.append(...nodes); element.append(line);
        play(line, [{opacity:0, transform:'translateY(16px)', clipPath:'inset(0 0 100% 0)'}, {opacity:1, transform:'none', clipPath:'inset(-15% -10% -15% -10%)'}], {duration:700, delay:index*90});
      });
      restored.push(() => { element.innerHTML = original; });
    } else if (element.matches('img')) {
      const endScale = pointer.matches && element.matches('.hero-editorial-visual > img, .story-image > img') ? '1.035' : '1';
      play(element, [{opacity:.35, scale:'1.06', clipPath:'inset(0 0 12% 0)'}, {opacity:1, scale:endScale, clipPath:'inset(0 0 0 0)'}], {duration:800});
    } else {
      play(element, [{opacity:0, transform:'translateY(14px)'}, {opacity:1, transform:'none'}], {delay});
    }
  };
  const candidates = root.querySelectorAll('h1, .editorial-section h2, .story-copy h2, .hero-editorial-copy > p, .story-copy > p, .about-intro p, .offering-card, .process-grid > *, .leadership-grid > *, .hero-editorial-visual > img, .story-image > img, .about-landscape > img, img.about-landscape');
  if (!reduce.matches && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting && !entry.target.hidden) {
        reveal(entry.target); observer.unobserve(entry.target);
      }
    }, {threshold:0.08});
    candidates.forEach(element => observer.observe(element));
  }
  const parallax = [...root.querySelectorAll('.hero-editorial-visual > img, .story-image > img')];
  if (!reduce.matches) {
    progress = document.createElement('div'); progress.className = 'reading-progress';
    progress.setAttribute('aria-hidden','true'); document.body.append(progress);
  }
  const update = () => {
    frame = 0;
    if (reduce.matches) return;
    const max = document.documentElement.scrollHeight - innerHeight;
    if (progress) progress.style.transform = `scaleX(${max > 0 ? Math.min(1, Math.max(0,scrollY/max)) : 0})`;
    if (!pointer.matches) return;
    const positions = parallax.map(image => ({image, rect:image.parentElement.getBoundingClientRect()}));
    for (const {image,rect} of positions) {
      if (rect.bottom < 0 || rect.top > innerHeight) continue;
      // Inward movement only: the image never exposes an empty edge.
      const distance = Math.min(8, Math.max(0, -rect.top * .025));
      image.style.translate = `0 ${distance}px`;
      image.style.scale = '1.035';
    }
  };
  const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
  window.addEventListener('scroll', schedule, {passive:true, signal:events.signal});
  window.addEventListener('resize', schedule, {passive:true, signal:events.signal});
  const clearTransforms = () => {
    parallax.forEach(image => {image.style.removeProperty('translate');image.style.removeProperty('scale');});
    root.querySelectorAll('.btn-primary').forEach(button => button.style.removeProperty('translate'));
  };
  pointer.addEventListener('change', () => {clearTransforms();schedule();}, {signal:events.signal});
  // A maximum three-pixel offset keeps the original hit target and native cursor.
  root.querySelectorAll('.btn-primary').forEach(button => {
    button.addEventListener('pointermove', event => {
      if (reduce.matches || !pointer.matches || event.pointerType !== 'mouse') return;
      const rect = button.getBoundingClientRect();
      button.style.translate = `${Math.max(-3,Math.min(3,(event.clientX-rect.left-rect.width/2)*.025))}px ${Math.max(-3,Math.min(3,(event.clientY-rect.top-rect.height/2)*.04))}px`;
    }, {passive:true, signal:events.signal});
    const reset = () => button.style.removeProperty('translate');
    button.addEventListener('pointerleave', reset, {signal:events.signal});
    button.addEventListener('blur', reset, {signal:events.signal});
  });
  root.addEventListener('click', event => {
    if (event.target.closest('[data-sector]')) {
      play(root.querySelector('#sector-image'), [{opacity:.45},{opacity:1}], {duration:350});
      play(root.querySelector('#sector-title'), [{opacity:0, transform:'translateY(6px)'},{opacity:1, transform:'none'}], {duration:400});
    }
    if (event.target.closest('[data-gallery-src]')) play(root.querySelector('#detail-main-image'), [{opacity:.35},{opacity:1}], {duration:220});
  }, {signal:events.signal});
  root.querySelectorAll('details').forEach(panel => panel.addEventListener('toggle', () => {
    if (panel.open) play(panel.querySelector('p'), [{opacity:0, transform:'translateY(-5px)'},{opacity:1,transform:'none'}], {duration:220});
  }, {signal:events.signal}));
  dispose = () => {
    observer?.disconnect(); events.abort(); cancelAnimationFrame(frame);
    running.forEach(animation => animation.cancel()); running.clear();
    clearTransforms(); restored.forEach(restore => restore()); progress?.remove();
  };
  reduce.addEventListener('change', () => initMotion(), {signal:events.signal});
  schedule();
}
