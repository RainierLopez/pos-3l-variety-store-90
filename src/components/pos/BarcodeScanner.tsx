
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
        
        // Clear any previous errors
        setError(null);
        
        console.log("Attempting to initialize scanner...");

        // Initialize Quagga with improved settings for better barcode detection
        await Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: { min: 640 },
              height: { min: 480 },
              facingMode: "environment",
              aspectRatio: { min: 1, max: 1 } // Force exact 1:1 aspect ratio to keep camera centered
            },
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: navigator.hardwareConcurrency ? Math.max(2, Math.min(navigator.hardwareConcurrency - 1, 4)) : 2,
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
            ],
            multiple: false
          },
          locate: true
        }, function(err) {
          if (err) {
            console.error("Error initializing scanner:", err);
            setError("Could not access camera. Please check permissions and try again.");
            return;
          }
          
          console.log("Scanner initialization successful!");
          Quagga.start();
          setInitialized(true);
        });

        // Improve detection by processing results with confidence score
        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code) {
            // Check if decodedCodes array exists and has at least one item with high confidence
            // Using type-safe check for confidence property
            if (
              result.codeResult.decodedCodes && 
              result.codeResult.decodedCodes.length > 0 &&
              result.codeResult.decodedCodes.some(code => {
                // Type-safe check if this code object has a confidence property and it's high enough
                return typeof (code as any).confidence === 'number' && (code as any).confidence > 0.65;
              })
            ) {
              processBarcode(result.codeResult.code);
            }
          }
        });

        quaggaInstance = Quagga;

      } catch (err) {
        console.error("Error initializing scanner:", err);
        setError("Could not access camera. Please check permissions and try again.");
      }
    };

    if (isOpen) {
      // Small delay before initializing to ensure DOM is ready
      setTimeout(() => {
        initializeScanner();
      }, 300);
    }

    return () => {
      if (quaggaInstance) {
        try {
          quaggaInstance.stop();
        } catch (e) {
          console.error("Error stopping Quagga:", e);
        }
        setInitialized(false);
      }
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isOpen, onBarcodeDetected]);

  // Function to retry camera access
  const retryScanner = () => {
    setInitialized(false);
    setError(null);
    
    // Small delay before reinitializing
    setTimeout(() => {
      if (!scannerRef.current) return;
      
      console.log("Retrying scanner initialization...");
      
      // Request permission explicitly before initializing
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(() => {
            // Permission granted, initialize Quagga
            Quagga.init({
              inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerRef.current,
                constraints: {
                  width: { min: 640 },
                  height: { min: 480 },
                  facingMode: "environment",
                  aspectRatio: { min: 1, max: 1 }
                },
              },
              locator: {
                patchSize: "medium",
                halfSample: true
              },
              numOfWorkers: navigator.hardwareConcurrency ? Math.max(2, Math.min(navigator.hardwareConcurrency - 1, 4)) : 2,
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
                ],
                multiple: false
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
          })
          .catch(err => {
            console.error("Camera permission denied:", err);
            setError("Camera permission denied. Please enable camera access in your browser settings.");
          });
      } else {
        setError("Your browser doesn't support camera access. Please try a different browser.");
      }
    }, 300);
  };

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
        className="w-full h-[300px] bg-black flex items-center justify-center relative overflow-hidden"
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
              onClick={retryScanner} 
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
