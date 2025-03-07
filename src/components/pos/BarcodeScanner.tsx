
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Camera, X, RefreshCcw, Smartphone, ScanLine } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const BarcodeScanner = ({ isOpen, onClose, onBarcodeDetected }: BarcodeScannerProps) => {
  const {
    scannerRef,
    cameras,
    activeCamera,
    errorMessage,
    scannerInitialized,
    isLoading,
    changeCamera,
    retryScanner
  } = useBarcodeScanner(isOpen, onBarcodeDetected);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => {
      if (!open) onClose();
    }}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between">
            <span>Barcode Scanner</span>
            <Button variant="ghost" size="icon" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
          <DialogDescription>
            Position the barcode within the scanning area
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2">
          {cameras.length > 1 && (
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1">Select Camera:</label>
              <div className="flex gap-2 overflow-x-auto pb-2">
                {cameras.map((camera, index) => (
                  <Button
                    key={camera.deviceId}
                    variant={activeCamera === camera.deviceId ? "default" : "outline"}
                    size="sm"
                    onClick={() => changeCamera(camera.deviceId)}
                  >
                    <Smartphone className="h-3 w-3 mr-1" />
                    {camera.label || `Camera ${index + 1}`}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {errorMessage ? (
            <div className="p-8 text-center">
              <div className="text-red-500 mb-4">{errorMessage}</div>
              <Button onClick={retryScanner}>
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry
              </Button>
            </div>
          ) : (
            <div className="relative">
              <div 
                ref={scannerRef} 
                className="w-full overflow-hidden rounded-lg relative"
                style={{ height: '300px', background: '#333' }}
              >
                {(isLoading || !scannerInitialized) && (
                  <div className="absolute inset-0 flex items-center justify-center">
                    <Camera className="h-12 w-12 text-gray-400 animate-pulse" />
                  </div>
                )}
              </div>
              
              <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                <div className="w-full h-full scanner-guides">
                  <style>{`
                    .scanner-guides {
                      position: relative;
                    }
                    .scanner-guides::before, 
                    .scanner-guides::after {
                      content: '';
                      position: absolute;
                      left: 50%;
                      top: 50%;
                      transform: translate(-50%, -50%);
                      border: 2px solid rgba(255, 255, 255, 0.5);
                    }
                    .scanner-guides::before {
                      width: 70%;
                      height: 60%;
                      border-radius: 4px;
                    }
                    .scanner-guides::after {
                      width: 50%;
                      height: 20px;
                      background-color: rgba(255, 0, 0, 0.3);
                      animation: scanline 2s linear infinite;
                    }
                    @keyframes scanline {
                      0% {
                        transform: translate(-50%, -100px);
                      }
                      50% {
                        transform: translate(-50%, 100px);
                      }
                      100% {
                        transform: translate(-50%, -100px);
                      }
                    }
                  `}</style>
                </div>
              </div>
            </div>
          )}

          <div className="flex justify-between items-center mt-4">
            <div className="text-center text-gray-500 text-sm">
              {scannerInitialized ? (
                <span className="flex items-center">
                  <ScanLine className="h-4 w-4 mr-1 text-green-500" />
                  Scanner active
                </span>
              ) : (
                "Position the barcode within the scanning area"
              )}
            </div>
            
            <Button 
              onClick={retryScanner}
              variant="outline"
              size="sm"
            >
              <RefreshCcw className="h-4 w-4 mr-1" />
              Reset Camera
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
