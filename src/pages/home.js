import { services } from '../data/services.js';
import { getCachedProducts } from '../firebase.js';

export function renderHome() {
  return `
    <!-- HERO SECTION -->
    <section class="hero" id="hero-section">
      <div class="hero-bg-image hero-day-bg" style="background-image: url('/images/hero-day.jpg');"></div>
      <div class="hero-bg-image hero-night-bg" style="background-image: url('/images/hero-night.jpg');"></div>
      <video class="hero-bg-video" autoplay loop muted playsinline>
        <source src="/images/hero.mp4" type="video/mp4">
      </video>
      <div class="hero-overlay"></div>
      <div class="hero-cinemagraph-layer">
        <!-- Shikara Boat 1 -->
        <div class="shikara-boat boat-1">
          <svg viewBox="0 0 120 30" width="120" height="30">
            <!-- Shikara silhouette with canopy and rower -->
            <path d="M 0 20 Q 20 18 35 25 L 90 25 Q 105 25 120 12 Q 105 22 90 22 L 35 22 Q 25 21 0 20 Z" fill="rgba(200, 146, 42, 0.45)" />
            <!-- Canopy / Roof -->
            <path d="M 45 22 L 48 10 L 82 10 L 85 22 Z" fill="rgba(200, 146, 42, 0.55)" />
            <rect x="52" y="6" width="26" height="4" fill="rgba(245, 224, 168, 0.6)" rx="1"/>
            <!-- Rower silhouette -->
            <circle cx="28" cy="15" r="3.5" fill="rgba(200, 146, 42, 0.5)" />
            <path d="M 28 18 L 26 23 L 30 23 Z" fill="rgba(200, 146, 42, 0.5)" />
            <!-- Oar entering water -->
            <line x1="26" y1="21" x2="22" y2="28" stroke="rgba(200, 146, 42, 0.4)" stroke-width="1.5"/>
          </svg>
        </div>
        <!-- Shikara Boat 2 (further away, smaller, slower) -->
        <div class="shikara-boat boat-2">
          <svg viewBox="0 0 120 30" width="70" height="18">
            <path d="M 0 20 Q 20 18 35 25 L 90 25 Q 105 25 120 12 Q 105 22 90 22 L 35 22 Q 25 21 0 20 Z" fill="rgba(245, 224, 168, 0.25)" />
            <path d="M 45 22 L 48 10 L 82 10 L 85 22 Z" fill="rgba(245, 224, 168, 0.3)" />
            <rect x="52" y="6" width="26" height="4" fill="rgba(251, 243, 227, 0.35)" rx="1"/>
            <circle cx="28" cy="15" r="3.5" fill="rgba(245, 224, 168, 0.3)" />
            <path d="M 28 18 L 26 23 L 30 23 Z" fill="rgba(245, 224, 168, 0.3)" />
            <line x1="26" y1="21" x2="22" y2="28" stroke="rgba(245, 224, 168, 0.25)" stroke-width="1.2"/>
          </svg>
        </div>
      </div>
      <div class="hero-content">
        <div class="hero-eyebrow animate-on-scroll">
          <span class="hero-diamond">◆</span>
          <span>General Supplier & Distributors</span>
          <span class="hero-diamond">◆</span>
        </div>
        <h1 class="hero-title animate-on-scroll">
          Where <em>Purity</em><br>Meets Heritage.
        </h1>
        <div class="hero-rule animate-on-scroll"></div>
        <p class="hero-subtitle animate-on-scroll">
          Serving Kashmir & the Leh Region with Premium Quality,<br>
          Regional Reach & Unwavering Trust.
        </p>
        <div class="theme-toggle-wrap animate-on-scroll" style="margin-bottom: 28px;">
          <button class="theme-toggle-btn" id="hero-theme-toggle" aria-label="Toggle Light/Dark Mode">
            <div class="toggle-track">
              <span class="toggle-text-left">Dark</span>
              <div class="toggle-knob">
                <!-- Sun Icon -->
                <svg class="icon-sun" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                  <circle cx="12" cy="12" r="5"/>
                  <line x1="12" y1="1" x2="12" y2="3"/>
                  <line x1="12" y1="21" x2="12" y2="23"/>
                  <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                  <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                  <line x1="1" y1="12" x2="3" y2="12"/>
                  <line x1="21" y1="12" x2="23" y2="12"/>
                  <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                  <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                </svg>
                <!-- Moon Icon -->
                <svg class="icon-moon" width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              </div>
              <span class="toggle-text-right">Light</span>
            </div>
          </button>
        </div>
        <div class="hero-actions animate-on-scroll">
          <a href="#/about" class="btn btn-primary" id="hero-cta-explore">Explore Our Story</a>
          <a href="#/contact" class="btn btn-outline" id="hero-cta-contact">Get In Touch</a>
          <a href="/AlGani_Company_Profile.pdf" download="AlGani_Company_Profile.pdf" class="btn btn-secondary" id="hero-cta-download" style="border: 1px solid var(--gold); color: var(--gold-light);">Download Profile (PDF)</a>
        </div>
        <div class="hero-stats animate-on-scroll">
          <div class="hero-stat">
            <span class="hero-stat-num counter" data-target="14" data-suffix="+">0</span>
            <span class="hero-stat-label">Service Categories</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-num counter" data-target="10" data-suffix="+">0</span>
            <span class="hero-stat-label">Team Members</span>
          </div>
          <div class="hero-stat-divider"></div>
          <div class="hero-stat">
            <span class="hero-stat-num counter" data-target="2">0</span>
            <span class="hero-stat-label">Key Regions</span>
          </div>
        </div>
      </div>
      <div class="hero-scroll-indicator">
        <span>Scroll</span>
        <div class="hero-scroll-line"></div>
      </div>
    </section>

    <!-- PARTNERS CAROUSEL BANNER -->
    <section class="partners-carousel-section" id="partners-section">
      <div class="container">
        <div class="partners-carousel-title animate-on-scroll">Trusted Supply Partners & Sectors</div>
        <div class="partners-ticker-wrap animate-on-scroll">
          <div class="partners-ticker">
            <div class="partner-item">🏨 Hospitality & Luxury Hotels</div>
            <div class="partner-item">🏗️ Real Estate Developers</div>
            <div class="partner-item">🥛 J&K Dairy Cooperatives</div>
            <div class="partner-item">🍎 Horticulture Growers</div>
            <div class="partner-item">🏫 Educational Institutions</div>
            <div class="partner-item">🩺 Regional Healthcare Facilities</div>
            <div class="partner-item">🏛️ Government Contractors</div>
            <!-- Duplicate for seamless scroll loop -->
            <div class="partner-item">🏨 Hospitality & Luxury Hotels</div>
            <div class="partner-item">🏗️ Real Estate Developers</div>
            <div class="partner-item">🥛 J&K Dairy Cooperatives</div>
            <div class="partner-item">🍎 Horticulture Growers</div>
            <div class="partner-item">🏫 Educational Institutions</div>
            <div class="partner-item">🩺 Regional Healthcare Facilities</div>
            <div class="partner-item">🏛️ Government Contractors</div>
          </div>
        </div>
      </div>
    </section>

    <!-- ABOUT TEASER -->
    <section class="about-teaser" id="about-teaser">
      <div class="container">
        <div class="about-teaser-grid">
          <div class="about-teaser-left animate-on-scroll">
            <div class="section-label">Our Story</div>
            <h2 class="section-title">Rooted in <em>Kashmir.</em><br>Built on Trust.</h2>
            <div class="section-rule"></div>
            <p class="body-text">
              Al Gani was born out of a singular belief — that the people and businesses of Kashmir deserve access to the finest products, delivered with reliability and care that matches the standards of this extraordinary region.
            </p>
            <p class="body-text" style="margin-top: 16px;">
              Based in Bagati Kanipora, Nowgam, we have built a reputation as one of the region's most dependable General Supplier and Distributors.
            </p>
            <a href="#/about" class="btn btn-secondary" id="about-teaser-cta" style="margin-top: 28px;">Learn More About Us</a>
          </div>
          <div class="about-teaser-right animate-on-scroll">
            <div class="about-teaser-quote" style="margin-bottom: 24px;">
              <div class="quote-mark">"</div>
              <p>Every product we carry, every partnership we build, carries the weight of Kashmir's name — and that is a responsibility we take seriously.</p>
              <div class="board-signatures-container" style="display: flex; gap: 24px; margin-top: 20px; flex-wrap: wrap; border-top: 1px solid rgba(251,243,227,0.15); padding-top: 16px;">
                <div class="board-signature" style="flex: 1; min-width: 150px;">
                  <cite style="display: flex; flex-direction: column; gap: 2px; margin-top: 0;">
                    <span style="font-family: var(--font-display); font-size: 14px; color: var(--cream); font-weight: 600; letter-spacing: 0.5px; text-transform: none;">Syed Mir Aftab</span>
                    <span class="cite-title" style="font-family: var(--font-ui); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold-light); font-style: normal; opacity: 0.85;">Managing Director</span>
                  </cite>
                </div>
                <div class="board-signature" style="flex: 1; min-width: 150px;">
                  <cite style="display: flex; flex-direction: column; gap: 2px; margin-top: 0;">
                    <span style="font-family: var(--font-display); font-size: 14px; color: var(--cream); font-weight: 600; letter-spacing: 0.5px; text-transform: none;">Mohammad Ayoub Bhat</span>
                    <span class="cite-title" style="font-family: var(--font-ui); font-size: 9px; letter-spacing: 2px; text-transform: uppercase; color: var(--gold-light); font-style: normal; opacity: 0.85;">Director</span>
                  </cite>
                </div>
              </div>
            </div>
            
            <div class="about-teaser-stats">
              <div class="stat-card">
                <div class="stat-card-num"><span class="counter" data-target="10" data-suffix="+">0</span></div>
                <div class="stat-card-label">Team Members</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-num counter" data-target="2">0</div>
                <div class="stat-card-label">Key Regions</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-num">∞</div>
                <div class="stat-card-label">Commitment</div>
              </div>
              <div class="stat-card">
                <div class="stat-card-num"><span class="counter" data-target="100" data-suffix="%">0</span></div>
                <div class="stat-card-label">Reliable Service</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- SERVICES SECTION -->
    <section class="services-section" id="services-section">
      <div class="services-section-header">
        <div class="container">
          <div class="section-label animate-on-scroll">What We Offer</div>
          <h2 class="section-title animate-on-scroll" style="color: var(--cream);">Our Core <em style="color: var(--gold-light);">Offerings</em></h2>
          <div class="section-rule animate-on-scroll"></div>
          <p class="body-text animate-on-scroll" style="max-width: 600px; color: var(--cream-dark);">
            Al Gani operates across multiple product verticals — each selected for its demand in our regional markets and our ability to deliver with quality and reliability.
          </p>
        </div>
      </div>
        <div class="services-grid">
          ${services.map((service, i) => `
            <a href="#/services/${service.slug}" 
               class="service-card animate-on-scroll ${i >= 6 ? 'service-card-extra service-card-hidden' : ''}" 
               id="service-card-${service.slug}" 
               style="animation-delay: ${(i % 6) * 0.05}s; ${i >= 6 ? 'display: none;' : ''}" 
               data-category="${service.category}">
              <div class="service-card-img-wrap">
                <img src="/images/${service.slug}.png" onerror="this.src='/images/general-commercial-supplies.png'" alt="${service.name}" class="service-card-img" loading="lazy">
              </div>
              <div class="service-card-icon">${service.icon}</div>
              <h3 class="service-card-name">${service.name}</h3>
              <p class="service-card-desc">${service.shortDesc}</p>
              <div class="service-card-footer">
                <span class="service-card-tag">${service.tag}</span>
                <span class="service-card-arrow">→</span>
              </div>
            </a>
          `).join('')}
        </div>
        <div class="services-show-more-wrap animate-on-scroll" style="text-align: center; margin-top: 48px;">
          <button id="btn-show-more-services" class="btn btn-secondary" style="border: 1px solid var(--gold); color: var(--gold-light); font-size: 13px; letter-spacing: 2px; padding: 12px 28px; text-transform: uppercase;">Show More Offerings</button>
        </div>
      </div>
    </section>

    <!-- WHY CHOOSE US -->
    <section class="why-section" id="why-section">
      <div class="container">
        <div class="section-label animate-on-scroll">Our Advantage</div>
        <h2 class="section-title animate-on-scroll">Why Partners <em>Choose Al Gani</em></h2>
        <div class="section-rule animate-on-scroll"></div>
        
        <div class="why-grid">
          <div class="why-card animate-on-scroll">
            <div class="why-card-num">01</div>
            <h3 class="why-card-title">Strategic Regional Reach</h3>
            <p class="why-card-text">We operate exclusively in Kashmir and Leh — two markets that demand hyper-local expertise. Our deep roots give us unmatched commercial relationships and distribution intelligence.</p>
          </div>
          <div class="why-card animate-on-scroll">
            <div class="why-card-num">02</div>
            <h3 class="why-card-title">Proven Track Record</h3>
            <p class="why-card-text">We have a demonstrated history of successfully introducing and distributing specialized products — including vending machinery — in this unique regional market.</p>
          </div>
          <div class="why-card animate-on-scroll">
            <div class="why-card-num">03</div>
            <h3 class="why-card-title">Dedicated Operations Team</h3>
            <p class="why-card-text">Our full 10-person team handles sales, logistics, client relations, and after-sales support — treating every partner's product as their own responsibility.</p>
          </div>
          <div class="why-card animate-on-scroll">
            <div class="why-card-num">04</div>
            <h3 class="why-card-title">End-to-End Supply Chain</h3>
            <p class="why-card-text">From purchase order to final-mile delivery — we manage customs clearance, regional logistics, warehousing, and client billing as a single point of accountability.</p>
          </div>
          <div class="why-card animate-on-scroll">
            <div class="why-card-num">05</div>
            <h3 class="why-card-title">Localized Expertise</h3>
            <p class="why-card-text">We create and execute localized product catalogs tailored to regional needs — presenting products in language, format, and context that resonates with Kashmiri buyers.</p>
          </div>
          <div class="why-card animate-on-scroll">
            <div class="why-card-num">06</div>
            <h3 class="why-card-title">Heritage & Quality</h3>
            <p class="why-card-text">Our brand promise — Where Purity Meets Heritage — applies to every brand we represent. We never compromise a partner's reputation for short-term gain.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- TERRITORIES -->
    <section class="territories-section" id="territories-section">
      <div class="container">
        <div class="ornament-line animate-on-scroll"><span>Our Operating Territories</span></div>
        <div class="territories-split">
          <div class="territories-info-col">
            <div class="territory-card territory-primary animate-on-scroll">
              <div class="territory-badge">Primary Market</div>
              <h3 class="territory-name">Kashmir Valley</h3>
              <p class="territory-desc">Srinagar, Baramulla, Anantnag, Sopore, Kupwara, Pulwama, Budgam and all major commercial centres across the Kashmir Valley.</p>
            </div>
            <div class="territory-card animate-on-scroll" style="margin-top: 20px;">
              <div class="territory-badge territory-badge-secondary">Expansion Market</div>
              <h3 class="territory-name">Leh Region</h3>
              <p class="territory-desc">Leh city and the broader Ladakh region — a growing commercial market with unique access challenges that our expertise overcomes.</p>
            </div>
          </div>
          <div class="territories-map-col animate-on-scroll">
            <div class="glass-map-container">
              <svg viewBox="0 0 500 320" class="glass-map-svg">
                <!-- Minimalist J&K / Ladakh borders -->
                <path d="M 40 130 L 130 30 L 220 60 L 350 20 L 450 100 L 410 200 L 300 260 L 160 290 L 80 230 L 40 130 Z" class="map-bg-region" />
                <path d="M 40 130 L 130 30 L 220 60 L 200 160 L 130 200 L 80 230 Z" class="map-region-kashmir" />
                <path d="M 220 60 L 350 20 L 450 100 L 410 200 L 300 260 L 200 160 Z" class="map-region-ladakh" />
                
                <!-- Divider line -->
                <path d="M 220 60 L 200 160" stroke="var(--gold)" stroke-width="1.5" stroke-dasharray="4,4" fill="none" opacity="0.6"/>
                
                <text x="100" y="110" class="map-label">KASHMIR VALLEY</text>
                <text x="290" y="150" class="map-label">LEH / LADAKH</text>
                
                <!-- Srinagar Pin -->
                <g class="map-marker" id="marker-srinagar" transform="translate(130, 150)">
                  <circle r="16" class="marker-pulse"/>
                  <circle r="6" class="marker-core"/>
                  <text x="12" y="4" class="marker-label">Srinagar Nowgam Hub</text>
                </g>
                
                <!-- Leh Pin -->
                <g class="map-marker" id="marker-leh" transform="translate(320, 110)">
                  <circle r="16" class="marker-pulse" style="animation-delay: 0.8s;"/>
                  <circle r="6" class="marker-core" style="fill: var(--gold-light);"/>
                  <text x="12" y="4" class="marker-label">Leh Expansion Hub</text>
                </g>
              </svg>
              <!-- Glass operational details card -->
              <div class="map-details-card" id="map-details-card">
                <div class="map-details-icon">📍</div>
                <div class="map-details-content">
                  <h4 class="map-details-title">Regional Logistics Hubs</h4>
                  <p class="map-details-text">Hover over Kashmir or Leh regions on the map to inspect operational logistics routes, dispatch frequencies, and regional reach.</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- TESTIMONIALS SECTION -->
    <section class="testimonials-section" id="testimonials-section">
      <div class="container">
        <div class="section-label animate-on-scroll">Client Success Stories</div>
        <h2 class="section-title animate-on-scroll">Trusted by Regional <em>Industry Leaders</em></h2>
        <div class="section-rule animate-on-scroll" style="margin: 18px auto 30px;"></div>
        
        <div class="testimonials-carousel-wrap animate-on-scroll">
          <div class="testimonial-slide active" data-index="0">
            <div class="testimonial-quote">“Al Gani has been our sole hospitality and equipment supplier for over 4 years. Their regional reach in Srinagar and ability to deliver bulk setup implements during peak tourist season is unmatched. A highly professional B2B partner.”</div>
            <div class="testimonial-author">
              <div class="author-avatar">🏨</div>
              <div class="author-info">
                <h4 class="author-name">Showkat Ahmad Dar</h4>
                <p class="author-title">Procurement Director, Gulmarg Grand Resorts</p>
              </div>
            </div>
          </div>

          <div class="testimonial-slide" data-index="1">
            <div class="testimonial-quote">“Operating supply chains in Leh presents unique high-altitude cold climate challenges. Al Gani overcomes these hurdles easily with their weekly dispatch routes and insulated cold storage solutions. Exceptional service standards.”</div>
            <div class="testimonial-author">
              <div class="author-avatar">🥛</div>
              <div class="author-info">
                <h4 class="author-name">Tundup Namgyal</h4>
                <p class="author-title">Logistics Manager, Ladakh Agri-Dairy Union</p>
              </div>
            </div>
          </div>

          <div class="testimonial-slide" data-index="2">
            <div class="testimonial-quote">“Their full-service B2B operations team takes complete responsibility of our custom vending machine lines. From customs clearance to final-mile installation and weekly servicing, they treat our products with utmost care.”</div>
            <div class="testimonial-author">
              <div class="author-avatar">💼</div>
              <div class="author-info">
                <h4 class="author-name">Farooq Shah</h4>
                <p class="author-title">Operations Head, Srinagar Metro Vending Solutions</p>
              </div>
            </div>
          </div>

          <div class="testimonials-nav">
            <button class="test-dot active" data-slide="0" aria-label="Go to slide 1"></button>
            <button class="test-dot" data-slide="1" aria-label="Go to slide 2"></button>
            <button class="test-dot" data-slide="2" aria-label="Go to slide 3"></button>
          </div>
        </div>
      </div>
    </section>

    <!-- FAQ SECTION -->
    <section class="faq-section" id="faq-section">
      <div class="container">
        <div class="section-label animate-on-scroll">B2B Support Hub</div>
        <h2 class="section-title animate-on-scroll">Frequently Asked <em>Questions</em></h2>
        <div class="section-rule animate-on-scroll" style="margin: 18px auto 30px;"></div>

        <div class="faq-accordion-wrap animate-on-scroll">
          <div class="faq-item">
            <button class="faq-trigger">
              <span>What are your delivery schedules to the Leh (Ladakh) region?</span>
              <svg class="faq-chevron" width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="faq-content">
              <p>We maintain a weekly B2B logistics route connecting our Srinagar hub to Leh city via Kargil. During the winter season, when passes like Zojila experience extreme snow closures, we utilize strategic local warehousing in Leh to keep critical supply lines fully operational without delays.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-trigger">
              <span>Do you provide ongoing technical support and warranties on B2B equipment?</span>
              <svg class="faq-chevron" width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="faq-content">
              <p>Yes. All specialized machinery—including smart commercial vending machines, cold storage insulation lines, and laboratory setups—come with comprehensive manufacturer warranties and a local servicing SLA managed directly by our 10-person operations team in Kashmir.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-trigger">
              <span>How can a manufacturer establish a distribution partnership with Al Gani?</span>
              <svg class="faq-chevron" width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="faq-content">
              <p>We are always eager to evaluate new supply brands. You can initiate a proposal by clicking "Get In Touch" to submit a B2B Callback Request. Our operations manager will coordinate a formal inquiry to evaluate market size, licensing, customs clearance requirements, and warehousing logistics.</p>
            </div>
          </div>

          <div class="faq-item">
            <button class="faq-trigger">
              <span>Can we request customized procurement and B2B catalog building?</span>
              <svg class="faq-chevron" width="14" height="14" viewBox="0 0 12 12" fill="none">
                <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
              </svg>
            </button>
            <div class="faq-content">
              <p>Absolutely. We specialize in localized catalogs matching specific hotel chain specifications, dairy cooperative needs, or beekeeping implement standards. We work closely with wholesale buyers to source, test, print work orders, and supply tailored items.</p>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA BANNER -->
    <section class="cta-banner" id="cta-section">
      <div class="cta-banner-bg"></div>
      <div class="container" style="position: relative; z-index: 1;">
        <div class="cta-content animate-on-scroll">
          <div class="section-label" style="color: var(--gold);">Partnership Opportunity</div>
          <h2 class="cta-title">Ready to Build <em>Something Together?</em></h2>
          <p class="cta-subtitle">Whether you're a manufacturer seeking a regional distribution partner, or a business looking for quality supplies — we're ready to connect.</p>
          <div class="cta-actions">
            <a href="#/contact" class="btn btn-primary btn-lg" id="cta-contact-btn">Contact Us Today</a>
            <a href="#/about" class="btn btn-outline btn-lg" id="cta-about-btn" style="border-color: var(--gold-light); color: var(--gold-light);">Learn More</a>
          </div>
        </div>
      </div>
    </section>
  `;
}

