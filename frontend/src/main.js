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
import { auth, onAuthStateChanged } from './firebase.js';
import { services, serviceCategories } from './data/services.js';

function escapeHtml(str) {
  if (str === null || str === undefined) return '';
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
}

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
    /* Premium Glassmorphic AI Chatbot Styles */
    .whatsapp-floating-widget {
      position: fixed;
      bottom: 30px;
      right: 30px;
      z-index: 1000;
      font-family: 'Montserrat', sans-serif;
    }
    .whatsapp-trigger {
      width: 60px;
      height: 60px;
      border-radius: 50%;
      background: #25D366;
      border: none;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      color: white;
      box-shadow: 0 4px 20px rgba(37, 211, 102, 0.4);
      transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      position: relative;
      z-index: 2;
    }
    .whatsapp-trigger:hover {
      box-shadow: 0 6px 25px rgba(37, 211, 102, 0.6);
    }
    .whatsapp-glow-ring {
      position: absolute;
      width: 100%;
      height: 100%;
      border-radius: 50%;
      border: 2px solid #25D366;
      animation: wa-ripple 1.6s infinite;
      opacity: 0;
      z-index: 1;
      pointer-events: none;
    }
    @keyframes wa-ripple {
      0% { transform: scale(1); opacity: 0.8; }
      100% { transform: scale(1.6); opacity: 0; }
    }
    .whatsapp-popup {
      position: absolute;
      bottom: 80px;
      right: 0;
      width: 360px;
      border-radius: 16px;
      overflow: hidden;
      opacity: 0;
      visibility: hidden;
      transform: translateY(20px) scale(0.95);
      transition: all 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.2);
      z-index: 1;
      border: 1px solid rgba(224, 176, 80, 0.25);
      background: rgba(26, 17, 12, 0.92);
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      box-shadow: 0 15px 40px rgba(0, 0, 0, 0.6);
    }
    .whatsapp-popup.active {
      opacity: 1;
      visibility: visible;
      transform: translateY(0) scale(1);
    }
    .whatsapp-popup-header {
      background: linear-gradient(135deg, #2b1810, #140b07);
      border-bottom: 1px solid rgba(224, 176, 80, 0.15);
      padding: 15px 20px;
      display: flex;
      align-items: center;
      gap: 12px;
    }
    .whatsapp-popup-header-icon {
      width: 42px;
      height: 42px;
      border-radius: 50%;
      background: linear-gradient(135deg, #E0B050, #9A7B32);
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 20px;
      box-shadow: 0 2px 10px rgba(224, 176, 80, 0.3);
      position: relative;
    }
    .wa-status-dot {
      position: absolute;
      bottom: 0;
      right: 0;
      width: 10px;
      height: 10px;
      border-radius: 50%;
      background: #25D366;
      border: 2px solid #140b07;
      animation: status-pulse 1.8s infinite;
    }
    @keyframes status-pulse {
      0% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0.7); }
      70% { box-shadow: 0 0 0 6px rgba(37, 211, 102, 0); }
      100% { box-shadow: 0 0 0 0 rgba(37, 211, 102, 0); }
    }
    .whatsapp-popup-title {
      margin: 0;
      font-size: 13.5px;
      font-weight: 600;
      color: #E0B050;
      font-family: 'Montserrat', sans-serif;
      letter-spacing: 0.5px;
    }
    .whatsapp-popup-subtitle {
      margin: 2px 0 0 0;
      font-size: 10px;
      color: rgba(251, 243, 227, 0.6);
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .whatsapp-popup-body {
      padding: 15px;
      display: flex;
      flex-direction: column;
    }
    .whatsapp-chat-log {
      max-height: 250px;
      overflow-y: auto;
      padding-right: 5px;
      display: flex;
      flex-direction: column;
      gap: 14px;
      margin-bottom: 12px;
      scroll-behavior: smooth;
    }
    .whatsapp-chat-log::-webkit-scrollbar {
      width: 4px;
    }
    .whatsapp-chat-log::-webkit-scrollbar-thumb {
      background: rgba(224, 176, 80, 0.25);
      border-radius: 2px;
    }
    .wa-msg {
      max-width: 85%;
      padding: 10px 14px;
      border-radius: 12px;
      font-size: 11px;
      line-height: 1.5;
      font-family: 'Montserrat', sans-serif;
      position: relative;
      animation: fadeInSlideUp 0.35s cubic-bezier(0.16, 1, 0.3, 1) forwards;
      word-wrap: break-word;
    }
    @keyframes fadeInSlideUp {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    .wa-msg-bot {
      background: rgba(251, 243, 227, 0.04);
      border: 1px solid rgba(224, 176, 80, 0.12);
      color: #FBF3E3;
      align-self: flex-start;
      border-top-left-radius: 2px;
    }
    .wa-msg-user {
      background: linear-gradient(135deg, #075E54, #128C7E);
      color: #FFFFFF;
      align-self: flex-end;
      border-top-right-radius: 2px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
    .wa-msg-avatar {
      font-size: 8.5px;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      color: #E0B050;
      margin-bottom: 4px;
      font-weight: 600;
      display: flex;
      align-items: center;
      gap: 4px;
    }
    .wa-msg-time {
      font-size: 8px;
      color: rgba(251, 243, 227, 0.35);
      text-align: right;
      margin-top: 5px;
    }
    .wa-msg-user .wa-msg-time {
      color: rgba(255, 255, 255, 0.6);
    }
    .wa-typing {
      align-self: flex-start;
      background: rgba(251, 243, 227, 0.02);
      border: 1px solid rgba(224, 176, 80, 0.08);
      color: rgba(251, 243, 227, 0.5);
      padding: 8px 14px;
      font-size: 10px;
      border-radius: 10px;
      display: none;
      margin-bottom: 8px;
      align-items: center;
      gap: 8px;
      border-top-left-radius: 2px;
      font-family: 'Montserrat', sans-serif;
    }
    .wa-typing-dots {
      display: flex;
      gap: 3px;
      align-items: center;
    }
    .wa-typing-dot {
      width: 4px;
      height: 4px;
      background-color: #E0B050;
      border-radius: 50%;
      animation: bounceDots 1.4s infinite ease-in-out both;
    }
    .wa-typing-dot:nth-child(1) { animation-delay: -0.32s; }
    .wa-typing-dot:nth-child(2) { animation-delay: -0.16s; }
    @keyframes bounceDots {
      0%, 80%, 100% { transform: scale(0); }
      40% { transform: scale(1); }
    }
    .wa-quick-replies {
      display: flex;
      flex-direction: column;
      gap: 6px;
      margin-bottom: 10px;
      animation: fadeInSlideUp 0.4s ease forwards;
    }
    .wa-reply-btn {
      display: flex;
      align-items: center;
      gap: 8px;
      padding: 8px 12px;
      background: rgba(251, 243, 227, 0.03);
      border: 1px solid rgba(224, 176, 80, 0.15);
      border-radius: 8px;
      color: #FBF3E3;
      font-size: 10.5px;
      font-weight: 500;
      text-align: left;
      cursor: pointer;
      transition: all 0.2s ease;
      font-family: 'Montserrat', sans-serif;
    }
    .wa-reply-btn:hover {
      background: rgba(224, 176, 80, 0.1);
      border-color: #E0B050;
      color: #FFFFFF;
    }
    .wa-chat-actions {
      display: flex;
      flex-direction: column;
      gap: 6px;
      width: 100%;
      margin-top: 4px;
      animation: fadeInSlideUp 0.3s ease forwards;
    }
    .wa-action-btn {
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      padding: 10px;
      background: #25D366;
      color: #FFFFFF !important;
      border-radius: 8px;
      font-size: 11px;
      font-weight: 600;
      text-align: center;
      text-decoration: none;
      box-shadow: 0 4px 12px rgba(37, 211, 102, 0.25);
      transition: all 0.3s ease;
      margin-top: 4px;
      font-family: 'Montserrat', sans-serif;
    }
    .wa-action-btn:hover {
      background: #20ba59;
      box-shadow: 0 6px 16px rgba(37, 211, 102, 0.4);
    }
    .wa-restart-btn {
      background: transparent;
      border: 1px dashed rgba(224, 176, 80, 0.25);
      color: rgba(251, 243, 227, 0.6);
      padding: 7px;
      text-align: center;
      font-size: 9px;
      border-radius: 6px;
      cursor: pointer;
      margin-top: 2px;
      transition: all 0.2s ease;
      width: 100%;
      font-family: 'Montserrat', sans-serif;
    }
    .wa-restart-btn:hover {
      background: rgba(224, 176, 80, 0.05);
      border-color: #E0B050;
      color: #E0B050;
    }
    .wa-input-container {
      display: flex;
      gap: 8px;
      border-top: 1px solid rgba(224, 176, 80, 0.1);
      padding-top: 10px;
      align-items: center;
    }
    .wa-ai-input {
      flex: 1;
      padding: 8px 14px;
      background: rgba(255, 255, 255, 0.03);
      border: 1px solid rgba(224, 176, 80, 0.2);
      border-radius: 20px;
      color: #FBF3E3;
      font-size: 11px;
      outline: none;
      font-family: 'Montserrat', sans-serif;
      transition: all 0.25s ease;
    }
    .wa-ai-input:focus {
      border-color: #E0B050;
      background: rgba(255, 255, 255, 0.05);
      box-shadow: 0 0 8px rgba(224, 176, 80, 0.15);
    }
    .wa-ai-send {
      width: 32px;
      height: 32px;
      border-radius: 50%;
      background: #E0B050;
      color: #140b07;
      display: flex;
      align-items: center;
      justify-content: center;
      border: none;
      cursor: pointer;
      transition: all 0.25s ease;
      flex-shrink: 0;
    }
    .wa-ai-send:hover {
      background: #FBF3E3;
      transform: scale(1.05);
    }
    .wa-ai-send svg {
      width: 13px;
      height: 13px;
      fill: none;
      stroke: currentColor;
      stroke-width: 2.5;
    }
    .wa-input-hint {
      font-size: 8px;
      color: rgba(251, 243, 227, 0.35);
      text-align: center;
      margin-top: 5px;
      font-family: 'Montserrat', sans-serif;
    }
    
    /* Mobile Responsive Optimizations */
    @media (max-width: 480px) {
      .whatsapp-floating-widget {
        bottom: 20px;
        right: 20px;
      }
      .whatsapp-trigger {
        width: 48px;
        height: 48px;
        box-shadow: 0 4px 15px rgba(37, 211, 102, 0.3);
      }
      .whatsapp-trigger:hover {
        box-shadow: 0 6px 18px rgba(37, 211, 102, 0.4);
      }
      .whatsapp-trigger svg {
        width: 22px;
        height: 22px;
      }
      .whatsapp-popup {
        bottom: 60px;
        right: 0;
        width: calc(100vw - 40px);
        max-width: 340px;
        border-radius: 12px;
      }
      .whatsapp-popup-header {
        padding: 12px 16px;
      }
      .whatsapp-popup-body {
        padding: 12px;
      }
      .whatsapp-chat-log {
        max-height: 180px;
        gap: 10px;
      }
      .wa-msg {
        padding: 8px 12px;
        font-size: 10px;
      }
      .wa-ai-input {
        padding: 6px 12px;
        font-size: 10px;
      }
      .wa-ai-send {
        width: 28px;
        height: 28px;
      }
      .wa-quick-replies {
        gap: 4px;
        margin-bottom: 6px;
      }
      .wa-reply-btn {
        padding: 6px 10px;
        font-size: 9.5px;
      }
      .wa-action-btn {
        padding: 8px;
        font-size: 10px;
      }
    }
  </style>

  <button class="whatsapp-trigger" id="whatsapp-trigger" aria-label="Chat with Al Gani AI">
    <svg viewBox="0 0 24 24" width="28" height="28" fill="currentColor">
      <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.963L2 22l5.21-1.366a9.936 9.936 0 0 0 4.79 1.23h.004c5.505 0 9.988-4.478 9.99-9.984a9.96 9.96 0 0 0-9.982-9.88zM6.837 5.75c.148-.327.4-.354.577-.354.148-.007.327-.007.478-.007.148 0 .393.054.6.49.206.435.707 1.714.77 1.837.062.122.102.265.02.428-.082.163-.122.265-.245.408-.122.143-.258.32-.367.43-.11.115-.224.238-.095.456.129.218.572.946 1.226 1.524.843.748 1.558.98 1.782 1.096.225.115.354.095.483-.054.129-.15.558-.646.707-.864.15-.218.3-.184.5-.11.2.075 1.265.592 1.483.7.218.11.36.163.415.258.054.095.054.551-.163 1.17-.218.62-1.272 1.21-1.782 1.265-.51.054-.993-.082-3.32-.999-2.73-1.074-4.48-3.83-4.61-4-.13-.17-1.04-1.38-1.04-2.636 0-1.25.65-1.864.88-2.11z"/>
    </svg>
    <div class="whatsapp-glow-ring"></div>
  </button>
  
  <div class="whatsapp-popup" id="whatsapp-popup">
    <div class="whatsapp-popup-header">
      <div class="whatsapp-popup-header-icon">
        💬
        <span class="wa-status-dot"></span>
      </div>
      <div>
        <h4 class="whatsapp-popup-title">Al Gani AI Sourcing Agent</h4>
        <p class="whatsapp-popup-subtitle">🤖 Online • Model v2.5</p>
      </div>
    </div>
    <div class="whatsapp-popup-body">
      <div class="whatsapp-chat-log" id="wa-chat-log">
        <div class="wa-msg wa-msg-bot">
          <div class="wa-msg-avatar">🤖 Al Gani AI Agent</div>
          <div class="wa-msg-text">Hello! Welcome to Al Gani Suppliers. 🌾 I am your AI Sourcing Assistant. To help me give you precise quotes and logistics routes, what is your name or company name?</div>
          <div class="wa-msg-time" id="initial-msg-time">Just now</div>
        </div>
      </div>
      
      <div class="wa-typing" id="wa-typing">
        <span>AI Sourcing Agent is thinking</span>
        <div class="wa-typing-dots">
          <span class="wa-typing-dot"></span>
          <span class="wa-typing-dot"></span>
          <span class="wa-typing-dot"></span>
        </div>
      </div>
      
      <div class="wa-quick-replies" id="wa-quick-replies">
        <button class="wa-reply-btn" data-key="quote">📋 Wholesale Quote Info</button>
        <button class="wa-reply-btn" data-key="vending">☕ Vending Machine Solutions</button>
        <button class="wa-reply-btn" data-key="md">👤 Direct VIP Chat with MD</button>
      </div>

      <div class="wa-input-container">
        <input type="text" id="wa-ai-input" class="wa-ai-input" placeholder="Query AI Sourcing Assistant..." required autocomplete="off">
        <button id="wa-ai-send" class="wa-ai-send" aria-label="Send message">
          <svg viewBox="0 0 24 24">
            <line x1="22" y1="2" x2="11" y2="13"/>
            <polygon points="22 2 15 22 11 13 2 9 22 2"/>
          </svg>
        </button>
      </div>
      <div class="wa-input-hint">⚡ Press Enter to ask AI Sourcing Assistant</div>
    </div>
  </div>
`;
document.body.appendChild(whatsappContainer);

// AI Chatbot logic
const chatLog = whatsappContainer.querySelector('#wa-chat-log');
const typingIndicator = whatsappContainer.querySelector('#wa-typing');
const quickRepliesContainer = whatsappContainer.querySelector('#wa-quick-replies');
const aiInput = whatsappContainer.querySelector('#wa-ai-input');
const aiSendBtn = whatsappContainer.querySelector('#wa-ai-send');

const initialTimeEl = whatsappContainer.querySelector('#initial-msg-time');
const getFormattedTime = () => {
  const now = new Date();
  let hours = now.getHours();
  let minutes = now.getMinutes();
  const ampm = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12;
  hours = hours ? hours : 12;
  minutes = minutes < 10 ? '0' + minutes : minutes;
  return `${hours}:${minutes} ${ampm}`;
};
if (initialTimeEl) initialTimeEl.textContent = getFormattedTime();

const botResponses = {
  quote: {
    message: "Absolutely! We distribute wholesale supplies across J&K. Click the button below to launch a chat directly with our sales team and receive a catalog.",
    text: "Hello Al Gani! I would like to request a B2B wholesale quotation."
  },
  vending: {
    message: "Excellent choice! Our CafeVend series smart vending machines are perfect for B2B establishments. Click below to coordinate with our servicing team.",
    text: "Hello Al Gani! I have an inquiry regarding CafeVend Vending Machines."
  },
  md: {
    message: "Understood. Connect directly with our Managing Director, Syed Mir Aftab, to discuss custom contracts or import tenders.",
    text: "Hello Al Gani! I would like to speak directly with Syed Mir Aftab."
  }
};

// AI Chatbot Context & Stateful Multi-Turn Management
let chatContext = {
  userName: null,
  waitingForName: true,
  lastIntent: null,
  lastMatchedService: null
};

// Conversational Name Extractor Flow
const extractName = (text) => {
  const clean = text.trim();
  const lower = clean.toLowerCase();
  
  const prefixes = [
    "my name is ", "i am ", "myself ", "this is ", 
    "company is ", "firm is ", "we are ", "representing ", 
    "name is ", "calling from "
  ];
  
  for (const pref of prefixes) {
    if (lower.startsWith(pref)) {
      return clean.substring(pref.length).trim();
    }
    const idx = lower.indexOf(pref);
    if (idx !== -1) {
      return clean.substring(idx + pref.length).trim();
    }
  }
  
  const words = clean.split(/\s+/);
  if (words.length <= 3) {
    return clean;
  }
  return words.slice(0, 3).join(' ');
};

// Semantic Stop Word Filtering & Score Calculation
const stopWords = new Set(['do', 'you', 'have', 'the', 'a', 'an', 'is', 'are', 'was', 'were', 'and', 'or', 'but', 'if', 'then', 'else', 'what', 'who', 'how', 'where', 'why', 'can', 'could', 'would', 'should', 'we', 'i', 'our', 'us', 'they', 'them', 'for', 'to', 'in', 'on', 'at', 'with', 'about', 'from', 'by', 'of', 'any', 'some', 'please', 'tell', 'me', 'more', 'give', 'get', 'sourcing', 'supplier', 'suppliers', 'supply']);

const calculateMatchingScore = (inputText, matchPhrases) => {
  const inputTokens = inputText.toLowerCase().split(/[^\w]+/).filter(t => t.length > 1 && !stopWords.has(t));
  let score = 0;
  
  matchPhrases.forEach(phrase => {
    const phraseLower = phrase.toLowerCase();
    const phraseTokens = phraseLower.split(/[^\w]+/).filter(t => t.length > 1);
    
    if (inputText.toLowerCase().includes(phraseLower)) {
      score += 15;
    }
    
    inputTokens.forEach(t => {
      if (phraseTokens.includes(t)) {
        score += 5;
      } else if (phraseLower.includes(t)) {
        score += 2;
      }
    });
  });
  
  return score;
};

// Sector Synonym Dictionaries
const intentSynonyms = {
  vending: ['vending', 'coffee', 'machine', 'cafevend', 'dispenser', 'brew', 'bean', 'cappuccino', 'hot chocolate', 'maintenance', 'sensor', 'refill', 'vender', 'office machine', 'commercial vending', 'espresso'],
  insulation: ['insulation', 'cold storage', 'thermal', 'polyurethane', 'sandwich panel', 'refrigerated transport', 'freezer room', 'temperature controlled', 'winter logistics', 'insulated material', 'cold room'],
  flooring: ['flooring', 'laminate', 'hardwood', 'wood paneling', 'interior styling', 'timber', 'gulmarg lodge', 'hotel flooring', 'office floor', 'wood sample', 'wooden flooring'],
  logistics: ['leh', 'ladakh', 'kargil', 'dispatch', 'freight', 'truck', 'transport', 'srinagar hub', 'freight run', 'high altitude', 'snow routes', 'delivery line', 'cargo convoy'],
  quote: ['wholesale quote', 'price list', 'pricing tiers', 'volume discount', 'contract terms', 'quotation', 'partnership', 'licensing', 'distributor terms', 'bulk order', 'cost sheet', 'pricing'],
  md: ['mir aftab', 'syed aftab', 'ayoub bhat', 'managing director', 'ops director', 'vip escalation', 'founder', 'ceo', 'management contracts', 'syed mir aftab', 'aftab', 'ayoub'],
  contact: ['phone number', 'email', 'address', 'location', 'srinagar hub', 'bagati kanipora', 'customer support', 'support line', 'call', 'office address', 'contact coordinates']
};

const typeMessage = (element, text, callback) => {
  let index = 0;
  element.innerHTML = '';
  const scrollLog = () => { chatLog.scrollTop = chatLog.scrollHeight; };
  const typeNextChar = () => {
    if (index < text.length) {
      const char = text.charAt(index);
      element.innerHTML += (char === '\n' ? '<br>' : char);
      index++;
      scrollLog();
      setTimeout(typeNextChar, 7 + Math.random() * 11);
    } else {
      scrollLog();
      if (callback) callback();
    }
  };
  typeNextChar();
};

const handleUserMessage = (text) => {
  if (!text.trim()) return;
  const userBubble = document.createElement('div');
  userBubble.className = 'wa-msg wa-msg-user';
  userBubble.innerHTML = `
    <div class="wa-msg-avatar" style="color: #FFFFFF;">👤 Client Sourcing</div>
    <div class="wa-msg-text">${escapeHtml(text)}</div>
    <div class="wa-msg-time">${getFormattedTime()}</div>
  `;
  chatLog.appendChild(userBubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  quickRepliesContainer.style.display = 'none';
  typingIndicator.style.display = 'flex';
  chatLog.scrollTop = chatLog.scrollHeight;
  
  let responseText = "";
  let waTextPrefill = "";
  let followUps = [];
  
  if (chatContext.waitingForName) {
    chatContext.userName = extractName(text);
    chatContext.waitingForName = false;
    responseText = `It is a pleasure meeting you, ${chatContext.userName}! How can I support your B2B supply chain or equipment sourcing today? 
I am fully trained in Al Gani's high-altitude logistics routes, CafeVend commercial vending machine setups, polyurethane insulated panel systems, premium wood flooring catalogs, and corporate wholesale contracts.`;
    waTextPrefill = `Hello Al Gani! I am chatting with your AI assistant. My name is ${chatContext.userName}.`;
    followUps = [
      { text: '📋 Request Wholesale Quote', key: 'quote' },
      { text: '☕ Vending Solutions', key: 'vending' },
      { text: '🚚 Srinagar to Leh Logistics', key: 'quote' }
    ];
  } else {
    let bestIntent = null;
    let highestScore = 0;
    Object.keys(intentSynonyms).forEach(intent => {
      const score = calculateMatchingScore(text, intentSynonyms[intent]);
      if (score > highestScore) { highestScore = score; bestIntent = intent; }
    });
    
    let matchedService = null;
    if (typeof services !== 'undefined' && Array.isArray(services)) {
      services.forEach(s => {
        const score = calculateMatchingScore(text, [s.name, s.slug, s.category, s.tag]);
        if (score > 4 && score > highestScore) { highestScore = score; bestIntent = 'dynamic_service'; matchedService = s; }
      });
    }
    if (highestScore < 3 && chatContext.lastIntent) { bestIntent = chatContext.lastIntent; highestScore = 5; }
    
    if (bestIntent === 'dynamic_service' && matchedService) {
      chatContext.lastIntent = 'dynamic_service';
      chatContext.lastMatchedService = matchedService;
      responseText = `🤖 AI Sourcing Agent: Answering regarding our dynamic database catalog for you, ${chatContext.userName || 'Client Sourcing'}!
📦 Custom Service: ${matchedService.name}
📂 Category Division: ${matchedService.category || 'General Sourcing'}
📝 Summary Overview: ${matchedService.shortDesc || ''}
✨ Key Sourcing Highlights:
${matchedService.features && matchedService.features.length ? matchedService.features.slice(0, 3).map(f => `• ${f}`).join('\n') : '• Premium wholesale supply & local logistics'}
Would you like custom B2B bulk pricing or delivery scheduling for "${matchedService.name}"? Click the live WhatsApp link below to coordinate with our department head!`;
      waTextPrefill = `Hello Al Gani Sourcing! I want to request B2B price lists and catalogs for your offering: "${matchedService.name}".`;
      followUps = [
        { text: '📋 Request price tier sheet', key: 'quote' },
        { text: '👤 Contact MD Syed Aftab', key: 'md' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    } else if (bestIntent === 'vending') {
      chatContext.lastIntent = 'vending';
      responseText = `Answering CafeVend inquiries, ${chatContext.userName || 'Client'}: Al Gani is the official regional distributor of CafeVend smart commercial vending machines in J&K. We supply offices and hubs with bean-to-cup machines equipped with telemetry sensors that automatically notify our Srinagar Nowgam hub when ingredients are low, backed by a dedicated 24-hour service SLA. Click below to request a catalog or lease terms!`;
      waTextPrefill = "Hello Al Gani! I have a question regarding CafeVend Vending Machine Solutions.";
      followUps = [
        { text: '🔧 Technical Support SLA', key: 'vending' },
        { text: '📋 Vending Price Catalogs', key: 'quote' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    } else if (bestIntent === 'insulation') {
      chatContext.lastIntent = 'insulation';
      responseText = `Regarding insulated warehousing, ${chatContext.userName || 'Client'}: We manufacture high-density polyurethane (PUF) insulation panels, thick thermal framing systems, and freezer setups. We maintain specialized supply convoys from Srinagar to Kargil and Leh even during harsh winter snows. Click the live chat link to coordinate specific sizing and volume-discount schedules!`;
      waTextPrefill = "Hello Al Gani! I would like to get details about B2B insulation and cold storage warehousing setups.";
      followUps = [
        { text: '🚚 Srinagar-Leh routes', key: 'quote' },
        { text: '📋 Cold Room quotation', key: 'quote' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    } else if (bestIntent === 'flooring') {
      chatContext.lastIntent = 'flooring';
      responseText = `Regarding premium wood flooring, ${chatContext.userName || 'Client'}: We are the primary J&K importer of commercial-grade laminate flooring and luxury interior wood paneling, widely configured inside premium Gulmarg ski lodges and Srinagar corporate offices. Let me link you directly with our design sourcing team on WhatsApp so they can stream wood catalog samples and wholesale quotes!`;
      waTextPrefill = "Hello Al Gani! I want to request catalogs and quotes for custom wood paneling and flooring.";
      followUps = [
        { text: '🪵 Premium wood catalogs', key: 'quote' },
        { text: '👤 Speak with Sourcing Lead', key: 'md' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    } else if (bestIntent === 'logistics') {
      chatContext.lastIntent = 'logistics';
      responseText = `Regarding logistics dispatches, ${chatContext.userName || 'Client'}: From our central Nowgam hub in Srinagar, we run daily logistics runs across J&K, plus dedicated high-altitude convoys across Kargil into Leh. We support specialized winter freight runs for bulk transport. Click the WhatsApp button below to speak directly with our regional convoy manager!`;
      waTextPrefill = "Hello Al Gani! I would like to inquire about regional B2B bulk freight runs and logistics schedules.";
      followUps = [
        { text: '🚚 High-altitude convoy times', key: 'quote' },
        { text: '👤 Contact Operations Lead', key: 'md' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    } else if (bestIntent === 'quote') {
      chatContext.lastIntent = 'quote';
      responseText = `Regarding quotes and pricing, ${chatContext.userName || 'Client'}: We support tailored B2B bulk discounts and corporate account schedules. You can also register as an official partner inside our Admin panel to unlock direct inventory alerts and automated invoices. Click below to discuss custom margins directly with our chief sales head!`;
      waTextPrefill = "Hello Al Gani! I would like to establish a B2B distribution partnership or request a wholesale quote.";
      followUps = [
        { text: '🤝 Partner registration coordinates', key: 'quote' },
        { text: '👤 Speak with Managing Director', key: 'md' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    } else if (bestIntent === 'md') {
      chatContext.lastIntent = 'md';
      responseText = `VIP Escalation, ${chatContext.userName || 'Client'}: Syed Mir Aftab (MD) and Mohammad Ayoub Bhat (Operations Director) steer corporate contract proposals, high-volume government procurements, and strategic partnerships. Let me open a priority VIP WhatsApp chat line directly to Managing Director Syed Mir Aftab for your project!`;
      waTextPrefill = "Hello Syed Mir Aftab! I would like to speak directly with you regarding a high-volume B2B contract.";
      followUps = [
        { text: '👤 Chat with MD Aftab', key: 'md' },
        { text: '📋 Submit procurement proposal', key: 'quote' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    } else if (bestIntent === 'contact') {
      chatContext.lastIntent = 'contact';
      responseText = `Customer Care contacts, ${chatContext.userName || 'Client'}: You can call our desk directly at +91 7780901374, email alganigeneralsupplier@gmail.com, or visit our central Srinagar Nowgam hub at Bagati Kanipora, Nowgam, Kashmir. Click below to open a direct live chat line to our operations team on WhatsApp!`;
      waTextPrefill = "Hello Al Gani! I would like to speak directly with your customer care team.";
      followUps = [
        { text: '👤 Speak with Srinagar Support', key: 'md' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    } else {
      responseText = `Sourcing inquiry logged, ${chatContext.userName || 'Client'}! I have scanned Al Gani's general B2B distribution database and confirmed we support custom wholesale procurement and Srinagar-Leh transport in this category. Click below to launch a direct live chat with our chief sourcing manager on WhatsApp to finalize quotes and sample shipping in 5 minutes!`;
      waTextPrefill = `Hello Al Gani! I have a custom sourcing inquiry regarding: "${text}"`;
      followUps = [
        { text: '📋 Get B2B Quote', key: 'quote' },
        { text: '👤 Speak with MD Syed Aftab', key: 'md' },
        { text: '🔄 Ask another topic', key: 'restart' }
      ];
    }
  }
  
  setTimeout(() => {
    typingIndicator.style.display = 'none';
    const botBubble = document.createElement('div');
    botBubble.className = 'wa-msg wa-msg-bot';
    botBubble.innerHTML = `
      <div class="wa-msg-avatar">🤖 Al Gani AI Agent</div>
      <div class="wa-msg-text"></div>
      <div class="wa-msg-time">${getFormattedTime()}</div>
    `;
    chatLog.appendChild(botBubble);
    typeMessage(botBubble.querySelector('.wa-msg-text'), responseText, () => {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'wa-chat-actions';
      const waLink = document.createElement('a');
      waLink.className = 'wa-action-btn';
      waLink.href = `https://wa.me/919419014741?text=${encodeURIComponent(waTextPrefill)}`;
      waLink.target = '_blank';
      waLink.rel = 'noopener';
      waLink.innerHTML = `<span>Launch Live Chat</span>`;
      const restartBtn = document.createElement('button');
      restartBtn.className = 'wa-restart-btn';
      restartBtn.textContent = '🔄 Ask Another Question / Start Over';
      restartBtn.addEventListener('click', () => {
        chatLog.innerHTML = `
          <div class="wa-msg wa-msg-bot">
            <div class="wa-msg-avatar">🤖 Al Gani AI Agent</div>
            <div class="wa-msg-text">Hello! Welcome to Al Gani Suppliers. 🌾 I am your AI Sourcing Assistant. To help me give you precise quotes and logistics routes, what is your name or company name?</div>
            <div class="wa-msg-time">${getFormattedTime()}</div>
          </div>
        `;
        quickRepliesContainer.style.display = 'flex';
        quickRepliesContainer.innerHTML = `
          <button class="wa-reply-btn" data-key="quote">📋 Wholesale Quote Info</button>
          <button class="wa-reply-btn" data-key="vending">☕ Vending Machine Solutions</button>
          <button class="wa-reply-btn" data-key="md">👤 Direct VIP Chat with MD</button>
        `;
        chatContext.lastIntent = null;
        chatContext.userName = null;
        chatContext.waitingForName = true;
      });
      actionsContainer.appendChild(waLink);
      actionsContainer.appendChild(restartBtn);
      chatLog.appendChild(actionsContainer);
      if (followUps.length > 0) {
        quickRepliesContainer.innerHTML = '';
        followUps.forEach(reply => {
          const btn = document.createElement('button');
          btn.className = 'wa-reply-btn';
          btn.dataset.key = reply.key;
          btn.textContent = reply.text;
          quickRepliesContainer.appendChild(btn);
        });
        quickRepliesContainer.style.display = 'flex';
      }
      chatLog.scrollTop = chatLog.scrollHeight;
    });
  }, 1000);
};

quickRepliesContainer?.addEventListener('click', (e) => {
  const btn = e.target.closest('.wa-reply-btn');
  if (!btn) return;
  const key = btn.dataset.key;
  if (key === 'restart') {
    chatLog.innerHTML = `
      <div class="wa-msg wa-msg-bot">
        <div class="wa-msg-avatar">🤖 Al Gani AI Agent</div>
        <div class="wa-msg-text">Hello! Welcome to Al Gani Suppliers. 🌾 I am your AI Sourcing Assistant. To help me give you precise quotes and logistics routes, what is your name or company name?</div>
        <div class="wa-msg-time">${getFormattedTime()}</div>
      </div>
    `;
    quickRepliesContainer.style.display = 'flex';
    quickRepliesContainer.innerHTML = `
      <button class="wa-reply-btn" data-key="quote">📋 Wholesale Quote Info</button>
      <button class="wa-reply-btn" data-key="vending">☕ Vending Machine Solutions</button>
      <button class="wa-reply-btn" data-key="md">👤 Direct VIP Chat with MD</button>
    `;
    chatContext.lastIntent = null;
    chatContext.userName = null;
    chatContext.waitingForName = true;
    return;
  }
  chatContext.waitingForName = false;
  const reply = botResponses[key];
  if (!reply) return;
  if (aiInput) aiInput.value = '';
  const userBubble = document.createElement('div');
  userBubble.className = 'wa-msg wa-msg-user';
  userBubble.innerHTML = `
    <div class="wa-msg-avatar" style="color: #FFFFFF;">👤 Client Sourcing</div>
    <div class="wa-msg-text">${escapeHtml(btn.textContent)}</div>
    <div class="wa-msg-time">${getFormattedTime()}</div>
  `;
  chatLog.appendChild(userBubble);
  chatLog.scrollTop = chatLog.scrollHeight;
  quickRepliesContainer.style.display = 'none';
  typingIndicator.style.display = 'flex';
  setTimeout(() => {
    typingIndicator.style.display = 'none';
    const botBubble = document.createElement('div');
    botBubble.className = 'wa-msg wa-msg-bot';
    botBubble.innerHTML = `
      <div class="wa-msg-avatar">🤖 Al Gani AI Agent</div>
      <div class="wa-msg-text"></div>
      <div class="wa-msg-time">${getFormattedTime()}</div>
    `;
    chatLog.appendChild(botBubble);
    typeMessage(botBubble.querySelector('.wa-msg-text'), reply.message, () => {
      const actionsContainer = document.createElement('div');
      actionsContainer.className = 'wa-chat-actions';
      const waLink = document.createElement('a');
      waLink.className = 'wa-action-btn';
      waLink.href = `https://wa.me/919419014741?text=${encodeURIComponent(reply.text)}`;
      waLink.target = '_blank';
      waLink.rel = 'noopener';
      waLink.innerHTML = `
        <svg width="15" height="15" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.963L2 22l5.21-1.366a9.936 9.936 0 0 0 4.79 1.23h.004c5.505 0 9.988-4.478 9.99-9.984a9.96 9.96 0 0 0-9.982-9.88zM6.837 5.75c.148-.327.4-.354.577-.354.148-.007.327-.007.478-.007.148 0 .393.054.6.49.206.435.707 1.714.77 1.837.062.122.102.265.02.428-.082.163-.122.265-.245.408-.122.143-.258.32-.367.43-.11.115-.224.238-.095.456.129.218.572.946 1.226 1.524.843.748 1.558.98 1.782 1.096.225.115.354.095.483-.054.129-.15.558-.646.707-.864.15-.218.3-.184.5-.11.2.075 1.265.592 1.483.7.218.11.36.163.415.258.054.095.054.551-.163 1.17-.218.62-1.272 1.21-1.782 1.265-.51.054-.993-.082-3.32-.999-2.73-1.074-4.48-3.83-4.61-4-.13-.17-1.04-1.38-1.04-2.636 0-1.25.65-1.864.88-2.11z"/>
        </svg>
        <span>Launch Live Chat</span>
      `;
      const restartBtn = document.createElement('button');
      restartBtn.className = 'wa-restart-btn';
      restartBtn.textContent = '🔄 Ask Another Question / Start Over';
      restartBtn.addEventListener('click', () => {
        chatLog.innerHTML = `
          <div class="wa-msg wa-msg-bot">
            <div class="wa-msg-avatar">🤖 Al Gani AI Agent</div>
            <div class="wa-msg-text">Hello! Welcome to Al Gani Suppliers. 🌾 I am your AI Sourcing Assistant. To help me give you precise quotes and logistics routes, what is your name or company name?</div>
            <div class="wa-msg-time">${getFormattedTime()}</div>
          </div>
        `;
        quickRepliesContainer.style.display = 'flex';
        quickRepliesContainer.innerHTML = `
          <button class="wa-reply-btn" data-key="quote">📋 Wholesale Quote Info</button>
          <button class="wa-reply-btn" data-key="vending">☕ Vending Machine Solutions</button>
          <button class="wa-reply-btn" data-key="md">👤 Direct VIP Chat with MD</button>
        `;
        chatContext.lastIntent = null;
        chatContext.userName = null;
        chatContext.waitingForName = true;
      });
      actionsContainer.appendChild(waLink);
      actionsContainer.appendChild(restartBtn);
      chatLog.appendChild(actionsContainer);
      chatLog.scrollTop = chatLog.scrollHeight;
    });
  }, 800);
});

const triggerSend = () => {
  if (!aiInput) return;
  const msg = aiInput.value.trim();
  if (msg) {
    aiInput.value = '';
    handleUserMessage(msg);
    setTimeout(() => aiInput.focus(), 50); // Refocus input field for buttery-smooth typing flows
  }
};

aiSendBtn?.addEventListener('click', triggerSend);
aiInput?.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    triggerSend();
  }
});

const waTrigger = whatsappContainer.querySelector('#whatsapp-trigger');
const waPopup = whatsappContainer.querySelector('#whatsapp-popup');
waTrigger?.addEventListener('click', (e) => {
  e.stopPropagation();
  waPopup?.classList.toggle('active');
  if (waPopup?.classList.contains('active') && aiInput) {
    setTimeout(() => {
      aiInput.focus();
      chatLog.scrollTop = chatLog.scrollHeight; // Auto scroll to bottom when opening the popup
    }, 150);
  }
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
  if (emailHref && emailHref.includes('alganigeneralsupplier@gmail.com')) {
    e.preventDefault();
    const confirmMail = confirm("Would you like to open Gmail in a new tab to send an email directly to Al Gani?");
    if (confirmMail) {
      const gmailUrl = 'https://mail.google.com/mail/?view=cm&fs=1&to=alganigeneralsupplier@gmail.com';
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
