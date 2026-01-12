interface ShoppingItemProps {
    id: number,
    name: string,
    quantity: number
}

function ShoppingItem(props: ShoppingItemProps) {
    return (
        <div>
            <h3>{props.name}</h3>
            <p>Quantity: {props.quantity}</p>
        </div>
    )
}

interface CheckboxProps {
    label: string
}

function Checkbox(props: CheckboxProps) {
    return (
        <label>
            <input type="checkbox" /> 
            {props.label} 
        </label>
    );
}

export { ShoppingItem, Checkbox };