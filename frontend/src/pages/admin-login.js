import './admin.css';
import { auth, signInWithEmailAndPassword } from '../firebase.js';
export function renderAdminLogin() {
 return `<div class="office-login"><aside class="office-login-story"><a class="office-brand" href="/"><img src="/images/algani-mark-192.png" width="45" height="45" alt=""><span>AL GANI<small>GENERAL SUPPLIERS</small></span></a><div><h2>Good business.<br><em>All in one place.</em></h2><p>Your conversations, your catalog, your next delivery. A considered workspace for everything you’re building.</p></div><small>KASHMIR VALLEY · LEH REGION</small></aside><section class="office-login-form-area" aria-labelledby="office-login-title"><p class="office-eyebrow">THE AL GANI WORKSPACE</p><h1 id="office-login-title">Welcome<br><em>back.</em></h1><p>Sign in to keep things moving.</p><form id="admin-login-form" class="office-form"><label class="office-field"><span>Admin username or email</span><input id="admin-email" name="username" type="text" required maxlength="250" autocomplete="username" placeholder="Your administrator account"></label><label class="office-field"><span>Password</span><div class="office-password-wrap"><input id="admin-password" aria-label="Password" name="password" type="password" required autocomplete="current-password"><button type="button" id="office-show-password" aria-label="Show password" aria-pressed="false">Show</button></div></label><div id="admin-login-error" class="office-form-error" role="alert" hidden></div><button id="admin-login-btn" class="office-button office-primary" type="submit">Sign in to workspace ↗</button></form><a href="/">← Back to the website</a></section></div>`;
}
export function initAdminLogin() {
 const form=document.getElementById('admin-login-form');if(!form)return;
 const password=form.querySelector('#admin-password'),show=form.querySelector('#office-show-password');
 show.addEventListener('click',()=>{const visible=password.type==='password';password.type=visible?'text':'password';show.textContent=visible?'Hide':'Show';show.setAttribute('aria-label',visible?'Hide password':'Show password');show.setAttribute('aria-pressed',String(visible));});
 form.addEventListener('submit',async event=>{
  event.preventDefault();const button=form.querySelector('#admin-login-btn');if(button.disabled)return;
  const error=form.querySelector('#admin-login-error'),email=form.querySelector('#admin-email').value.trim();
  if(!email){error.hidden=false;error.textContent='Enter your administrator username or email.';return;}
  button.disabled=true;button.textContent='Signing in…';error.hidden=true;
  try{await signInWithEmailAndPassword(auth,email,password.value);if(form.isConnected)location.hash='#/admin';}
  catch(err){if(form.isConnected){error.textContent=err.message||'Unable to sign in. Please try again.';error.hidden=false;}}
  finally{button.disabled=false;button.textContent='Sign in to workspace ↗';}
 });
}
