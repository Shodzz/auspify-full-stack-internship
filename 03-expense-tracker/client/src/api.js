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
    res = await fetch(path, {
      method,
      credentials: 'same-origin',
      headers: body !== undefined ? { 'Content-Type': 'application/json' } : undefined,
      body: body !== undefined ? JSON.stringify(body) : undefined,
    });
  } catch {
    throw new ApiError('Could not reach the server. Check that it is running.', 0);
  }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => null);
  if (!res.ok) {
    if (res.status === 401 && !path.startsWith('/api/auth/')) window.dispatchEvent(new Event('session-expired'));
    throw new ApiError(data?.error || `Request failed (${res.status})`, res.status, data?.fields);
  }
  return data;
}

const qs = (params) => {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) p.set(k, v);
  return p.toString();
};

export const api = {
  config: () => request('/api/config'),
  me: () => request('/api/auth/me'),
  login: (body) => request('/api/auth/login', { method: 'POST', body }),
  register: (body) => request('/api/auth/register', { method: 'POST', body }),
  logout: () => request('/api/auth/logout', { method: 'POST', body: {} }),
  updateMe: (body) => request('/api/auth/me', { method: 'PATCH', body }),

  transactions: (filters) => request('/api/transactions?' + qs(filters)),
  exportUrl: (filters) => '/api/transactions/export.csv?' + qs(filters),
  addTx: (body) => request('/api/transactions', { method: 'POST', body }),
  updateTx: (id, body) => request(`/api/transactions/${id}`, { method: 'PUT', body }),
  deleteTx: (id) => request(`/api/transactions/${id}`, { method: 'DELETE' }),

  summary: (month) => request('/api/reports/summary?' + qs({ month })),
};
