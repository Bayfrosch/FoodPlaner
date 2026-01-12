import { useState } from 'react';
import './App.css'
import { ShoppingItem } from './components/ShoppingItem';

interface ShoppingItemData {
  id: number;
  name: string;
  completed: boolean;
}

function App() {
  const [items, setItems] = useState<ShoppingItemData[]>([]);

  const [inputValue, setInputValue] = useState("");
  const [nextId, setNextId] = useState(1);

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

  const handleToggle = (id: number) => {
    setItems(
      items.map(item => {
        if (item.id === id) {
          return { ...item, completed: !item.completed };
        }
        return item;
      })
    );
  };

  const handleDelete = (id: number) => {
    setItems(items.filter(item => item.id !== id));
  };

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
            onDelete={() => handleDelete(item.id)}
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
