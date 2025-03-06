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

  const processBarcode = (code: string) => {
    if (code === lastScannedCode) return;
    
    setLastScannedCode(code);
    onBarcodeDetected(code);
    
    const audio = new Audio('/static/sounds/beep.mp3');
    audio.play().catch(err => console.error("Error playing beep:", err));
    
    if (debounceTimerRef.current) {
      window.clearTimeout(debounceTimerRef.current);
    }
    
    debounceTimerRef.current = window.setTimeout(() => {
      setLastScannedCode(null);
    }, 3000);
  };

  const stopScanner = () => {
    try {
      Quagga.stop();
    } catch (e) {
      console.error("Error stopping Quagga:", e);
    }
    setInitialized(false);
  };

  useEffect(() => {
    return () => {
      if (initialized) {
        stopScanner();
      }
      if (debounceTimerRef.current) {
        window.clearTimeout(debounceTimerRef.current);
      }
    };
  }, [initialized]);

  useEffect(() => {
    let quaggaInstance: any = null;

    const initializeScanner = async () => {
      try {
        if (!scannerRef.current) return;
        
        setError(null);
        setInitialized(false);
        
        console.log("Attempting to initialize scanner...");

        if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
          try {
            await navigator.mediaDevices.getUserMedia({ video: true });
            
            Quagga.init({
              inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerRef.current,
                constraints: {
                  width: 640,
                  height: 480,
                  facingMode: "environment",
                },
              },
              locator: {
                patchSize: "medium",
                halfSample: true
              },
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
              locate: true,
              frequency: 5,
              numOfWorkers: 2,
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

            Quagga.onDetected((result) => {
              if (result && result.codeResult && result.codeResult.code) {
                console.log("Detected barcode:", result.codeResult.code);
                
                let highConfidence = false;
                if (result.codeResult.decodedCodes) {
                  for (let i = 0; i < result.codeResult.decodedCodes.length; i++) {
                    const code = result.codeResult.decodedCodes[i];
                    if (code && typeof (code as any).confidence === 'number' && (code as any).confidence > 0.65) {
                      highConfidence = true;
                      break;
                    }
                  }
                }
                
                if (highConfidence) {
                  console.log("Processing barcode with high confidence");
                  processBarcode(result.codeResult.code);
                } else {
                  console.log("Barcode detected but confidence too low");
                }
              }
            });

            quaggaInstance = Quagga;
          } catch (err) {
            console.error("Camera permission denied:", err);
            setError("Camera permission denied. Please enable camera access in your browser settings.");
          }
        } else {
          setError("Your browser doesn't support camera access. Please try a different browser.");
        }
      } catch (err) {
        console.error("Error initializing scanner:", err);
        setError("Could not access camera. Please check permissions and try again.");
      }
    };

    if (isOpen) {
      setTimeout(() => {
        initializeScanner();
      }, 500);
    } else if (initialized) {
      stopScanner();
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
  }, [isOpen]);

  const retryScanner = () => {
    stopScanner();
    setError(null);
    
    setTimeout(() => {
      if (!scannerRef.current) return;
      
      console.log("Retrying scanner initialization...");
      
      if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
        navigator.mediaDevices.getUserMedia({ video: true })
          .then(() => {
            Quagga.init({
              inputStream: {
                name: "Live",
                type: "LiveStream",
                target: scannerRef.current,
                constraints: {
                  width: 640,
                  height: 480,
                  facingMode: "environment",
                },
              },
              locator: {
                patchSize: "medium",
                halfSample: true
              },
              numOfWorkers: 2,
              frequency: 5,
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
              
              toast({
                title: "Camera activated",
                description: "Scanner is now ready to use",
              });
            });
            
            Quagga.onDetected((result) => {
              if (result && result.codeResult && result.codeResult.code) {
                console.log("Detected barcode on retry:", result.codeResult.code);
                
                let hasConfidence = false;
                if (result.codeResult.decodedCodes) {
                  for (let i = 0; i < result.codeResult.decodedCodes.length; i++) {
                    const code = result.codeResult.decodedCodes[i];
                    if (code && typeof (code as any).confidence === 'number' && (code as any).confidence > 0.5) {
                      hasConfidence = true;
                      break;
                    }
                  }
                }
                
                if (hasConfidence) {
                  processBarcode(result.codeResult.code);
                }
              }
            });
          })
          .catch(err => {
            console.error("Camera permission denied:", err);
            setError("Camera permission denied. Please enable camera access in your browser settings.");
            
            toast({
              title: "Camera access denied",
              description: "Please enable camera access in your browser settings",
              variant: "destructive"
            });
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
      >
        {!initialized && !error && (
          <div className="text-white flex flex-col items-center">
            <Camera className="h-8 w-8 animate-pulse mb-2" />
            <p className="text-sm">Initializing camera...</p>
          </div>
        )}
        
        {error && (
          <div className="text-red-500 p-4 text-center">
            <CameraOff className="h-8 w-8 mx-auto mb-2" />
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
        
        {initialized && (
          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-70 text-white text-xs p-1 text-center">
            Position barcode in view to scan
          </div>
        )}
        
        {initialized && (
          <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_5px_red] z-20 scan-line-animation"></div>
        )}
      </div>
      
      {lastScannedCode && (
        <div className="bg-green-600 p-2 text-center font-bold text-white text-sm">
          Scanned: {lastScannedCode}
        </div>
      )}
      
      <style>
        {`
        .scan-line-animation {
          animation: scan 2s linear infinite;
        }
        
        @keyframes scan {
          0% { top: 20%; }
          50% { top: 80%; }
          100% { top: 20%; }
        }
        `}
      </style>
    </div>
  );
};
