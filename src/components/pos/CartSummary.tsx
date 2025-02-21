
import { Button } from "@/components/ui/button";
import { Printer } from "lucide-react";
import { Product, Transaction } from "@/types/pos";
import { CartItem } from "./CartItem";
import { PaymentMethods } from "./PaymentMethods";
import { CardPayment } from "./payments/CardPayment";
import { EWalletPayment } from "./payments/EWalletPayment";
import { CardDetails } from "@/types/pos";

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
}: CartSummaryProps) => {
  return (
    <div className="space-y-4">
      {cart.map((item) => (
        <CartItem
          key={item.id}
          item={item}
          onUpdateQuantity={onUpdateQuantity}
          onRemove={onRemoveFromCart}
        />
      ))}

      {cart.length === 0 && (
        <div className="text-center py-8 text-gray-500">
          Cart is empty. Add some products!
        </div>
      )}

      {cart.length > 0 && !paymentComplete && (
        <div className="mt-4 space-y-4">
          <PaymentMethods
            selectedPaymentMethod={selectedPaymentMethod}
            onPaymentMethodSelect={onPaymentMethodSelect}
          />

          {showCardForm && (
            <CardPayment
              cardDetails={cardDetails}
              onCardDetailsChange={onCardDetailsChange}
              onSubmit={onCardSubmit}
            />
          )}

          {showEWalletForm && (
            <EWalletPayment
              onFileUpload={onFileUpload}
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
                onClick={onPayment}
                className="w-full"
                style={{ backgroundColor: '#8B4513', color: 'white' }}
              >
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
              onClick={() => currentTransactionForReceipt && onPrintReceipt(currentTransactionForReceipt)}
              variant="outline"
              className="w-full"
            >
              <Printer className="mr-2 h-4 w-4" />
              {selectedPaymentMethod === "cash" ? "Print Initial Receipt" : "Print Receipt"}
            </Button>
            <Button
              onClick={onResetTransaction}
              className="w-full"
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
