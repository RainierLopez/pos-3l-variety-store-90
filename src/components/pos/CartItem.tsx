
import { Button } from "@/components/ui/button";
import { Minus, Plus, X } from "lucide-react";
import { CartItem as CartItemType } from "@/types/pos";

interface CartItemProps {
  item: CartItemType;
  onUpdateQuantity: (id: number, change: number) => void;
  onRemove: (id: number) => void;
}

export const CartItem = ({ item, onUpdateQuantity, onRemove }: CartItemProps) => {
  return (
    <div className="flex items-center justify-between bg-white p-4 rounded-lg">
      <div className="flex-1">
        <h3 className="font-medium">{item.name}</h3>
        <p className="text-sm text-gray-500">
          ₱{item.price.toFixed(2)} × {item.quantity}
        </p>
      </div>
      <div className="flex items-center space-x-2">
        <Button
          variant="outline"
          size="icon"
          onClick={() => onUpdateQuantity(item.id, -1)}
        >
          <Minus className="h-4 w-4" />
        </Button>
        <span className="w-8 text-center">{item.quantity}</span>
        <Button
          variant="outline"
          size="icon"
          onClick={() => onUpdateQuantity(item.id, 1)}
        >
          <Plus className="h-4 w-4" />
        </Button>
        <Button
          variant="destructive"
          size="icon"
          onClick={() => onRemove(item.id)}
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
};
