  // ══════════════════════════════════════════════════════════
//  LOCAL EXPRESS/MYSQL CONNECTION CLIENT — Al Gani Admin Panel
// ══════════════════════════════════════════════════════════
//
//  This file replaces the Firebase SDK configuration completely.
//  It provides drop-in compatible replacements for Firebase Auth 
//  and Firestore methods, pointing instead to our local Express / MySQL server.
//  
// ══════════════════════════════════════════════════════════

// ── AUTHENTICATION CLIENT STATE ──
const auth = {
  currentUser: null
};

// Restore temporary session from sessionStorage on startup (logs out on tab close)
const savedUser = sessionStorage.getItem('algani_admin_user');
if (savedUser) {
  try {
    auth.currentUser = JSON.parse(savedUser);
  } catch (e) {
    console.error('Failed to parse saved user credentials', e);
  }
}

const authListeners = [];

function triggerAuthChange() {
  authListeners.forEach(callback => callback(auth.currentUser));
}

// Simulated onAuthStateChanged Auth State Guard
const onAuthStateChanged = (authInstance, callback) => {
  authListeners.push(callback);
  // Trigger callback immediately with the restored or null state
  callback(auth.currentUser);
  
  // Return standard Firebase unsubscriber method
  return () => {
    const idx = authListeners.indexOf(callback);
    if (idx > -1) authListeners.splice(idx, 1);
  };
};

// Simulated signInWithEmailAndPassword HTTP Client Handler
const signInWithEmailAndPassword = async (authInstance, email, password) => {
  const res = await fetch('/api/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Login failed' }));
    const error = new Error(errData.error || 'Authentication failed');
    if (errData.code) {
      error.code = errData.code;
    } else if (errData.error && (
      errData.error.toLowerCase().includes('database') || 
      errData.error.toLowerCase().includes('mysql') || 
      errData.error.toLowerCase().includes('connect') || 
      errData.error.toLowerCase().includes('pool') ||
      errData.error.toLowerCase().includes('transaction')
    )) {
      error.code = 'auth/database-error';
    } else {
      error.code = 'auth/invalid-credential';
    }
    throw error;
  }

  const userData = await res.json();
  auth.currentUser = userData;
  sessionStorage.setItem('algani_admin_user', JSON.stringify(userData));
  triggerAuthChange();

  return { user: userData };
};

// Simulated signOut HTTP Client Handler
const signOut = async (authInstance) => {
  auth.currentUser = null;
  sessionStorage.removeItem('algani_admin_user');
  triggerAuthChange();
  return true;
};


// ── FIRESTORE DATABASE MOCKING INTERFACE ──
const db = {};

// Collection Reference Builder
const collection = (dbInstance, collectionPath) => {
  return {
    type: 'collection',
    path: collectionPath
  };
};

// Document Reference Builder
const doc = (dbInstance, collectionPath, docId) => {
  return {
    type: 'document',
    path: collectionPath,
    id: docId
  };
};

// Dummy Firestore Constraints for query construction Compatibility
const query = (collectionRef, ...constraints) => {
  // Returns collection ref as is — sorting & constraints handled by MySQL endpoints
  return collectionRef;
};

const orderBy = (field, direction = 'asc') => ({ type: 'orderBy', field, direction });
const where = (field, operator, value) => ({ type: 'where', field, operator, value });
const serverTimestamp = () => new Date().toISOString();

