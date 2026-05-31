import './style.css';
import { Router } from './router.js';
import { createNavbar } from './components/navbar.js';
import { createFooter } from './components/footer.js';
import { createQuickInquiry } from './components/quick-inquiry.js';
import { renderHome, initHome } from './pages/home.js';
import { renderAbout } from './pages/about.js';
import { renderService, renderServicesIndex, initServicesIndex, initServiceDetail } from './pages/service.js';
import { renderContact, initContact } from './pages/contact.js';
import { renderAdminLogin, initAdminLogin } from './pages/admin-login.js';
import { renderAdmin, initAdmin, cleanupAdmin } from './pages/admin.js';
import { auth, onAuthStateChanged, db, collection, addDoc, serverTimestamp } from './firebase.js';
import { services, serviceCategories } from './data/services.js';

// ── GLOBAL THEME INITIALIZATION ──
const savedTheme = localStorage.getItem('theme') || 'dark';
document.body.setAttribute('data-theme', savedTheme);

// ── PRELOADER ──
const preloader = document.getElementById('preloader');
window.addEventListener('load', () => {
  setTimeout(() => {
    preloader?.classList.add('preloader-hidden');
    setTimeout(() => preloader?.remove(), 500);
  }, 800);
});

// Mount navbar, footer and floating callback widget
const app = document.getElementById('app');

const navbar = createNavbar();
app.prepend(navbar);

const footer = createFooter();
app.appendChild(footer);

const quickInquiry = createQuickInquiry();
app.appendChild(quickInquiry);

// ── FLOATING WHATSAPP SUPPORT WIDGET ──
const whatsappContainer = document.createElement('div');
whatsappContainer.className = 'whatsapp-floating-widget';
whatsappContainer.id = 'whatsapp-floating-widget';
whatsappContainer.innerHTML = `
  <button class="whatsapp-trigger" id="whatsapp-trigger" aria-label="Chat on WhatsApp">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.963L2 22l5.21-1.366a9.936 9.936 0 0 0 4.79 1.23h.004c5.505 0 9.988-4.478 9.99-9.984a9.96 9.96 0 0 0-9.982-9.88zM6.837 5.75c.148-.327.4-.354.577-.354.148-.007.327-.007.478-.007.148 0 .393.054.6.49.206.435.707 1.714.77 1.837.062.122.102.265.02.428-.082.163-.122.265-.245.408-.122.143-.258.32-.367.43-.11.115-.224.238-.095.456.129.218.572.946 1.226 1.524.843.748 1.558.98 1.782 1.096.225.115.354.095.483-.054.129-.15.558-.646.707-.864.15-.218.3-.184.5-.11.2.075 1.265.592 1.483.7.218.11.36.163.415.258.054.095.054.551-.163 1.17-.218.62-1.272 1.21-1.782 1.265-.51.054-.993-.082-3.32-.999-2.73-1.074-4.48-3.83-4.61-4-.13-.17-1.04-1.38-1.04-2.636 0-1.25.65-1.864.88-2.11z"/>
    </svg>
    <div class="whatsapp-glow-ring"></div>
  </button>
  
  <div class="whatsapp-popup" id="whatsapp-popup">
    <div class="whatsapp-popup-header">
      <div class="whatsapp-popup-header-icon">💬</div>
      <div>
        <h4 class="whatsapp-popup-title">Al Gani WhatsApp Support</h4>
        <p class="whatsapp-popup-subtitle">Instant B2B response line</p>
      </div>
    </div>
    <div class="whatsapp-popup-body">
      <p style="margin-bottom:12px; font-size:12px; opacity:0.85; color:#FBF3E3;">Select an option to launch WhatsApp chat directly with our team:</p>
      <div style="display:flex; flex-direction:column; gap:8px;">
        <a href="https://wa.me/919419014741?text=Hello%20Al%20Gani!%20I%20would%20like%20to%20request%20a%20B2B%20wholesale%20quotation." target="_blank" class="whatsapp-popup-link">
          <span>📋 Request Wholesale Quote</span>
        </a>
        <a href="https://wa.me/919419014741?text=Hello%20Al%20Gani!%20I%20have%20an%20inquiry%20regarding%20CafeVend%20Vending%20Machines." target="_blank" class="whatsapp-popup-link">
          <span>☕ Vending Machine Solutions</span>
        </a>
        <a href="https://wa.me/919419014741?text=Hello%20Al%20Gani!%20I%20would%20like%20to%20speak%20directly%20with%20Syed%20Mir%20Aftab." target="_blank" class="whatsapp-popup-link">
          <span>👤 Contact Syed Mir Aftab (MD)</span>
        </a>
      </div>
    </div>
  </div>
`;
document.body.appendChild(whatsappContainer);

