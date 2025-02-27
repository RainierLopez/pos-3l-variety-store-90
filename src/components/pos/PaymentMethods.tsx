
import { CreditCard, Wallet, Banknote } from "lucide-react";
import { Button } from "@/components/ui/button";

interface PaymentMethodsProps {
  selectedPaymentMethod: string | null;
  onPaymentMethodSelect: (methodId: string) => void;
}

export const PaymentMethods = ({
  selectedPaymentMethod,
  onPaymentMethodSelect,
}: PaymentMethodsProps) => {
  const paymentMethods = [
    { id: "cash", name: "Cash", icon: <Banknote className="h-4 w-4 mr-2" /> },
    { id: "card", name: "Card", icon: <CreditCard className="h-4 w-4 mr-2" /> },
    { id: "wallet", name: "E-Wallet", icon: <Wallet className="h-4 w-4 mr-2" /> },
  ];

  return (
    <div className="border-t pt-4">
      <h3 className="font-medium mb-2">Select Payment Method</h3>
      <div className="grid grid-cols-3 gap-2">
        {paymentMethods.map((method) => (
          <Button
            key={method.id}
            variant={selectedPaymentMethod === method.id ? "default" : "outline"}
            className="w-full"
            onClick={() => onPaymentMethodSelect(method.id)}
            style={selectedPaymentMethod === method.id ? { backgroundColor: '#8B4513', color: 'white' } : {}}
          >
            {method.icon}
            {method.name}
          </Button>
        ))}
      </div>
    </div>
  );
};
