
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw } from 'lucide-react';
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
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scanning, setScanning] = useState(true);
  const debounceTimerRef = useRef<number | null>(null);

  // Prevent multiple scans of the same barcode
  const processBarcode = (code: string) => {
    if (code === lastScannedCode) return;
    
    setLastScannedCode(code);
    onBarcodeDetected(code);
    
    // Play a beep sound
    const audio = new Audio('/static/sounds/beep.mp3');
    audio.play();
    
    // Show toast
    toast({
      title: "Barcode Detected",
      description: `Scanned barcode: ${code}`,
    });
    
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
        // Get list of cameras
        const devices = await navigator.mediaDevices.enumerateDevices();
        const videoDevices = devices.filter(device => device.kind === 'videoinput');
        setCameras(videoDevices);
        
        // Use the first camera by default
        if (videoDevices.length > 0 && !activeCamera) {
          setActiveCamera(videoDevices[0].deviceId);
        }

        if (!scannerRef.current || !activeCamera) return;

        // Initialize Quagga
        await Quagga.init({
          inputStream: {
            name: "Live",
            type: "LiveStream",
            target: scannerRef.current,
            constraints: {
              width: { min: 450 },
              height: { min: 300 },
              facingMode: "environment",
              deviceId: activeCamera
            },
          },
          locator: {
            patchSize: "medium",
            halfSample: true
          },
          numOfWorkers: navigator.hardwareConcurrency || 4,
          frequency: 10,
          decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "code_93_reader"]
          },
          locate: true
        });

        Quagga.start();
        setInitialized(true);
        setError(null);

        // Setup barcode detection handler
        Quagga.onDetected((result) => {
          if (result && result.codeResult && result.codeResult.code && scanning) {
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
  }, [isOpen, activeCamera, scanning, onBarcodeDetected]);

  const switchCamera = async () => {
    if (initialized) {
      Quagga.stop();
      setInitialized(false);
    }

    const currentIndex = cameras.findIndex(camera => camera.deviceId === activeCamera);
    const nextIndex = (currentIndex + 1) % cameras.length;
    setActiveCamera(cameras[nextIndex].deviceId);
  };

  const toggleScanner = () => {
    if (initialized) {
      Quagga.stop();
      setInitialized(false);
    } else {
      setInitialized(false);  // Reset first to ensure clean initialization
      setTimeout(() => {
        if (scannerRef.current) {
          Quagga.init({
            inputStream: {
              name: "Live",
              type: "LiveStream",
              target: scannerRef.current,
              constraints: {
                width: { min: 450 },
                height: { min: 300 },
                facingMode: "environment",
                deviceId: activeCamera || undefined
              },
            },
            locator: {
              patchSize: "medium",
              halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency || 4,
            frequency: 10,
            decoder: {
              readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "code_93_reader"]
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
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-md overflow-hidden">
        <div className="p-4 bg-[#8B4513] text-white flex justify-between items-center">
          <h3 className="text-lg font-medium">Barcode Scanner</h3>
          <button onClick={onClose} className="text-white hover:text-gray-200">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"></line><line x1="6" y1="6" x2="18" y2="18"></line></svg>
          </button>
        </div>
        
        <div className="relative">
          <div 
            ref={scannerRef} 
            className="w-full h-[300px] bg-black flex items-center justify-center relative overflow-hidden"
          >
            {!initialized && !error && (
              <div className="text-white">Initializing camera...</div>
            )}
            
            {error && (
              <div className="text-red-500 p-4 text-center">
                <p>{error}</p>
                <Button 
                  onClick={toggleScanner} 
                  variant="outline"
                  className="mt-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
            
            {/* Scanner overlay */}
            <div className="absolute inset-0 pointer-events-none">
              <div className="absolute left-0 right-0 top-1/2 h-0.5 bg-red-500 opacity-70 z-20 shadow-md"></div>
              <div className="absolute top-[10%] bottom-[10%] left-[10%] right-[10%] border-2 border-white border-opacity-50 rounded-lg"></div>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="absolute top-0 left-0 right-0 p-2 bg-black bg-opacity-60 text-white text-center">
            {scanning ? 'Scanner active - position barcode in the frame' : 'Scanner paused'}
          </div>
          
          {/* Last detected barcode */}
          {lastScannedCode && (
            <div className="absolute bottom-0 left-0 right-0 bg-white bg-opacity-80 p-2 text-center font-bold">
              Detected: {lastScannedCode}
            </div>
          )}
        </div>
        
        <div className="p-4 flex justify-between">
          <div className="flex space-x-2">
            <Button 
              onClick={toggleScanner} 
              variant="outline"
              className="flex items-center"
            >
              {initialized ? <CameraOff className="w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
              {initialized ? 'Stop' : 'Start'}
            </Button>
            
            {cameras.length > 1 && (
              <Button 
                onClick={switchCamera} 
                variant="outline"
                disabled={!initialized}
                className="flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Switch Camera
              </Button>
            )}
          </div>
          
          <Button 
            onClick={() => setScanning(!scanning)}
            variant={scanning ? "default" : "destructive"}
            className="flex items-center"
          >
            {scanning ? 'Pause' : 'Resume'} Scanning
          </Button>
        </div>
      </div>
    </div>
  );
};
