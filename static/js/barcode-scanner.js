
// BarcodeScanner.js - Manages barcode scanning UI flow
class BarcodeScanner {
    constructor(options) {
        this.options = {
            onBarcodeDetected: null,
            scanButtonId: 'scan-barcode-btn',
            scannerContainerId: 'barcode-scanner-container',
            manualFormId: 'manual-barcode-form',
            manualInputId: 'manual-barcode-input',
            closeButtonId: 'close-scanner-btn',
            toggleCameraButtonId: 'toggle-camera-btn',
            ...options
        };

        this.isOpen = false;
        this.isScanning = false;
        this.cameraScanner = null;
        this.currentBarcode = '';
        this.scanHistory = [];
        this.setupEventListeners();
    }

    setupEventListeners() {
        // Scan button to open the scanner
        const scanButton = document.getElementById(this.options.scanButtonId);
        if (scanButton) {
            scanButton.addEventListener('click', () => this.openScanner());
        }

        // Close button event
        document.addEventListener('click', (e) => {
            if (e.target.id === this.options.closeButtonId) {
                this.closeScanner();
            }
        });

        // Toggle camera button event
        document.addEventListener('click', (e) => {
            if (e.target.id === this.options.toggleCameraButtonId) {
                this.toggleScannerMode();
            }
        });

        // Manual barcode form submission
        document.addEventListener('submit', (e) => {
            if (e.target.id === this.options.manualFormId) {
                e.preventDefault();
                const input = document.getElementById(this.options.manualInputId);
                this.handleManualBarcode(input.value);
                input.value = '';
            }
        });
    }

    openScanner() {
        this.isOpen = true;
        const container = document.getElementById(this.options.scannerContainerId);
        
        if (container) {
            // Create scanner UI
            container.innerHTML = this.createScannerHTML();
            container.classList.remove('hidden');
            
            // Initialize with manual entry mode first
            this.showManualEntry();
        }
    }

    closeScanner() {
        this.isOpen = false;
        if (this.cameraScanner) {
            this.cameraScanner.stop();
            this.cameraScanner = null;
        }

        const container = document.getElementById(this.options.scannerContainerId);
        if (container) {
            container.classList.add('hidden');
            container.innerHTML = '';
        }
    }

    createScannerHTML() {
        return `
            <div class="fixed inset-0 bg-black bg-opacity-75 z-50 flex items-center justify-center">
                <div class="bg-white rounded-lg max-w-lg w-full mx-4 overflow-hidden">
                    <div class="bg-[#8B4513] text-white p-4 flex justify-between items-center">
                        <h3 class="text-lg font-medium">Barcode Scanner</h3>
                        <button id="${this.options.closeButtonId}" class="text-white hover:text-gray-200">
                            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                        </button>
                    </div>
                    
                    <div class="p-4">
                        <div class="flex justify-center mb-4">
                            <div class="flex bg-gray-100 rounded-full p-1">
                                <button id="manual-mode-btn" class="px-4 py-2 rounded-full bg-[#8B4513] text-white">
                                    Manual Entry
                                </button>
                                <button id="${this.options.toggleCameraButtonId}" class="px-4 py-2 rounded-full">
                                    Camera
                                </button>
                            </div>
                        </div>
                        
                        <div id="manual-entry-container" class="mb-4">
                            <form id="${this.options.manualFormId}" class="space-y-4">
                                <div class="flex items-center">
                                    <input 
                                        type="text" 
                                        id="${this.options.manualInputId}" 
                                        class="flex-1 border-2 border-gray-300 rounded-l-lg p-2 focus:border-[#8B4513] focus:outline-none" 
                                        placeholder="Enter barcode number..."
                                        required
                                    />
                                    <button 
                                        type="submit" 
                                        class="bg-[#8B4513] text-white px-4 py-2 rounded-r-lg"
                                    >
                                        <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-search"><circle cx="11" cy="11" r="8"/><path d="m21 21-4.3-4.3"/></svg>
                                    </button>
                                </div>
                            </form>
                        </div>
                        
                        <div id="camera-container" class="hidden">
                            <div id="interactive" class="viewport relative bg-black rounded-lg overflow-hidden h-64">
                                <video class="w-full h-full"></video>
                                <div class="scanner-overlay absolute inset-0">
                                    <div class="scanner-crosshair absolute border-[#8B4513] border-4 rounded"></div>
                                </div>
                                <div class="absolute bottom-2 left-0 right-0 text-center text-white text-sm bg-black bg-opacity-50 py-1">
                                    Position barcode within the frame
                                </div>
                            </div>
                            <div class="mt-3 text-center text-sm text-gray-500">
                                Please allow camera access if prompted
                            </div>
                        </div>
                    </div>
                    
                    <div id="scan-history" class="mt-4 px-4 pb-4 max-h-32 overflow-y-auto">
                        <!-- Scanned items will appear here -->
                    </div>
                </div>
            </div>
        `;
    }

    showManualEntry() {
        // Stop any existing camera scanner
        if (this.cameraScanner) {
            this.cameraScanner.stop();
            this.cameraScanner = null;
        }

        const manualButton = document.getElementById('manual-mode-btn');
        const cameraButton = document.getElementById(this.options.toggleCameraButtonId);
        const manualContainer = document.getElementById('manual-entry-container');
        const cameraContainer = document.getElementById('camera-container');

        if (manualButton && cameraButton && manualContainer && cameraContainer) {
            // Update UI to show manual entry is active
            manualButton.classList.add('bg-[#8B4513]', 'text-white');
            cameraButton.classList.remove('bg-[#8B4513]', 'text-white');
            
            manualContainer.classList.remove('hidden');
            cameraContainer.classList.add('hidden');
            
            // Focus on the input
            const input = document.getElementById(this.options.manualInputId);
            if (input) {
                input.focus();
            }
        }
    }