// ── DYNAMIC CATALOG SYNC FOR HOME PAGE ──
export async function initHome() {
  // 1. Determine screen layout (mobile vs desktop initial offerings limit)
  const isMobile = window.innerWidth <= 768;
  const initialShowCount = isMobile ? 3 : 6;

  // 2. Hide extra services initially based on layout
  const cards = document.querySelectorAll('.services-grid .service-card');
  cards.forEach((card, idx) => {
    if (idx >= initialShowCount) {
      card.style.display = 'none';
      card.classList.add('service-card-extra', 'service-card-hidden');
    } else {
      card.style.display = '';
      card.classList.remove('service-card-hidden');
    }
  });

  // 3. Show More button listener
  const showMoreBtn = document.getElementById('btn-show-more-services');
  if (showMoreBtn) {
    // Clone and replace button to clear previous click event listeners if any (prevents double fire)
    const newBtn = showMoreBtn.cloneNode(true);
    showMoreBtn.parentNode.replaceChild(newBtn, showMoreBtn);

    newBtn.addEventListener('click', () => {
      const hiddenCards = document.querySelectorAll('.services-grid .service-card.service-card-hidden');
      if (hiddenCards.length > 0) {
        hiddenCards.forEach(card => {
          card.style.display = '';
          card.classList.remove('service-card-hidden');
          card.classList.add('animate-visible');
        });
        newBtn.textContent = 'Show Less Offerings';
      } else {
        cards.forEach((card, idx) => {
          if (idx >= initialShowCount) {
            card.style.display = 'none';
            card.classList.add('service-card-hidden');
          }
        });
        newBtn.textContent = 'Show More Offerings';
        document.getElementById('services-section')?.scrollIntoView({ behavior: 'smooth' });
      }
    });
  }

  // 4. Fetch catalog from backend and apply settings (visibility + stock status)
  try {
    const products = await getCachedProducts();
    
    products.forEach(p => {
      const card = document.getElementById(`service-card-${p.slug}`);
      if (!card) return;
      
      // Hide if visibility is toggled off in admin (hard override)
      if (p.visible === 0) {
        card.style.display = 'none';
        card.classList.remove('service-card-hidden'); // remove so it won't show on expand
        return;
      }
      
      // Add stock status badge
      const footer = card.querySelector('.service-card-footer');
      if (footer && p.stockStatus) {
        // Remove existing badge if already inserted
        const oldBadge = footer.querySelector('.dynamic-stock-badge');
        if (oldBadge) oldBadge.remove();

        const badge = document.createElement('span');
        badge.className = 'dynamic-stock-badge';
        
        let stockLabel = '🟢 In Stock';
        let badgeColor = '#7deca0';
        if (p.stockStatus === 'low-stock') {
          stockLabel = '🟡 Low Stock';
          badgeColor = '#DEC89A';
        } else if (p.stockStatus === 'out-of-stock') {
          stockLabel = '🔴 Out of Stock';
          badgeColor = '#ff6b6b';
        }
        
        badge.innerHTML = stockLabel;
        badge.style.cssText = `
          font-family: 'Montserrat', sans-serif;
          font-size: 10px;
          font-weight: 700;
          color: ${badgeColor};
          letter-spacing: 1px;
          text-transform: uppercase;
          margin-right: auto;
        `;
        
        const tag = footer.querySelector('.service-card-tag');
        if (tag) tag.style.display = 'none';
        footer.insertBefore(badge, footer.querySelector('.service-card-arrow'));
      }
    });
  } catch (err) {
    console.error('Error syncing home page catalog:', err);
  }

  // 5. Interactive SVG Map triggers
  const mapDetailsCard = document.getElementById('map-details-card');
  const kashmirPath = document.querySelector('.map-region-kashmir');
  const ladakhPath = document.querySelector('.map-region-ladakh');
  const srinagarMarker = document.getElementById('marker-srinagar');
  const lehMarker = document.getElementById('marker-leh');

  const activateKashmir = () => {
    if (!kashmirPath || !mapDetailsCard) return;
    kashmirPath.style.fill = 'rgba(200, 146, 42, 0.4)';
    srinagarMarker?.classList.add('pulse-active');
    mapDetailsCard.innerHTML = `
      <div class="map-details-icon" style="color: var(--gold);">🏔️</div>
      <div class="map-details-content">
        <h4 class="map-details-title" style="color: var(--gold-light);">Kashmir Valley Operations</h4>
        <p class="map-details-text">Daily regional dispatches from our active Nowgam hub. Direct distribution logistics covering Srinagar, Baramulla, Anantnag, Pulwama, and Budgam.</p>
      </div>
    `;
    mapDetailsCard.classList.add('highlight');
  };

  const deactivateKashmir = () => {
    if (!kashmirPath || !mapDetailsCard) return;
    kashmirPath.style.fill = '';
    srinagarMarker?.classList.remove('pulse-active');
    mapDetailsCard.classList.remove('highlight');
  };

  const activateLadakh = () => {
    if (!ladakhPath || !mapDetailsCard) return;
    ladakhPath.style.fill = 'rgba(200, 146, 42, 0.3)';
    lehMarker?.classList.add('pulse-active');
    mapDetailsCard.innerHTML = `
      <div class="map-details-icon" style="color: var(--gold-light);">🏔️</div>
      <div class="map-details-content">
        <h4 class="map-details-title" style="color: var(--gold-light);">Leh / Ladakh Operations</h4>
        <p class="map-details-text">Weekly high-altitude cold climate route via Kargil. Specialized supply chains and local winter storage facilities serving Leh City.</p>
      </div>
    `;
    mapDetailsCard.classList.add('highlight');
  };

  const deactivateLadakh = () => {
    if (!ladakhPath || !mapDetailsCard) return;
    ladakhPath.style.fill = '';
    lehMarker?.classList.remove('pulse-active');
    mapDetailsCard.classList.remove('highlight');
  };

  // Bind Kashmir interactions to both the region path and the Srinagar marker
  if (kashmirPath) {
    kashmirPath.addEventListener('mouseenter', activateKashmir);
    kashmirPath.addEventListener('mouseleave', deactivateKashmir);
  }
  if (srinagarMarker) {
    srinagarMarker.addEventListener('mouseenter', activateKashmir);
    srinagarMarker.addEventListener('mouseleave', deactivateKashmir);
  }

  // Bind Ladakh interactions to both the region path and the Leh marker
  if (ladakhPath) {
    ladakhPath.addEventListener('mouseenter', activateLadakh);
    ladakhPath.addEventListener('mouseleave', deactivateLadakh);
  }
  if (lehMarker) {
    lehMarker.addEventListener('mouseenter', activateLadakh);
    lehMarker.addEventListener('mouseleave', deactivateLadakh);
  }

  // 6. Testimonials Carousel Slider
  const slides = document.querySelectorAll('.testimonial-slide');
  const dots = document.querySelectorAll('.test-dot');
  let activeSlide = 0;
  let slideInterval;

  const showSlide = (idx) => {
    slides.forEach(s => s.classList.remove('active'));
    dots.forEach(d => d.classList.remove('active'));
    if (slides[idx]) slides[idx].classList.add('active');
    if (dots[idx]) dots[idx].classList.add('active');
    activeSlide = idx;
  };

  const startSlideShow = () => {
    slideInterval = setInterval(() => {
      let next = (activeSlide + 1) % slides.length;
      showSlide(next);
    }, 6000);
  };

  dots.forEach((dot, index) => {
    dot.addEventListener('click', () => {
      clearInterval(slideInterval);
      showSlide(index);
      startSlideShow();
    });
  });

  if (slides.length) {
    startSlideShow();
  }

  // 7. FAQ Accordions
  const faqItems = document.querySelectorAll('.faq-item');
  faqItems.forEach(item => {
    const trigger = item.querySelector('.faq-trigger');
    const content = item.querySelector('.faq-content');
    
    trigger?.addEventListener('click', () => {
      const isOpen = item.classList.contains('open');
      
      // Close all items first for a clean single-open accordion feel
      faqItems.forEach(i => {
        i.classList.remove('open');
        const cnt = i.querySelector('.faq-content');
        if (cnt) cnt.style.maxHeight = null;
      });

      if (!isOpen) {
        item.classList.add('open');
        if (content) {
          content.style.maxHeight = content.scrollHeight + 'px';
        }
      }
    });
  });

  // Re-initialize intersection observers for the dynamically added elements
  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.classList.add('animate-visible');
        observer.unobserve(entry.target);
      }
    });
  }, { threshold: 0.05, rootMargin: '0px 0px -40px 0px' });

  document.querySelectorAll('.testimonials-section .animate-on-scroll, .faq-section .animate-on-scroll').forEach(el => {
    observer.observe(el);
  });
}
