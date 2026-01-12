import { useState } from "react";
import '../App.css';

interface ShoppingItemProps {
    id: number,
    name: string,
    quantity: number
}

function ShoppingItem(props: ShoppingItemProps) {
    const [checked, setChecked] = useState(false);

    return (
        <div className={checked ? "shopping-item checked" : "shopping-item" }
        onClick={() => setChecked(!checked)}
        >            
            <h3>{props.name}</h3>
            <p>Quantity: {props.quantity}</p>
        </div>
    )
}

export { ShoppingItem };