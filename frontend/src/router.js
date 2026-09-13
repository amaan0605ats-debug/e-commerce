export class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentPath = '';
    this.lastRenderedHash = null;
    window.addEventListener('hashchange', () => this.handleRoute());
  }

  navigate(path) {
    window.location.hash = path;
  }

  handleRoute() {
    clearTimeout(this.renderTimer);
    clearTimeout(this.enterTimer);
    this.scrollObserver?.disconnect();

    const rawHash = window.location.hash.slice(1) || '/';
    const hash = rawHash.split('?')[0].replace(/\/+$/, '') || '/';
    this.currentPath = hash;
    let matchedRoute = null;
    let params = {};

    for (const route of this.routes) {
      const match = this.matchRoute(route.path, hash);
      if (match) {
        matchedRoute = route;
        params = match.params;
        break;
      }
    }

    const app = document.getElementById('app-content');
    if (!app) return;
    const shouldFocus = this.lastRenderedHash !== null && this.lastRenderedHash !== rawHash;
    app.classList.add('page-exit');

    this.renderTimer = setTimeout(() => {
      // The URL can change before its queued hashchange handler runs.
      if ((window.location.hash.slice(1) || '/') !== rawHash) return;
      const content = matchedRoute?.render ? matchedRoute.render(params) : this.renderNotFound();
      // A route renderer may redirect (for example, the admin auth guard).
      if ((window.location.hash.slice(1) || '/') !== rawHash) return;
      app.innerHTML = '';
      if (typeof content === 'string') {
        app.innerHTML = content;
      } else if (content instanceof HTMLElement) {
        app.appendChild(content);
      }

      window.scrollTo({ top: 0, behavior: 'instant' });
      app.classList.remove('page-exit');
      app.classList.add('page-enter');
      void app.offsetWidth;
      this.enterTimer = setTimeout(() => app.classList.remove('page-enter'), 150);

      this.initScrollAnimations();
      this.updateActiveNav();
      const heading = app.querySelector('h1');
      document.title = `${(heading?.innerText || heading?.textContent || '').replace(/\s+/g, ' ').trim() || 'Al Gani'} | Al Gani General Suppliers`;
      this.lastRenderedHash = rawHash;
      this.onRendered?.();

      // Announce a client-side page change without stealing focus on first load.
      if (shouldFocus) {
        const focusTarget = heading || app;
        focusTarget.setAttribute('tabindex', '-1');
        focusTarget.focus({ preventScroll: true });
      }
    }, 100);
  }

  renderNotFound() {
    return `
      <section class="not-found-page page-hero">
        <div class="container not-found-content">
          <span class="eyebrow">404 / A little off course</span>
          <h1>Let's get you<br>back on track.</h1>
          <p>This page may have moved, or the link may be incomplete. Explore our offerings or tell us what you are looking for.</p>
          <div class="not-found-actions">
            <a href="#/services" class="btn btn-primary">Explore offerings <span aria-hidden="true">↗</span></a>
            <a href="#/" class="btn btn-secondary">Back to home</a>
          </div>
        </div>
      </section>
    `;
  }

  matchRoute(pattern, hash) {
    const paramNames = [];
    const regexStr = pattern.split('/').map(segment => {
      if (segment.startsWith(':')) {
        paramNames.push(segment.slice(1));
        return '([^/]+)';
      }
      return segment.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    }).join('/');

    const match = hash.match(new RegExp(`^${regexStr}$`));
    if (!match) return null;

    const params = {};
    try {
      paramNames.forEach((name, index) => {
        params[name] = decodeURIComponent(match[index + 1]);
      });
    } catch {
      // Invalid percent encoding should show the fallback page, never crash routing.
      return null;
    }
    return { params };
  }

  initScrollAnimations() {
    this.scrollObserver?.disconnect();
    const elements = document.querySelectorAll('.animate-on-scroll');
    const reducedMotion = window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
    if (reducedMotion || typeof IntersectionObserver === 'undefined') {
      elements.forEach(element => element.classList.add('animate-visible'));
      return;
    }

    document.querySelectorAll('.services-grid, .why-grid, .about-teaser-grid').forEach(container => {
      container.querySelectorAll('.animate-on-scroll').forEach((item, index) => {
        item.style.transitionDelay = `${Math.min(index, 4) * 0.08}s`;
      });
    });

    const observer = new IntersectionObserver(entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -20px 0px' });
    this.scrollObserver = observer;
    elements.forEach(element => observer.observe(element));
  }

  updateActiveNav() {
    const hash = this.currentPath;
    document.querySelectorAll('.nav-link').forEach(link => {
      const href = link.getAttribute('href');
      const linkPath = href?.startsWith('#') ? href.slice(1) : null;
      const isExact = hash === linkPath;
      const isActive = linkPath !== null && (isExact || (linkPath !== '/' && hash.startsWith(`${linkPath}/`)));
      link.classList.toggle('active', isActive);
      if (isExact) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });
  }
}
