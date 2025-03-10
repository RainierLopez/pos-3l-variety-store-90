import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Printer, ShoppingBag, CreditCard, Wallet, Banknote, Barcode, Database, Camera } from "lucide-react";
import { Product, Transaction } from "@/types/pos";
import { CartItem } from "./CartItem";
import { PaymentMethods } from "./PaymentMethods";
import { CardPayment } from "./payments/CardPayment";
import { EWalletPayment } from "./payments/EWalletPayment";
import { BarcodeScanner } from "./BarcodeScanner";
import { CardDetails } from "@/types/pos";
import { useState } from "react";

interface CartSummaryProps {
  cart: Product[];
  total: number;
  paymentComplete: boolean;
  selectedPaymentMethod: string | null;
  showCardForm: boolean;
  showEWalletForm: boolean;
  cardDetails: CardDetails;
  currentTransactionForReceipt: Transaction | null;
  onUpdateQuantity: (productId: number, change: number) => void;
  onRemoveFromCart: (productId: number) => void;
  onPaymentMethodSelect: (methodId: string) => void;
  onCardDetailsChange: (details: CardDetails) => void;
  onCardSubmit: (e: React.FormEvent) => void;
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onPayment: () => void;
  onPrintReceipt: (transaction: Transaction) => void;
  onResetTransaction: () => void;
  onBarcodeSearch: () => void;
  barcodeInput: string;
  onBarcodeInputChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  onBarcodeKeyPress: (e: React.KeyboardEvent<HTMLInputElement>) => void;
  isProductCatalogCollapsed: boolean;
  onToggleProductCatalog: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const CartSummary = ({
  cart,
  total,
  paymentComplete,
  selectedPaymentMethod,
  showCardForm,
  showEWalletForm,
  cardDetails,
  currentTransactionForReceipt,
  onUpdateQuantity,
  onRemoveFromCart,
  onPaymentMethodSelect,
  onCardDetailsChange,
  onCardSubmit,
  onFileUpload,
  onPayment,
  onPrintReceipt,
  onResetTransaction,
  onBarcodeSearch,
  barcodeInput,
  onBarcodeInputChange,
  onBarcodeKeyPress,
  isProductCatalogCollapsed,
  onToggleProductCatalog,
  onBarcodeDetected,
}: CartSummaryProps) => {
  const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);
  
