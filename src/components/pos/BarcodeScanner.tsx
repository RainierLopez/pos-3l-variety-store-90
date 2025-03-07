
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useBarcodeScanner } from "@/hooks/useBarcodeScanner";
import { Camera, X, RefreshCcw, Smartphone, ScanLine, AlertTriangle } from "lucide-react";
import { useEffect, useState } from "react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const BarcodeScanner = ({ isOpen, onClose, onBarcodeDetected }: BarcodeScannerProps) => {
  const {
    scannerRef,
    videoRef,
    cameras,
    activeCamera,
    errorMessage,
    scannerInitialized,
    isLoading,
    changeCamera,
    retryScanner
  } = useBarcodeScanner(isOpen, onBarcodeDetected);
  
  const [retryCount, setRetryCount] = useState(0);
  const [manualRetryNeeded, setManualRetryNeeded] = useState(false);

  // Log mounting status for debugging
  useEffect(() => {
    console.log("BarcodeScanner component mounted, isOpen:", isOpen);
    return () => {
      console.log("BarcodeScanner component unmounted");
    };
  }, []);

  useEffect(() => {
    console.log("Scanner initialized status changed:", scannerInitialized);
  }, [scannerInitialized]);
  
  // Auto-retry up to 3 times if scanner isn't initialized
  useEffect(() => {
    if (isOpen && !scannerInitialized && !manualRetryNeeded && retryCount < 3) {
      const timer = setTimeout(() => {
        console.log(`Auto-retrying scanner (attempt ${retryCount + 1} of 3)`);
        setRetryCount(prev => prev + 1);
        retryScanner();
      }, 3000);
      
      return () => clearTimeout(timer);
    } else if (retryCount >= 3 && !scannerInitialized) {
      setManualRetryNeeded(true);
    }
  }, [isOpen, scannerInitialized, retryCount, manualRetryNeeded]);

  const handleManualRetry = () => {
    setManualRetryNeeded(false);
    setRetryCount(0);
    retryScanner();
  };

  const videoClickHandler = () => {
    if (videoRef.current && videoRef.current.getAttribute('data-needs-interaction') === 'true') {
      videoRef.current.play().catch(err => console.error("Error playing video on click:", err));
    }
  };

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

          {errorMessage && manualRetryNeeded ? (
            <div className="p-8 flex flex-col items-center justify-center space-y-4 bg-red-50 border border-red-200 rounded-lg">
              <AlertTriangle className="h-12 w-12 text-red-500" />
              <div className="text-red-500 font-medium text-center">{errorMessage}</div>
              <p className="text-sm text-center text-gray-600 max-w-md">
                We couldn't initialize your camera after multiple attempts. This could be due to permission issues
                or your browser's security settings.
              </p>
              <Button onClick={handleManualRetry} variant="destructive">
                <RefreshCcw className="h-4 w-4 mr-2" />
                Retry Camera Access
              </Button>
            </div>
          ) : (
            <div className="relative">
              {/* Main scanner container */}
              <div 
                ref={scannerRef} 
                className="w-full overflow-hidden rounded-lg relative"
                style={{ height: '300px', background: '#333' }}
              >
                {/* Direct video element - key part of the fix */}
                <video 
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  onClick={videoClickHandler}
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    zIndex: 5
                  }}
                />
                
                {/* Loading state indicator */}
                {(isLoading || (!scannerInitialized && !videoRef.current?.srcObject)) && (
                  <div className="absolute inset-0 flex items-center justify-center bg-black/20" style={{ zIndex: 10 }}>
                    <Camera className="h-12 w-12 text-white animate-pulse" />
                  </div>
                )}
              </div>
              
              {/* Error message display */}
              {errorMessage && !manualRetryNeeded && (
                <div className="absolute top-2 left-0 right-0 mx-auto flex items-center justify-center">
                  <div className="bg-black/70 text-white px-4 py-2 rounded-full text-sm flex items-center space-x-2">
                    <AlertTriangle className="h-4 w-4 text-yellow-400" />
                    <span>{errorMessage}</span>
                  </div>
                </div>
              )}
              
              {/* Scanner guides overlay */}
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
                      z-index: 20;
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
              className="flex items-center gap-1"
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
