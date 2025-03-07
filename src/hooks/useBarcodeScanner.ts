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
  const [quaggaAttempts, setQuaggaAttempts] = useState(0);
  const { toast } = useToast();
  
  const isMounted = useRef(true);
  
  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

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

  useEffect(() => {
    let setupTimer: number | null = null;
    
    if (isOpen && activeCamera && scannerRef.current && !scannerInitialized) {
      console.log("Active camera set, setting up Quagga after short delay");
      setupTimer = window.setTimeout(() => {
        if (isMounted.current) setupQuagga();
      }, 500);
    }
    
    return () => {
      if (setupTimer) clearTimeout(setupTimer);
    };
  }, [activeCamera, isOpen, scannerInitialized]);

  useEffect(() => {
    if (stream && videoRef.current) {
      console.log("Stream changed, updating video element");
      attachStreamToVideo(stream, videoRef.current);
    }
  }, [stream]);

  useEffect(() => {
    let retryTimer: number | null = null;
    
    if (isOpen && stream && !scannerInitialized && quaggaAttempts < 3) {
      console.log(`Video stream exists but Quagga not initialized. Attempt ${quaggaAttempts + 1}/3`);
      retryTimer = window.setTimeout(() => {
        if (isMounted.current) {
          setQuaggaAttempts(prev => prev + 1);
          if (activeCamera) {
            setupQuagga();
          }
        }
      }, 2000);
    }
    
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [isOpen, stream, scannerInitialized, quaggaAttempts, activeCamera]);
  
  useEffect(() => {
    if (isOpen && stream && !scannerInitialized && quaggaAttempts >= 3 && videoRef.current) {
      console.log("Quagga failed to initialize after multiple attempts, ensuring video is visible");
      
      if (videoRef.current) {
        videoRef.current.style.display = 'block';
        videoRef.current.style.position = 'absolute';
        videoRef.current.style.top = '0';
        videoRef.current.style.left = '0';
        videoRef.current.style.width = '100%';
        videoRef.current.style.height = '100%';
        videoRef.current.style.zIndex = '10';
        
        attachStreamToVideo(stream, videoRef.current);
      }
    }
  }, [isOpen, stream, scannerInitialized, quaggaAttempts]);

  const initScanner = async () => {
    if (!isMounted.current) return;
    
    setIsLoading(true);
    setErrorMessage("Initializing camera...");
    setQuaggaAttempts(0);
    
    try {
      console.log("Initializing scanner and requesting camera permissions");
      
      const mediaStream = await requestCameraPermission();
      if (!mediaStream) {
        if (isMounted.current) {
          setErrorMessage('Camera permission denied. Please allow camera access and try again.');
          setIsLoading(false);
        }
        return;
      }
      
      if (!isMounted.current) {
        stopStreamTracks(mediaStream);
        return;
      }
      
      setStream(mediaStream);
      if (videoRef.current) {
        resetVideoElement(videoRef.current);
        console.log("Attaching direct video stream before Quagga init");
        attachStreamToVideo(mediaStream, videoRef.current);
      }
      
      const videoDevices = await getAvailableCameras();
      if (!isMounted.current) {
        stopStreamTracks(mediaStream);
        return;
      }
      
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
      if (isMounted.current) {
        setErrorMessage('Failed to initialize camera. Please try again.');
      }
    }
    
    if (isMounted.current) {
      setIsLoading(false);
    }
  };

  const stopScanner = () => {
    if (!isMounted.current) return;
    
    try {
      console.log("Stopping Quagga scanner");
      try {
        Quagga.stop();
      } catch (e) {
        console.log("Error stopping Quagga:", e);
      }
      
      setScannerInitialized(false);
      
      if (stream) {
        console.log("Stopping camera stream");
        stopStreamTracks(stream);
        setStream(null);
      }
      
      if (videoRef.current) {
        resetVideoElement(videoRef.current);
      }
      
      setQuaggaAttempts(0);
    } catch (e) {
      console.error("Error stopping scanner:", e);
    }
  };

  const setupQuagga = () => {
    if (!isMounted.current || !scannerRef.current || !activeCamera) {
      console.error("Cannot setup Quagga: missing scanner ref or active camera");
      return;
    }
    
    try {
      try {
        Quagga.stop();
      } catch (e) {
        console.log("No Quagga instance to stop:", e);
      }
      
      setErrorMessage('Initializing camera...');
      
      console.log('Initializing Quagga with camera ID:', activeCamera);
      
      if (scannerRef.current) {
        scannerRef.current.style.position = 'relative';
        scannerRef.current.style.overflow = 'hidden';
      }
      
      const config = {
        inputStream: {
          name: 'Live',
          type: 'LiveStream',
          target: scannerRef.current,
          constraints: {
            deviceId: activeCamera,
            facingMode: 'environment',
            width: { min: 450, ideal: 1280, max: 1920 },
            height: { min: 300, ideal: 720, max: 1080 },
            aspectRatio: { min: 1, max: 2 }
          },
          area: {
            top: "25%",
            right: "10%",
            left: "10%",
            bottom: "25%",
          },
        },
        locator: {
          patchSize: 'medium',
          halfSample: true,
        },
        numOfWorkers: 2,
        frequency: 10,
        decoder: {
          readers: [
            { format: "ean_reader", config: { supplements: [] } },
            { format: "ean_8_reader", config: { supplements: [] } },
            { format: "code_128_reader", config: { supplements: [] } },
            { format: "code_39_reader", config: { supplements: [] } },
            { format: "code_93_reader", config: { supplements: [] } }
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
      
      Quagga.init(config as any, (err) => {
        if (!isMounted.current) return;
        
        if (err) {
          console.error('Error initializing Quagga:', err);
          setErrorMessage(`Scanner initialization failed. Using backup camera feed.`);
          
          if (stream && videoRef.current) {
            console.log("Quagga failed, showing direct camera feed");
            videoRef.current.style.display = 'block';
            videoRef.current.style.zIndex = '10';
            attachStreamToVideo(stream, videoRef.current);
          }
          return;
        }

        console.log('Quagga initialized successfully');
        setScannerInitialized(true);
        setErrorMessage(null);
        setQuaggaAttempts(0);
        
        try {
          Quagga.start();
        } catch (e) {
          console.error("Error starting Quagga:", e);
          if (stream && videoRef.current) {
            videoRef.current.style.display = 'block';
            videoRef.current.style.zIndex = '10';
            attachStreamToVideo(stream, videoRef.current);
          }
          return;
        }
        
        if (videoRef.current) {
          videoRef.current.style.display = 'none';
        }
        
        Quagga.onProcessed((result) => {
          if (!isMounted.current) return;
          
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
          if (!isMounted.current) return;
          
          const code = result.codeResult.code;
          if (!code) return;
          
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
          
          try {
            Quagga.stop();
          } catch (e) {
            console.error("Error stopping Quagga after detection:", e);
          }
        });
      });
    } catch (error) {
      console.error("Error in setupQuagga:", error);
      
      if (isMounted.current) {
        setErrorMessage("Scanner error. Using backup camera.");
        
        if (stream && videoRef.current) {
          videoRef.current.style.display = 'block';
          videoRef.current.style.zIndex = '10';
          attachStreamToVideo(stream, videoRef.current);
        }
      }
    }
  };

  const changeCamera = (deviceId: string) => {
    if (!isMounted.current || activeCamera === deviceId) return;
    
    console.log(`Changing camera to: ${deviceId}`);
    stopScanner();
    setActiveCamera(deviceId);
  };

  const retryScanner = async () => {
    if (!isMounted.current) return;
    
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
