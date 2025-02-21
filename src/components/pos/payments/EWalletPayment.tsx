
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { QrCode } from "lucide-react";

interface EWalletPaymentProps {
  onFileUpload: (e: React.ChangeEvent<HTMLInputElement>) => void;
}

export const EWalletPayment = ({ onFileUpload }: EWalletPaymentProps) => {
  const [previewImage, setPreviewImage] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = () => {
        setPreviewImage(reader.result as string);
      };
      reader.readAsDataURL(file);
      onFileUpload(e);
    }
  };

  return (
    <div className="space-y-4 animate-in">
      <div className="bg-white p-4 rounded-lg text-center">
        {previewImage ? (
          <img 
            src={previewImage} 
            alt="Uploaded QR" 
            className="mx-auto h-32 w-32 object-contain"
          />
        ) : (
          <img 
            src="/lovable-uploads/c7206fcf-6a6e-406c-8aa7-51ec1981655b.png" 
            alt="InstaPay QR Code"
            className="mx-auto h-32 w-32 object-contain"
          />
        )}
        <p className="mt-2 text-sm text-gray-600">
          Scan and Attach it below
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Button
          onClick={() => document.getElementById('file-upload')?.click()}
          className="w-full"
          style={{ backgroundColor: '#8B4513', color: 'white' }}
        >
          {previewImage ? 'Change Image' : 'Attach here!'}
        </Button>
        <input
          id="file-upload"
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
          onClick={(e) => {
            (e.target as HTMLInputElement).value = '';
          }}
        />
      </div>
    </div>
  );
};
