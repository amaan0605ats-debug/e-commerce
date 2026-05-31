import { auth, signInWithEmailAndPassword } from '../firebase.js';

export function renderAdminLogin() {
  return `
    <div class="admin-login-page">
      <div class="admin-login-card">
        <div class="admin-login-logo">
          <span class="admin-logo-text">AL GAN<span class="admin-logo-accent">I</span></span>
          <span class="admin-logo-dot"></span>
          <span class="admin-logo-sub">Admin Portal</span>
        </div>

        <h1 class="admin-login-title">Welcome Back</h1>
        <p class="admin-login-subtitle">Sign in to manage orders, inquiries, and product inventory.</p>

        <form class="admin-login-form" id="admin-login-form">
          <div class="admin-form-group">
            <label for="admin-email" class="admin-form-label">Email Address</label>
            <div class="admin-input-wrap">
              <svg class="admin-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="2" y="4" width="20" height="16" rx="2"/>
                <path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7"/>
              </svg>
              <input type="email" id="admin-email" class="admin-form-input" placeholder="your@email.com" required autocomplete="email">
            </div>
          </div>
          <div class="admin-form-group">
            <label for="admin-password" class="admin-form-label">Password</label>
            <div class="admin-input-wrap">
              <svg class="admin-input-icon" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
                <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
              </svg>
              <input type="password" id="admin-password" class="admin-form-input" placeholder="••••••••" required autocomplete="current-password">
            </div>
          </div>
          <div id="admin-login-error" class="admin-login-error" style="display: none;"></div>
          <button type="submit" class="admin-login-btn" id="admin-login-btn">
            <span class="admin-login-btn-text">Sign In</span>
            <span class="admin-login-btn-loader" style="display: none;">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5">
                <path d="M12 2v4M12 18v4M4.93 4.93l2.83 2.83M16.24 16.24l2.83 2.83M2 12h4M18 12h4M4.93 19.07l2.83-2.83M16.24 7.76l2.83-2.83"/>
              </svg>
            </span>
          </button>
        </form>

        <a href="#/" class="admin-back-link">← Back to Website</a>
      </div>

      <div class="admin-login-footer">
        <p>Al Gani General Suppliers · Admin Access Only</p>
      </div>
    </div>
  `;
}

export function initAdminLogin() {
  const form = document.getElementById('admin-login-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;
    const errorEl = document.getElementById('admin-login-error');
    const btnText = form.querySelector('.admin-login-btn-text');
    const btnLoader = form.querySelector('.admin-login-btn-loader');
    const btn = document.getElementById('admin-login-btn');

    // Show loading
    errorEl.style.display = 'none';
    btn.disabled = true;
    btnText.style.display = 'none';
    btnLoader.style.display = 'inline-flex';

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Auth state change will handle redirect via main.js
      window.location.hash = '#/admin';
    } catch (error) {
      let message = 'Invalid credentials. Please try again.';
      if (error.code === 'auth/user-not-found') message = 'No account found with this email.';
      if (error.code === 'auth/wrong-password') message = 'Incorrect password.';
      if (error.code === 'auth/too-many-requests') message = 'Too many attempts. Please wait a moment.';
      if (error.code === 'auth/invalid-credential') message = 'Invalid credentials. Please check your email and password.';
      if (error.code === 'auth/database-error') message = error.message || 'Database connection failed. Please ensure your local MySQL server is running and check your .env configuration.';

      errorEl.textContent = message;
      errorEl.style.display = 'block';
    } finally {
      btn.disabled = false;
      btnText.style.display = 'inline';
      btnLoader.style.display = 'none';
    }
  });
}
