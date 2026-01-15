const API_URL = typeof window !== 'undefined' ? '/api' : 'http://localhost:3000/api';

// ============================================
// HELPER FUNCTION für alle API Calls
// ============================================
export const apiCall = async (
  endpoint: string,
  options: RequestInit = {}
) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

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
    let error: any = { error: 'API Error' };
    try {
      const contentType = response.headers.get('content-type');
      if (contentType?.includes('application/json')) {
        error = await response.json();
      } else {
        error = { error: `HTTP ${response.status}: ${response.statusText}` };
      }
    } catch (e) {
      error = { error: `HTTP ${response.status}: ${response.statusText}` };
    }
    
    // Falls 401 (Unauthorized) and not on login page → redirect zu Login
    if (response.status === 401 && typeof window !== 'undefined') {
      const isLoginPage = window.location.pathname === '/login';
      const isRegisterPage = window.location.pathname === '/register';
      
      if (!isLoginPage && !isRegisterPage) {
        localStorage.removeItem('token');
        localStorage.removeItem('userId');
        window.location.href = '/login';
      }
    }
    
    throw new Error(error.error || 'API Error');
  }

  return response.json();
};

// ============================================
// AUTH APIs (Login, Register, etc.)
// ============================================
export const auth = {
  register: (username: string, password: string) =>
    apiCall('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, password }),
    }),

  login: (username: string, password: string) =>
    apiCall('/auth/login', {
      method:  'POST',
      body:  JSON.stringify({ username, password }),
    }),

  me: () => apiCall('/auth/me'),

  updateProfile: (currentPassword: string, newPassword?: string) =>
    apiCall('/auth/profile', {
      method: 'PUT',
      body: JSON.stringify({ currentPassword, newPassword }),
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

  getCategories: (id: number) => apiCall(`/lists/${id}/categories`),

  syncCategory: (id: number, itemName: string, category: string | null) =>
    apiCall(`/lists/${id}/categories`, {
      method: 'POST',
      body: JSON.stringify({ itemName, category }),
    }),

  deleteCategory: (id: number, category: string) =>
    apiCall(`/lists/${id}/categories/${encodeURIComponent(category)}`, { method: 'DELETE' }),

  getCategoryOrder: (id: number) => apiCall(`/lists/${id}/categories/order`),

  updateCategoryOrder: (id: number, categories: string[]) =>
    apiCall(`/lists/${id}/categories/order`, {
      method: 'PUT',
      body: JSON.stringify({ categories }),
    }),
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

  updateCategory: (listId: number, itemId: number, category: string | null) =>
    apiCall(`/lists/${listId}/items/${itemId}`, {
      method: 'PUT',
      body: JSON.stringify({ category }),
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

  invite: (listId: number, username: string, role: 'editor' | 'viewer') =>
    apiCall(`/lists/${listId}/collaborators`, {
      method: 'POST',
      body: JSON.stringify({ username, role }),
    }),

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

  remove: (listId: number, collaboratorId: number) =>
    apiCall(`/lists/${listId}/collaborators/${collaboratorId}`, { method: 'DELETE' }),

  accept: (listId: number, collaboratorId: number) =>
    apiCall(`/lists/${listId}/collaborators/${collaboratorId}/accept`, {
      method: 'POST',
    }),
};

// ============================================
// RECIPES APIs (Rezepte)
// ============================================
export const recipes = {
  getAll: () => apiCall('/recipes'),

  getById: (id: number) => apiCall(`/recipes/${id}`),

  create: (title: string, description: string = '', items: Array<{ name: string }> = []) =>
    apiCall('/recipes', {
      method: 'POST',
      body: JSON.stringify({ title, description, items }),
    }),

  update: (id: number, title: string, description: string) =>
    apiCall(`/recipes/${id}`, {
      method: 'PUT',
      body: JSON.stringify({ title, description }),
    }),

  delete: (id: number) =>
    apiCall(`/recipes/${id}`, { method: 'DELETE' }),

  addItem: (id: number, name: string) =>
    apiCall(`/recipes/${id}/items`, {
      method: 'POST',
      body: JSON.stringify({ name }),
    }),

  deleteItem: (id: number, itemId: number) =>
    apiCall(`/recipes/${id}/items/${itemId}`, { method: 'DELETE' }),

  addToList: (id: number, listId: number) =>
    apiCall(`/recipes/${id}/add-to-list`, {
      method: 'POST',
      body: JSON.stringify({ listId }),
    }),
};