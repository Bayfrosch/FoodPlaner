import { useEffect, useState } from 'react';
import './App.css'
import { ShoppingItem } from './components/ShoppingItem';
import { getItems, createItem, deleteItem, updateItem } from './services/api';

interface ShoppingItemData {
  id: number;
  name: string;
  completed: boolean;
}

function App() {
  const [items, setItems] = useState<ShoppingItemData[]>([]);
  const [inputValue, setInputValue] = useState("");
  const [nextId, setNextId] = useState(1);
  const [newItemName, setNewItemName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<String | null>(null);

  useEffect(() => {
    loadItems();
  },[]);

  const loadItems = async () => {
    try {
      setLoading(true);
      const data = await getItems();
      setItems(data);
    } catch (err) {
      setError('Fehler beim laden der Items')
      console.error(err)
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = () => {
    if (inputValue.trim() === "") return;
    const newItem: ShoppingItemData = {
      id: nextId,
      name: inputValue,
      completed: false
    };
    setItems([...items, newItem]);
    setNextId(nextId + 1);
    setInputValue("");
  };

  const handleToggle = async (id: number) => {
    try {
      // Finde das Item
      const item = items.find(i => i.id === id);
      if (! item) return;

      // API Call - toggle completed
      const updatedItem = await updateItem(id, !item.completed);
      
      // State updaten
      setItems(items.map(i => i.id === id ? updatedItem : i));
    } catch (error) {
      console.error('Fehler beim Toggle:', error);
    }
  };

  const handleAddItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (! newItemName.trim()) return;

    try {
      const newItem = await createItem(newItemName);
      setItems([...items, newItem]);
      setNewItemName('');
    } catch (err) {
      setError('Fehler beim Erstellen des Items');
      console.error(err);
    }
  };

  const handleDeleteItem = async (id: number) => {
    try {
      await deleteItem(id);
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      setError('Fehler beim Löschen des Items');
      console.error(err);
    }
  };

  const handleToggleItem = async (id: number, completed: boolean) => {
    try {
      const updatedItem = await updateItem(id, ! completed);
      setItems(items.map(item => item.id === id ? updatedItem : item));
    } catch (err) {
      setError('Fehler beim Aktualisieren des Items');
      console.error(err);
    }
  };

  if (loading) return <div>Laden...</div>;
  if (error) return <div>Error: {error}</div>;

  return (
    <div>
      <div>
        <h1>Shopping List</h1>
        {items
        .sort((a, b) => Number(a.completed) - Number(b.completed))
        .map(item => (
          <ShoppingItem 
            key={item.id}
            id={item.id}
            name={item.name}
            completed={item.completed}
            onToggle={() => handleToggle(item.id)}
          />
        ))}
      </div>
      <div>
        <input 
          type="text" 
          value={inputValue} 
          onChange={(e) => setInputValue(e.target.value)} 
          placeholder="Was brauchst du?"
        />
        <br/>
        <button onClick={handleSubmit}>Hinzufügen</button>
        <button onClick={() => setItems(items.filter(item => !item.completed))}>Fertige leeren</button>
      </div>
    </div>
  );
}

export default App
