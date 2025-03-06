
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, X } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import Quagga from '@ericblade/quagga2';

interface BarcodeScannerProps {
  onBarcodeDetected: (barcode: string) => void;
  isOpen: boolean;
  onClose: () => void;
}

export const BarcodeScanner: React.FC<BarcodeScannerProps> = ({
  onBarcodeDetected,
  isOpen,
  onClose
}) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [initialized, setInitialized] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const debounceTimerRef = useRef<number | null>(null);

  // Prevent multiple scans of the same barcode
  const processBarcode = (code: string) => {
    if (code === lastScannedCode) return;
    
    setLastScannedCode(code);
    onBarcodeDetected(code);
    
    // Play a beep sound
    const audio = new Audio('/static/sounds/beep.mp3');
    audio.play();
    
    // Reset the last scanned code after a delay
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = window.setTimeout(() => {
      setLastScannedCode(null);
    }, 3000); // Wait 3 seconds before scanning the same code again
  };

  useEffect(() => {
    let quaggaInstance: any = null;

    const initializeScanner = async () => {
      try {
        if (!scannerRef.current) return;

        // Initialize Quagga with improved settings for better barcode detection
        await Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: { min: 800 },
              height: { min: 600 },
              facingMode: "environment",
              aspectRatio: { min: 1, max: 2 }
            },
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          frequency: 10,
          decoder: {
            readers: [
              "ean_reader",
              "ean_8_reader",
              "code_128_reader", 
              "code_39_reader", 
              "code_93_reader",
              "upc_reader",
              "upc_e_reader",
              "codabar_reader",
              "i2of5_reader"
            ]
          },
          locate: true
        });

        Quagga.start();
        setInitialized(true);
        setError(null);

        // Setup barcode detection handler
        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            processBarcode(result.codeResult.code);
          }
        });

        quaggaInstance = Quagga;

      } catch (err) {
        console.error("Error initializing scanner:", err);
        setError("Could not access camera. Please check permissions and try again.");
      }
    };

    if (isOpen && !initialized) {
      initializeScanner();
    }

    return () => {
      if (quaggaInstance) {
        quaggaInstance.stop();
        setInitialized(false);
      }
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen, onBarcodeDetected]);

  if (!isOpen) return null;

  return (
    <div className="relative w-full bg-black rounded-lg overflow-hidden">
      <div className="absolute top-0 right-0 p-1 z-10">
        <Button 
          onClick={onClose} 
          variant="ghost" 
          size="icon"
          className="h-8 w-8 bg-black bg-opacity-30 rounded-full text-white hover:bg-black hover:bg-opacity-50"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
      
      <div 
        ref={scannerRef} 
        className="w-full h-[400px] bg-black flex items-center justify-center relative overflow-hidden"
        style={{ aspectRatio: '1/1' }}
      >
        {!initialized && !error && (
          <div className="text-white flex flex-col items-center">
            <Camera className="h-8 w-8 animate-pulse mb-2" />
            <p className="text-sm">Initializing camera...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 p-4 text-center">
            <p className="text-sm">{error}</p>
            <Button 
              onClick={() => {
                setInitialized(false);
                setTimeout(() => {
                  if (scannerRef.current) {
                    Quagga.init({
                      inputStream: {
                        name: "Live",
                        type: "LiveStream",
                        target: scannerRef.current,
                        constraints: {
                          width: { min: 800 },
                          height: { min: 600 },
                          facingMode: "environment",
                          aspectRatio: { min: 1, max: 2 }
                        },
                      },
                      locator: {
                        patchSize: "medium",
                        halfSample: true
                      },
                      numOfWorkers: navigator.hardwareConcurrency || 4,
                      frequency: 10,
                      decoder: {
                        readers: [
                          "ean_reader",
                          "ean_8_reader",
                          "code_128_reader", 
                          "code_39_reader", 
                          "code_93_reader",
                          "upc_reader",
                          "upc_e_reader",
                          "codabar_reader",
                          "i2of5_reader"
                        ]
                      },
                      locate: true
                    }, function(err: any) {
                      if (err) {
                        console.error("Error reinitializing scanner:", err);
                        setError("Could not access camera. Please check permissions and try again.");
                        return;
                      }
                      Quagga.start();
                      setInitialized(true);
                      setError(null);
                    });
                  }
                }, 300);
              }} 
              variant="destructive"
              size="sm"
              className="mt-2"
            >
              <RefreshCw className="w-3 h-3 mr-1" />
              Retry
            </Button>
          </div>
        )}
        
        {/* Scanner hints */}
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 text-center">
          Position barcode in view to scan
        </div>
        
        {/* Horizontal red scan line with animation */}
        <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_5px_red] z-20 scan-line-animation"></div>
      </div>
      
      {/* Last detected barcode */}
      {lastScannedCode && (
        <div className="bg-green-600 p-2 text-center font-bold text-white text-sm">
          Scanned: {lastScannedCode}
        </div>
      )}
    </div>
  );
};
