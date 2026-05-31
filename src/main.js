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
  <style>
    .whatsapp-chat-log {
      max-height: 220px;
      overflow-y: auto;
      padding: 10px 0;
      display: flex;
      flex-direction: column;
      gap: 12px;
      margin-bottom: 12px;
      scroll-behavior: smooth;
    }
    .whatsapp-chat-log::-webkit-scrollbar {
      width: 4px;
    }
    .whatsapp-chat-log::-webkit-scrollbar-thumb {
      background: rgba(200, 146, 42, 0.2);
      border-radius: 2px;
    }
    .wa-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 11.5px;
      line-height: 1.5;
      font-family: 'Montserrat', sans-serif;
    }
    .wa-msg-bot {
      background: rgba(251, 243, 227, 0.05);
      border: 1px solid rgba(224, 176, 80, 0.15);
      color: #FBF3E3;
      align-self: flex-start;
      border-top-left-radius: 2px;
    }
    .wa-msg-user {
      background: #075E54;
      color: #FFFFFF;
      align-self: flex-end;
      border-top-right-radius: 2px;
      box-shadow: 0 2px 5px rgba(0,0,0,0.2);
    }
    .wa-typing {
      align-self: flex-start;
      background: rgba(251, 243, 227, 0.03);
      border: 1px solid rgba(224, 176, 80, 0.1);
      color: rgba(251, 243, 227, 0.6);
      padding: 8px 12px;
      font-style: italic;
      font-size: 10.5px;
      border-radius: 10px;
      display: none;
      margin-bottom: 8px;
    }
    .wa-quick-replies {
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .wa-reply-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 10px 14px;
      background: rgba(251, 243, 227, 0.04);
      border: 1px solid rgba(224, 176, 80, 0.2);
      border-radius: 8px;
      color: #FBF3E3;
      font-size: 11.5px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: all 0.25s ease;
    }
    .wa-reply-btn:hover {
      background: rgba(37, 211, 102, 0.1);
      border-color: #25D366;
      color: #25D366;
      transform: translateX(4px);
    }
    .wa-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 12px;
      background: #25D366;
      color: #FFFFFF !important;
      border-radius: 8px;
      font-size: 12px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
      transition: all 0.3s ease;
      margin-top: 8px;
    }
    .wa-action-btn:hover {
      background: #20ba59;
      transform: translateY(-2px);
      box-shadow: 0 6px 20px rgba(37, 211, 102, 0.5);
    }
    .wa-restart-btn {
      background: transparent;
      border: 1px dashed rgba(224, 176, 80, 0.3);
      color: #E0B050;
      padding: 8px;
      text-align: center;
      font-size: 10px;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 6px;
      transition: all 0.25s ease;
      width: 100%;
    }
    .wa-restart-btn:hover {
      background: rgba(224, 176, 80, 0.05);
      border-color: var(--gold);
      color: var(--gold-light);
    }
  </style>

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
        <h4 class="whatsapp-popup-title">Al Gani B2B Assistant</h4>
        <p class="whatsapp-popup-subtitle">Instant B2B Chatbot</p>
      </div>
    </div>
    <div class="whatsapp-popup-body">
      <div class="whatsapp-chat-log" id="wa-chat-log">
        <div class="wa-msg wa-msg-bot">
          Hello! Welcome to Al Gani Suppliers. 🌾 How can we support your B2B supply chain or equipment needs today?
        </div>
      </div>
      <div class="wa-typing" id="wa-typing">Al Gani is typing...</div>
      <div class="wa-quick-replies" id="wa-quick-replies">
        <button class="wa-reply-btn" data-key="quote">📋 Request Wholesale Quote</button>
        <button class="wa-reply-btn" data-key="vending">☕ Vending Machine Solutions</button>
        <button class="wa-reply-btn" data-key="partner">🤝 Sourcing & Partnership</button>
        <button class="wa-reply-btn" data-key="md">👤 Speak with Syed Mir Aftab (MD)</button>
      </div>
    </div>
  </div>
