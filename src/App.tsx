import { useState } from 'react';
import './App.css'
import { ShoppingItem } from './components/ShoppingItem';

interface ShoppingItemData {
  id: number;
  name: string;
  completed: boolean;
}

function App() {
  const [items, setItems] = useState<ShoppingItemData[]>([
    { id: 1, name: "Brot", completed: false },
    { id: 2, name: "Milch", completed: true },
    { id: 3, name: "Eier", completed: false }
  ]);

  const [inputValue, setInputValue] = useState("");

  const handleSubmit = () => {
    if (inputValue.trim() === "") return;
    const newItem: ShoppingItemData = {
      id: items.length + 1,
      name: inputValue,
      completed: false
    };
    setItems([...items, newItem]);
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
        {items.map(item => (
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
        <button onClick={() => setItems([])}>Liste leeren</button>
      </div>
    </div>
  );
}

export default App
