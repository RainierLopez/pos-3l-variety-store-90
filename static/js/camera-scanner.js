
// Store last result to prevent duplicate scans
let lastResult = null;
let scanning = true;
let cameraId = null;
let availableCameras = [];
let currentCameraIndex = 0;

// Initialize QuaggaJS
function initQuagga() {
    document.querySelector('.scan-status').textContent = 'Initializing camera...';
    
    Quagga.CameraAccess.enumerateVideoDevices()
        .then(function(devices) {
            availableCameras = devices.filter(device => device.kind === 'videoinput');
            console.log('Available cameras:', availableCameras);
            
            if (availableCameras.length === 0) {
                document.querySelector('.scan-status').textContent = 'No camera found';
                return;
            }
            
            // Try to start with back camera if available
            currentCameraIndex = availableCameras.findIndex(camera => 
                camera.label.toLowerCase().includes('back') || 
                camera.label.toLowerCase().includes('rear')
            );
            
            if (currentCameraIndex === -1) currentCameraIndex = 0;
            
            startScanner(availableCameras[currentCameraIndex].deviceId);
        })
        .catch(function(err) {
            console.error('Error enumerating cameras:', err);
            document.querySelector('.scan-status').textContent = 'Failed to access camera';
        });
}

function startScanner(deviceId) {
    cameraId = deviceId;
    document.querySelector('.scan-status').textContent = 'Starting camera...';
    
    Quagga.init({
        inputStream: {
            name: "Live",
            type: "LiveStream",
            target: document.querySelector('#interactive'),
            constraints: {
                width: { min: 640 },
                height: { min: 480 },
                facingMode: "environment",
                deviceId: deviceId ? { exact: deviceId } : undefined
            },
        },
        locator: {
            patchSize: "medium",
            halfSample: true
        },
        numOfWorkers: navigator.hardwareConcurrency || 2,
        frequency: 10,
        decoder: {
            readers: ["ean_reader", "ean_8_reader", "code_128_reader", "code_39_reader", "upc_reader"]
        },
        locate: true
    }, function(err) {
        if (err) {
            console.error('Error initializing Quagga:', err);
            document.querySelector('.scan-status').textContent = 'Failed to start camera: ' + err;
            return;
        }
        
        document.querySelector('.scan-status').textContent = 'Scanner active - point camera at barcode';
        Quagga.start();
        scanning = true;

        // Set up listeners for detected and processed barcodes
        Quagga.onDetected(onBarcodeDetected);
        Quagga.onProcessed(onBarcodeProcessed);
    });
}

// Handle successful barcode detection
function onBarcodeDetected(result) {
    const code = result.codeResult.code;
    
    // Prevent duplicate scans (same code scanned multiple times)
    if (lastResult === code) {
        return;
    }
    
    // Play success sound
    let beepSound = new Audio('/static/sounds/beep.mp3');
    beepSound.play();
    
    // Update the last result to prevent duplicates
    lastResult = code;
    
    // Show the detected barcode
    document.querySelector('.last-result').textContent = 'Detected: ' + code;
    
    // Add the barcode to the list
    addBarcodeToList(code);
    
    // Look up the product in the database
    lookupProduct(code);
    
    // Pause detection briefly to prevent multiple scans of the same barcode
    Quagga.pause();
    setTimeout(() => {
        if (scanning) {
            Quagga.start();
        }
    }, 1500);
}

// Visualize the processed barcode locations
function onBarcodeProcessed(result) {
    var drawingCtx = Quagga.canvas.ctx.overlay,
        drawingCanvas = Quagga.canvas.dom.overlay;

    if (result) {
        if (result.boxes) {
            drawingCtx.clearRect(0, 0, parseInt(drawingCanvas.getAttribute("width")), parseInt(drawingCanvas.getAttribute("height")));
            result.boxes.filter(function(box) {
                return box !== result.box;
            }).forEach(function(box) {
                Quagga.ImageDebug.drawPath(box, { x: 0, y: 1 }, drawingCtx, { color: "green", lineWidth: 2 });
            });
        }

        if (result.box) {
            Quagga.ImageDebug.drawPath(result.box, { x: 0, y: 1 }, drawingCtx, { color: "#00F", lineWidth: 2 });
        }

        if (result.codeResult && result.codeResult.code) {
            Quagga.ImageDebug.drawPath(result.line, { x: 'x', y: 'y' }, drawingCtx, { color: 'red', lineWidth: 3 });
        }
    }
}

