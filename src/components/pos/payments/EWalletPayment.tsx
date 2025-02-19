
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

interface EWalletPaymentProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EWalletPayment = ({ onFileUpload }: EWalletPaymentProps) => {
  return (
    <div className="space-y-4 animate-in">
      <div className="bg-white p-4 rounded-lg text-center">
        <QrCode className="mx-auto h-32 w-32 text-[#8B4513]" />
        <p className="mt-2 text-sm text-gray-600">
          Take a Screenshot and Attach it below
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <label className="cursor-pointer">
          <input
            type="file"
            accept="image/*"
            className="hidden"
            onChange={onFileUpload}
            onClick={(e) => {
              // Reset the value to allow selecting the same file again
              (e.target as HTMLInputElement).value = '';
            }}
          />
          <Button
            className="w-full"
            style={{ backgroundColor: '#8B4513', color: 'white' }}
          >
            Attach here!
          </Button>
        </label>
      </div>
    </div>
  );
};
