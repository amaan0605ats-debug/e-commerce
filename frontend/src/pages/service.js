import { getServiceBySlug, getRelatedServices, services } from '../data/services.js';
import { getCachedProducts } from '../firebase.js';

export function renderService(params) {
  const service = getServiceBySlug(params.slug);
  
  if (!service) {
    return renderServicesIndex();
  }

  const related = getRelatedServices(service.slug, 4);
  const imgPath = `/images/${service.slug}.webp`;
  const imgPath2 = `/images/${service.slug}-2.webp`;
  const imgPath3 = `/images/${service.slug}-3.webp`;

  return `
    <!-- SERVICE HERO -->
    <section class="service-hero" id="service-hero">
      <div class="service-hero-bg"></div>
      
      <!-- Decorative floating particles -->
      <div style="position:absolute; inset:0; overflow:hidden; pointer-events:none; z-index:0;">
        <div style="position:absolute; width:4px; height:4px; background:rgba(224,176,80,0.3); border-radius:50%; top:15%; left:10%; animation: floatParticle 8s ease-in-out infinite; box-shadow: 0 0 8px rgba(224,176,80,0.2);"></div>
        <div style="position:absolute; width:3px; height:3px; background:rgba(224,176,80,0.25); border-radius:50%; top:25%; right:15%; animation: floatParticle 10s ease-in-out infinite 1s; box-shadow: 0 0 6px rgba(224,176,80,0.15);"></div>
        <div style="position:absolute; width:5px; height:5px; background:rgba(224,176,80,0.2); border-radius:50%; bottom:20%; left:20%; animation: floatParticle 12s ease-in-out infinite 2s; box-shadow: 0 0 10px rgba(224,176,80,0.15);"></div>
        <div style="position:absolute; width:3px; height:3px; background:rgba(224,176,80,0.3); border-radius:50%; top:40%; right:8%; animation: floatParticle 9s ease-in-out infinite 3s; box-shadow: 0 0 6px rgba(224,176,80,0.2);"></div>
        <div style="position:absolute; width:4px; height:4px; background:rgba(224,176,80,0.15); border-radius:50%; bottom:35%; right:25%; animation: floatParticle 11s ease-in-out infinite 4s; box-shadow: 0 0 8px rgba(224,176,80,0.1);"></div>
        <div style="position:absolute; width:2px; height:2px; background:rgba(251,243,227,0.2); border-radius:50%; top:60%; left:5%; animation: floatParticle 7s ease-in-out infinite 2.5s;"></div>
        <div style="position:absolute; width:2px; height:2px; background:rgba(251,243,227,0.15); border-radius:50%; top:10%; left:45%; animation: floatParticle 13s ease-in-out infinite 5s;"></div>
        
        <!-- Decorative diamond ornaments -->
        <div style="position:absolute; top:12%; left:8%; width:24px; height:24px; border:1px solid rgba(200,146,42,0.08); transform:rotate(45deg); border-radius:2px;"></div>
        <div style="position:absolute; top:18%; left:10%; width:12px; height:12px; border:1px solid rgba(200,146,42,0.06); transform:rotate(45deg); border-radius:1px;"></div>
        <div style="position:absolute; bottom:15%; right:10%; width:20px; height:20px; border:1px solid rgba(200,146,42,0.08); transform:rotate(45deg); border-radius:2px;"></div>
        <div style="position:absolute; bottom:20%; right:12%; width:10px; height:10px; border:1px solid rgba(200,146,42,0.06); transform:rotate(45deg); border-radius:1px;"></div>
        
        <!-- Horizontal decorative lines -->
        <div style="position:absolute; top:50%; left:0; width:120px; height:1px; background: linear-gradient(90deg, transparent, rgba(200,146,42,0.1), transparent);"></div>
        <div style="position:absolute; top:50%; right:0; width:120px; height:1px; background: linear-gradient(90deg, transparent, rgba(200,146,42,0.1), transparent);"></div>
      </div>
      
      <style>
        @keyframes floatParticle {
          0%, 100% { transform: translateY(0) translateX(0); opacity: 0.3; }
          25% { transform: translateY(-15px) translateX(8px); opacity: 0.7; }
          50% { transform: translateY(-25px) translateX(-5px); opacity: 0.5; }
          75% { transform: translateY(-10px) translateX(12px); opacity: 0.8; }
        }
      </style>
      
      <div class="container">
        <div class="service-hero-content animate-on-scroll">
          <div class="breadcrumb">
            <a href="#/">Home</a>
            <span class="breadcrumb-sep">◆</span>
            <a href="#/services">Services</a>
            <span class="breadcrumb-sep">◆</span>
            <span>${service.name}</span>
          </div>
          <div class="service-hero-icon">${service.icon}</div>
          <span class="service-hero-tag">${service.tag}</span>
          <h1 class="service-hero-title">${service.name}</h1>
          <div class="section-rule"></div>
          <p class="service-hero-subtitle" style="margin-bottom: 24px;">${service.shortDesc}</p>
          <div>
            <a href="#/contact?service=${service.slug}" class="btn btn-primary btn-lg" id="service-hero-buy-btn">Buy / Inquire Now</a>
          </div>
        </div>
      </div>
    </section>

    <!-- SERVICE IMAGE BANNER -->
    <section class="service-image-section" id="service-image">
      <div class="container">
        <div class="service-image-grid animate-on-scroll">
          <div class="service-image-card service-image-large">
            <img src="${imgPath}" onerror="this.src='/images/general-commercial-supplies.webp'" alt="${service.name} Overview" class="service-img" loading="lazy">
          </div>
          <div class="service-image-card">
            <img src="${imgPath2}" onerror="this.src='/images/general-commercial-supplies-2.webp'" alt="${service.name} Detail" class="service-img" loading="lazy">
          </div>
          <div class="service-image-card">
            <img src="${imgPath3}" onerror="this.src='/images/general-commercial-supplies-3.webp'" alt="${service.name} Close-up" class="service-img" loading="lazy">
          </div>
        </div>
      </div>
    </section>

    <!-- SERVICE DESCRIPTION -->
    <section class="service-description" id="service-description">
      <div class="container">
        <div class="service-desc-grid">
          <div class="service-desc-main animate-on-scroll">
            <div class="section-label">Overview</div>
            <h2 class="section-title" style="font-size: 30px;">About This <em>Service</em></h2>
            <div class="section-rule"></div>
            ${service.longDesc.split('\n\n').map(p => `<p class="body-text" style="margin-bottom: 16px;">${p.trim()}</p>`).join('')}
          </div>
          <div class="service-desc-sidebar animate-on-scroll">
            <div class="service-features-box">
              <h3 class="service-features-title">Key Features</h3>
              <ul class="service-features-list">
                ${service.features.map(f => `<li>${f}</li>`).join('')}
              </ul>
            </div>
             <div class="service-cta-box">
              <h3 class="service-cta-title">Order / Inquire</h3>
              <p class="service-cta-text">Ready to purchase or need custom dimensions? Contact our supply team to place your order or request specifications.</p>
              <a href="#/contact?service=${service.slug}" class="btn btn-primary" id="service-cta-btn" style="width: 100%; text-align: center;">Buy / Inquire Now</a>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- RELATED SERVICES -->
    <section class="related-section" id="related-services">
      <div class="container">
        <div class="ornament-line animate-on-scroll"><span>Explore More Services</span></div>
        <div class="related-grid">
          ${related.map(s => `
            <a href="#/services/${s.slug}" class="related-card animate-on-scroll" id="related-${s.slug}">
              <div class="related-card-img">
                <img src="/images/${s.slug}.webp" onerror="this.src='/images/general-commercial-supplies.webp'" alt="${s.name}" loading="lazy">
              </div>
              <div class="related-card-body">
                <div class="related-card-icon">${s.icon}</div>
                <h4 class="related-card-name">${s.name}</h4>
                <p class="related-card-desc">${s.shortDesc.substring(0, 80)}...</p>
                <span class="related-card-link">Learn More →</span>
              </div>
            </a>
          `).join('')}
        </div>
      </div>
    </section>

    <!-- CTA -->
    <section class="cta-banner" id="service-page-cta">
      <div class="cta-banner-bg"></div>
      <div class="container" style="position: relative; z-index: 1;">
        <div class="cta-content animate-on-scroll">
          <h2 class="cta-title">Ready to Buy <em>${service.name}?</em></h2>
          <p class="cta-subtitle">Place your order or request a custom quotation today. Our Kashmiri logistics team is ready to deliver.</p>
          <a href="#/contact?service=${service.slug}" class="btn btn-primary btn-lg" id="service-final-cta">Buy / Place Order Inquiry</a>
        </div>
      </div>
    </section>
  `;
}