// Simulated addDoc HTTP Post client mapping
const addDoc = async (collectionRef, data) => {
  const path = collectionRef.path;
  
  // Strip serverTimestamp placeholder strings or mock functions to JSON-friendly data
  const payload = { ...data };
  Object.keys(payload).forEach(key => {
    if (typeof payload[key] === 'function' || payload[key] === undefined) {
      payload[key] = new Date().toISOString();
    }
  });

  const res = await fetch(`/api/${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(payload)
  });

  if (!res.ok) {
    let detail = '';
    try {
      const errBody = await res.json();
      detail = errBody.error || errBody.detail || JSON.stringify(errBody);
    } catch {
      detail = await res.text().catch(() => '');
    }
    throw new Error(
      `API error ${res.status} on /api/${path}${detail ? `: ${detail}` : ''}`
    );
  }

  const savedData = await res.json();
  return {
    id: savedData.id,
    data: () => savedData
  };
};

// Simulated getDocs HTTP Fetch client mapping
const getDocs = async (collectionRef) => {
  const path = collectionRef.path;
  const res = await fetch(`/api/${path}`);
  if (!res.ok) {
    throw new Error(`Failed to fetch database collection '${path}'`);
  }

  const data = await res.json();
  return {
    forEach: (callback) => {
      data.forEach(item => {
        callback({
          id: item.id || item.slug,
          data: () => item
        });
      });
    },
    docs: data.map(item => ({
      id: item.id || item.slug,
      data: () => item
    }))
  };
};

// Simulated getDoc HTTP Fetch single document mapping
const getDoc = async (docRef) => {
  const { path, id } = docRef;
  const res = await fetch(`/api/${path}/${id}`);
  if (!res.ok) {
    throw new Error(`Document '${id}' not found in database path '${path}'`);
  }
  const item = await res.json();
  return {
    exists: () => true,
    id: item.id || item.slug,
    data: () => item
  };
};

// Simulated updateDoc HTTP Put client mapping
const updateDoc = async (docRef, data) => {
  const { path, id } = docRef;
  const res = await fetch(`/api/${path}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`Failed to update database record '${id}' in path '${path}'`);
  }

  const updatedData = await res.json();
  return updatedData;
};

// Simulated setDoc HTTP Put client mapping (used for toggles and settings merges)
const setDoc = async (docRef, data, options = {}) => {
  const { path, id } = docRef;
  const res = await fetch(`/api/${path}/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data)
  });

  if (!res.ok) {
    throw new Error(`Failed to set database configurations for product '${id}'`);
  }

  const savedData = await res.json();
  return savedData;
};

// Simulated onSnapshot Real-time sync pipeline using polling
const onSnapshot = (queryRef, callback, errorCallback) => {
  const path = queryRef.path;
  let lastStringifiedData = '';

  const pollData = async () => {
    try {
      const res = await fetch(`/api/${path}`);
      if (!res.ok) throw new Error(`Fetch failed for polling real-time stream '${path}'`);
      const data = await res.json();

      const stringified = JSON.stringify(data);
      if (stringified !== lastStringifiedData) {
        lastStringifiedData = stringified;

        // Build mock Firebase QuerySnapshot
        const snapshot = {
          forEach: (cb) => {
            data.forEach(item => {
              cb({
                id: item.id || item.slug,
                data: () => item
              });
            });
          },
          docs: data.map(item => ({
            id: item.id || item.slug,
            data: () => item
          }))
        };

        callback(snapshot);
      }
    } catch (err) {
      if (errorCallback) {
        errorCallback(err);
      } else {
        console.error('Real-time synchronization poll failure:', err);
      }
    }
  };

  // Run immediate fetch
  pollData();

  // Establish a 3-second database polling cycle (simulates live Firestore synchronization)
  const pollInterval = setInterval(pollData, 3000);

  // Return unsubscribe cleanup handler
  return () => {
    clearInterval(pollInterval);
  };
};

// Simulated changePassword HTTP Client Handler
const changePassword = async (email, currentPassword, newPassword) => {
  const res = await fetch('/api/auth/change-password', {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, currentPassword, newPassword })
  });

  if (!res.ok) {
    const errData = await res.json().catch(() => ({ error: 'Password change failed' }));
    throw new Error(errData.error || 'Failed to update password');
  }

  return await res.json();
};

// Simulated Cache Store for Products/Offerings
let productsCache = null;
let lastCacheTime = 0;

const getCachedProducts = async (forceRefresh = false) => {
  const now = Date.now();
  // Cache for 30 seconds to prevent constant HTTP queries on route switching
  if (!productsCache || forceRefresh || (now - lastCacheTime > 30000)) {
    try {
      const res = await fetch('/api/products');
      if (res.ok) {
        productsCache = await res.json();
        lastCacheTime = now;
      }
    } catch (e) {
      console.error('Failed to fetch products for cache:', e);
    }
  }
  return productsCache || [];
};

export {
  auth, db,
  signInWithEmailAndPassword, signOut, onAuthStateChanged,
  collection, addDoc, getDocs, getDoc, doc, updateDoc,
  query, orderBy, where, onSnapshot, serverTimestamp, setDoc,
  changePassword, getCachedProducts
};
