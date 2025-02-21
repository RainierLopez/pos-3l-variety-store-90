
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface PhoneNumberDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  phoneNumber: string;
  onPhoneNumberChange: (value: string) => void;
  onSendReceipt: () => void;
}

export const PhoneNumberDialog = ({
  open,
  onOpenChange,
  phoneNumber,
  onPhoneNumberChange,
  onSendReceipt,
}: PhoneNumberDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
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
              onChange={(e) => onPhoneNumberChange(e.target.value)}
              placeholder="Enter 11-digit number"
              className="border rounded-md px-3 py-2"
            />
          </div>
          <Button
            onClick={onSendReceipt}
            className="w-full"
            style={{ backgroundColor: '#8B4513', color: 'white' }}
          >
            Send Receipt
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};
