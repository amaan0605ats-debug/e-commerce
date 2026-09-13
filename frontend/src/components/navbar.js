const navigation = [
  { path: '/', label: 'Home', id: 'home' },
  { path: '/about', label: 'About', id: 'about' },
  { path: '/services', label: 'Offerings', id: 'services' },
  { path: '/contact', label: 'Contact', id: 'contact' },
];

export function createNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'main-navbar';
  nav.setAttribute('aria-label', 'Main navigation');

  nav.innerHTML = `
    <div class="nav-container">
      <a href="#/" class="nav-logo" id="nav-logo" aria-label="Al Gani General Suppliers — home">
        <img class="brand-mark" src="/images/algani-mark-192.png" alt="" width="48" height="48">
        <span class="nav-brand-copy">
          <span class="nav-logo-text">AL GANI<span class="nav-logo-dot" aria-hidden="true">.</span></span>
          <span class="nav-logo-sub">General Suppliers</span>
        </span>
      </a>

      <div class="nav-links" id="nav-links">
        ${navigation.map(item => `<a href="#${item.path}" class="nav-link" id="nav-${item.id}">${item.label}</a>`).join('')}
      </div>

      <div class="nav-actions">
        <a href="#/quote" class="nav-quote nav-link" id="nav-quote">Your list <span class="quote-count" data-quote-count>0</span></a>
        <a href="#/contact" class="nav-cta" id="nav-cta-btn">Request a quote <span aria-hidden="true">↗</span></a>
        <button type="button" class="nav-hamburger" id="nav-hamburger" aria-label="Open navigation menu" aria-expanded="false" aria-controls="mobile-menu">
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
          <span class="hamburger-line"></span>
        </button>
      </div>
    </div>

    <div class="mobile-menu" id="mobile-menu" hidden inert aria-hidden="true">
      <div class="mobile-menu-inner">
        ${navigation.map(item => `<a href="#${item.path}" class="mobile-link nav-link" id="mobile-${item.id}">${item.label}</a>`).join('')}
        <a href="#/quote" class="mobile-link nav-link" id="mobile-quote">Your quote list <span class="quote-count" data-quote-count>0</span></a>
        <a href="#/contact" class="mobile-cta" id="mobile-cta-btn">Request a quote <span aria-hidden="true">↗</span></a>
      </div>
    </div>
  `;

  const hamburger = nav.querySelector('#nav-hamburger');
  const mobileMenu = nav.querySelector('#mobile-menu');
  let isOpen = false;

  function setMenuOpen(open, restoreFocus = false) {
    isOpen = open;
    hamburger.classList.toggle('active', open);
    hamburger.setAttribute('aria-expanded', String(open));
    hamburger.setAttribute('aria-label', open ? 'Close navigation menu' : 'Open navigation menu');
    mobileMenu.classList.toggle('open', open);
    mobileMenu.hidden = !open;
    mobileMenu.inert = !open;
    // Keep visibility in sync at every responsive breakpoint, including tablets.
    mobileMenu.style.display = open ? 'block' : 'none';
    mobileMenu.setAttribute('aria-hidden', String(!open));
    document.body.classList.toggle('menu-open', open);
    if (restoreFocus) hamburger.focus();
  }

  hamburger.addEventListener('click', () => setMenuOpen(!isOpen));

  nav.addEventListener('click', event => {
    const link = event.target.closest('a[href]');
    if (!link) return;
    // Same-page links do not fire hashchange, so return focus to a visible control.
    const samePage = link.hash === (window.location.hash || '#/');
    setMenuOpen(false, samePage && mobileMenu.contains(link));
  });

  nav.addEventListener('keydown', event => {
    if (event.key === 'Escape' && isOpen) {
      event.preventDefault();
      setMenuOpen(false, true);
    }
  });

  // This is a disclosure, so keyboard users can tab out without a focus trap.
  nav.addEventListener('focusout', event => {
    if (isOpen && event.relatedTarget && !nav.contains(event.relatedTarget)) setMenuOpen(false);
  });

  document.addEventListener('click', event => {
    if (isOpen && !nav.contains(event.target)) setMenuOpen(false);
  });

  window.addEventListener('hashchange', () => setMenuOpen(false));
  window.addEventListener('resize', () => {
    if (isOpen && getComputedStyle(hamburger).display === 'none') setMenuOpen(false);
  });

  nav.querySelector('#nav-logo').addEventListener('click', event => {
    setMenuOpen(false);
    if (!window.location.hash || window.location.hash === '#/') {
      event.preventDefault();
      const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
      window.scrollTo({ top: 0, behavior: reducedMotion ? 'instant' : 'smooth' });
    }
  });

  const updateScrollState = () => nav.classList.toggle('scrolled', window.scrollY > 32);
  window.addEventListener('scroll', updateScrollState, { passive: true });
  updateScrollState();

  return nav;
}