  const getPaymentIcon = () => {
    switch (selectedPaymentMethod) {
      case 'cash':
        return <Banknote className="h-5 w-5 mr-2" />;
      case 'card':
        return <CreditCard className="h-5 w-5 mr-2" />;
      case 'wallet':
        return <Wallet className="h-5 w-5 mr-2" />;
      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-2xl font-bold text-[#8B4513]">Cart</h2>
        <div className="flex gap-2">
          <div className="flex gap-2 relative">
            <Input 
              placeholder="Enter barcode..."
              value={barcodeInput}
              onChange={onBarcodeInputChange}
              onKeyPress={onBarcodeKeyPress}
              className="w-40 pl-9 rounded-full bg-white border-2 border-[#8B4513] focus-visible:ring-[#8B4513]"
            />
            <Barcode className="absolute left-3 top-2.5 text-[#8B4513] h-4 w-4" />
            <Button 
              onClick={onBarcodeSearch}
              className="rounded-full h-9"
              style={{ backgroundColor: '#8B4513', color: 'white' }}
            >
              Search
            </Button>
            <Button
              onClick={() => setShowBarcodeScanner(!showBarcodeScanner)}
              className="rounded-full h-9 flex items-center gap-1"
              style={{ backgroundColor: '#8B4513', color: 'white' }}
            >
              <Camera className="h-4 w-4" />
              {showBarcodeScanner ? 'Hide Scanner' : 'Scan'}
            </Button>
          </div>
          <Button
            onClick={() => window.location.href = "/transactions"}
            variant="outline"
            className="flex items-center gap-2 rounded-full shadow-md hover:shadow-lg transition-all hover:border-[#8B4513]"
          >
            <Database className="h-4 w-4" />
            Transactions
          </Button>
        </div>
      </div>

      {/* Barcode Scanner Dialog */}
      <BarcodeScanner 
        isOpen={showBarcodeScanner}
        onClose={() => setShowBarcodeScanner(false)}
        onBarcodeDetected={(barcode) => {
          setShowBarcodeScanner(false);
          onBarcodeDetected(barcode);
        }}
      />

      <div className="max-h-[400px] overflow-y-auto pr-2 space-y-4 custom-scrollbar">
        {cart.map((item) => (
          <CartItem
            key={item.id}
            item={item}
            onUpdateQuantity={onUpdateQuantity}
            onRemove={onRemoveFromCart}
          />
        ))}

        {cart.length === 0 && (
          <div className="text-center py-12">
            <ShoppingBag className="h-16 w-16 mx-auto text-gray-300 mb-4" />
            <p className="text-gray-500 text-lg">Cart is empty. Add some products!</p>
          </div>
        )}
      </div>

      {/* Payment section */}
      {cart.length > 0 && !paymentComplete && (
        <div className="mt-6 space-y-6 border-t pt-6">
          <PaymentMethods
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodSelect={onPaymentMethodSelect}
          />

          {showCardForm && (
            <div className="rounded-lg bg-white p-4 shadow-inner border border-gray-100">
              <CardPayment
                cardDetails={cardDetails}
                onCardDetailsChange={onCardDetailsChange}
                onSubmit={onCardSubmit}
              />
            </div>
          )}

          {showEWalletForm && (
            <div className="rounded-lg bg-white p-4 shadow-inner border border-gray-100">
              <EWalletPayment
                onFileUpload={onFileUpload}
              />
            </div>
          )}
          
          <div className="border-t pt-6">
            <div className="flex justify-between mb-4 items-center">
              <span className="font-bold text-lg">Total:</span>
              <span className="font-bold text-xl text-[#8B4513]">
                {total.toFixed(2)}
              </span>
            </div>
            {!showCardForm && !showEWalletForm && (
              <Button
                onClick={onPayment}
                className="w-full h-12 text-lg rounded-full shadow-lg hover:shadow-xl transition-all"
                style={{ backgroundColor: '#8B4513', color: 'white' }}
                disabled={!selectedPaymentMethod}
              >
                Pay Now
              </Button>
            )}
          </div>
        </div>
      )}

      {paymentComplete && (
        <div className="mt-6 space-y-6 animate-in">
          <div className="p-6 rounded-lg shadow-inner border text-center">
            {selectedPaymentMethod === "cash" ? (
              <div className="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-yellow-700">
                <Banknote className="h-8 w-8 mx-auto mb-2" />
                <p className="font-medium text-lg">Pending Payment</p>
                <p className="text-base">Total Bill: {total.toFixed(2)}</p>
                <p className="text-base">Method: Cash</p>
              </div>
            ) : (
              <div className="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-green-700">
                {getPaymentIcon()}
                <p className="font-medium text-lg">Payment Successful!</p>
                <p className="text-base">Total paid: {total.toFixed(2)}</p>
                <p className="text-base">Method: {selectedPaymentMethod}</p>
              </div>
            )}
          </div>
          <div className="grid grid-cols-2 gap-4">
            <Button
              onClick={() => currentTransactionForReceipt && onPrintReceipt(currentTransactionForReceipt)}
              variant="outline"
              className="w-full h-12 shadow-md hover:shadow-lg transition-all rounded-full"
            >
              <Printer className="h-5 w-5 mr-2" />
              {selectedPaymentMethod === "cash" ? "Print Initial Receipt" : "Print Receipt"}
            </Button>
            <Button
              onClick={onResetTransaction}
              className="w-full h-12 shadow-md hover:shadow-lg transition-all rounded-full"
              style={{ backgroundColor: '#8B4513', color: 'white' }}
            >
              New Transaction
            </Button>
          </div>
        </div>
      )}
    </div>
  );
};