// Trigger toggle logic
const waTrigger = whatsappContainer.querySelector('#whatsapp-trigger');
const waPopup = whatsappContainer.querySelector('#whatsapp-popup');
waTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  waPopup?.classList.toggle('active');
});
document.addEventListener('click', (e) => {
  if (!whatsappContainer.contains(e.target)) {
    waPopup?.classList.remove('active');
  }
});

// ── BACK TO TOP BUTTON ──
const backToTop = document.createElement('button');
backToTop.className = 'back-to-top';
backToTop.id = 'back-to-top';
backToTop.setAttribute('aria-label', 'Back to top');
backToTop.innerHTML = `
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
    <path d="M18 15l-6-6-6 6"/>
  </svg>
`;
document.body.appendChild(backToTop);

backToTop.addEventListener('click', () => {
  window.scrollTo({ top: 0, behavior: 'smooth' });
});

window.addEventListener('scroll', () => {
  if (window.scrollY > 400) {
    backToTop.classList.add('visible');
  } else {
    backToTop.classList.remove('visible');
  }
});

// ── COUNTER ANIMATION ──
function initCounters() {
  const counters = document.querySelectorAll('.counter');
  if (!counters.length) return;

  const counterObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        const el = entry.target;
        const target = parseInt(el.dataset.target);
        const suffix = el.dataset.suffix || '';
        const duration = 1500;
        const start = performance.now();

        function update(now) {
          const elapsed = now - start;
          const progress = Math.min(elapsed / duration, 1);
          // Ease out cubic
          const eased = 1 - Math.pow(1 - progress, 3);
          const current = Math.round(target * eased);
          el.textContent = current + suffix;

          if (progress < 1) {
            requestAnimationFrame(update);
          } else {
            el.textContent = target + suffix;
          }
        }

        requestAnimationFrame(update);
        counterObserver.unobserve(el);
      }
    });
  }, { threshold: 0.5 });

  counters.forEach(c => counterObserver.observe(c));
}

// ── ADMIN AUTH GUARD ──
function isAdminRoute(path) {
  return path.startsWith('/admin');
}

let currentUser = null;
onAuthStateChanged(auth, (user) => {
  currentUser = user;
  const hash = window.location.hash.slice(1) || '/';
  if (isAdminRoute(hash) && !user && hash !== '/admin/login') {
    window.location.hash = '#/admin/login';
  }
});

// Initialize router
const router = new Router([
  { path: '/', render: () => renderHome() },
  { path: '/about', render: () => renderAbout() },
  { path: '/services', render: () => renderServicesIndex() },
  { path: '/services/:slug', render: (params) => renderService(params) },
  { path: '/contact', render: () => renderContact() },
  { path: '/admin/login', render: () => renderAdminLogin(), isAdmin: true },
  { path: '/admin', render: () => {
    if (!currentUser) { window.location.hash = '#/admin/login'; return ''; }
    return renderAdmin();
  }, isAdmin: true },
]);

