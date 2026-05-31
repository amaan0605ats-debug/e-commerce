import { services } from '../data/services.js';

export function createFooter() {
  const footer = document.createElement('footer');
  footer.className = 'site-footer';
  footer.id = 'site-footer';

  const coreServices = services.filter(s => s.category === 'Core Supply');
  const specializedServices = services.filter(s => s.category !== 'Core Supply').slice(0, 5);

  footer.innerHTML = `
    <div class="footer-top">
      <div class="footer-container">
        <div class="footer-grid">
          
          <div class="footer-col footer-brand-col">
            <a href="#/" class="footer-logo" id="footer-logo">
              <span class="footer-logo-text">AL GAN<span class="footer-logo-accent">I</span></span>
              <span class="footer-logo-dot"></span>
            </a>
            <p class="footer-tagline">Where Purity Meets Heritage</p>
            <p class="footer-desc">
              General Supplier & Distributors serving Kashmir & the Leh Region with premium quality, regional reach & trust.
            </p>
            <div class="footer-badges">
              <span class="footer-badge">Est. Nowgam, J&K</span>
              <span class="footer-badge">Multi-Category Supplier</span>
            </div>
          </div>

          <div class="footer-col">
            <h4 class="footer-heading">Quick Links</h4>
            <ul class="footer-links">
              <li><a href="#/" id="footer-link-home">Home</a></li>
              <li><a href="#/about" id="footer-link-about">About Us</a></li>
              <li><a href="#/contact" id="footer-link-contact">Contact</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4 class="footer-heading">Core Services</h4>
            <ul class="footer-links">
              ${coreServices.map(s => `
                <li><a href="#/services/${s.slug}" id="footer-${s.slug}">${s.name}</a></li>
              `).join('')}
              <li><a href="#/services/vending-machine-solutions" id="footer-vending">Vending Machines</a></li>
            </ul>
          </div>

          <div class="footer-col">
            <h4 class="footer-heading">Specialized</h4>
            <ul class="footer-links">
              ${specializedServices.map(s => `
                <li><a href="#/services/${s.slug}" id="footer-spec-${s.slug}">${s.name}</a></li>
              `).join('')}
            </ul>
          </div>

          <div class="footer-col">
            <h4 class="footer-heading">Contact</h4>
            <ul class="footer-contact-list">
              <li>
                <span class="footer-contact-icon">📞</span>
                <div>
                  <span class="footer-contact-label">Call</span>
                  <span class="footer-contact-value">7780901374</span>
                </div>
              </li>
              <li>
                <span class="footer-contact-icon">💬</span>
                <div>
                  <span class="footer-contact-label">WhatsApp</span>
                  <span class="footer-contact-value">9419014741</span>
                </div>
              </li>
              <li>
                <span class="footer-contact-icon">✉️</span>
                <div>
                  <span class="footer-contact-label">Email</span>
                  <span class="footer-contact-value footer-email">Alganigeneralsupliers@gmail.com</span>
                </div>
              </li>
              <li>
                <span class="footer-contact-icon">📍</span>
                <div>
                  <span class="footer-contact-label">Address</span>
                  <span class="footer-contact-value">Bagati Kanipora, Nowgam, Kashmir - 190019</span>
                </div>
              </li>
            </ul>
          </div>

        </div>
      </div>
    </div>

    <div class="footer-divider"></div>

    <div class="footer-bottom">
      <div class="footer-container">
        <div class="footer-bottom-inner">
          <p class="footer-copyright">© ${new Date().getFullYear()} Al Gani — General Supplier & Distributors. All rights reserved.</p>
          <div class="footer-bottom-tagline">
            <span class="footer-diamond">◆</span>
            <span>Where Purity Meets Heritage</span>
            <span class="footer-diamond">◆</span>
          </div>
        </div>
      </div>
    </div>
  `;

  return footer;
}
