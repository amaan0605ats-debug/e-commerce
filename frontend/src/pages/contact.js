import { services } from '../data/services.js';
import { db, collection, addDoc, serverTimestamp } from '../firebase.js';


export function renderContact() {
  return `
    <!-- CONTACT HERO -->
    <section class="page-hero contact-hero-section" id="contact-hero">
      <div class="page-hero-bg"></div>
      <div class="container">
        <div class="page-hero-content animate-on-scroll">
          <div class="breadcrumb">
            <a href="#/">Home</a>
            <span class="breadcrumb-sep">◆</span>
            <span>Contact</span>
          </div>
          <div class="section-label" style="color: var(--gold);">Reach Out</div>
          <h1 class="page-hero-title">Let's Build <em>Something<br>Together.</em></h1>
          <div class="section-rule"></div>
          <p class="page-hero-subtitle">Whether you are a manufacturer seeking a regional distribution partner, a business looking for quality supplies, or a client exploring our product line — we would be glad to hear from you.</p>
        </div>
      </div>
    </section>

    <!-- CONTACT CONTENT -->
    <section class="contact-content" id="contact-content">
      <div class="container">
        <div class="contact-grid">
          
          <!-- Contact Info -->
          <div class="contact-info-col animate-on-scroll">
            <h2 class="section-title" style="font-size: 28px;">Get In <em>Touch</em></h2>
            <div class="section-rule"></div>
            
            <div class="contact-items">
              <div class="contact-item" id="contact-phone">
                <div class="contact-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div class="contact-item-content">
                  <div class="contact-item-label">Contact Numbers</div>
                  <div class="contact-item-value"><a href="tel:+917780901374" style="color: inherit; text-decoration: none;">7780901374</a> <span class="contact-item-note">(Calls & Inquiries)</span></div>
                </div>
              </div>

              <div class="contact-item" id="contact-whatsapp">
                <div class="contact-icon-box contact-icon-whatsapp">
                  <svg viewBox="0 0 24 24" width="22" height="22" fill="currentColor">
                    <path d="M12.012 2c-5.506 0-9.989 4.478-9.99 9.984a9.96 9.96 0 0 0 1.335 4.963L2 22l5.21-1.366a9.936 9.936 0 0 0 4.79 1.23h.004c5.505 0 9.988-4.478 9.99-9.984a9.96 9.96 0 0 0-9.982-9.88zM6.837 5.75c.148-.327.4-.354.577-.354.148-.007.327-.007.478-.007.148 0 .393.054.6.49.206.435.707 1.714.77 1.837.062.122.102.265.02.428-.082.163-.122.265-.245.408-.122.143-.258.32-.367.43-.11.115-.224.238-.095.456.129.218.572.946 1.226 1.524.843.748 1.558.98 1.782 1.096.225.115.354.095.483-.054.129-.15.558-.646.707-.864.15-.218.3-.184.5-.11.2.075 1.265.592 1.483.7.218.11.36.163.415.258.054.095.054.551-.163 1.17-.218.62-1.272 1.21-1.782 1.265-.51.054-.993-.082-3.32-.999-2.73-1.074-4.48-3.83-4.61-4-.13-.17-1.04-1.38-1.04-2.636 0-1.25.65-1.864.88-2.11z"/>
                  </svg>
                </div>
                <div class="contact-item-content">
                  <div class="contact-item-label">WhatsApp</div>
                  <div class="contact-item-value"><a href="https://wa.me/919419014741" target="_blank" rel="noopener" style="color: inherit; text-decoration: none;">9419014741</a> <span class="contact-item-note">(WhatsApp Only — tap to chat)</span></div>
                </div>
              </div>

              <div class="contact-item" id="contact-email">
                <div class="contact-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <rect x="2" y="4" width="20" height="16" rx="2"/>
                    <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
                  </svg>
                </div>
                <div class="contact-item-content">
                  <div class="contact-item-label">Email</div>
                  <div class="contact-item-value"><a href="mailto:alganigeneralsupplier@gmail.com" style="color: inherit; text-decoration: none;">alganigeneralsupplier@gmail.com</a></div>
                </div>
              </div>

              <div class="contact-item" id="contact-gst">
                <div class="contact-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
                    <polyline points="14 2 14 8 20 8"/>
                    <line x1="16" y1="13" x2="8" y2="13"/>
                    <line x1="16" y1="17" x2="8" y2="17"/>
                  </svg>
                </div>
                <div class="contact-item-content">
                  <div class="contact-item-label">GST No.</div>
                  <div class="contact-item-value">01DDLPS888Q121</div>
                </div>
              </div>

              <div class="contact-item" id="contact-address">
                <div class="contact-icon-box">
                  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/>
                    <circle cx="12" cy="10" r="3"/>
                  </svg>
                </div>
                <div class="contact-item-content">
                  <div class="contact-item-label">Address</div>
                  <div class="contact-item-value">Bagati Kanipora, Nowgam,<br>Kashmir - 190019</div>
                </div>
              </div>
            </div>

            <!-- Quick Overview -->
            <div class="contact-overview-box animate-on-scroll">
              <h3 class="contact-overview-title">Quick Overview</h3>
              <ul class="contact-overview-list">
                <li>General Supplier & Distributors</li>
                <li>Interior Paneling, Flooring & Insulation</li>
                <li>Vending Machine Regional Distribution</li>
                <li>General Commercial Supply Cataloging</li>
                <li>Serving Kashmir Valley & Leh Region</li>
                <li>10-Person Dedicated Operations Team</li>
              </ul>
            </div>
          </div>

          <!-- Contact Form -->
          <div class="contact-form-col animate-on-scroll">
            <div class="contact-form-box">
              <h3 class="contact-form-title">Send Us a Message</h3>
              <p class="contact-form-subtitle">We'll get back to you within 24 hours.</p>
              <form class="contact-form" id="contact-form" onsubmit="event.preventDefault();">
                <div class="form-group">
                  <label for="form-name" class="form-label">Full Name</label>
                  <input type="text" id="form-name" class="form-input" placeholder="Your full name" required>
                </div>
                <div class="form-group">
                  <label for="form-email" class="form-label">Email Address</label>
                  <input type="email" id="form-email" class="form-input" placeholder="your@email.com" required>
                </div>
                <div class="form-group">
                  <label for="form-phone" class="form-label">Phone Number</label>
                  <input type="tel" id="form-phone" class="form-input" placeholder="+91 XXXXX XXXXX">
                </div>
                <div class="form-group">
                  <label for="form-subject" class="form-label">Subject</label>
                  <select id="form-subject" class="form-input form-select">
                    <option value="">Select a subject...</option>
                    <option value="partnership">Distribution Partnership</option>
                    <option value="supply">Supply Inquiry / Purchase</option>
                    <option value="services">Service Information</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="form-service" class="form-label">Service of Interest</label>
                  <select id="form-service" class="form-input form-select">
                    <option value="">Select a service to buy/inquire...</option>
                    ${services.map(s => `<option value="${s.slug}">${s.name}</option>`).join('')}
                  </select>
                </div>
                <div class="form-group">
                  <label for="form-location" class="form-label">Location / Territory</label>
                  <input type="text" id="form-location" class="form-input" placeholder="e.g. Srinagar, Pulwama, Leh, or Not provided">
                </div>
                <div class="form-group">
                  <label for="form-message" class="form-label">Message</label>
                  <textarea id="form-message" class="form-input form-textarea" placeholder="Tell us about your requirements..." rows="5" required></textarea>
                </div>
                <button type="submit" class="btn btn-primary btn-lg" id="form-submit-btn" style="width: 100%;">
                  Send Message
                </button>
              </form>
            </div>

            <!-- Promise Box -->
            <div class="contact-promise-box animate-on-scroll">
              <div class="section-label" style="color: var(--gold);">Our Promise</div>
              <p class="promise-text">"Every delivery we make, every partnership we honor, every product we carry — carries the spirit and standard of Kashmir's finest."</p>
            </div>
          </div>

        </div>
      </div>
    </section>
  `;
}

