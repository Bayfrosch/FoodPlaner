import '../App.css';

interface ShoppingItemProps {
    id: number,
    name: string,
    completed: boolean,
    onToggle: () => void;
}

function ShoppingItem(props: ShoppingItemProps) {
    return (
        <div 
        className={props.completed ? "shopping-item checked" : "shopping-item" }
        onClick={() => props.onToggle()}
        >            
            <h3>{props.name}</h3>
        </div>
    )
}

export { ShoppingItem };