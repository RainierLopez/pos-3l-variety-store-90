
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
  return (
    <form onSubmit={onSubmit} className="space-y-4 animate-in">
      <Input
        type="text"
        placeholder="Card Number"
        value={cardDetails.cardNumber}
        onChange={(e) =>
          onCardDetailsChange({ ...cardDetails, cardNumber: e.target.value })
        }
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
