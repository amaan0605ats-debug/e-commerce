import { db, collection, addDoc, serverTimestamp } from '../firebase.js';
import { services } from '../data/services.js';

export function createQuickInquiry() {
  const container = document.createElement('div');
  container.className = 'quick-inquiry-container';
  container.id = 'quick-inquiry-container';

  container.innerHTML = `
    <!-- Floating Circular Button -->
    <button class="quick-inquiry-trigger" id="quick-inquiry-btn" aria-label="Request B2B callback">
      <svg class="trigger-icon" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
      </svg>
      <span class="trigger-badge">B2B</span>
      <div class="trigger-glow-ring"></div>
    </button>

    <!-- Glassmorphic Callback Modal -->
    <div class="quick-inquiry-modal" id="quick-inquiry-modal">
      <div class="quick-inquiry-glass-card">
        <button class="quick-inquiry-close" id="quick-inquiry-close-btn" aria-label="Close modal">&times;</button>
        
        <div class="modal-header">
          <div class="modal-header-icon">💼</div>
          <h3 class="modal-title">B2B Callback Request</h3>
          <p class="modal-subtitle">Direct dispatch line for Kashmir & Ladakh wholesale buyers</p>
        </div>

        <form class="quick-inquiry-form" id="quick-inquiry-form">
          <div class="form-row">
            <label for="quick-name" class="form-label">Full Name / Corporate Entity</label>
            <input type="text" id="quick-name" class="form-input" placeholder="e.g. Grand Palace Hotel Procurement" required>
          </div>

          <div class="form-grid">
            <div class="form-row">
              <label for="quick-phone" class="form-label">Phone / WhatsApp</label>
              <input type="tel" id="quick-phone" class="form-input" placeholder="10-digit mobile" required>
            </div>
            <div class="form-row">
              <label for="quick-email" class="form-label">Corporate Email</label>
              <input type="email" id="quick-email" class="form-input" placeholder="name@company.com" required>
            </div>
          </div>

          <div class="form-row">
            <label for="quick-service" class="form-label">Target Service Category</label>
            <select id="quick-service" class="form-input form-select" required>
              <option value="" disabled selected>Select equipment/supply type</option>
              ${services.map(s => `<option value="${s.slug}">${s.name}</option>`).join('')}
            </select>
          </div>

          <div class="form-row">
            <label for="quick-message" class="form-label">Brief Sourcing Requirements</label>
            <textarea id="quick-message" class="form-input form-textarea" rows="3" placeholder="Target quantity, delivery region (Kashmir Valley or Ladakh), or specific model needs..." required></textarea>
          </div>

          <button type="submit" class="btn btn-primary quick-submit-btn" id="quick-submit-btn">
            <span>Send Callback Request</span>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
              <line x1="22" y1="2" x2="11" y2="13"/>
              <polygon points="22 2 15 22 11 13 2 9 22 2"/>
            </svg>
          </button>
        </form>

        <!-- Loading / Success State Container -->
        <div class="quick-inquiry-status" id="quick-inquiry-status">
          <div class="status-content">
            <div class="status-spinner" id="status-spinner"></div>
            <div class="status-success-checkmark" id="status-checkmark">
              <div class="success-ring"></div>
              <svg class="checkmark-svg" viewBox="0 0 52 52">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
              </svg>
            </div>
            <h4 class="status-title" id="status-title">Submitting Request...</h4>
            <p class="status-text" id="status-text">Connecting to Al Gani regional distribution hub</p>
          </div>
        </div>
      </div>
    </div>
  `;

  // Bind DOM elements
  const trigger = container.querySelector('#quick-inquiry-btn');
  const modal = container.querySelector('#quick-inquiry-modal');
  const closeBtn = container.querySelector('#quick-inquiry-close-btn');
  const form = container.querySelector('#quick-inquiry-form');
  const statusContainer = container.querySelector('#quick-inquiry-status');
  const spinner = container.querySelector('#status-spinner');
  const checkmark = container.querySelector('#status-checkmark');
  const statusTitle = container.querySelector('#status-title');
  const statusText = container.querySelector('#status-text');

  // Toggle modal on click
  trigger?.addEventListener('click', (e) => {
    e.stopPropagation();
    modal?.classList.add('active');
    document.body.classList.add('quick-inquiry-open');
  });

  // Close modal
  const closeModal = () => {
    modal?.classList.remove('active');
    document.body.classList.remove('quick-inquiry-open');
    // Reset form and status
    setTimeout(() => {
      form?.reset();
      statusContainer?.classList.remove('active');
      spinner.style.display = 'block';
      checkmark.classList.remove('animate');
      checkmark.style.display = 'none';
      statusTitle.textContent = 'Submitting Request...';
      statusText.textContent = 'Connecting to Al Gani regional distribution hub';
    }, 400);
  };

  closeBtn?.addEventListener('click', closeModal);

  // Close modal if clicked outside card
  modal?.addEventListener('click', (e) => {
    if (e.target === modal) {
      closeModal();
    }
  });

  // Handle Form Submission
  form?.addEventListener('submit', async (e) => {
    e.preventDefault();

    const name = container.querySelector('#quick-name')?.value;
    const phone = container.querySelector('#quick-phone')?.value;
    const email = container.querySelector('#quick-email')?.value;
    const serviceSelect = container.querySelector('#quick-service');
    const service = serviceSelect?.value;
    const productName = serviceSelect?.selectedIndex > 0
      ? serviceSelect.options[serviceSelect.selectedIndex].text
      : '';
    const message = container.querySelector('#quick-message')?.value;

    // Show status container with spinner
    statusContainer?.classList.add('active');
    spinner.style.display = 'block';
    checkmark.style.display = 'none';

    try {
      // Connect and save into Firestore inquiries
      await addDoc(collection(db, 'inquiries'), {
        name,
        email,
        phone: phone || null,
        subject: `Quick B2B Callback Request [${productName || service}]`,
        service: service || null,
        productName: productName || null,
        location: 'Kashmir/Leh Regional Office',
        message: `Corporate Email: ${email}\nWhatsApp/Phone: ${phone}\n\nClient Requirements:\n${message}`,
        status: 'pending',
        createdAt: serverTimestamp()
      });

      // Switch to animated checkmark success state
      spinner.style.display = 'none';
      checkmark.style.display = 'block';
      setTimeout(() => checkmark.classList.add('animate'), 50);

      statusTitle.textContent = 'Callback Requested!';
      statusText.textContent = 'Success! Live synchronizing directly to our regional operations hub. We will call you shortly.';

      // Auto close modal after delay
      setTimeout(() => {
        closeModal();
      }, 2800);

    } catch (err) {
      console.error('Failed to submit callback request:', err);
      spinner.style.display = 'none';
      statusTitle.textContent = 'Submission Failed';
      statusText.textContent = 'Please double check your network connection and try again, or reach us on WhatsApp.';
      
      // Auto dismiss error state
      setTimeout(() => {
        statusContainer?.classList.remove('active');
      }, 4000);
    }
  });

  return container;
}
