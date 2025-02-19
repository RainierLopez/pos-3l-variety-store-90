
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { CreditCard, Printer, Wallet, DollarSign, Database } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProductCatalog } from "@/components/pos/ProductCatalog";
import { CartItem } from "@/components/pos/CartItem";
import { CardPayment } from "@/components/pos/payments/CardPayment";
import { EWalletPayment } from "@/components/pos/payments/EWalletPayment";
import { Product, CardDetails } from "@/types/pos";

const POS = () => {
  const [cart, setCart] = useState<Product[]>([]);
  const [paymentComplete, setPaymentComplete] = useState(false);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string | null>(null);
  const [showCardForm, setShowCardForm] = useState(false);
  const [showEWalletForm, setShowEWalletForm] = useState(false);
  const [selectedCategory, setSelectedCategory] = useState("meat");
  const [cardDetails, setCardDetails] = useState<CardDetails>({
    cardNumber: "",
    expiryDate: "",
    cvv: "",
  });
  const { toast } = useToast();
  const navigate = useNavigate();

  const products: Product[] = [
    { id: 1, name: "Liempo (Per kg)", price: 230, quantity: 0, category: "meat" },
    { id: 2, name: "Lechon Roll (Per kg)", price: 200, quantity: 0, category: "meat" },
    { id: 3, name: "Bacon (Per kg)", price: 215, quantity: 0, category: "meat" },
    { id: 4, name: "Chicken Drumsticks (Per kg)", price: 180, quantity: 0, category: "meat" },
    { id: 5, name: "Chicken Wings (Per kg)", price: 120, quantity: 0, category: "meat" },
    { id: 6, name: "Eggplant (Per kg)", price: 40, quantity: 0, category: "vegetable" },
    { id: 7, name: "Carrots (Per kg)", price: 80, quantity: 0, category: "vegetable" },
    { id: 8, name: "Sayote (Per kg)", price: 50, quantity: 0, category: "vegetable" },
    { id: 9, name: "Potatoes (Per kg)", price: 80, quantity: 0, category: "vegetable" },
    { id: 10, name: "Garlic (Per kg)", price: 103.63, quantity: 0, category: "vegetable" },
    { id: 11, name: "Onion (Per kg)", price: 89.13, quantity: 0, category: "vegetable" },
  ];

  const addToCart = (product: Product) => {
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
      }).filter(item => item.quantity > 0)
    );
  };

  const removeFromCart = (productId: number) => {
    setPaymentComplete(false);
    setSelectedPaymentMethod(null);
    setCart((currentCart) =>
      currentCart.filter((item) => item.id !== productId)
    );
  };

  const total = cart.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
    setShowCardForm(methodId === "card");
    setShowEWalletForm(methodId === "wallet");
    
    if (methodId === "cash") {
      toast({
        title: "Cash Payment Selected",
        description: "The transaction will be successful once the payment is handed and the receipt will be given.",
      });
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        localStorage.setItem(`receipt-${Date.now()}`, imageData);
        toast({
          title: "QR Code received",
          description: "Processing your payment...",
        });
        setTimeout(handlePayment, 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleCardSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
      toast({
        title: "Missing card details",
        description: "Please fill in all card details",
        variant: "destructive",
      });
      return;
    }
    handlePayment();
  };

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

    const calculatedTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const transaction = {
      id: Math.random().toString(36).substr(2, 9),
      timestamp: new Date().toISOString(),
      total: calculatedTotal,
      status: selectedPaymentMethod === "cash" ? "pending" : "completed",
      paymentMethod: selectedPaymentMethod,
      items: cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price
      })),
      ...(selectedPaymentMethod === "card" && {
        cardDetails: {
          cardNumber: cardDetails.cardNumber.slice(-4),
          expiryDate: cardDetails.expiryDate
        }
      })
    };

    const transactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    transactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(transactions));

    toast({
      title: selectedPaymentMethod === "cash" ? "Initial Order Successful!" : "Payment successful",
      description: `Total amount: ₱${calculatedTotal.toFixed(2)}`,
    });
    setPaymentComplete(true);
    setShowCardForm(false);
    setShowEWalletForm(false);
  };

  const viewTransactions = () => {
    navigate("/transactions");
  };

  const resetTransaction = () => {
    setCart([]);
    setPaymentComplete(false);
    setSelectedPaymentMethod(null);
    setCardDetails({
      cardNumber: "",
      expiryDate: "",
      cvv: "",
    });
  };

  const paymentMethods = [
    { id: "cash", name: "Cash", icon: <DollarSign className="h-4 w-4" /> },
    { id: "card", name: "Card", icon: <CreditCard className="h-4 w-4" /> },
    { id: "wallet", name: "E-Wallet", icon: <Wallet className="h-4 w-4" /> },
  ];

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-2 gap-8">
        <ProductCatalog
          products={products}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
        />

        <div className="glass-panel p-6 animate-in">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-bold">Cart</h2>
            <Button
              onClick={viewTransactions}
              variant="outline"
              className="flex items-center gap-2"
            >
              <Database className="h-4 w-4" />
              View Transactions
            </Button>
          </div>

          <div className="space-y-4">
            {cart.map((item) => (
              <CartItem
                key={item.id}
                item={item}
                onUpdateQuantity={updateQuantity}
                onRemove={removeFromCart}
              />
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
                        onClick={() => handlePaymentMethodSelect(method.id)}
                        style={selectedPaymentMethod === method.id ? { backgroundColor: '#8B4513', color: 'white' } : {}}
                      >
                        {method.icon}
                        {method.name}
                      </Button>
                    ))}
                  </div>
                </div>

                {showCardForm && (
                  <CardPayment
                    cardDetails={cardDetails}
                    onCardDetailsChange={setCardDetails}
                    onSubmit={handleCardSubmit}
                  />
                )}

                {showEWalletForm && (
                  <EWalletPayment
                    onFileUpload={handleFileUpload}
                  />
                )}
                
                <div className="border-t pt-4">
                  <div className="flex justify-between mb-4">
                    <span className="font-bold">Total:</span>
                    <span className="font-bold">
                      ₱{total.toFixed(2)}
                    </span>
                  </div>
                  {!showCardForm && !showEWalletForm && (
                    <Button
                      onClick={handlePayment}
                      className="w-full"
                      style={{ backgroundColor: '#8B4513', color: 'white' }}
                    >
                      <CreditCard className="mr-2 h-4 w-4" />
                      Pay Now
                    </Button>
                  )}
                </div>
              </div>
            )}

            {paymentComplete && (
              <div className="mt-4 space-y-4 animate-in">
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                  {selectedPaymentMethod === "cash" ? (
                    <>
                      <p className="font-medium">Pending Payment</p>
                      <p className="text-sm">Total Bill: ₱{total.toFixed(2)}</p>
                      <p className="text-sm">Method: Cash</p>
                    </>
                  ) : (
                    <>
                      <p className="font-medium">Payment Successful!</p>
                      <p className="text-sm">Total paid: ₱{total.toFixed(2)}</p>
                      <p className="text-sm">Method: {selectedPaymentMethod}</p>
                    </>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <Button
                    onClick={() => {
                      toast({
                        title: "Receipt printed",
                        description: "The receipt has been sent to the printer.",
                      });
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    <Printer className="mr-2 h-4 w-4" />
                    {selectedPaymentMethod === "cash" ? "Print Initial Receipt" : "Print Receipt"}
                  </Button>
                  <Button
                    onClick={resetTransaction}
                    className="w-full"
                    style={{ backgroundColor: '#8B4513', color: 'white' }}
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
