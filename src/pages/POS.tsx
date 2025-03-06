import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Database, List, LogOut } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { ProductCatalog } from "@/components/pos/ProductCatalog";
import { CartSummary } from "@/components/pos/CartSummary";
import { PhoneNumberDialog } from "@/components/pos/PhoneNumberDialog";
import { Product, CardDetails, Transaction } from "@/types/pos";
import { products as initialProducts } from "@/data/products";

const POS = () => {
  const [products, setProducts] = useState<Product[]>(() => {
    const savedProducts = localStorage.getItem("products");
    return savedProducts ? JSON.parse(savedProducts) : initialProducts;
  });
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
  const [barcodeInput, setBarcodeInput] = useState("");
  const [isProductCatalogCollapsed, setIsProductCatalogCollapsed] = useState(true);
  const { toast } = useToast();
  const navigate = useNavigate();

  const [showPhoneDialog, setShowPhoneDialog] = useState(false);
  const [phoneNumber, setPhoneNumber] = useState("");
  const [currentTransactionForReceipt, setCurrentTransactionForReceipt] = useState<Transaction | null>(null);
  
  useEffect(() => {
    localStorage.setItem("products", JSON.stringify(products));
  }, [products]);

  const handleBarcodeInput = (e: React.ChangeEvent<HTMLInputElement>) => {
    setBarcodeInput(e.target.value);
  };

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleBarcodeSearch();
    }
  };

  const handleBarcodeSearch = () => {
    if (!barcodeInput) return;
    
    const product = products.find(p => p.barcode === barcodeInput);
    if (product) {
      addToCart(product);
      toast({
        title: "Product Found",
        description: `${product.name} has been added to your cart.`,
      });
      setBarcodeInput("");
    } else {
      const numericBarcode = barcodeInput.replace(/^0+/, '');
      const productWithNumericBarcode = products.find(p => p.barcode.replace(/^0+/, '') === numericBarcode);
      
      if (productWithNumericBarcode) {
        addToCart(productWithNumericBarcode);
        toast({
          title: "Product Found",
          description: `${productWithNumericBarcode.name} has been added to your cart.`,
        });
      } else {
        toast({
          title: "Product Not Found",
          description: `No product matches barcode: ${barcodeInput}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleBarcodeDetected = (barcode: string) => {
    console.log("Barcode detected in POS component:", barcode);
    const product = products.find(p => p.barcode === barcode);
    if (product) {
      addToCart(product);
      toast({
        title: "Product Found",
        description: `${product.name} has been added to your cart.`,
      });
    } else {
      const numericBarcode = barcode.replace(/^0+/, '');
      const productWithNumericBarcode = products.find(p => p.barcode.replace(/^0+/, '') === numericBarcode);
      
      if (productWithNumericBarcode) {
        addToCart(productWithNumericBarcode);
        toast({
          title: "Product Found",
          description: `${productWithNumericBarcode.name} has been added to your cart.`,
        });
      } else {
        toast({
          title: "Product Not Found",
          description: `No product matches barcode: ${barcode}`,
          variant: "destructive",
        });
      }
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        const imageData = reader.result as string;
        
        const calculatedTotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
        const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
        const nextOrderNumber = (existingTransactions.length + 1).toString();

        const newTransaction = {
          id: nextOrderNumber,
          timestamp: new Date().toISOString(),
          total: calculatedTotal,
          status: "pending" as const,
          paymentMethod: "wallet" as const,
          items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            barcode: item.barcode
          })),
          ewalletReceipt: imageData
        };

        existingTransactions.push(newTransaction);
        localStorage.setItem('transactions', JSON.stringify(existingTransactions));
        
        setCurrentTransactionForReceipt(newTransaction);
        
        toast({
          title: "QR Code received",
          description: "Processing your payment...",
        });
        
        setTimeout(() => {
          updateStockLevels();
          setPaymentComplete(true);
          setShowEWalletForm(false);
        }, 2000);
      };
      reader.readAsDataURL(file);
    }
  };

  const handlePrintReceipt = (transaction: Transaction) => {
    const printContent = `
      <div style="font-family: Arial, sans-serif; padding: 20px;">
        <h2 style="text-align: center;">Transaction Receipt</h2>
        <p><strong>Order #${transaction.id}</strong></p>
        <p><strong>Date:</strong> ${new Date(transaction.timestamp).toLocaleString()}</p>
        <p><strong>Payment Method:</strong> ${transaction.paymentMethod}</p>
        <hr/>
        ${transaction.items.map((item: any) => `
          <div style="display: flex; justify-content: space-between; margin: 5px 0;">
            <span>${item.name} x ${item.quantity}</span>
            <span>₱${(item.price * item.quantity).toFixed(2)}</span>
          </div>
        `).join('')}
        <hr/>
        <div style="display: flex; justify-content: space-between; margin-top: 10px;">
          <strong>Total:</strong>
          <strong>₱${transaction.total.toFixed(2)}</strong>
        </div>
        ${transaction.ewalletReceipt ? `
          <div style="margin-top: 20px; text-align: center;">
            <p><strong>E-Wallet Receipt:</strong></p>
            <img src="${transaction.ewalletReceipt}" style="max-width: 200px; margin-top: 10px;"/>
          </div>
        ` : ''}
      </div>
    `;

    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(printContent);
      printWindow.document.close();
      printWindow.print();
      printWindow.close();
    }

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

    const existingTransactions = JSON.parse(localStorage.getItem('transactions') || '[]');
    const updatedTransactions = existingTransactions.map((t: any) => 
      t.id === currentTransactionForReceipt?.id 
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

  const updateStockLevels = () => {
    const updatedProducts = products.map(product => {
      const cartItem = cart.find(item => item.id === product.id);
      if (cartItem) {
        return {
          ...product,
          stock: Math.max(0, product.stock - cartItem.quantity)
        };
      }
      return product;
    });
    
    setProducts(updatedProducts);
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
        description: "Please add items to the cart before proceeding.",
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

    const newTransaction = {
      id: nextOrderNumber,
      timestamp: new Date().toISOString(),
      total: calculatedTotal,
      status: "pending" as const,
      paymentMethod: selectedPaymentMethod as "cash" | "card" | "wallet",
      items: cart.map(item => ({
        name: item.name,
        quantity: item.quantity,
        price: item.price,
        barcode: item.barcode
      })),
      ...(selectedPaymentMethod === "card" && {
        cardDetails: {
          cardNumber: cardDetails.cardNumber.slice(-4),
          expiryDate: cardDetails.expiryDate
        }
      })
    };

    existingTransactions.push(newTransaction);
    localStorage.setItem('transactions', JSON.stringify(existingTransactions));

    setCurrentTransactionForReceipt(newTransaction);

    toast({
      title: "Order Created Successfully",
      description: `Order #${nextOrderNumber} is now pending. Total amount: ₱${calculatedTotal.toFixed(2)}`,
    });

    updateStockLevels();
    
    setPaymentComplete(true);
    setShowCardForm(false);
    setShowEWalletForm(false);
  };

  const addToCart = (product: Product) => {
    const existingProduct = products.find(p => p.id === product.id);
    if (!existingProduct || existingProduct.stock <= 0) {
      toast({
        title: "Out of stock",
        description: `${product.name} is currently out of stock.`,
        variant: "destructive",
      });
      return;
    }
    
    const cartItem = cart.find(item => item.id === product.id);
    const currentQuantityInCart = cartItem ? cartItem.quantity : 0;
    
    if (currentQuantityInCart + 1 > existingProduct.stock) {
      toast({
        title: "Insufficient stock",
        description: `Only ${existingProduct.stock} units of ${product.name} available.`,
        variant: "destructive",
      });
      return;
    }
    
    setPaymentComplete(false);
    setSelectedPaymentMethod(null);
    setCart((currentCart) => {
      if (cartItem) {
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
    setCart((currentCart) => {
      const updatedCart = currentCart.map((item) => {
        if (item.id === productId) {
          const newQuantity = item.quantity + change;
          if (change > 0) {
            const productInStock = products.find(p => p.id === productId);
            if (!productInStock || newQuantity > productInStock.stock) {
              toast({
                title: "Insufficient stock",
                description: `Only ${productInStock?.stock} units available.`,
                variant: "destructive",
              });
              return item;
            }
          }
          return newQuantity > 0 ? { ...item, quantity: newQuantity } : item;
        }
        return item;
      });
      
      return updatedCart.filter(item => item.quantity > 0);
    });
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

  const generateBarcodeList = () => {
    const content = `
      <html>
      <head>
        <title>Barcode List</title>
        <script src="https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/JsBarcode.all.min.js"></script>
        <style>
          body { font-family: Arial, sans-serif; padding: 20px; }
          table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
          th, td { padding: 8px; text-align: left; border-bottom: 1px solid #ddd; }
          th { background-color: #f2f2f2; }
          .meat { background-color: #ffebee; }
          .vegetable { background-color: #e8f5e9; }
          .barcode-container { display: flex; flex-direction: column; align-items: center; margin-top: 5px; }
          @media print {
            .no-print { display: none; }
            .page-break { page-break-after: always; }
            svg { max-width: 100%; height: auto; }
          }
          .print-button {
            background-color: #8B4513;
            color: white;
            border: none;
            padding: 10px 20px;
            border-radius: 4px;
            cursor: pointer;
            margin-bottom: 20px;
            font-weight: bold;
          }
          h1 { color: #8B4513; }
        </style>
      </head>
      <body>
        <div class="no-print" style="text-align: center; margin-bottom: 20px;">
          <h1>Product Barcode List</h1>
          <button class="print-button" onclick="window.print()">Print Barcode List</button>
        </div>
        
        <table>
          <tr>
            <th>Barcode</th>
            <th>Product Name</th>
            <th>Price</th>
            <th>Stock</th>
            <th>Category</th>
          </tr>
          ${products.map(product => `
            <tr class="${product.category}">
              <td>
                ${product.barcode}
                <div class="barcode-container">
                  <svg id="barcode-${product.id}" class="barcode"></svg>
                </div>
              </td>
              <td>${product.name}</td>
              <td>₱${product.price.toFixed(2)}</td>
              <td>${product.stock}</td>
              <td>${product.category.charAt(0).toUpperCase() + product.category.slice(1)}</td>
            </tr>
          `).join('')}
        </table>
        
        <script>
          document.addEventListener('DOMContentLoaded', function() {
            ${products.map(product => `
              try {
                JsBarcode("#barcode-${product.id}", "${product.barcode}", {
                  format: "CODE128",
                  width: 1.5,
                  height: 40,
                  displayValue: true,
                  fontSize: 12,
                  margin: 10
                });
              } catch (e) {
                console.error("Error generating barcode for ${product.barcode}:", e);
              }
            `).join('')}
          });
        </script>
      </body>
      </html>
    `;
    
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(content);
      printWindow.document.close();
    }
  };

  const handleLogout = () => {
    navigate("/");
  };

  const toggleProductCatalog = () => {
    setIsProductCatalogCollapsed(!isProductCatalogCollapsed);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-white to-pink-50">
      <div className="bg-[#8B4513] text-white py-4 px-6 shadow-lg mb-6">
        <div className="max-w-7xl mx-auto flex justify-between items-center">
          <h1 className="text-2xl font-bold">3-L Variety Store</h1>
          <div className="flex items-center gap-4">
            <Button
              onClick={generateBarcodeList}
              variant="ghost"
              className="text-white hover:text-white/80 hover:bg-white/10 flex items-center gap-2"
            >
              <List className="h-5 w-5" />
              Generate Barcode List
            </Button>
            <Button
              onClick={handleLogout}
              variant="ghost"
              className="text-white hover:text-white/80 hover:bg-white/10"
            >
              <LogOut className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </div>

      <div className="p-4">
        <PhoneNumberDialog
          open={showPhoneDialog}
          onOpenChange={setShowPhoneDialog}
          phoneNumber={phoneNumber}
          onPhoneNumberChange={setPhoneNumber}
          onSendReceipt={handleSendReceipt}
        />

        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8" style={{ 
            gridTemplateColumns: isProductCatalogCollapsed ? "0fr 1fr" : "1fr 1fr"
          }}>
            {!isProductCatalogCollapsed && (
              <ProductCatalog
                products={products}
                selectedCategory={selectedCategory}
                onCategoryChange={setSelectedCategory}
                onAddToCart={addToCart}
                isCollapsed={isProductCatalogCollapsed}
                onToggleCollapse={toggleProductCatalog}
              />
            )}

            <div className={`glass-panel p-6 animate-in rounded-xl shadow-lg border border-white border-opacity-30 bg-white bg-opacity-80 ${isProductCatalogCollapsed ? "col-span-2" : ""}`}>
              <CartSummary
                cart={cart}
                total={total}
                paymentComplete={paymentComplete}
                selectedPaymentMethod={selectedPaymentMethod}
                showCardForm={showCardForm}
                showEWalletForm={showEWalletForm}
                cardDetails={cardDetails}
                currentTransactionForReceipt={currentTransactionForReceipt}
                onUpdateQuantity={updateQuantity}
                onRemoveFromCart={removeFromCart}
                onPaymentMethodSelect={handlePaymentMethodSelect}
                onCardDetailsChange={setCardDetails}
                onCardSubmit={handleCardSubmit}
                onFileUpload={handleFileUpload}
                onPayment={handlePayment}
                onPrintReceipt={handlePrintReceipt}
                onResetTransaction={resetTransaction}
                onBarcodeSearch={handleBarcodeSearch}
                barcodeInput={barcodeInput}
                onBarcodeInputChange={handleBarcodeInput}
                onBarcodeKeyPress={handleKeyPress}
                isProductCatalogCollapsed={isProductCatalogCollapsed}
                onToggleProductCatalog={toggleProductCatalog}
                onBarcodeDetected={handleBarcodeDetected}
              />
            </div>
          </div>
        </div>
      </div>

      {isProductCatalogCollapsed && (
        <ProductCatalog
          products={products}
          selectedCategory={selectedCategory}
          onCategoryChange={setSelectedCategory}
          onAddToCart={addToCart}
          isCollapsed={isProductCatalogCollapsed}
          onToggleCollapse={toggleProductCatalog}
        />
      )}
    </div>
  );
};

export default POS;
