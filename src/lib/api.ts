const API_URL = import.meta.env.VITE_API_URL || '';

async function request<T>(
  path: string,
  options: RequestInit & { method?: string } = {}
): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error((data as { error?: string }).error || res.statusText || 'Request failed');
  }
  return data as T;
}

export const api = {
  auth: {
    me: () => request<{ user: { id: string; email: string; display_name: string; is_admin: boolean } }>('/api/auth/me'),
    login: (email: string, password: string) =>
      request<{ user: { id: string; email: string; display_name: string; is_admin: boolean } }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),
    register: (email: string, password: string, display_name: string) =>
      request<{ user: { id: string; email: string; display_name: string; is_admin: boolean } }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password, display_name }),
      }),
    logout: () => request<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  },
  products: {
    list: () =>
      request<
        Array<{
          id: string;
          name: string;
          description: string;
          duration_days: number;
          price: number;
          stock_count: number;
        }>
      >('/api/products'),
    get: (id: string) =>
      request<{
        id: string;
        name: string;
        description: string;
        duration_days: number;
        price: number;
        stock_count: number;
      }>(`/api/products/${id}`),
  },
  keys: {
    list: () =>
      request<
        Array<{
          id: string;
          key_code: string;
          status: string;
          duration_days: number;
          hwid: string | null;
          expires_at: string | null;
          activated_at: string | null;
          hwid_reset_count: number;
          last_hwid_reset_at: string | null;
        }>
      >('/api/keys'),
    getById: (id: string) =>
      request<{ id: string; key_code: string }>(`/api/keys/by-id/${id}`),
    resetHwid: (key_code: string) =>
      request<{ success: boolean; message: string }>('/api/keys/reset-hwid', {
        method: 'POST',
        body: JSON.stringify({ key_code }),
      }),
  },
  orders: {
    create: (product_id: string) =>
      request<{
        success: boolean;
        order_id: string;
        qris_url: string;
        amount: number;
      }>('/api/orders', {
        method: 'POST',
        body: JSON.stringify({ product_id }),
      }),
    get: (id: string) =>
      request<{ id: string; payment_status: string; key_id: string | null; paid_at: string | null }>(
        `/api/orders/${id}`
      ),
  },
  admin: {
    stats: () =>
      request<{ totalKeys: number; activeKeys: number; usedKeys: number; totalRevenue: number }>(
        '/api/admin/stats'
      ),
    keys: (params?: { status?: string; page?: number }) => {
      const sp = new URLSearchParams();
      if (params?.status) sp.set('status', params.status);
      if (params?.page) sp.set('page', String(params.page));
      const q = sp.toString();
      return request<{
        keys: Array<{
          id: string;
          key_code: string;
          status: string;
          duration_days: number;
          price: number;
          hwid: string | null;
          user_name: string | null;
          created_at: string;
          expires_at: string | null;
        }>;
        total: number;
        page: number;
        totalPages: number;
      }>(`/api/admin/keys${q ? `?${q}` : ''}`);
    },
    keysBulk: (keyIds: string[], action: 'block' | 'delete') =>
      request<{ ok: boolean }>('/api/admin/keys/bulk', {
        method: 'PATCH',
        body: JSON.stringify({ keyIds, action }),
      }),
    resetHwid: (key_code: string, secret?: string) =>
      request<{ success: boolean; message: string }>('/api/admin/keys/reset-hwid', {
        method: 'POST',
        body: JSON.stringify({ key_code, secret }),
      }),
    generateKeys: (product_id: string, quantity: number) =>
      request<{ success: boolean; message: string; keys: Array<{ id: string; key_code: string; created_at: string }> }>(
        '/api/admin/keys/generate',
        {
          method: 'POST',
          body: JSON.stringify({ product_id, quantity }),
        }
      ),
  },
};