// Add scanned barcode to the list
function addBarcodeToList(code) {
    const list = document.getElementById('barcodeList');
    const item = document.createElement('li');
    item.className = 'py-2 flex justify-between items-center';
    
    const timestamp = new Date().toLocaleTimeString();
    
    item.innerHTML = `
        <span class="font-medium">${code}</span>
        <span class="text-sm text-gray-500">${timestamp}</span>
    `;
    
    list.prepend(item);
}

// Look up product by barcode
function lookupProduct(barcode) {
    document.querySelector('.scan-status').textContent = 'Looking up product...';
    
    fetch(`/pos/api/products/barcode/?barcode=${barcode}`)
        .then(response => {
            if (!response.ok) {
                throw new Error('Product not found');
            }
            return response.json();
        })
        .then(product => {
            // Display the product
            document.getElementById('scannedProduct').innerHTML = `
                <div class="flex items-center justify-between">
                    <div>
                        <h3 class="font-bold text-gray-800">${product.name}</h3>
                        <p class="text-[#8B4513] font-medium">₱${parseFloat(product.price).toFixed(2)}</p>
                        <p class="text-sm text-gray-500">Stock: ${product.stock}</p>
                    </div>
                    <button 
                        onclick="addToCart(${product.id})"
                        class="px-3 py-1 bg-[#8B4513] text-white text-sm rounded-full hover:bg-[#6d3410]"
                    >
                        Add to Cart
                    </button>
                </div>
            `;
            
            document.querySelector('.scan-status').textContent = 'Product found';
        })
        .catch(error => {
            document.getElementById('scannedProduct').innerHTML = `
                <div class="text-red-500">
                    <p>No product found with barcode: ${barcode}</p>
                </div>
            `;
            document.querySelector('.scan-status').textContent = 'Product not found';
        });
}

// Add product to cart
function addToCart(productId) {
    fetch('/pos/api/cart/add/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCookie('csrftoken')
        },
        body: JSON.stringify({
            product_id: productId,
            quantity: 1
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Show success message
            document.querySelector('.scan-status').textContent = 'Added to cart';
            
            // Update the UI to show it was added
            const addButton = document.querySelector('#scannedProduct button');
            if (addButton) {
                addButton.textContent = 'Added';
                addButton.classList.remove('bg-[#8B4513]', 'hover:bg-[#6d3410]');
                addButton.classList.add('bg-green-500');
                
                // Reset after delay
                setTimeout(() => {
                    addButton.textContent = 'Add to Cart';
                    addButton.classList.add('bg-[#8B4513]', 'hover:bg-[#6d3410]');
                    addButton.classList.remove('bg-green-500');
                }, 2000);
            }
        } else {
            document.querySelector('.scan-status').textContent = 'Error: ' + data.error;
        }
    })
    .catch(error => {
        document.querySelector('.scan-status').textContent = 'Error adding to cart';
    });
}

// Toggle scanner on/off
document.getElementById('toggleCamera').addEventListener('click', function() {
    if (scanning) {
        Quagga.stop();
        scanning = false;
        this.textContent = 'Start Scanner';
        document.querySelector('.scan-status').textContent = 'Scanner paused';
    } else {
        if (cameraId) {
            startScanner(cameraId);
        } else {
            initQuagga();
        }
        this.textContent = 'Stop Scanner';
    }
});

// Switch between cameras
document.getElementById('switchCamera').addEventListener('click', function() {
    if (availableCameras.length <= 1) {
        alert('Only one camera is available');
        return;
    }
    
    Quagga.stop();
    
    currentCameraIndex = (currentCameraIndex + 1) % availableCameras.length;
    cameraId = availableCameras[currentCameraIndex].deviceId;
    
    startScanner(cameraId);
});

// Helper function to get CSRF token
function getCookie(name) {
    let cookieValue = null;
    if (document.cookie && document.cookie !== '') {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.substring(0, name.length + 1) === (name + '=')) {
                cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
                break;
            }
        }
    }
    return cookieValue;
}

// Clean up when leaving the page
window.addEventListener('beforeunload', function() {
    if (scanning) {
        Quagga.stop();
    }
});