export function initContact() {
  const form = document.getElementById('contact-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = document.getElementById('form-name').value.trim();
    const email = document.getElementById('form-email').value.trim();
    const phone = document.getElementById('form-phone').value.trim();
    const subjectSelect = document.getElementById('form-subject');
    const subject = subjectSelect.value ? subjectSelect.options[subjectSelect.selectedIndex].text : 'General Inquiry';
    const serviceSelect = document.getElementById('form-service');
    const serviceName = serviceSelect.value ? serviceSelect.options[serviceSelect.selectedIndex].text : '';
    const service = serviceSelect.value;
    const location = document.getElementById('form-location').value.trim();
    const message = document.getElementById('form-message').value.trim();
    const submitBtn = document.getElementById('form-submit-btn');

    // Show loading state
    submitBtn.disabled = true;
    submitBtn.innerHTML = `
      <span style="display: inline-flex; align-items: center; justify-content: center; gap: 8px;">
        Sending...
        <svg class="spinner" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" style="animation: spin 1s linear infinite;">
          <circle cx="12" cy="12" r="10" stroke="rgba(255,255,255,0.2)" fill="none"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="currentColor" fill="none"/>
        </svg>
      </span>
      <style>
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      </style>
    `;

    try {
      // Write to Firestore inquiries collection
      await addDoc(collection(db, 'inquiries'), {
        name,
        email,
        phone: phone || null,
        subject: subject,
        service: service || null,
        productName: serviceName || null,
        location: location || null,
        message,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Show gorgeous success feedback replacing the form container
      const formBox = form.closest('.contact-form-box');
      if (formBox) {
        formBox.style.opacity = '0';
        formBox.style.transform = 'translateY(10px)';
        formBox.style.transition = 'all 0.4s ease';

        setTimeout(() => {
          formBox.innerHTML = `
            <div class="contact-success-card animate-visible" style="text-align: center; padding: 24px 12px;">
              <div style="font-size: 56px; margin-bottom: 20px; animation: bounce 1.5s ease infinite;">✨</div>
              <h3 style="font-family: var(--font-display); font-size: 26px; color: var(--gold-light); margin-bottom: 12px; font-style: italic; font-weight: 700;">Thank You, ${name}!</h3>
              <div class="section-rule" style="margin: 12px auto 20px;"></div>
              <p class="body-text" style="color: var(--text-dark) !important; font-size: 16px; line-height: 1.6; max-width: 420px; margin: 0 auto 24px; font-family: var(--font-body);">
                Your message regarding <strong>${subject}</strong> ${serviceName ? `for <em>${serviceName}</em>` : ''} has been received by Al Gani. Our dedicated team will review your inquiry and reach out to you within 24 hours.
              </p>
              <div style="margin-top: 12px;">
                <a href="#/" class="btn btn-primary" style="font-size: 11px; letter-spacing: 2px; padding: 10px 24px; border-radius: 30px;">Return to Home</a>
              </div>
            </div>
            <style>
              @keyframes bounce {
                0%, 100% { transform: translateY(0); }
                50% { transform: translateY(-10px); }
              }
            </style>
          `;
          formBox.style.opacity = '1';
          formBox.style.transform = 'translateY(0)';
        }, 400);
      }

    } catch (error) {
      console.error('Error submitting inquiry to Firestore:', error);

      // Create a copyable backup and standard mailto fallback in case Firebase config is placeholder / offline
      const mailtoUrl = `mailto:alganigeneralsupplier@gmail.com?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(`Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nService: ${serviceName || 'None'}\nMessage:\n${message}`)}`;
      
      const formBox = form.closest('.contact-form-box');
      if (formBox) {
        formBox.style.opacity = '0';
        formBox.style.transform = 'translateY(10px)';
        formBox.style.transition = 'all 0.4s ease';

        setTimeout(() => {
          formBox.innerHTML = `
            <div class="contact-error-card" style="padding: 16px 8px; text-align: center;">
              <div style="font-size: 48px; margin-bottom: 16px;">⚠️</div>
              <h3 style="font-family: var(--font-display); font-size: 22px; color: #ff6b6b; margin-bottom: 12px; font-style: italic; font-weight: 700;">Submission Offline</h3>
              <div class="section-rule" style="margin: 12px auto 20px; background: #ff6b6b;"></div>
              <p class="body-text" style="color: var(--text-dark) !important; font-size: 15px; line-height: 1.6; max-width: 400px; margin: 0 auto 20px; font-family: var(--font-body);">
                We couldn't connect to our live servers. Don't worry, your message is safe! You can send it directly to us via email or copy it below.
              </p>
              
              <div style="margin: 16px 0; display: flex; flex-direction: column; gap: 12px; align-items: center;">
                <a href="${mailtoUrl}" class="btn btn-primary" style="font-size: 11px; letter-spacing: 2.5px; width: 100%; border-radius: 30px; padding: 12px; text-align: center; display: block;">✉️ Send via Direct Email</a>
                <button id="btn-copy-msg" class="btn btn-outline" style="font-size: 10px; letter-spacing: 2px; width: 100%; border-radius: 30px; padding: 10px; color: var(--gold-light); border-color: rgba(224,176,80,0.5);">📋 Copy Message to Clipboard</button>
              </div>
              
              <div style="margin-top: 16px;">
                <button id="btn-try-again" class="btn" style="font-size: 10px; color: var(--gold) !important; padding: 8px 16px; border: none; text-decoration: underline; background: none;">Go Back to Form</button>
              </div>
            </div>
          `;
          
          formBox.style.opacity = '1';
          formBox.style.transform = 'translateY(0)';

          // Hook up helper buttons
          document.getElementById('btn-copy-msg')?.addEventListener('click', () => {
            const fullText = `Name: ${name}\nEmail: ${email}\nPhone: ${phone}\nSubject: ${subject}\nService: ${serviceName}\nMessage: ${message}`;
            navigator.clipboard.writeText(fullText).then(() => {
              const copyBtn = document.getElementById('btn-copy-msg');
              if (copyBtn) copyBtn.textContent = '✓ Copied Successfully!';
            }).catch(err => {
              console.error('Failed to copy message:', err);
            });
          });

          document.getElementById('btn-try-again')?.addEventListener('click', () => {
            window.location.reload();
          });
        }, 400);
      }
    }
  });
}

