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

  return (
    <div>
      <h1>Shopping List</h1>
      {items.map(item => (
        <ShoppingItem 
          key={item.id}
          id={item.id}
          name={item.name}
          completed={item.completed}
          onToggle={() => handleToggle(item.id)}
        />
      ))}
    </div>
  );
}

export default App
