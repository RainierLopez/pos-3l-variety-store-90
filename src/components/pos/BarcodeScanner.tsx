
import React, { useEffect, useRef, useState } from 'react';
import { Camera, CameraOff, RefreshCw, Zap, ZapOff, X } from 'lucide-react';
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
  const [torchEnabled, setTorchEnabled] = useState(false);
  const videoStreamRef = useRef<MediaStream | null>(null);

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

        // Get the video stream for torch control
        const videoTrack = Quagga.CameraAccess.getActiveTrack();
        if (videoTrack) {
          videoStreamRef.current = new MediaStream([videoTrack]);
        }

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

  const toggleTorch = async () => {
    if (!videoStreamRef.current) return;
    
    const videoTrack = videoStreamRef.current.getVideoTracks()[0];
    if (!videoTrack) return;
    
    try {
      const capabilities = videoTrack.getCapabilities();
      if (!capabilities.torch) {
        toast({
          title: "Not Supported",
          description: "Torch mode is not supported by your device",
          variant: "destructive",
        });
        return;
      }
      
      await videoTrack.applyConstraints({
        advanced: [{ torch: !torchEnabled }]
      });
      
      setTorchEnabled(!torchEnabled);
    } catch (err) {
      console.error("Error toggling torch:", err);
      toast({
        title: "Error",
        description: "Could not toggle torch mode",
        variant: "destructive",
      });
    }
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-80">
      <div className="bg-gray-900 rounded-xl shadow-2xl w-full max-w-md overflow-hidden border border-gray-700">
        <div className="p-4 bg-gradient-to-r from-purple-700 to-indigo-800 text-white flex justify-between items-center">
          <h3 className="text-lg font-medium flex items-center">
            <Camera className="h-5 w-5 mr-2" /> 
            Scanner
          </h3>
          <button 
            onClick={onClose} 
            className="text-white hover:text-gray-200 bg-black bg-opacity-30 rounded-full p-1"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
        
        <div className="relative">
          <div 
            ref={scannerRef} 
            className="w-full h-[300px] bg-black flex items-center justify-center relative overflow-hidden"
          >
            {!initialized && !error && (
              <div className="text-white flex flex-col items-center">
                <Camera className="h-16 w-16 animate-pulse mb-2" />
                <p className="text-lg">Initializing camera...</p>
              </div>
            )}
            
            {error && (
              <div className="text-red-500 p-4 text-center">
                <p>{error}</p>
                <Button 
                  onClick={toggleScanner} 
                  variant="destructive"
                  className="mt-2"
                >
                  <RefreshCw className="w-4 h-4 mr-2" />
                  Retry
                </Button>
              </div>
            )}
            
            {/* Fixed scanner frame */}
            <div className="absolute inset-0 pointer-events-none">
              {/* Horizontal red scan line with animation */}
              <div className="absolute left-0 right-0 h-0.5 bg-red-500 shadow-[0_0_5px_red] z-20 scan-line-animation"></div>
              
              {/* Corner guides for targeting */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-[280px] h-[280px] relative">
                  {/* Top-left corner */}
                  <div className="absolute -top-1 -left-1 w-10 h-10 border-t-2 border-l-2 border-green-400"></div>
                  {/* Top-right corner */}
                  <div className="absolute -top-1 -right-1 w-10 h-10 border-t-2 border-r-2 border-green-400"></div>
                  {/* Bottom-left corner */}
                  <div className="absolute -bottom-1 -left-1 w-10 h-10 border-b-2 border-l-2 border-green-400"></div>
                  {/* Bottom-right corner */}
                  <div className="absolute -bottom-1 -right-1 w-10 h-10 border-b-2 border-r-2 border-green-400"></div>
                </div>
              </div>
              
              {/* Semi-transparent overlay to focus attention on the scan area */}
              <div className="absolute inset-0 bg-gradient-radial from-transparent to-black opacity-50"></div>
            </div>
          </div>
          
          {/* Status indicator */}
          <div className="absolute top-0 left-0 right-0 p-2 bg-gradient-to-r from-indigo-900 to-purple-900 bg-opacity-80 text-white text-center text-sm font-medium">
            {scanning ? 'Scanner active - position barcode in the frame' : 'Scanner paused'}
          </div>
          
          {/* Last detected barcode */}
          {lastScannedCode && (
            <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-r from-indigo-600 to-purple-600 p-3 text-center font-bold text-white flex items-center justify-center gap-2">
              <span className="text-xs uppercase tracking-wide opacity-75">Detected:</span>
              <span className="text-xl">{lastScannedCode}</span>
            </div>
          )}
        </div>
        
        <div className="p-4 bg-gray-800 grid grid-cols-2 gap-2">
          <div className="col-span-2 flex space-x-2 mb-2">
            <Button 
              onClick={toggleScanner} 
              variant={initialized ? "destructive" : "default"}
              className="flex-1 flex items-center justify-center"
              size="sm"
            >
              {initialized ? <CameraOff className="w-4 h-4 mr-2" /> : <Camera className="w-4 h-4 mr-2" />}
              {initialized ? 'Stop' : 'Start'}
            </Button>
            
            {cameras.length > 1 && (
              <Button 
                onClick={switchCamera} 
                variant="secondary"
                disabled={!initialized}
                className="flex-1 flex items-center justify-center"
                size="sm"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Switch Camera
              </Button>
            )}
          </div>
          
          <Button 
            onClick={() => setScanning(!scanning)}
            variant={scanning ? "outline" : "default"}
            className="flex items-center justify-center border-green-500"
            size="sm"
          >
            {scanning ? 'Pause' : 'Resume'} Scanning
          </Button>
          
          <Button 
            onClick={toggleTorch} 
            variant="outline" 
            className="flex items-center justify-center border-yellow-500"
            size="sm"
          >
            {torchEnabled ? (
              <>
                <ZapOff className="w-4 h-4 mr-2" /> 
                Torch Off
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 mr-2" /> 
                Torch On
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
};

