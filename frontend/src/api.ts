const API_URL = 'http://localhost:3001/api';

// ============================================
// HELPER FUNCTION für alle API Calls
// ============================================
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = localStorage.getItem('token');

  const headers:  HeadersInit = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string>),
  };

  // Falls Token vorhanden → in Header packen
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  // Falls Fehler → Error werfen
  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'API Error');
  }

  return response.json();
};

// ============================================
// AUTH APIs (Login, Register, etc.)
// ============================================
export const auth = {
  register: (email: string, username: string, password: string) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, username, password }),
    }),

  login: (email: string, password: string) =>
    apiCall('/auth/login', {
      method:  'POST',
      body:  JSON.stringify({ email, password }),
    }),

  me: () => apiCall('/auth/me'),

  updateProfile: (email: string, currentPassword: string, newPassword?: string) =>
    apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ email, currentPassword, newPassword }),
    }),

  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('userId');
  },
};

// ============================================
// LISTS APIs (Einkaufslisten)
// ============================================
export const lists = {
  getAll:  () => apiCall('/lists'),

  getById: (id: number) => apiCall(`/lists/${id}`),

  create: (title: string, description: string = '') =>
    apiCall('/lists', {
      method: 'POST',
      body: JSON.stringify({ title, description }),
    }),

  update: (id: number, title: string, description: string) =>
    apiCall(`/lists/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description }),
    }),

  delete: (id: number) =>
    apiCall(`/lists/${id}`, { method: 'DELETE' }),
};

// ============================================
// ITEMS APIs (Einkaufslisten Items)
// ============================================
export const items = {
  getAll: (listId: number) => apiCall(`/lists/${listId}/items`),

  create: (listId: number, name: string) =>
    apiCall(`/lists/${listId}/items`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  update: (listId: number, itemId: number, completed: boolean) =>
    apiCall(`/lists/${listId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ completed }),
    }),

  delete: (listId: number, itemId:  number) =>
    apiCall(`/lists/${listId}/items/${itemId}`, { method: 'DELETE' }),
};

// ============================================
// COLLABORATORS APIs (Mitarbeiter)
// ============================================
export const collaborators = {
  getAll: (listId: number) =>
    apiCall(`/lists/${listId}/collaborators`),

  add: (listId: number, userId: number, role: 'editor' | 'viewer') =>
    apiCall(`/lists/${listId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ userId, role }),
    }),

  update: (listId: number, userId: number, role: 'editor' | 'viewer') =>
    apiCall(`/lists/${listId}/collaborators/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    }),

  delete: (listId: number, userId: number) =>
    apiCall(`/lists/${listId}/collaborators/${userId}`, {
      method: 'DELETE',
    }),
};