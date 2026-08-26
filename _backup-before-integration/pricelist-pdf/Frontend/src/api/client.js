/**
 * Single place where the frontend talks to the backend.
 *
 * The base URL comes from VITE_API_URL (see .env). No secrets ever live
 * here — the API key, database URI and JWT secret stay on the server.
 */

const RAW_BASE = import.meta.env.VITE_API_URL || 'http://localhost:5000';
export const API_BASE = String(RAW_BASE).replace(/\/+$/, '');
const API = `${API_BASE}/api`;

const TOKEN_KEY = 'mvp_admin_token';

/** Error shape every caller can rely on. */
export class ApiError extends Error {
  constructor(message, { status = 0, code = 'NETWORK_ERROR', errors = null } = {}) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.code = code;
    this.errors = errors; // field -> message, for inline form errors
  }

  get isNetwork() {
    return this.status === 0;
  }
  get isValidation() {
    return this.status === 422 || this.status === 400;
  }
}

export const getToken = () => {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
};

export const setToken = (token) => {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* private browsing — the session simply won't persist */
  }
};

async function request(path, { method = 'GET', body, auth = false, timeout = 30000 } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeout);

  const headers = {};
  if (body !== undefined) headers['Content-Type'] = 'application/json';
  if (auth) {
    const token = getToken();
    if (token) headers.Authorization = `Bearer ${token}`;
  }

  let response;
  try {
    response = await fetch(`${API}${path}`, {
      method,
      headers,
      body: body === undefined ? undefined : JSON.stringify(body),
      signal: controller.signal,
    });
  } catch (err) {
    clearTimeout(timer);
    if (err.name === 'AbortError') {
      throw new ApiError('The server took too long to respond. Please try again.', {
        code: 'TIMEOUT',
      });
    }
    throw new ApiError(
      'We could not reach the server. Please check your internet connection and try again.',
      { code: 'NETWORK_ERROR' }
    );
  } finally {
    clearTimeout(timer);
  }

  let payload = null;
  try {
    payload = await response.json();
  } catch {
    payload = null;
  }

  if (!response.ok) {
    if (response.status === 401 && auth) setToken(null);
    throw new ApiError(payload?.message || `Request failed (${response.status})`, {
      status: response.status,
      code: payload?.code || 'REQUEST_FAILED',
      errors: payload?.errors || null,
    });
  }

  return payload;
}

// ── Is VITE_API_URL actually pointing at THIS backend? ──────
//
// Ports like 5000 are commonly taken by another project. When that
// happens every call quietly hits a stranger's API and the errors make
// no sense ("Email/userId and password required"), so check once and
// say plainly what is wrong.
const SERVICE_NAME = 'mvp-crackers-backend';
let apiCheck = null;

export function checkApiTarget() {
  if (apiCheck) return apiCheck;

  apiCheck = (async () => {
    try {
      const res = await fetch(`${API}/health`, { signal: AbortSignal.timeout(8000) });
      const body = await res.json().catch(() => null);

      if (body?.service === SERVICE_NAME) return { ok: true };

      const message =
        `Something other than the MVP Crackers backend is answering at ${API_BASE}. ` +
        `Start the backend (npm run dev in the Backend folder) or change VITE_API_URL ` +
        `in Frontend/.env to the port it is actually running on, then restart npm run dev.`;
      // eslint-disable-next-line no-console
      console.error('[MVP] ' + message);
      return { ok: false, reason: 'wrong-service', message };
    } catch {
      const message =
        `No backend is answering at ${API_BASE}. Start it with "npm run dev" ` +
        `(or "npm run dev:demo") in the Backend folder.`;
      // eslint-disable-next-line no-console
      console.warn('[MVP] ' + message);
      return { ok: false, reason: 'unreachable', message };
    }
  })();

  return apiCheck;
}

// ── Storefront ──────────────────────────────────────────────
export const fetchSiteConfig = () => request('/config');

export const fetchCategories = () => request('/products?grouped=true');

export const fetchProduct = (id) => request(`/products/${id}`);

/** Server-authoritative totals for the current cart. */
export const fetchQuote = (items, options = {}) =>
  request('/orders/quote', { method: 'POST', body: { items, ...options } });

/** Places the order. `idempotencyKey` makes a repeated click a no-op. */
export const placeOrder = (payload) => request('/orders', { method: 'POST', body: payload });

