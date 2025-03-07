
import { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import { useToast } from "@/hooks/use-toast";
import { requestCameraPermission, getAvailableCameras, selectBestCamera, playBeepSound } from '@/utils/cameraUtils';

export interface UseBarcodeScanner {
  scannerRef: React.RefObject<HTMLDivElement>;
  cameras: MediaDeviceInfo[];
  activeCamera: string | null;
  errorMessage: string | null;
  scannerInitialized: boolean;
  lastScannedCode: string | null;
  stream: MediaStream | null;
  isLoading: boolean;
  initScanner: () => Promise<void>;
  changeCamera: (deviceId: string) => void;
  stopScanner: () => void;
  retryScanner: () => Promise<void>;
}

export function useBarcodeScanner(
  isOpen: boolean,
  onBarcodeDetected: (barcode: string) => void
): UseBarcodeScanner {
  const scannerRef = useRef<HTMLDivElement>(null);
  const [cameras, setCameras] = useState<MediaDeviceInfo[]>([]);
  const [activeCamera, setActiveCamera] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [lastScannedCode, setLastScannedCode] = useState<string | null>(null);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [scannerInitialized, setScannerInitialized] = useState(false);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  // Initialize camera when component mounts
  useEffect(() => {
    if (isOpen) {
      setErrorMessage(null);
      setLastScannedCode(null);
      setScannerInitialized(false);
      initScanner();
    } else {
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Set up scanner when active camera changes
  useEffect(() => {
    if (isOpen && activeCamera && scannerRef.current && !scannerInitialized) {
      setupQuagga();
    }
  }, [activeCamera, isOpen, scannerInitialized]);

  const initScanner = async () => {
    setIsLoading(true);
    try {
      // First ask for camera permission
      const mediaStream = await requestCameraPermission();
      if (!mediaStream) {
        setErrorMessage('Camera permission denied. Please allow camera access and try again.');
        setIsLoading(false);
        return;
      }
      
      setStream(mediaStream);
      
      // Then get available cameras
      const videoDevices = await getAvailableCameras();
      setCameras(videoDevices);
      
      if (videoDevices.length > 0) {
        const cameraId = selectBestCamera(videoDevices);
        console.log('Selected camera:', cameraId);
        setActiveCamera(cameraId);
        setErrorMessage(null);
      } else {
        setErrorMessage('No cameras detected on your device');
      }
    } catch (error) {
      console.error('Error initializing camera:', error);
      setErrorMessage('Failed to initialize camera. Please try again.');
    }
    setIsLoading(false);
  };

  const stopScanner = () => {
    try {
      Quagga.stop();
      setScannerInitialized(false);
      
      // Clean up the stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    } catch (e) {
      console.error("Error stopping scanner:", e);
    }
  };

  const setupQuagga = () => {
    if (!scannerRef.current || !activeCamera) return;
    
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
            width: { min: 640, ideal: 1280, max: 1920 },
            height: { min: 480, ideal: 720, max: 1080 },
            facingMode: 'environment',
            deviceId: activeCamera,
            aspectRatio: { min: 1, max: 2 }
          },
          area: {
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
        numOfWorkers: navigator.hardwareConcurrency ? Math.max(2, Math.floor(navigator.hardwareConcurrency / 2)) : 2,
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
            drawingCtx.clearRect(
              0, 0, 
              parseInt(drawingCanvas.getAttribute("width") || "0"), 
              parseInt(drawingCanvas.getAttribute("height") || "0")
            );
              
            if (result && result.boxes) {
              result.boxes
                .filter(box => box !== result.box)
                .forEach(box => {
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
          
          // Prevent duplicate scans within 3 seconds
          if (lastScannedCode === code && Date.now() - lastScanTime < 3000) {
            return;
          }
          
          console.log('Barcode detected:', code);
          
          setLastScannedCode(code);
          setLastScanTime(Date.now());
          
          playBeepSound();

          toast({
            title: "Barcode detected!",
            description: `Code: ${code}`,
          });

          onBarcodeDetected(code);
          
          // Pause scanner briefly to prevent multiple scans
          stopScanner();
          setTimeout(() => {
            if (isOpen && scannerRef.current && activeCamera) {
              setupQuagga();
            }
          }, 1500);
        });
      }
    );
  };

  const changeCamera = (deviceId: string) => {
    if (activeCamera === deviceId) return;
    stopScanner();
    setActiveCamera(deviceId);
  };

  const retryScanner = async () => {
    stopScanner();
    await initScanner();
  };

  return {
    scannerRef,
    cameras,
    activeCamera,
    errorMessage,
    scannerInitialized,
    lastScannedCode,
    stream,
    isLoading,
    initScanner,
    changeCamera,
    stopScanner,
    retryScanner
  };
}
