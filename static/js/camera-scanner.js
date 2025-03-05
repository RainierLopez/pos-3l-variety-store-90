
// CameraScanner.js - Handles camera integration for barcode scanning
class CameraScanner {
    constructor(options) {
        this.options = {
            onBarcodeDetected: null,
            onScannerError: null,
            targetElement: 'interactive',
            crosshairId: 'scanner-crosshair',
            ...options
        };
        
        this.isScanning = false;
        this.lastDetectedCode = '';
        this.lastDetectionTime = 0;
        this.detectionCooldown = 1000; // Avoid duplicate scans within 1 second
    }
    
    start() {
        if (this.isScanning) {
            return;
        }
        
        if (!window.Quagga) {
            this.handleError(new Error("Quagga barcode library is not loaded"));
            return;
        }
        
        // Initialize the crosshair element
        const targetElement = document.getElementById(this.options.targetElement);
        if (targetElement) {
            const crosshair = targetElement.querySelector('.scanner-crosshair');
            if (crosshair) {
                // Center the crosshair in the viewfinder
                setTimeout(() => {
                    const viewportRect = targetElement.getBoundingClientRect();
                    const size = Math.min(viewportRect.width, viewportRect.height) * 0.6;
                    
                    crosshair.style.width = `${size}px`;
                    crosshair.style.height = `${size}px`;
                    crosshair.style.top = `${(viewportRect.height - size) / 2}px`;
                    crosshair.style.left = `${(viewportRect.width - size) / 2}px`;
                }, 100);
            }
        }
        
        Quagga.init({
            inputStream: {
                name: "Live",
                type: "LiveStream",
                target: `#${this.options.targetElement}`,
                constraints: {
                    width: { min: 640 },
                    height: { min: 480 },
                    facingMode: "environment", // Use rear camera when available
                    aspectRatio: { min: 1, max: 2 }
                }
            },
            locator: {
                patchSize: "medium",
                halfSample: true
            },
            numOfWorkers: navigator.hardwareConcurrency || 2,
            frequency: 10,
            decoder: {
                readers: [
                    "ean_reader",
                    "ean_8_reader",
                    "code_128_reader",
                    "code_39_reader",
                    "code_93_reader",
                    "upc_reader",
                    "upc_e_reader"
                ]
            },
            locate: true
        }, (err) => {
            if (err) {
                this.handleError(err);
                return;
            }
            
            console.log("Quagga initialization complete");
            this.isScanning = true;
            
            // Start the scanner
            Quagga.start();
            
            // Register result handler
            Quagga.onDetected(this.onBarcodeDetected.bind(this));
            
            // Add visual feedback by drawing boxes around detected barcodes
            Quagga.onProcessed(this.onProcessed.bind(this));
        });
    }
    
    stop() {
        if (this.isScanning && window.Quagga) {
            Quagga.stop();
            this.isScanning = false;
            console.log("Camera scanner stopped");
        }
    }
    
    onBarcodeDetected(result) {
        const code = result.codeResult.code;
        const now = Date.now();
        
        // Check for duplicate scans within cooldown period
        if (code === this.lastDetectedCode && now - this.lastDetectionTime < this.detectionCooldown) {
            return;
        }
        
        this.lastDetectedCode = code;
        this.lastDetectionTime = now;
        
        console.log("Barcode detected:", code);
        
        // Call the provided callback
        if (typeof this.options.onBarcodeDetected === 'function') {
            this.options.onBarcodeDetected(code);
        }
    }
    
    onProcessed(result) {
        if (!result) {
            return;
        }
        
        const drawingCtx = Quagga.canvas.ctx.overlay;
        const drawingCanvas = Quagga.canvas.dom.overlay;
        
        if (result.boxes) {
            drawingCtx.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
            
            // Draw all detected boxes except the final one
            result.boxes.filter(box => box !== result.box).forEach(box => {
                Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "rgba(255, 0, 0, 0.3)", lineWidth: 2 });
            });
        }
        
        // Draw the final found box in a different color
        if (result.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#8B4513", lineWidth: 2 });
        }
        
        // Draw the barcode result numerically
        if (result.codeResult && result.codeResult.code) {
            const code = result.codeResult.code;
            drawingCtx.font = "24px Arial";
            drawingCtx.fillStyle = "white";
            drawingCtx.strokeStyle = "black";
            drawingCtx.lineWidth = 4;
            
            const textWidth = drawingCtx.measureText(code).width;
            const x = (drawingCanvas.width - textWidth) / 2;
            const y = drawingCanvas.height - 20;
            
            // Draw text stroke for better visibility
            drawingCtx.strokeText(code, x, y);
            drawingCtx.fillText(code, x, y);
        }
    }
    
    handleError(error) {
        console.error("Scanner error:", error);
        
        if (typeof this.options.onScannerError === 'function') {
            this.options.onScannerError(error);
        }
        
        // Check for common camera permission errors
        if (error.name === 'NotAllowedError' || error.name === 'PermissionDeniedError') {
            alert("Camera access was denied. Please check your camera permissions.");
        } else if (error.name === 'NotFoundError' || error.name === 'DevicesNotFoundError') {
            alert("No camera detected on your device or the camera is in use by another application.");
        } else if (error.name === 'NotReadableError' || error.name === 'TrackStartError') {
            alert("Cannot access your camera. It may be in use by another application.");
        }
    }
}

// Make CameraScanner available globally
window.CameraScanner = CameraScanner;