// Patch router to also init counters, admin, and pre-select services after each route
const originalHandleRoute = router.handleRoute.bind(router);
router.handleRoute = function() {
  // Cleanup previous admin subscriptions
  cleanupAdmin();

  originalHandleRoute();

  // Toggle navbar/footer/widget visibility for admin routes
  const hash = window.location.hash.slice(1) || '/';
  const isAdmin = isAdminRoute(hash);
  if (navbar) navbar.style.display = isAdmin ? 'none' : '';
  if (footer) footer.style.display = isAdmin ? 'none' : '';
  if (quickInquiry) quickInquiry.style.display = isAdmin ? 'none' : '';
  if (whatsappContainer) whatsappContainer.style.display = isAdmin ? 'none' : '';

  // Init page-specific features after render
  setTimeout(() => {
    initCounters();

    // Init home page catalog sync
    if (hash === '/') {
      initHome();
    }

    // Init admin login page
    if (hash === '/admin/login') {
      initAdminLogin();
    }

    // Hardened auth guard: redirect if trying to access admin without auth
    if (hash === '/admin' && !currentUser) {
      window.location.hash = '#/admin/login';
      return;
    }

    // Init admin dashboard
    if (hash === '/admin' && currentUser) {
      initAdmin();
    }
    
    // Check for service pre-selection in contact URL query parameters
    if (hash.includes('/contact')) {
      initContact();
      const queryIdx = hash.indexOf('?');
      if (queryIdx !== -1) {
        const queryParams = new URLSearchParams(hash.slice(queryIdx + 1));
        const serviceSlug = queryParams.get('service');
        if (serviceSlug) {
          const serviceSelect = document.getElementById('form-service');
          if (serviceSelect) {
            serviceSelect.value = serviceSlug;
          }
        }
      }
    }

    // Dynamic database bindings for public services pages
    if (hash === '/services') {
      initServicesIndex();
    }
    if (hash.startsWith('/services/')) {
      const parts = hash.split('/');
      const slug = parts[parts.length - 1].split('?')[0];
      initServiceDetail(slug);
    }
  }, 300);
};

// Fetch and initialize dynamic services from MySQL database
async function loadDynamicServices() {
  try {
    const res = await fetch('/api/custom-services');
    if (res.ok) {
      const customServices = await res.json();
      customServices.forEach(cs => {
        if (!services.some(s => s.slug === cs.slug)) {
          services.push({
            id: services.length + 1,
            slug: cs.slug,
            name: cs.name,
            icon: cs.icon,
            category: cs.category,
            tag: cs.tag,
            shortDesc: cs.shortDesc,
            longDesc: cs.longDesc,
            features: cs.features,
            gallery: cs.gallery
          });
          
          const cat = serviceCategories.find(c => c.name === cs.category);
          if (cat && !cat.services.includes(cs.slug)) {
            cat.services.push(cs.slug);
          }
        }
      });
    }
  } catch (err) {
    console.error('Failed to load dynamic services:', err);
  }
}

// Fetch dynamic offerings and trigger initial routing
async function initApp() {
  await loadDynamicServices();
  router.handleRoute();
}

// Trigger initial route startup
initApp();

// ── GLOBAL LIGHTBOX SYSTEM ──
document.body.addEventListener('click', (e) => {
  const card = e.target.closest('.service-image-card');
  if (!card) return;
  
  const img = card.querySelector('.service-img');
  if (!img) return;

  // Create lightbox modal DOM element
  const lightbox = document.createElement('div');
  lightbox.className = 'lightbox-modal';
  lightbox.innerHTML = `
    <div class="lightbox-overlay"></div>
    <div class="lightbox-content">
      <img src="${img.src}" alt="${img.alt}" class="lightbox-img">
      <button class="lightbox-close" aria-label="Close image">×</button>
    </div>
  `;
  document.body.appendChild(lightbox);

  // Close animation and cleanup
  const closeLightbox = () => {
    lightbox.classList.add('lightbox-closing');
    setTimeout(() => lightbox.remove(), 350);
  };
  
  lightbox.querySelector('.lightbox-close').addEventListener('click', closeLightbox);
  lightbox.querySelector('.lightbox-overlay').addEventListener('click', closeLightbox);
  
  // Allow keyboard Escape to close
  const handleEsc = (evt) => {
    if (evt.key === 'Escape') {
      closeLightbox();
      document.removeEventListener('keydown', handleEsc);
    }
  };
  document.addEventListener('keydown', handleEsc);
});

