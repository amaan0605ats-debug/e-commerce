import { serviceCategories, services } from '../data/services.js';

export function createNavbar() {
  const nav = document.createElement('nav');
  nav.className = 'navbar';
  nav.id = 'main-navbar';

  nav.innerHTML = `
    <div class="nav-container">
      <a href="#/" class="nav-logo" id="nav-logo">
        <span class="nav-logo-text">AL GAN<span class="nav-logo-accent">I</span></span>
        <span class="nav-logo-dot"></span>
        <span class="nav-logo-sub">General Suppliers</span>
      </a>

      <div class="nav-links" id="nav-links">
        <a href="#/" class="nav-link active" id="nav-home">Home</a>
        <a href="#/about" class="nav-link" id="nav-about">About</a>
        <div class="nav-dropdown" id="nav-services-dropdown">
          <a href="#/services" class="nav-link nav-link-dropdown" id="nav-services">
            Services
            <svg class="dropdown-chevron" width="12" height="12" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </a>
          <div class="mega-menu" id="mega-menu">
            <div class="mega-menu-inner">
              ${serviceCategories.map(cat => `
                <div class="mega-menu-column">
                  <div class="mega-menu-category">${cat.name}</div>
                  <div class="mega-menu-items">
                    ${cat.services.map(slug => {
                      const service = services.find(s => s.slug === slug);
                      return service ? `
                        <a href="#/services/${service.slug}" class="mega-menu-item" id="mega-${service.slug}">
                          <span class="mega-menu-icon">${service.icon}</span>
                          <span class="mega-menu-name">${service.name}</span>
                        </a>
                      ` : '';
                    }).join('')}
                  </div>
                </div>
              `).join('')}
            </div>
          </div>
        </div>
        <a href="#/contact" class="nav-link" id="nav-contact">Contact</a>
      </div>

      <a href="#/contact" class="nav-cta" id="nav-cta-btn">Get In Touch</a>

      <button class="nav-hamburger" id="nav-hamburger" aria-label="Toggle navigation menu">
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
        <span class="hamburger-line"></span>
      </button>
    </div>

    <!-- Mobile Menu -->
    <div class="mobile-menu" id="mobile-menu">
      <div class="mobile-menu-inner">
        <a href="#/" class="mobile-link" id="mobile-home">Home</a>
        <a href="#/about" class="mobile-link" id="mobile-about">About</a>
        <div class="mobile-accordion" id="mobile-services-accordion">
          <button class="mobile-link mobile-accordion-trigger" id="mobile-services-trigger">
            Services
            <svg class="mobile-chevron" width="16" height="16" viewBox="0 0 12 12" fill="none">
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>
            </svg>
          </button>
          <div class="mobile-accordion-content" id="mobile-services-content">
            ${serviceCategories.map(cat => `
              <div class="mobile-category-label">${cat.name}</div>
              ${cat.services.map(slug => {
                const service = services.find(s => s.slug === slug);
                return service ? `
                  <a href="#/services/${service.slug}" class="mobile-service-link" id="mobile-${service.slug}">
                    <span>${service.icon}</span> ${service.name}
                  </a>
                ` : '';
              }).join('')}
            `).join('')}
          </div>
        </div>
        <a href="#/contact" class="mobile-link" id="mobile-contact">Contact</a>
        <a href="#/contact" class="mobile-cta" id="mobile-cta-btn">Get In Touch</a>
      </div>
    </div>
  `;

  // Event listeners bound directly to navbar elements
  const hamburger = nav.querySelector('#nav-hamburger');
  const mobileMenu = nav.querySelector('#mobile-menu');
  const mobileLinks = mobileMenu?.querySelectorAll('.mobile-link:not(.mobile-accordion-trigger), .mobile-service-link, .mobile-cta');
  const accordionTrigger = nav.querySelector('#mobile-services-trigger');
  const accordionContent = nav.querySelector('#mobile-services-content');

  // Hamburger toggle
  hamburger?.addEventListener('click', () => {
    hamburger.classList.toggle('active');
    mobileMenu?.classList.toggle('open');
    document.body.classList.toggle('menu-open');
  });

  // Close mobile menu on link click
  mobileLinks?.forEach(link => {
    link.addEventListener('click', () => {
      hamburger?.classList.remove('active');
      mobileMenu?.classList.remove('open');
      document.body.classList.remove('menu-open');
    });
  });

  // Mobile accordion
  accordionTrigger?.addEventListener('click', () => {
    accordionContent?.classList.toggle('open');
    accordionTrigger.classList.toggle('open');
  });

  // Scroll behavior for navbar
  let lastScroll = 0;
  window.addEventListener('scroll', () => {
    if (window.scrollY > 80) {
      nav.classList.add('scrolled');
    } else {
      nav.classList.remove('scrolled');
    }
    lastScroll = window.scrollY;
  });

  return nav;
}
