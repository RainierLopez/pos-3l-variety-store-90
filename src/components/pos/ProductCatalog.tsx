
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";
import { Product } from "@/types/pos";
import { toast } from "@/hooks/use-toast";
import { Search, Barcode, ChevronLeft } from "lucide-react";

interface ProductCatalogProps {
  products: Product[];
  selectedCategory: string;
  onCategoryChange: (category: string) => void;
  onAddToCart: (product: Product) => void;
  isCollapsed: boolean;
  onToggleCollapse: () => void;
}

export const ProductCatalog = ({
  products,
  selectedCategory,
  onCategoryChange,
  onAddToCart,
  isCollapsed,
  onToggleCollapse,
}: ProductCatalogProps) => {
  const [searchQuery, setSearchQuery] = useState("");

  const handleSearch = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  };

  const filteredProducts = products
    .filter((product) => product.category === selectedCategory)
    .filter((product) => 
      searchQuery 
        ? product.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
          product.barcode.includes(searchQuery)
        : true
    );

  if (isCollapsed) {
    return (
      <Button 
        onClick={onToggleCollapse} 
        className="fixed left-0 top-1/2 transform -translate-y-1/2 z-10 h-24 rounded-r-full rounded-l-none shadow-lg"
        style={{ backgroundColor: '#8B4513', color: 'white' }}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>
    );
  }

  return (
    <div className="glass-panel p-6 animate-in rounded-xl shadow-lg border border-white border-opacity-30 bg-white bg-opacity-80">
      <div className="flex justify-between items-center mb-6">
        <h2 className="text-2xl font-bold text-[#8B4513]">Products</h2>
        <div className="flex gap-2 items-center">
          <Button
            onClick={() => onCategoryChange("meat")}
            variant={selectedCategory === "meat" ? "default" : "outline"}
            style={selectedCategory === "meat" ? { backgroundColor: '#8B4513', color: 'white' } : {}}
            className="rounded-full shadow-md transition-all hover:scale-105"
          >
            Meat
          </Button>
          <Button
            onClick={() => onCategoryChange("vegetable")}
            variant={selectedCategory === "vegetable" ? "default" : "outline"}
            style={selectedCategory === "vegetable" ? { backgroundColor: '#8B4513', color: 'white' } : {}}
            className="rounded-full shadow-md transition-all hover:scale-105"
          >
            Vegetable
          </Button>
          <Button
            onClick={onToggleCollapse}
            variant="outline"
            className="rounded-full ml-2"
          >
            <ChevronLeft className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mb-6">
        <div className="flex gap-2 relative">
          <Input
            placeholder="Search products..."
            value={searchQuery}
            onChange={handleSearch}
            className="flex-1 pl-10 rounded-full bg-white border-2 border-[#8B4513] focus-visible:ring-[#8B4513]"
          />
          <Search className="absolute left-3 top-3 text-[#8B4513] h-4 w-4" />
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
        {filteredProducts.map((product) => (
          <button
            key={product.id}
            onClick={() => onAddToCart(product)}
            className="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all duration-200 text-left flex flex-col h-full border border-gray-100 hover:border-[#8B4513] hover:scale-105 group"
          >
            <div className="flex-shrink-0 h-32 w-full mb-2 overflow-hidden rounded-md bg-gray-100 relative">
              <img 
                src={product.image || "/placeholder.svg"} 
                alt={product.name}
                className="h-full w-full object-cover transition-all group-hover:scale-110"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = "/placeholder.svg";
                }}
              />
              <div className="absolute bottom-0 right-0 bg-[#8B4513] text-white text-xs px-2 py-1 rounded-tl-md">
                #{product.barcode.slice(-4)}
              </div>
            </div>
            <div className="flex-1">
              <h3 className="font-medium line-clamp-2 group-hover:text-[#8B4513]">{product.name}</h3>
              <p className="text-[#8B4513] font-bold text-lg">₱{product.price.toFixed(2)}</p>
              <div className="mt-1 flex items-center justify-between">
                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                  Stock: {product.stock}
                </span>
                <span className="text-xs text-[#8B4513] opacity-0 group-hover:opacity-100 transition-opacity">
                  Add to cart
                </span>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  );
};