// ── SERVICES CATEGORY FILTER SYSTEM ──
document.body.addEventListener('click', (e) => {
  const btn = e.target.closest('.filter-btn');
  if (!btn) return;
  
  const filterTabs = btn.closest('.filter-tabs');
  if (!filterTabs) return;

  // Toggle active button styling
  filterTabs.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');

  const filterValue = btn.dataset.filter;
  const cards = document.querySelectorAll('.services-index .service-card');
  
  cards.forEach(card => {
    const category = card.dataset.category;
    const isDbHidden = card.getAttribute('data-db-hidden') === 'true';

    if (isDbHidden) {
      card.style.display = 'none';
      return;
    }

    if (filterValue === 'all' || category === filterValue) {
      card.style.display = 'flex';
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
      }, 50);
    } else {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px) scale(0.95)';
      setTimeout(() => {
        card.style.display = 'none';
      }, 300);
    }
  });
});

// ── FAQ ACCORDION TOGGLE ──
document.body.addEventListener('click', (e) => {
  const btn = e.target.closest('.faq-question, .faq-trigger');
  if (!btn) return;

  const currentItem = btn.closest('.faq-item');
  if (!currentItem) return;

  const isTrigger = btn.classList.contains('faq-trigger');
  const answerClass = isTrigger ? '.faq-content' : '.faq-answer';
  const answer = currentItem.querySelector(answerClass);
  const icon = currentItem.querySelector(isTrigger ? '.faq-chevron' : '.faq-icon');
  
  const isOpen = currentItem.classList.contains('open');

  // Close all other items for a clean accordion effect
  document.querySelectorAll('.faq-item').forEach(item => {
    item.classList.remove('open');
    const ans = item.querySelector('.faq-content, .faq-answer');
    if (ans) ans.style.maxHeight = null;
    
    const icn = item.querySelector('.faq-icon');
    if (icn) icn.textContent = '▼';
  });

  if (!isOpen) {
    currentItem.classList.add('open');
    if (answer) {
      answer.style.maxHeight = answer.scrollHeight + 'px';
    }
    if (icon && !isTrigger) {
      icon.textContent = '▲';
    }
  }
});

// ── EMAIL CLICK REDIRECT INTERCEPTOR ──
document.body.addEventListener('click', (e) => {
  const mailLink = e.target.closest('a[href^="mailto:"]');
  if (!mailLink) return;

  const emailHref = mailLink.getAttribute('href');
  if (emailHref && emailHref.includes('Alganigeneralsupliers@gmail.com')) {
    e.preventDefault();
    const confirmMail = confirm("Would you like to open Gmail in a new tab to send an email directly to Al Gani?");
    if (confirmMail) {
      const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=Alganigeneralsupliers@gmail.com';
      window.open(gmailUrl, '_blank');
    }
  }
});

// ── GLOBAL THEME TOGGLE CLICK HANDLER ──
document.body.addEventListener('click', (e) => {
  const btn = e.target.closest('.theme-toggle-btn');
  if (!btn) return;
  
  const currentTheme = document.body.getAttribute('data-theme') || 'dark';
  const newTheme = currentTheme === 'dark' ? 'light' : 'dark';
  
  document.body.setAttribute('data-theme', newTheme);
  localStorage.setItem('theme', newTheme);
});

// ── SHOW MORE / SHOW LESS SERVICES ON HOME PAGE ──
document.body.addEventListener('click', (e) => {
  const btn = e.target.closest('#btn-show-more-services');
  if (!btn) return;

  const isExpanded = btn.getAttribute('data-expanded') === 'true';
  const extraCards = document.querySelectorAll('.services-grid .service-card-extra');

  if (isExpanded) {
    // Collapse extra cards
    extraCards.forEach(card => {
      card.style.opacity = '0';
      card.style.transform = 'translateY(20px) scale(0.95)';
      card.classList.add('service-card-hidden');
      setTimeout(() => {
        card.style.display = 'none';
      }, 250);
    });

    btn.textContent = 'Show More Offerings';
    btn.setAttribute('data-expanded', 'false');

    // Smooth scroll back up to the top of the services section
    const servicesSection = document.getElementById('services-section');
    if (servicesSection) {
      servicesSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  } else {
    // Expand extra cards
    extraCards.forEach((card, i) => {
      card.style.display = 'flex';
      setTimeout(() => {
        card.classList.remove('service-card-hidden');
        card.style.opacity = '1';
        card.style.transform = 'translateY(0) scale(1)';
      }, i * 40 + 10);
    });

    btn.textContent = 'Show Less Offerings';
    btn.setAttribute('data-expanded', 'true');
  }
});