export const fetchOrder = (orderId) => request(`/orders/${orderId}`);

export const invoiceViewUrl = (orderId) => `${API}/orders/${orderId}/invoice`;
export const invoiceDownloadUrl = (orderId) => `${API}/orders/${orderId}/invoice?download=1`;

/** Fetches the invoice as a File, for the native share sheet. */
export async function fetchInvoiceFile(orderId, fileName = 'invoice.pdf') {
  const res = await fetch(invoiceViewUrl(orderId));
  if (!res.ok) throw new ApiError('The invoice could not be downloaded.', { status: res.status });
  const blob = await res.blob();
  return new File([blob], fileName, { type: 'application/pdf' });
}

// ── Admin ───────────────────────────────────────────────────
export const adminLogin = (email, password) =>
  request('/auth/login', { method: 'POST', body: { email, password } });

export const adminMe = () => request('/auth/me', { auth: true });

export const adminChangePassword = (currentPassword, newPassword) =>
  request('/auth/password', { method: 'PUT', body: { currentPassword, newPassword }, auth: true });

export const adminListOrders = (params = {}) => {
  const qs = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  ).toString();
  return request(`/orders${qs ? `?${qs}` : ''}`, { auth: true });
};

export const adminGetOrder = (id) => request(`/orders/${id}/detail`, { auth: true });

export const adminUpdateStatus = (id, status, note) =>
  request(`/orders/${id}/status`, { method: 'PUT', body: { status, note }, auth: true });

export const adminUpdatePaymentStatus = (id, paymentStatus, paymentReference) =>
  request(`/orders/${id}/payment-status`, {
    method: 'PUT',
    body: { paymentStatus, paymentReference },
    auth: true,
  });

// ── Admin: crackers / products ──────────────────────────────
const qs = (params = {}) => {
  const q = new URLSearchParams(
    Object.entries(params).filter(([, v]) => v !== '' && v !== undefined && v !== null)
  ).toString();
  return q ? `?${q}` : '';
};

/** Full product list including inactive items. Admin token required. */
export const adminListProducts = (params = {}) =>
  request(`/products${qs({ ...params, admin: 'true' })}`, { auth: true });

export const fetchCategoryList = () => request('/products/categories');

export const adminCreateProduct = (payload) =>
  request('/products', { method: 'POST', body: payload, auth: true });

export const adminUpdateProduct = (id, payload) =>
  request(`/products/${id}`, { method: 'PUT', body: payload, auth: true });

/** Dedicated price endpoint — separately audited on the server. */
export const adminUpdatePrice = (id, { price, offerPrice, note } = {}) =>
  request(`/products/${id}/price`, { method: 'PUT', body: { price, offerPrice, note }, auth: true });

export const adminSetProductStatus = (id, isActive) =>
  request(`/products/${id}/status`, { method: 'PUT', body: { isActive }, auth: true });

export const adminUpdateStock = (id, stock, trackStock) =>
  request(`/products/${id}/stock`, { method: 'PUT', body: { stock, trackStock }, auth: true });

/** Soft-delete by default; `hard` permanently removes an unused product. */
export const adminDeleteProduct = (id, hard = false) =>
  request(`/products/${id}${hard ? '?hard=true' : ''}`, { method: 'DELETE', auth: true });

export const adminBulkPrice = (categoryId, percent) =>
  request('/products/bulk-price', { method: 'POST', body: { categoryId, percent }, auth: true });

export default {
  API_BASE,
  ApiError,
  getToken,
  setToken,
  checkApiTarget,
  fetchSiteConfig,
  fetchCategories,
  fetchProduct,
  fetchQuote,
  placeOrder,
  fetchOrder,
  invoiceViewUrl,
  invoiceDownloadUrl,
  fetchInvoiceFile,
  adminLogin,
  adminMe,
  adminChangePassword,
  adminListOrders,
  adminGetOrder,
  adminUpdateStatus,
  adminUpdatePaymentStatus,
  adminListProducts,
  fetchCategoryList,
  adminCreateProduct,
  adminUpdateProduct,
  adminUpdatePrice,
  adminSetProductStatus,
  adminUpdateStock,
  adminDeleteProduct,
  adminBulkPrice,
};
