// Keep content visible: only below-fold cards move, once, without opacity resets.
let dispose = () => {};
export function cleanupMotion() { dispose(); dispose = () => {}; }
export function initMotion() {
  cleanupMotion();
  const root = document.getElementById('app-content');
  if (!root || document.body.classList.contains('admin-view')) return;
  const reduce = matchMedia('(prefers-reduced-motion: reduce)');
  const events = new AbortController();
  const running = new Set();
  let observer;
  if (!reduce.matches && typeof IntersectionObserver !== 'undefined') {
    observer = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        observer.unobserve(entry.target);
        try {
          const animation = entry.target.animate?.(
            [{transform:'translateY(8px)'}, {transform:'none'}],
            {duration:500, easing:'cubic-bezier(.22,1,.36,1)'}
          );
          if (animation) {
            running.add(animation);
            animation.finished.then(() => running.delete(animation), () => running.delete(animation));
          }
        } catch { /* Animation is optional; the original content stays visible. */ }
      }
    }, {threshold:0});
    root.querySelectorAll('.offering-card, .project-path, .scope-card, .process-grid > article').forEach(element => {
      // Never restart an entrance on content already painted in the viewport.
      if (element.getBoundingClientRect().top >= innerHeight) observer.observe(element);
    });
  }
  dispose = () => {
    observer?.disconnect(); events.abort();
    running.forEach(animation => animation.cancel()); running.clear();
  };
  reduce.addEventListener('change', initMotion, {signal:events.signal});
}
