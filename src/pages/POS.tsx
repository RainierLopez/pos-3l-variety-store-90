
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { X, Plus, Minus, CreditCard, Printer, Wallet, DollarSign } from "lucide-react";

interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
}

const POS = () => {
  const [cart, setCart] = useState<Product[]>([]);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const { toast } = useToast();

  const products = [
    { id: 1, name: "Product 1", price: 10 },
    { id: 2, name: "Product 2", price: 20 },
    { id: 3, name: "Product 3", price: 30 },
    { id: 4, name: "Product 4", price: 40 },
  ];

  const addToCart = (product: { id: number; name: string; price: number }) => {
    setPaymentComplete(false);
    setSelectedPaymentMethod(null);
    setCart((currentCart) => {
      const existingProduct = currentCart.find((item) => item.id === product.id);
      if (existingProduct) {
        return currentCart.map((item) =>
          item.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...currentCart, { ...product, quantity: 1 }];
    });
  };

  const removeFromCart = (productId: number) => {
    setPaymentComplete(false);
    setSelectedPaymentMethod(null);
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  const updateQuantity = (productId: number, change: number) => {
    setPaymentComplete(false);
    setSelectedPaymentMethod(null);
    setCart((currentCart) =>
      currentCart.map((item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change;
          return newQuantity > 0
            ? { ...item, quantity: newQuantity }
            : item;
        }
        return item;
      })
    );
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handlePayment = () => {
    if (!selectedPaymentMethod) {
      toast({
        title: "Payment method required",
        description: "Please select a payment method before proceeding.",
        variant: "destructive",
      });
      return;
    }

    if (cart.length === 0) {
      toast({
        title: "Cart is empty",
        description: "Please add items to the cart before proceeding to payment.",
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Payment successful",
      description: `Total amount: $${total.toFixed(2)} paid via ${selectedPaymentMethod}`,
    });
    setPaymentComplete(true);
  };

  const printReceipt = () => {
    toast({
      title: "Receipt printed",
      description: "The receipt has been sent to the printer.",
    });
  };

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: <DollarSign className="h-4 w-4" /> },
    { id: "card", name: "Card", icon: <CreditCard className="h-4 w-4" /> },
    { id: "wallet", name: "E-Wallet", icon: <Wallet className="h-4 w-4" /> },
  ];

  const resetTransaction = () => {
    setCart([]);
    setPaymentComplete(false);
    setSelectedPaymentMethod(null);
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        {/* Products Section */}
        <div className="glass-panel p-6 animate-in">
          <h2 className="text-2xl font-bold mb-4">Products</h2>
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            {products.map((product) => (
              <button
                key={product.id}
                onClick={() => addToCart(product)}
                className="p-4 bg-white rounded-lg shadow-sm hover:shadow-md transition-shadow duration-200 text-left"
              >
                <h3 className="font-medium">{product.name}</h3>
                <p className="text-primary">${product.price.toFixed(2)}</p>
              </button>
            ))}
          </div>
        </div>

        {/* Cart Section */}
        <div className="glass-panel p-6 animate-in">
          <h2 className="text-2xl font-bold mb-4">Cart</h2>
          <div className="space-y-4">
            {cart.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-white p-4 rounded-lg"
              >
                <div className="flex-1">
                  <h3 className="font-medium">{item.name}</h3>
                  <p className="text-sm text-gray-500">
                    ${item.price.toFixed(2)} × {item.quantity}
                  </p>
                </div>
                <div className="flex items-center space-x-2">
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(item.id, -1)}
                  >
                    <Minus className="h-4 w-4" />
                  </Button>
                  <span className="w-8 text-center">{item.quantity}</span>
                  <Button
                    variant="outline"
                    size="icon"
                    onClick={() => updateQuantity(item.id, 1)}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="destructive"
                    size="icon"
                    onClick={() => removeFromCart(item.id)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}

            {cart.length === 0 && (
              <div className="text-center py-8 text-gray-500">
                Cart is empty. Add some products!
              </div>
            )}

            {cart.length > 0 && !paymentComplete && (
              <div className="mt-4 space-y-4">
                <div className="border-t pt-4">
                  <h3 className="font-medium mb-2">Select Payment Method</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {paymentMethods.map((method) => (
                      <Button
                        key={method.id}
                        variant={selectedPaymentMethod === method.id ? "default" : "outline"}
                        className="w-full"
                        onClick={() => setSelectedPaymentMethod(method.id)}
                      >
                        {method.icon}
                        {method.name}
                      </Button>
                    ))}
                  </div>
                </div>
                
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-4">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold">
                      ${total.toFixed(2)}
                    </span>
                  </div>
                  <Button
                    onClick={handlePayment}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    <CreditCard className="mr-2 h-4 w-4" />
                    Pay Now
                  </Button>
                </div>
              </div>
            )}

            {paymentComplete && (
              <div className="mt-4 space-y-4 animate-in">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  <p className="font-medium">Payment Successful!</p>
                  <p className="text-sm">Total paid: ${total.toFixed(2)}</p>
                  <p className="text-sm">Method: {selectedPaymentMethod}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={printReceipt}
                    variant="outline"
                    className="w-full"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    Print Receipt
                  </Button>
                  <Button
                    onClick={resetTransaction}
                    className="w-full bg-primary hover:bg-primary/90"
                  >
                    New Transaction
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default POS;
