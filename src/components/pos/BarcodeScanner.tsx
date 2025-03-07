import { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/use-toast";
import { Camera, X, RefreshCcw } from "lucide-react";

interface BarcodeScannerProps {
  isOpen: boolean;
  onClose: () => void;
  onBarcodeDetected: (barcode: string) => void;
}

export const BarcodeScanner = ({ isOpen, onClose, onBarcodeDetected }: BarcodeScannerProps) => {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setLastScannedCode(null);
      setScannerInitialized(false);
      
      requestCameraPermission();
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  useEffect(() => {
    if (isOpen && activeCamera && scannerRef.current && !scannerInitialized) {
      initQuagga();
    }
  }, [activeCamera, isOpen, scannerInitialized]);

  const requestCameraPermission = async () => {
    try {
      setErrorMessage('Requesting camera access...');
      const stream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          facingMode: 'environment',
          width: { ideal: 640 },
          height: { ideal: 480 }
        } 
      });
      
      const tracks = stream.getTracks();
      
      await listCameras();
      
      setTimeout(() => {
        tracks.forEach(track => track.stop());
      }, 500);
      
    } catch (error) {
      console.error('Error requesting camera permission:', error);
      setErrorMessage('Camera permission denied. Please allow camera access and try again.');
    }
  };

  const listCameras = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videoDevices = devices.filter(device => device.kind === 'videoinput');
      
      console.log('Available cameras:', videoDevices);
      
      setCameras(videoDevices);
      
      if (videoDevices.length > 0) {
        const backCamera = videoDevices.find(device => 
          device.label.toLowerCase().includes('back') || 
          device.label.toLowerCase().includes('rear') ||
          device.label.toLowerCase().includes('environment'));
        
        const cameraToUse = backCamera?.deviceId || videoDevices[0].deviceId;
        console.log('Selected camera:', cameraToUse);
        setActiveCamera(cameraToUse);
        setErrorMessage(null);
      } else {
        setErrorMessage('No cameras detected on your device');
      }
    } catch (error) {
      console.error('Error listing cameras:', error);
      setErrorMessage('Failed to access camera devices. Please check permissions.');
    }
  };

  const stopScanner = () => {
    try {
      Quagga.stop();
      setScannerInitialized(false);
    } catch (e) {
    }
  };

  const initQuagga = () => {
    if (!scannerRef.current) return;
    
    stopScanner();
    
    setErrorMessage('Initializing camera...');
    
    console.log('Initializing Quagga with camera ID:', activeCamera);
    
    Quagga.init(
      {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            width: { min: 320, ideal: 640, max: 1280 },
            height: { min: 240, ideal: 480, max: 720 },
            facingMode: 'environment',
            deviceId: activeCamera || undefined,
          },
          area: { // Define a smaller scanning area to improve performance
            top: "25%",
            right: "10%",
            left: "10%",
            bottom: "25%",
          },
          willReadFrequently: true
        },
        locator: {
          patchSize: 'medium',
          halfSample: true,
        },
        numOfWorkers: navigator.hardwareConcurrency || 2,
        frequency: 10,
        decoder: {
          readers: ['ean_reader', 'ean_8_reader', 'code_128_reader', 'code_39_reader', 'code_93_reader'],
          debug: {
            drawBoundingBox: true,
            showFrequency: true,
            drawScanline: true,
            showPattern: true
          }
        },
        locate: true,
      },
      (err) => {
        if (err) {
          console.error('Error initializing Quagga:', err);
          setErrorMessage(`Failed to initialize barcode scanner: ${err.message || 'Unknown error'}`);
          return;
        }

        console.log('Quagga initialized successfully');
        setScannerInitialized(true);
        setErrorMessage(null);
        
        Quagga.start();
        
        Quagga.onProcessed((result) => {
          const drawingCtx = Quagga.canvas.ctx.overlay;
          const drawingCanvas = Quagga.canvas.dom.overlay;
          
          if (drawingCtx && drawingCanvas) {
            drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width") || "0"), 
                                    parseInt(drawingCanvas.getAttribute("height") || "0"));
              
            if (result && result.boxes) {
              result.boxes.filter(function(box) {
                return box !== result.box;
              }).forEach(function(box) {
                Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: 'green', lineWidth: 2 });
              });
            }
              
            if (result && result.box) {
              Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: '#00F', lineWidth: 2 });
            }
              
            if (result && result.codeResult && result.codeResult.code) {
              Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
            }
          }
        });
        
        Quagga.onDetected((result) => {
          const code = result.codeResult.code;
          if (!code) return;
          
          if (lastScannedCode === code && Date.now() - lastScanTime < 3000) {
            return;
          }
          
          console.log('Barcode detected:', code);
          
          setLastScannedCode(code);
          setLastScanTime(Date.now());
          
          const audio = new Audio('/static/sounds/beep.mp3');
          audio.play().catch(e => console.log('Error playing sound:', e));

          toast({
            title: "Barcode detected!",
            description: `Code: ${code}`,
          });

          onBarcodeDetected(code);
          
          stopScanner();
          setTimeout(() => {
            if (isOpen && scannerRef.current && activeCamera) {
              initQuagga();
            }
          }, 1500);
        });
      }
    );
  };

  const [lastScanTime, setLastScanTime] = useState(0);

  const changeCamera = (deviceId: string) => {
    if (activeCamera === deviceId) return;
    stopScanner();
    setActiveCamera(deviceId);
  };

  const retryScanner = () => {
    stopScanner();
    requestCameraPermission();
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
                {!scannerInitialized && (
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

          <div className="text-center text-gray-500 text-sm mt-4">
            Position the barcode within the scanning area. Hold steady for best results.
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BarcodeScanner;
