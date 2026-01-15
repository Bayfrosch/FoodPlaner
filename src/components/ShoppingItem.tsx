import { memo } from 'react';
import '../App.css';

interface ShoppingItemProps {
    id: number,
    name: string,
    completed: boolean,
    onToggle: () => void;
}

const ShoppingItem = memo(function ShoppingItem(props: ShoppingItemProps) {
    return (
        <div className="shopping-item-wrapper">
            <div 
                className={props.completed ? "shopping-item checked" : "shopping-item" }
                onClick={() => props.onToggle()}
            >
                <h3>{props.name}</h3>
            </div>
        </div>
    )
});

export { ShoppingItem };