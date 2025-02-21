
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { CardDetails } from "@/types/pos";

interface CardPaymentProps {
  cardDetails: CardDetails;
  onCardDetailsChange: (details: CardDetails) => void;
  onSubmit: (e: React.FormEvent) => void;
}

export const CardPayment = ({
  cardDetails,
  onCardDetailsChange,
  onSubmit,
}: CardPaymentProps) => {
  const formatCardNumber = (value: string) => {
    // Remove any non-digit characters
    const digits = value.replace(/\D/g, '');
    
    // Limit to 16 digits
    const truncated = digits.slice(0, 16);
    
    // Add dashes every 4 digits
    const formatted = truncated.replace(/(\d{4})(?=\d)/g, '$1-');
    
    return formatted;
  };

  const handleCardNumberChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatCardNumber(e.target.value);
    onCardDetailsChange({ ...cardDetails, cardNumber: formatted });
  };

  return (
    <form onSubmit={onSubmit} className="space-y-4 animate-in">
      <div className="bg-blue-50 p-4 rounded-lg mb-4">
        <p className="text-sm text-blue-800 font-medium mb-2">Accepted Cards:</p>
        <div className="text-sm text-blue-700">
          <ul className="list-disc list-inside space-y-1">
            <li>Bank Cards: BDO, Metrobank, BPI, PNB, Unionbank, AUB</li>
            <li>Credit Cards: Visa, Mastercard</li>
          </ul>
        </div>
      </div>
      
      <Input
        type="text"
        placeholder="Card Number (e.g., 4235-1231-1241-4234)"
        value={cardDetails.cardNumber}
        onChange={handleCardNumberChange}
        maxLength={19} // 16 digits + 3 dashes
        required
      />
      <div className="grid grid-cols-2 gap-4">
        <Input
          type="text"
          placeholder="MM/YY"
          value={cardDetails.expiryDate}
          onChange={(e) =>
            onCardDetailsChange({ ...cardDetails, expiryDate: e.target.value })
          }
          required
        />
        <Input
          type="text"
          placeholder="CVV"
          value={cardDetails.cvv}
          onChange={(e) =>
            onCardDetailsChange({ ...cardDetails, cvv: e.target.value })
          }
          required
        />
      </div>
      <Button
        type="submit"
        className="w-full"
        style={{ backgroundColor: '#8B4513', color: 'white' }}
      >
        Process Card Payment
      </Button>
    </form>
  );
};
