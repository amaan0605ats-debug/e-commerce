export class Router {
  constructor(routes) {
    this.routes = routes;
    this.currentPath = '';
    
    window.addEventListener('hashchange', () => this.handleRoute());
    window.addEventListener('load', () => this.handleRoute());
  }

  navigate(path) {
    window.location.hash = path;
  }

  handleRoute() {
    let hash = window.location.hash.slice(1) || '/';
    
    // Strip query parameters for routing
    const queryIdx = hash.indexOf('?');
    if (queryIdx !== -1) {
      hash = hash.slice(0, queryIdx);
    }
    
    this.currentPath = hash;
    
    // Find matching route
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

    if (!matchedRoute) {
      // Default to home
      matchedRoute = this.routes.find(r => r.path === '/');
      params = {};
    }

    const app = document.getElementById('app-content');
    if (app) {
      // Add exit animation
      app.classList.add('page-exit');
      
      setTimeout(() => {
        app.innerHTML = '';
        if (matchedRoute && matchedRoute.render) {
          const content = matchedRoute.render(params);
          if (typeof content === 'string') {
            app.innerHTML = content;
          } else if (content instanceof HTMLElement) {
            app.appendChild(content);
          }
        }
        
        // Scroll to top
        window.scrollTo({ top: 0, behavior: 'instant' });
        
        // Remove exit, add enter animation
        app.classList.remove('page-exit');
        app.classList.add('page-enter');
        
        // Trigger DOM reflow to immediately kickstart hardware-accelerated CSS transition
        void app.offsetWidth;
        
        setTimeout(() => {
          app.classList.remove('page-enter');
        }, 150);

        // Initialize intersection observers for scroll animations
        this.initScrollAnimations();
        
        // Update active nav link
        this.updateActiveNav();
      }, 100);
    }
  }

  matchRoute(pattern, hash) {
    // Convert route pattern to regex
    const paramNames = [];
    const regexStr = pattern.replace(/:([^/]+)/g, (_, name) => {
      paramNames.push(name);
      return '([^/]+)';
    });
    
    const regex = new RegExp(`^${regexStr}$`);
    const match = hash.match(regex);
    
    if (!match) return null;
    
    const params = {};
    paramNames.forEach((name, i) => {
      params[name] = match[i + 1];
    });
    
    return { params };
  }

  initScrollAnimations() {
    // 1. Auto-stagger grids and lists to create beautiful cascades of items
    const staggerContainers = document.querySelectorAll(
      '.services-grid, .why-grid, .territories-info-col, .about-teaser-grid, .partners-ticker-wrap, .mega-menu-inner, .mobile-accordion-content'
    );
    
    staggerContainers.forEach(container => {
      const items = container.querySelectorAll('.animate-on-scroll');
      items.forEach((item, index) => {
        item.style.transitionDelay = `${index * 0.15}s`;
      });
    });

    // 2. Setup intersection observer for on-scroll reveal
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          entry.target.classList.add('animate-visible');
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

    document.querySelectorAll('.animate-on-scroll').forEach(el => {
      observer.observe(el);
    });
  }

  updateActiveNav() {
    const hash = window.location.hash.slice(1) || '/';
    document.querySelectorAll('.nav-link').forEach(link => {
      link.classList.remove('active');
      const href = link.getAttribute('href');
      if (href) {
        const linkPath = href.slice(1); // remove #
        if (hash === linkPath || (linkPath !== '/' && hash.startsWith(linkPath))) {
          link.classList.add('active');
        }
      }
    });
  }
}