`;
document.body.appendChild(whatsappContainer);

// Chatbot logic
const chatLog = whatsappContainer.querySelector('#wa-chat-log');
const typingIndicator = whatsappContainer.querySelector('#wa-typing');
const quickRepliesContainer = whatsappContainer.querySelector('#wa-quick-replies');

const botResponses = {
  quote: {
    message: "Absolutely! We distribute wholesale supplies across J&K. Click the button below to launch a chat directly with our sales team and receive a catalog.",
    text: "Hello Al Gani! I would like to request a B2B wholesale quotation."
  },
  vending: {
    message: "Excellent choice! Our CafeVend series smart vending machines are perfect for B2B establishments. Click below to coordinate with our servicing team.",
    text: "Hello Al Gani! I have an inquiry regarding CafeVend Vending Machines."
  },
  partner: {
    message: "Fantastic! We coordinate regional logistics and cold storage setups. Click below to propose a distribution contract or partner sourcing.",
    text: "Hello Al Gani! I want to discuss a wholesale supply or distribution partnership."
  },
  md: {
    message: "Understood. Connect directly with our Managing Director, Syed Mir Aftab, to discuss custom contracts or import tenders.",
    text: "Hello Al Gani! I would like to speak directly with Syed Mir Aftab."
  }
};

quickRepliesContainer?.addEventListener('click', (e) => {
  const btn = e.target.closest('.wa-reply-btn');
  if (!btn) return;
  
  const key = btn.dataset.key;
  const reply = botResponses[key];
  if (!reply) return;
  
  // Append User message
  const userBubble = document.createElement('div');
  userBubble.className = 'wa-msg wa-msg-user';
  userBubble.textContent = btn.textContent;
  chatLog.appendChild(userBubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  
  // Hide replies
  quickRepliesContainer.style.display = 'none';
  
  // Show typing indicator
  typingIndicator.style.display = 'block';
  chatLog.scrollTop = chatLog.scrollHeight;
  
  setTimeout(() => {
    typingIndicator.style.display = 'none';
    
    // Append Bot response
    const botBubble = document.createElement('div');
    botBubble.className = 'wa-msg wa-msg-bot';
    botBubble.textContent = reply.message;
    chatLog.appendChild(botBubble);
    
    // Add WhatsApp Direct CTA & Restart CTA
    const actionsContainer = document.createElement('div');
    actionsContainer.className = 'wa-chat-actions';
    actionsContainer.style.display = 'flex';
    actionsContainer.style.flexDirection = 'column';
    actionsContainer.style.gap = '6px';
    actionsContainer.style.width = '100%';
    
    const waLink = document.createElement('a');
    waLink.className = 'wa-action-btn';
    waLink.href = `https://wa.me/919419014741?text=${encodeURIComponent(reply.text)}`;
    waLink.target = '_blank';
    waLink.innerHTML = `
      <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.963L2 22l5.21-1.366a9.936 9.936 0 0 0 4.79 1.23h.004c5.505 0 9.988-4.478 9.99-9.984a9.96 9.96 0 0 0-9.982-9.88zM6.837 5.75c.148-.327.4-.354.577-.354.148-.007.327-.007.478-.007.148 0 .393.054.6.49.206.435.707 1.714.77 1.837.062.122.102.265.02.428-.082.163-.122.265-.245.408-.122.143-.258.32-.367.43-.11.115-.224.238-.095.456.129.218.572.946 1.226 1.524.843.748 1.558.98 1.782 1.096.225.115.354.095.483-.054.129-.15.558-.646.707-.864.15-.218.3-.184.5-.11.2.075 1.265.592 1.483.7.218.11.36.163.415.258.054.095.054.551-.163 1.17-.218.62-1.272 1.21-1.782 1.265-.51.054-.993-.082-3.32-.999-2.73-1.074-4.48-3.83-4.61-4-.13-.17-1.04-1.38-1.04-2.636 0-1.25.65-1.864.88-2.11z"/>
      </svg>
      <span>Launch Live Chat</span>
    `;
    
    const restartBtn = document.createElement('button');
    restartBtn.className = 'wa-restart-btn';
    restartBtn.textContent = '🔄 Ask Another Question / Start Over';
    
    restartBtn.addEventListener('click', () => {
      // Clear log to original message
      chatLog.innerHTML = `
        <div class="wa-msg wa-msg-bot">
          Hello! Welcome to Al Gani Suppliers. 🌾 How can we support your B2B supply chain or equipment needs today?
        </div>
      `;
      // Restore quick replies
      quickRepliesContainer.style.display = 'flex';
    });
    
    actionsContainer.appendChild(waLink);
    actionsContainer.appendChild(restartBtn);
    chatLog.appendChild(actionsContainer);
    
    chatLog.scrollTop = chatLog.scrollHeight;
  }, 800);
});

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