    showCameraScanner() {
        const manualButton = document.getElementById('manual-mode-btn');
        const cameraButton = document.getElementById(this.options.toggleCameraButtonId);
        const manualContainer = document.getElementById('manual-entry-container');
        const cameraContainer = document.getElementById('camera-container');

        if (manualButton && cameraButton && manualContainer && cameraContainer) {
            // Update UI to show camera scanner is active
            manualButton.classList.remove('bg-[#8B4513]', 'text-white');
            cameraButton.classList.add('bg-[#8B4513]', 'text-white');
            
            manualContainer.classList.add('hidden');
            cameraContainer.classList.remove('hidden');
            
            // Initialize camera scanner if not already running
            if (!this.cameraScanner) {
                this.initializeCameraScanner();
            }
        }
    }

    toggleScannerMode() {
        const cameraContainer = document.getElementById('camera-container');
        const isCurrentlyShowingCamera = cameraContainer && !cameraContainer.classList.contains('hidden');
        
        if (isCurrentlyShowingCamera) {
            this.showManualEntry();
        } else {
            this.showCameraScanner();
        }
    }

    initializeCameraScanner() {
        this.cameraScanner = new CameraScanner({
            onBarcodeDetected: (barcode) => this.handleBarcodeDetection(barcode),
            onScannerError: (error) => this.handleScannerError(error),
            targetElement: 'interactive'
        });
        
        this.cameraScanner.start();
    }

    handleManualBarcode(barcode) {
        if (!barcode || barcode.trim() === '') {
            this.showToast('Please enter a valid barcode', 'error');
            return;
        }
        
        this.handleBarcodeDetection(barcode.trim());
    }

    handleBarcodeDetection(barcode) {
        // Prevent duplicate scans in quick succession
        if (this.currentBarcode === barcode) {
            return;
        }
        
        console.log('Barcode detected:', barcode);
        this.currentBarcode = barcode;
        
        // Play success sound
        this.playBeepSound();
        
        // Vibrate if supported
        if (navigator.vibrate) {
            navigator.vibrate(200);
        }
        
        // Add to scan history
        this.addToScanHistory(barcode);
        
        // Show toast notification
        this.showToast(`Barcode detected: ${barcode}`, 'success');
        
        // Call the provided callback
        if (typeof this.options.onBarcodeDetected === 'function') {
            this.options.onBarcodeDetected(barcode);
        }
        
        // Reset current barcode after a short delay
        setTimeout(() => {
            this.currentBarcode = '';
        }, 2000);
    }

    handleScannerError(error) {
        console.error('Scanner error:', error);
        this.showToast(`Camera error: ${error.message || 'Unknown error'}`, 'error');
    }

    addToScanHistory(barcode) {
        this.scanHistory.unshift(barcode);
        if (this.scanHistory.length > 5) {
            this.scanHistory.pop();
        }
        
        const historyContainer = document.getElementById('scan-history');
        if (historyContainer) {
            const item = document.createElement('div');
            item.className = 'text-sm py-1 border-b border-gray-200 last:border-0';
            item.innerHTML = `
                <div class="flex justify-between items-center">
                    <span class="font-medium">${barcode}</span>
                    <span class="text-xs text-gray-500">${new Date().toLocaleTimeString()}</span>
                </div>
            `;
            
            historyContainer.prepend(item);
            
            // Trim history in DOM if too long
            while (historyContainer.children.length > 5) {
                historyContainer.removeChild(historyContainer.lastChild);
            }
        }
    }

    playBeepSound() {
        const audio = new Audio('/static/sounds/beep.mp3');
        audio.play().catch(e => console.log('Error playing sound:', e));
    }

    showToast(message, type = 'info') {
        // Create toast container if it doesn't exist
        let toastContainer = document.getElementById('toast-container');
        if (!toastContainer) {
            toastContainer = document.createElement('div');
            toastContainer.id = 'toast-container';
            toastContainer.className = 'fixed top-4 right-4 z-50 flex flex-col gap-2';
            document.body.appendChild(toastContainer);
        }
        
        // Create toast element
        const toast = document.createElement('div');
        toast.className = `p-3 rounded shadow-lg flex items-center gap-2 animate-in slide-in-from-right duration-200 max-w-xs text-sm ${
            type === 'success' ? 'bg-green-100 text-green-800 border-l-4 border-green-500' : 
            type === 'error' ? 'bg-red-100 text-red-800 border-l-4 border-red-500' : 
            'bg-blue-100 text-blue-800 border-l-4 border-blue-500'
        }`;
        
        toast.innerHTML = `
            <div class="flex-shrink-0">
                ${type === 'success' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-check-circle"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="m9 11 3 3L22 4"/></svg>' : 
                type === 'error' ? '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x-circle"><circle cx="12" cy="12" r="10"/><path d="m15 9-6 6"/><path d="m9 9 6 6"/></svg>' : 
                '<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-info"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>'}
            </div>
            <div>${message}</div>
        `;
        
        toastContainer.appendChild(toast);
        
        // Remove toast after delay
        setTimeout(() => {
            toast.classList.add('slide-out-to-right', 'duration-200');
            setTimeout(() => {
                toast.remove();
                if (toastContainer.children.length === 0) {
                    toastContainer.remove();
                }
            }, 200);
        }, 3000);
    }
}

// Make BarcodeScanner available globally
window.BarcodeScanner = BarcodeScanner;
