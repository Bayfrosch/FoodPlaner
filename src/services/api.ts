const API_URL = 'http://localhost:3001/api';

export interface ShoppingItem {
    id: number;
    name: string;
    completed: boolean;
}

// GET ALL
export async function getItems(): Promise<ShoppingItem[]> {
  const response = await fetch(`${API_URL}/items`);
  if (!response.ok) {
    throw new Error('Failed to fetch items');
  }
  return response.json();
}

// Post (neues Item)
export async function createItem(name: string): Promise<ShoppingItem> {
  const response = await fetch(`${API_URL}/items`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body:  JSON.stringify({ name })
  });
  if (!response.ok) {
    throw new Error('Failed to create item');
  }
  return response.json();
}

// DELETE Item
export async function deleteItem(id: number): Promise<void> {
  const response = await fetch(`${API_URL}/items/${id}`, {
    method: 'DELETE'
  });
  if (!response.ok) {
    throw new Error('Failed to delete item');
  }
}

// PUT Item (toggle completed)
export async function updateItem(id: number, completed:  boolean): Promise<ShoppingItem> {
  const response = await fetch(`${API_URL}/items/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ completed })
  });
  if (!response.ok) {
    throw new Error('Failed to update item');
  }
  return response.json();
}