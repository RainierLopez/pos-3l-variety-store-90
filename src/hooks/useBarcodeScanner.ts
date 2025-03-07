
import { useState, useEffect, useRef } from 'react';
import Quagga from '@ericblade/quagga2';
import { useToast } from "@/hooks/use-toast";
import { 
  requestCameraPermission, 
  getAvailableCameras, 
  selectBestCamera, 
  playBeepSound, 
  attachStreamToVideo,
  resetVideoElement,
  stopStreamTracks
} from '@/utils/cameraUtils';

// Import the types from the library directly
type QuaggaJSConfigObject = Quagga.QuaggaJSConfigObject;

export interface UseBarcodeScanner {
  scannerRef: React.RefObject<HTMLDivElement>;
  videoRef: React.RefObject<HTMLVideoElement>;
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
  const videoRef = useRef<HTMLVideoElement>(null);
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
      console.log("Scanner dialog opened, initializing camera");
      setErrorMessage(null);
      setLastScannedCode(null);
      setScannerInitialized(false);
      initScanner();
    } else {
      console.log("Scanner dialog closed, stopping scanner");
      stopScanner();
    }
    
    return () => {
      stopScanner();
    };
  }, [isOpen]);

  // Set up scanner when active camera changes
  useEffect(() => {
    if (isOpen && activeCamera && scannerRef.current && !scannerInitialized) {
      console.log("Active camera set, setting up Quagga");
      setupQuagga();
    }
  }, [activeCamera, isOpen, scannerInitialized]);

  // Ensure video element is properly set up when stream changes
  useEffect(() => {
    if (stream && videoRef.current) {
      console.log("Stream changed, updating video element");
      attachStreamToVideo(stream, videoRef.current);
    }
  }, [stream]);

  const initScanner = async () => {
    setIsLoading(true);
    setErrorMessage("Initializing camera...");
    
    try {
      console.log("Initializing scanner and requesting camera permissions");
      
      // First get any camera access - this is crucial for permission
      const mediaStream = await requestCameraPermission();
      if (!mediaStream) {
        setErrorMessage('Camera permission denied. Please allow camera access and try again.');
        setIsLoading(false);
        return;
      }
      
      // Set initial stream and attach to video
      setStream(mediaStream);
      if (videoRef.current) {
        // Reset video element first
        resetVideoElement(videoRef.current);
        const success = attachStreamToVideo(mediaStream, videoRef.current);
        if (!success) {
          console.error("Failed to attach stream to video element");
        }
      }
      
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
      console.log("Stopping Quagga scanner");
      Quagga.stop();
      setScannerInitialized(false);
      
      // Stop and clean up the stream
      if (stream) {
        console.log("Stopping camera stream");
        stopStreamTracks(stream);
        setStream(null);
      }
      
      // Reset video element
      if (videoRef.current) {
        resetVideoElement(videoRef.current);
      }
    } catch (e) {
      console.error("Error stopping scanner:", e);
    }
  };

  const setupQuagga = () => {
    if (!scannerRef.current || !activeCamera) {
      console.error("Cannot setup Quagga: missing scanner ref or active camera");
      return;
    }
    
    stopScanner();
    setErrorMessage('Initializing camera...');
    
    console.log('Initializing Quagga with camera ID:', activeCamera);
    
    // Create the configuration object
    const config: QuaggaJSConfigObject = {
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
        readers: [
          { format: "ean_reader", config: {} },
          { format: "ean_8_reader", config: {} },
          { format: "code_128_reader", config: {} },
          { format: "code_39_reader", config: {} },
          { format: "code_93_reader", config: {} }
        ],
        debug: {
          drawBoundingBox: true,
          showFrequency: true,
          drawScanline: true,
          showPattern: true
        }
      },
      locate: true,
    };
    
    console.log("Quagga config:", JSON.stringify(config, null, 2));
    
    Quagga.init(
      config,
      (err) => {
        if (err) {
          console.error('Error initializing Quagga:', err);
          setErrorMessage(`Failed to initialize barcode scanner: ${err.message || 'Unknown error'}`);
          
          // Fallback: If Quagga fails, at least show the direct camera feed
          if (stream && videoRef.current && videoRef.current.srcObject !== stream) {
            console.log("Quagga failed, falling back to direct camera feed");
            attachStreamToVideo(stream, videoRef.current);
          }
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
    console.log(`Changing camera to: ${deviceId}`);
    stopScanner();
    setActiveCamera(deviceId);
  };

  const retryScanner = async () => {
    console.log("Retrying scanner initialization");
    stopScanner();
    await initScanner();
  };

  return {
    scannerRef,
    videoRef,
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
