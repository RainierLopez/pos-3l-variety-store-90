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
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

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

  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentTransactionForReceipt, setCurrentTransactionForReceipt] = useState<any>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        const transaction = {
          ...currentTransactionForReceipt,
          ewalletReceipt: imageData
        };
        
        const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        const updatedTransactions = existingTransactions.map((t: any) => 
          t.id === transaction.id ? transaction : t
        );
        
        localStorage.setItem('transactions', JSON.stringify(updatedTransactions));
        
        toast({
          title: "QR Code received",
          description: "Processing your payment...",
        });
        setTimeout(handlePayment, 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrintReceipt = (transaction: any) => {
    setCurrentTransactionForReceipt(transaction);
    setShowPhoneDialog(true);
  };

  const handleSendReceipt = () => {
    if (!phoneNumber.match(/^\d{11}$/)) {
      toast({
        title: "Invalid phone number",
        description: "Please enter a valid 11-digit phone number",
        variant: "destructive",
      });
      return;
    }

    // Update transaction with phone number
    const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const updatedTransactions = existingTransactions.map((t: any) => 
      t.id === currentTransactionForReceipt.id 
        ? { ...t, customerContact: phoneNumber }
        : t
    );
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));

    toast({
      title: "Receipt sent",
      description: `Receipt has been sent to ${phoneNumber}`,
    });

    setShowPhoneDialog(false);
    setPhoneNumber("");
    setCurrentTransactionForReceipt(null);
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

    if (selectedPaymentMethod === "card") {
      if (!cardDetails.cardNumber || !cardDetails.expiryDate || !cardDetails.cvv) {
        toast({
          title: "Invalid card details",
          description: "Please enter valid card information.",
          variant: "destructive",
        });
        return;
      }

      const expiryRegex = /^(0[1-9]|1[0-2])\/([0-9]{2})$/;
      if (!expiryRegex.test(cardDetails.expiryDate)) {
        toast({
          title: "Invalid expiry date",
          description: "Please enter a valid expiry date in MM/YY format.",
          variant: "destructive",
        });
        return;
      }

      const expiryDate = new Date(2000 + parseInt(cardDetails.expiryDate.split('/')[1]), parseInt(cardDetails.expiryDate.split('/')[0]) - 1);
      if (expiryDate < new Date()) {
        toast({
          title: "Card expired",
          description: "Please use a valid, non-expired card.",
          variant: "destructive",
        });
        return;
      }
    }

    const calculatedTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);

    const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const nextOrderNumber = (existingTransactions.length + 1).toString();

    const transaction = {
      id: nextOrderNumber,
      timestamp: new Date().toISOString(),
      total: calculatedTotal,
      status: "pending" as const,
      paymentMethod: selectedPaymentMethod as "cash" | "card" | "wallet",
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

    existingTransactions.push(transaction);
    localStorage.setItem('transactions', JSON.stringify(existingTransactions));

    toast({
      title: "Order Created Successfully",
      description: `Order #${nextOrderNumber} is now pending. Total amount: ₱${calculatedTotal.toFixed(2)}`,
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
      
      <Dialog open={showPhoneDialog} onOpenChange={setShowPhoneDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Enter Phone Number</DialogTitle>
            <DialogDescription>
              Please enter the phone number to send the receipt
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-col gap-2">
              <label htmlFor="phone" className="text-sm font-medium">
                Phone Number
              </label>
              <input
                id="phone"
                type="tel"
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value)}
                placeholder="Enter 11-digit number"
                className="border rounded-md px-3 py-2"
              />
            </div>
            <Button
              onClick={handleSendReceipt}
              className="w-full"
              style={{ backgroundColor: '#8B4513', color: 'white' }}
            >
              Send Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>

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
                    onClick={() => handlePrintReceipt(transaction)}
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