export function renderServicesIndex() {
  return `
    <!-- SERVICES INDEX HERO -->
    <section class="page-hero" id="services-hero">
      <div class="page-hero-bg"></div>
      <div class="container">
        <div class="page-hero-content animate-on-scroll">
          <div class="breadcrumb">
            <a href="#/">Home</a>
            <span class="breadcrumb-sep">◆</span>
            <span>All Services</span>
          </div>
          <div class="section-label" style="color: var(--gold);">What We Offer</div>
          <h1 class="page-hero-title">Our Complete <em>Service Portfolio</em></h1>
          <div class="section-rule"></div>
          <p class="page-hero-subtitle">Explore our full range of supply and distribution services across Kashmir and the Leh region.</p>
        </div>
      </div>
    </section>

    <!-- FILTER TABS -->
    <section class="services-filter-section" id="services-filter" style="padding: 48px 0 20px; background: var(--cream); text-align: center;">
      <div class="container">
        <div class="filter-tabs animate-on-scroll">
          <button class="filter-btn active" data-filter="all">All Offerings</button>
          <button class="filter-btn" data-filter="Core Supply">Core Supply</button>
          <button class="filter-btn" data-filter="Automated Solutions">Automated Solutions</button>
          <button class="filter-btn" data-filter="Specialized & Engineering">Specialized & Engineering</button>
        </div>
      </div>
    </section>

    <!-- ALL SERVICES GRID -->
    <section class="services-index" id="services-index" style="padding-top: 20px;">
      <div class="container">
        <div class="services-grid">
          ${services.map((service, i) => `
            <a href="#/services/${service.slug}" class="service-card animate-on-scroll" id="idx-${service.slug}" style="animation-delay: ${i * 0.04}s" data-category="${service.category}">
              <div class="service-card-img-wrap">
                <img src="/images/${service.slug}.webp" onerror="this.src='/images/general-commercial-supplies.webp'" alt="${service.name}" class="service-card-img" loading="lazy">
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
      </div>
    </section>
  `;
}

// ── DYNAMIC BACKEND DATABASE BINDINGS FOR PUBLIC PAGES ──

export async function initServicesIndex() {
  try {
    const products = await getCachedProducts();
    if (!products || !products.length) return;
    
    products.forEach(p => {
      const card = document.getElementById(`idx-${p.slug}`);
      if (!card) return;
      
      // Hide if catalogvisibility is set to false in SQLite/MySQL
      if (p.visible === 0) {
        card.style.display = 'none';
        card.setAttribute('data-db-hidden', 'true');
        return;
      }
      
      // Add dynamic B2B stock status badge to the card
      const footer = card.querySelector('.service-card-footer');
      if (footer) {
        const badge = document.createElement('span');
        badge.className = 'service-stock-badge';
        
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
    console.error('Error fetching product statuses for index:', err);
  }
}

export async function initServiceDetail(slug) {
  try {
    const products = await getCachedProducts();
    if (!products || !products.length) return;
    
    const dbProduct = products.find(p => p.slug === slug);
    if (!dbProduct) return;
    
    // Add real-time stock indicator in the hero section
    const heroContent = document.querySelector('.service-hero-content');
    if (heroContent) {
      const badge = document.createElement('div');
      badge.className = 'service-detail-stock-badge';
      
      let stockLabel = '🟢 In Stock - Available for immediate supply';
      let badgeColor = '#7deca0';
      if (dbProduct.stockStatus === 'low-stock') {
        stockLabel = '🟡 Low Stock - Supply queue priority active';
        badgeColor = '#DEC89A';
      } else if (dbProduct.stockStatus === 'out-of-stock') {
        stockLabel = '🔴 Out of Stock - Dispatch delays expected';
        badgeColor = '#ff6b6b';
        
        // Update Buy Button actions to show pre-order conditions
        const buyBtn = document.getElementById('service-hero-buy-btn');
        if (buyBtn) {
          buyBtn.textContent = 'Pre-Order / Inquire Now';
          buyBtn.style.background = 'transparent';
          buyBtn.style.border = '2px solid #ff6b6b';
          buyBtn.style.color = '#ff6b6b';
        }
        const ctaBtn = document.getElementById('service-cta-btn');
        if (ctaBtn) {
          ctaBtn.textContent = 'Pre-Order / Inquire Now';
          ctaBtn.style.background = 'transparent';
          ctaBtn.style.border = '2px solid #ff6b6b';
          ctaBtn.style.color = '#ff6b6b';
        }
        const finalCta = document.getElementById('service-final-cta');
        if (finalCta) {
          finalCta.textContent = 'Pre-Order / Place Inquiry';
          finalCta.style.background = 'transparent';
          finalCta.style.border = '2px solid #ff6b6b';
          finalCta.style.color = '#ff6b6b';
        }
      }
      
      badge.innerHTML = stockLabel;
      badge.style.cssText = `
        font-family: 'Montserrat', sans-serif;
        font-size: 11px;
        font-weight: 700;
        color: ${badgeColor};
        letter-spacing: 2px;
        text-transform: uppercase;
        margin-top: 16px;
        margin-bottom: 8px;
        display: block;
      `;
      
      const tag = heroContent.querySelector('.service-hero-tag');
      if (tag) {
        tag.parentNode.insertBefore(badge, tag.nextSibling);
      }
    }
  } catch (err) {
    console.error('Error fetching service detail stock:', err);
  }
}


