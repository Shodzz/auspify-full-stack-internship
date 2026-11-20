export class ApiError extends Error {
  constructor(message, status, fields) {
    super(message);
    this.status = status;
    this.fields = fields || null;
  }
}

async function request(path, { method = 'GET', body } = {}) {
  let res;
  try {
    res = await fetch('/api' + path, {
      method,
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the store. Check your connection and try again.', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.fields);
  return data;
}

const qs = (o) => new URLSearchParams(Object.entries(o).filter(([, v]) => v !== '' && v != null)).toString();

export const api = {
  meta: () => request('/meta'),
  me: () => request('/auth/me'),
  login: (b) => request('/auth/login', { method: 'POST', body: b }),
  register: (b) => request('/auth/register', { method: 'POST', body: b }),
  logout: () => request('/auth/logout', { method: 'POST', body: {} }),

  products: (params) => request('/products?' + qs(params)),
  product: (slug) => request(`/products/${encodeURIComponent(slug)}`),
  quote: (items) => request('/cart/quote', { method: 'POST', body: { items } }),

  placeOrder: (b) => request('/orders', { method: 'POST', body: b }),
  orders: () => request('/orders'),
  order: (id) => request(`/orders/${id}`),
  cancelOrder: (id) => request(`/orders/${id}/cancel`, { method: 'POST', body: {} }),

  admin: {
    stats: () => request('/admin/stats'),
    products: () => request('/admin/products'),
    product: (id) => request(`/admin/products/${id}`),
    createProduct: (b) => request('/admin/products', { method: 'POST', body: b }),
    updateProduct: (id, b) => request(`/admin/products/${id}`, { method: 'PUT', body: b }),
    hideProduct: (id) => request(`/admin/products/${id}`, { method: 'DELETE' }),
    orders: (status) => request('/admin/orders?' + qs({ status })),
    setStatus: (id, status) => request(`/admin/orders/${id}`, { method: 'PATCH', body: { status } }),
  },
};
