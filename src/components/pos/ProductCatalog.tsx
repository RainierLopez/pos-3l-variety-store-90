
import { Button } from "@/components/ui/button";
import { Product } from "@/types/pos";

interface ProductCatalogProps {
  products: Product[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onAddToCart: (product: Product) => void;
}

export const ProductCatalog = ({
  products,
  selectedCategory,
  onCategoryChange,
  onAddToCart,
}: ProductCatalogProps) => {
  return (
    <div className="glass-panel p-6 animate-in">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold">Products</h2>
        <div className="flex gap-2">
          <Button
            onClick={() => onCategoryChange("meat")}
            variant={selectedCategory === "meat" ? "default" : "outline"}
            style={selectedCategory === "meat" ? { backgroundColor: '#8B4513', color: 'white' } : {}}
          >
            Meat
          </Button>
          <Button
            onClick={() => onCategoryChange("vegetable")}
            variant={selectedCategory === "vegetable" ? "default" : "outline"}
            style={selectedCategory === "vegetable" ? { backgroundColor: '#8B4513', color: 'white' } : {}}
          >
            Vegetable
          </Button>
        </div>
      </div>
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {products
          .filter((product) => product.category === selectedCategory)
          .map((product) => (
            <button
              key={product.id}
              onClick={() => onAddToCart(product)}
              className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
            >
              <h3 className="font-medium">{product.name}</h3>
              <p className="text-[#8B4513]">₱{product.price.toFixed(2)}</p>
            </button>
          ))}
      </div>
    </div>
  );
};
