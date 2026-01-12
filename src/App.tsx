import './App.css'
import { ShoppingItem, Checkbox } from './components/ShoppingItem';

function App() {
  return (
    <div>
      <h1>Shopping List</h1>
      <ShoppingItem
        id={1}
        name="Apples"
        quantity={5}
      />
      <ShoppingItem
        id={2}
        name="Bananas"
        quantity={3}
      />
      <Checkbox label="I have completed my shopping" />
    </div>
  );
}

export default App
