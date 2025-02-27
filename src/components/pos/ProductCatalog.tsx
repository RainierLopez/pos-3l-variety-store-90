
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
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
  const [searchQuery, setSearchQuery] = useState("");
  const [barcodeInput, setBarcodeInput] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeInput(e.target.value);
  };

  const handleBarcodeSearch = () => {
    if (!barcodeInput) return;
    
    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      onAddToCart(product);
      setBarcodeInput("");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBarcodeSearch();
    }
  };

  const filteredProducts = products
    .filter((product) => product.category === selectedCategory)
    .filter((product) => 
      searchQuery 
        ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          product.barcode.includes(searchQuery)
        : true
    );

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

      <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex gap-2">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={handleSearch}
            className="flex-1"
          />
        </div>
        <div className="flex gap-2">
          <Input 
            placeholder="Enter barcode..."
            value={barcodeInput}
            onChange={handleBarcodeInput}
            onKeyPress={handleKeyPress}
            className="flex-1"
          />
          <Button onClick={handleBarcodeSearch}>
            Scan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left flex flex-col h-full"
          >
            <div className="flex-shrink-0 h-32 w-full mb-2 overflow-hidden rounded-md bg-gray-100">
              <img 
                src={product.image || "/placeholder.svg"} 
                alt={product.name}
                className="h-full w-full object-cover"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
            </div>
            <div className="flex-1">
              <h3 className="font-medium line-clamp-2">{product.name}</h3>
              <p className="text-[#8B4513] font-bold">₱{product.price.toFixed(2)}</p>
              <div className="flex justify-between mt-1">
                <span className="text-xs text-gray-500">Stock: {product.stock}</span>
                <span className="text-xs text-gray-500">#{product.barcode.slice(-4)}</span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
