// Compatibility client for the Express API used by the admin dashboard.
const auth = { currentUser: null };
const db = {};
const authListeners = new Set();
const SESSION_KEY = 'algani_admin_user';

function saveSession(user) {
  try {
    if (user) sessionStorage.setItem(SESSION_KEY, JSON.stringify(user));
    else sessionStorage.removeItem(SESSION_KEY);
  } catch { /* A blocked storage API must not break the website. */ }
}

try {
  const saved = JSON.parse(sessionStorage.getItem(SESSION_KEY) || 'null');
  if (saved && typeof saved.token === 'string' && saved.uid && saved.email) {
    const payload = JSON.parse(atob(saved.token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')));
    if (typeof payload.exp === 'number' && payload.exp * 1000 > Date.now()) auth.currentUser = saved;
    else saveSession(null);
  } else if (saved) saveSession(null);
} catch { saveSession(null); }

function notifyAuth() {
  for (const callback of [...authListeners]) {
    try { callback(auth.currentUser); }
    catch (error) { console.error('Auth listener failed:', error); }
  }
}

const onAuthStateChanged = (_auth, callback) => {
  authListeners.add(callback);
  callback(auth.currentUser);
  return () => authListeners.delete(callback);
};

const signOut = async () => {
  auth.currentUser = null;
  saveSession(null);
  notifyAuth();
  return true;
};

async function request(endpoint, { method = 'GET', data, signal, authenticated = true } = {}) {
  const token = authenticated ? auth.currentUser?.token : null;
  const controller = new AbortController();
  const abort = () => controller.abort();
  if (signal?.aborted) abort();
  else signal?.addEventListener('abort', abort, { once: true });
  const timeout = setTimeout(abort, 15000);
  let response;
  try {
    response = await fetch(endpoint, {
      method,
      headers: {
        ...(data !== undefined ? { 'Content-Type': 'application/json' } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(data !== undefined ? { body: JSON.stringify(data) } : {}),
      signal: controller.signal,
    });
    const raw = await response.text();
    let result;
    try { result = raw ? JSON.parse(raw) : {}; }
    catch { result = null; }
    if (!response.ok) {
      const error = new Error(result?.error || `Request failed (${response.status}). Please try again.`);
      error.status = response.status;
      error.code = result?.code || (response.status === 503 ? 'auth/database-error' : 'api/request-failed');
      if (response.status === 401 && ['auth/invalid-token', 'auth/unauthorized'].includes(error.code) && token === auth.currentUser?.token) {
        await signOut();
      }
      throw error;
    }
    if (result === null) throw new Error('The server returned an unexpected response. Please try again.');
    return result;
  } catch (error) {
    if (error.name === 'AbortError' && !signal?.aborted) {
      throw new Error('The request timed out. Please try again.');
    }
    throw error;
  } finally {
    clearTimeout(timeout);
    signal?.removeEventListener('abort', abort);
  }
}

const signInWithEmailAndPassword = async (_auth, email, password) => {
  const user = await request('/api/auth/login', { method: 'POST', data: { email, password }, authenticated: false });
  if (!user.uid || !user.email || typeof user.token !== 'string') throw new Error('The server returned an invalid sign-in response.');
  auth.currentUser = user;
  saveSession(user);
  notifyAuth();
  return { user };
};

const collection = (_db, path) => ({ type: 'collection', path });
const doc = (_db, path, id) => ({ type: 'document', path, id });
const query = (reference, ...constraints) => ({ ...reference, constraints });
const orderBy = (field, direction = 'asc') => ({ type: 'orderBy', field, direction });
const where = (field, operator, value) => ({ type: 'where', field, operator, value });
const serverTimestamp = () => new Date().toISOString();
const endpoint = (reference) => `/api/${encodeURIComponent(reference.path)}${reference.id !== undefined ? `/${encodeURIComponent(reference.id)}` : ''}`;

function snapshot(data, reference = {}) {
  if (!Array.isArray(data)) throw new Error('The server returned an invalid collection response.');
  let rows = [...data];
  for (const constraint of reference.constraints || []) {
    if (constraint.type === 'where') {
      if (constraint.operator === '==') rows = rows.filter(row => row[constraint.field] === constraint.value);
      else if (constraint.operator === '!=') rows = rows.filter(row => row[constraint.field] !== constraint.value);
      else throw new Error(`Unsupported query operator: ${constraint.operator}`);
    }
  }
  const sorting = (reference.constraints || []).filter(c => c.type === 'orderBy');
  if (sorting.length) rows.sort((a, b) => {
    for (const { field, direction } of sorting) {
      const difference = a[field] < b[field] ? -1 : a[field] > b[field] ? 1 : 0;
      if (difference) return direction === 'desc' ? -difference : difference;
    }
    return 0;
  });
  const docs = rows.map(item => ({ id: item.id ?? item.slug, data: () => item }));
  return { docs, size: docs.length, empty: docs.length === 0, forEach: callback => docs.forEach(callback) };
}

const addDoc = async (reference, data) => {
  const saved = await request(endpoint(reference), { method: 'POST', data });
  return { id: saved.id ?? saved.slug, data: () => saved };
};
const getDocs = async (reference) => snapshot(await request(endpoint(reference)), reference);
const getDoc = async (reference) => {
  try {
    const item = await request(endpoint(reference));
    return { exists: () => true, id: item.id ?? item.slug ?? reference.id, data: () => item };
  } catch (error) {
    if (error.status === 404) return { exists: () => false, id: reference.id, data: () => undefined };
    throw error;
  }
};
const updateDoc = (reference, data) => request(endpoint(reference), { method: 'PUT', data });
const setDoc = updateDoc;

// Schedule after each response so slow requests never overlap. An unmounted
// dashboard cannot receive a delayed response or accidentally start polling again.
const onSnapshot = (reference, callback, errorCallback) => {
  let active = true;
  let timer;
  let previous = '';
  const controller = new AbortController();
  const poll = async () => {
    try {
      const data = await request(endpoint(reference), { signal: controller.signal });
      if (!active) return;
      const value = JSON.stringify(data);
      if (value !== previous) {
        const result = snapshot(data, reference);
        previous = value;
        callback(result);
      }
    } catch (error) {
      if (!active) return;
      if (errorCallback) errorCallback(error);
      else console.error('Dashboard refresh failed:', error);
    } finally {
      if (active) timer = setTimeout(poll, 30000);
    }
  };
  poll();
  return () => { active = false; clearTimeout(timer); controller.abort(); };
};

const changePassword = (email, currentPassword, newPassword) => request('/api/auth/change-password', {
  method: 'PUT', data: { email, currentPassword, newPassword },
});

let productsCache = null;
let lastCacheTime = 0;
let productsRequest = null;
let productsRequestVersion = 0;
const getCachedProducts = async (forceRefresh = false) => {
  if (!forceRefresh && productsCache && Date.now() - lastCacheTime < 30000) return productsCache;
  if (productsRequest && !forceRefresh) return productsRequest;
  // Public pages always use public fields, including during an admin session.
  // No supplier addresses or internal counts are retained after signing out.
  const version = ++productsRequestVersion;
  const pending = request('/api/products/public', { authenticated: false })
    .then(data => {
      if (!Array.isArray(data)) throw new Error('Invalid product response');
      // A slow request started before an admin update cannot replace the newer
      // visibility response fetched by forceRefresh.
      if (version === productsRequestVersion) {
        productsCache = data;
        lastCacheTime = Date.now();
      }
      return productsCache || data;
    })
    .catch(error => {
      console.error('Product availability refresh failed:', error);
      return productsCache || [];
    })
    .finally(() => { if (productsRequest === pending) productsRequest = null; });
  productsRequest = pending;
  return pending;
};

export {
  auth, db, signInWithEmailAndPassword, signOut, onAuthStateChanged,
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, orderBy, where, onSnapshot, serverTimestamp, setDoc,
  changePassword, getCachedProducts, request,
};
