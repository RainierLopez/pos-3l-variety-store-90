
// Main.js - Main application logic for POS system

document.addEventListener('DOMContentLoaded', function() {
    // Initialize the app state
    const appState = {
        products: [],
        cart: [],
        selectedCategory: 'meat',
        paymentComplete: false,
        selectedPaymentMethod: null,
        ewalletReceipt: null,
        cardDetails: {
            cardNumber: '',
            expiryDate: '',
            cvv: ''
        },
        currentTransactionId: null,
        isProductCatalogCollapsed: false
    };

    // Initialize barcode scanner
    const barcodeScanner = new BarcodeScanner({
        onBarcodeDetected: handleBarcodeDetection
    });

    // Fetch products from API
    fetchProducts();

    // Add event listeners
    setupEventListeners();

    // Set up cart from local storage if available
    loadCartFromStorage();

    // Initial rendering
    renderUI();

    // Functions
    
    function fetchProducts() {
        fetch('/api/products/')
            .then(response => response.json())
            .then(data => {
                appState.products = data.products;
                renderProductGrid();
            })
            .catch(error => {
                console.error('Error fetching products:', error);
                showToast('Failed to load products', 'error');
            });
    }

    function setupEventListeners() {
        // Category buttons
        document.getElementById('meat-category-btn').addEventListener('click', () => {
            appState.selectedCategory = 'meat';
            updateCategoryButtons();
            renderProductGrid();
        });

        document.getElementById('vegetable-category-btn').addEventListener('click', () => {
            appState.selectedCategory = 'vegetable';
            updateCategoryButtons();
            renderProductGrid();
        });

        // Product search
        document.getElementById('product-search').addEventListener('input', (e) => {
            renderProductGrid(e.target.value);
        });

        // Manual barcode entry
        document.getElementById('manual-barcode').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                handleManualBarcodeScan();
            }
        });

        document.getElementById('manual-scan-btn').addEventListener('click', handleManualBarcodeScan);

        // Payment method selection
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                selectPaymentMethod(btn.getAttribute('data-payment'));
            });
        });

        // Card form submission
        document.getElementById('card-form').addEventListener('submit', (e) => {
            e.preventDefault();
            handleCardSubmit();
        });

        // E-wallet receipt upload
        const receiptUploadArea = document.querySelector('#ewallet-payment-form .border-dashed');
        const receiptInput = document.getElementById('receipt-upload');
        
        receiptUploadArea.addEventListener('click', () => {
            receiptInput.click();
        });
        
        receiptInput.addEventListener('change', handleReceiptUpload);
        
        document.getElementById('remove-receipt').addEventListener('click', () => {
            appState.ewalletReceipt = null;
            document.getElementById('receipt-upload').value = '';
            document.getElementById('upload-preview').classList.add('hidden');
            document.getElementById('submit-ewallet').disabled = true;
        });
        
        document.getElementById('submit-ewallet').addEventListener('click', handleEwalletSubmit);

        // Pay now button
        document.getElementById('pay-now-btn').addEventListener('click', processPayment);
        
        // Print receipt
        document.getElementById('print-receipt-btn').addEventListener('click', printReceipt);
        
        // New transaction
        document.getElementById('new-transaction-btn').addEventListener('click', startNewTransaction);
        
        // Generate barcode list
        document.getElementById('generate-barcode-list').addEventListener('click', generateBarcodeList);
        
        // Phone number dialog
        document.getElementById('cancel-send-receipt').addEventListener('click', () => {
            document.getElementById('phone-number-dialog').classList.add('hidden');
        });
        
        document.getElementById('confirm-send-receipt').addEventListener('click', sendReceiptSMS);
        
        // Collapse/expand product catalog
        document.getElementById('collapse-catalog-btn').addEventListener('click', toggleProductCatalog);
    }

    function handleBarcodeDetection(barcode) {
        console.log('Barcode detected:', barcode);
        
        // Look up product by barcode
        const product = appState.products.find(p => p.barcode === barcode);
        
        if (product) {
            addToCart(product);
            showToast(`Added ${product.name} to cart`, 'success');
            
            // Close the scanner after successful scan
            if (barcodeScanner.isOpen) {
                barcodeScanner.closeScanner();
            }
        } else {
            showToast(`Product not found for barcode: ${barcode}`, 'error');
        }
    }

    function handleManualBarcodeScan() {
        const barcodeInput = document.getElementById('manual-barcode');
        const barcode = barcodeInput.value.trim();
        
        if (barcode) {
            handleBarcodeDetection(barcode);
            barcodeInput.value = '';
        } else {
            showToast('Please enter a barcode', 'error');
        }
    }

    function selectPaymentMethod(method) {
        appState.selectedPaymentMethod = method;
        
        // Update UI to show selected payment method
        document.querySelectorAll('.payment-method-btn').forEach(btn => {
            if (btn.getAttribute('data-payment') === method) {
                btn.classList.add('border-[#8B4513]', 'bg-[#8B4513]/10');
            } else {
                btn.classList.remove('border-[#8B4513]', 'bg-[#8B4513]/10');
            }
        });
        
        // Show/hide payment form based on selection
        document.getElementById('card-payment-form').classList.toggle('hidden', method !== 'card');
        document.getElementById('ewallet-payment-form').classList.toggle('hidden', method !== 'wallet');
        
        // Enable pay now button if cash is selected
        const payNowBtn = document.getElementById('pay-now-btn');
        payNowBtn.disabled = false;
        payNowBtn.classList.toggle('hidden', method === 'card' || method === 'wallet');
        
        if (method === 'cash') {
            showToast('Cash payment selected. Click "Pay Now" to continue.', 'info');
        }
    }

    function handleCardSubmit() {
        appState.cardDetails = {
            cardNumber: document.getElementById('card-number').value,
            expiryDate: document.getElementById('expiry-date').value,
            cvv: document.getElementById('cvv').value
        };
        
        // Validate card details
        if (!validateCardDetails()) {
            return;
        }
        
        processPayment();
    }

    function validateCardDetails() {
        const { cardNumber, expiryDate, cvv } = appState.cardDetails;
        
        // Basic validation
        if (!cardNumber.trim() || !expiryDate.trim() || !cvv.trim()) {
            showToast('Please fill in all card details', 'error');
            return false;
        }
        
        // Card number format (just check if it has digits only and reasonable length)
        if (!/^\d{13,19}$/.test(cardNumber.replace(/\s/g, ''))) {
            showToast('Invalid card number', 'error');
            return false;
        }
        
        // Expiry date format MM/YY
        if (!/^(0[1-9]|1[0-2])\/\d{2}$/.test(expiryDate)) {
            showToast('Invalid expiry date. Use MM/YY format', 'error');
            return false;
        }
        
        // Check if card is expired
        const [month, year] = expiryDate.split('/');
        const expiryDate20YY = new Date(2000 + parseInt(year), parseInt(month) - 1);
        if (expiryDate20YY < new Date()) {
            showToast('Card has expired', 'error');
            return false;
        }
        
        // CVV should be 3-4 digits
        if (!/^\d{3,4}$/.test(cvv)) {
            showToast('Invalid CVV', 'error');
            return false;
        }
        
        return true;
    }

    function handleReceiptUpload(e) {
        const file = e.target.files[0];
        
        if (!file) return;
        
        if (!file.type.match('image.*')) {
            showToast('Please select an image file', 'error');
            return;
        }
        
        if (file.size > 5 * 1024 * 1024) {
            showToast('File size should be less than 5MB', 'error');
            return;
        }
        
        const reader = new FileReader();
        reader.onload = function(event) {
            appState.ewalletReceipt = event.target.result;
            document.getElementById('receipt-preview').src = event.target.result;
            document.getElementById('upload-preview').classList.remove('hidden');
            document.getElementById('submit-ewallet').disabled = false;
        };
        
        reader.readAsDataURL(file);
    }

    function handleEwalletSubmit() {
        if (!appState.ewalletReceipt) {
            showToast('Please upload a receipt image', 'error');
            return;
        }
        
        processPayment();
    }

    function processPayment() {
        if (appState.cart.length === 0) {
            showToast('Cart is empty', 'error');
            return;
        }
        
        if (!appState.selectedPaymentMethod) {
            showToast('Please select a payment method', 'error');
            return;
        }
        
        // Prepare transaction data
        const transaction = {
            items: appState.cart.map(item => ({
                name: item.name,
                quantity: item.quantity,
                price: item.price,
                barcode: item.barcode
            })),
            total: calculateTotal(),
            payment_method: appState.selectedPaymentMethod
        };
        
        // Add payment-specific details
        if (appState.selectedPaymentMethod === 'card') {
            transaction.card_details = {
                card_number: appState.cardDetails.cardNumber.slice(-4),
                expiry_date: appState.cardDetails.expiryDate
            };
        }
        
        // Send transaction to server
        fetch('/api/transactions/create/', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'X-CSRFToken': getCsrfToken()
            },
            body: JSON.stringify(transaction)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                appState.currentTransactionId = data.transaction_id;
                
                // Handle e-wallet receipt upload
                if (appState.selectedPaymentMethod === 'wallet' && appState.ewalletReceipt) {
                    uploadEwalletReceipt(data.transaction_id);
                } else {
                    completeTransaction();
                }
            } else {
                showToast(`Payment failed: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error processing payment:', error);
            showToast('Payment processing failed', 'error');
        });
    }

    function uploadEwalletReceipt(transactionId) {
        // Create form data with receipt image
        const formData = new FormData();
        
        // Convert base64 to blob
        const byteString = atob(appState.ewalletReceipt.split(',')[1]);
        const mimeString = appState.ewalletReceipt.split(',')[0].split(':')[1].split(';')[0];
        const ab = new ArrayBuffer(byteString.length);
        const ia = new Uint8Array(ab);
        
        for (let i = 0; i < byteString.length; i++) {
            ia[i] = byteString.charCodeAt(i);
        }
        
        const blob = new Blob([ab], { type: mimeString });
        formData.append('receipt', blob, 'receipt.jpg');
        
        // Upload receipt to server
        fetch(`/api/transactions/${transactionId}/upload-receipt/`, {
            method: 'POST',
            headers: {
                'X-CSRFToken': getCsrfToken()
            },
            body: formData
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                completeTransaction();
            } else {
                showToast(`Failed to upload receipt: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error uploading receipt:', error);
            showToast('Failed to upload receipt', 'error');
        });
    }

    function completeTransaction() {
        // Update stock levels for products
        appState.paymentComplete = true;
        updateStockLevels();
        
        // Show payment complete UI
        renderUI();
        
        // Clear e-wallet receipt
        appState.ewalletReceipt = null;
        
        // Show success message
        showToast('Transaction completed successfully', 'success');
        
        // Clear cart from local storage
        localStorage.removeItem('pos_cart');
    }

    function updateStockLevels() {
        // In a real implementation, stock updates are handled on the server
        // But we also update our local copy for immediate UI feedback
        appState.cart.forEach(cartItem => {
            const product = appState.products.find(p => p.id === cartItem.id);
            if (product) {
                product.stock = Math.max(0, product.stock - cartItem.quantity);
            }
        });
    }

    function printReceipt() {
        if (!appState.currentTransactionId) {
            showToast('No transaction to print', 'error');
            return;
        }
        
        // Open receipt in new window
        window.open(`/print-receipt/${appState.currentTransactionId}/`);
        
        // Show phone number dialog
        document.getElementById('phone-number-dialog').classList.remove('hidden');
    }

    function sendReceiptSMS() {
        const phoneInput = document.getElementById('phone-number-input');
        const phoneNumber = phoneInput.value.trim();
        
        if (!phoneNumber.match(/^\d{11}$/)) {
            showToast('Please enter a valid 11-digit phone number', 'error');
            return;
        }
        
        // Update transaction with phone number
        fetch(`/api/transactions/${appState.currentTransactionId}/update-status/`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded',
                'X-CSRFToken': getCsrfToken()
            },
            body: `status=completed&customer_contact=${phoneNumber}`
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                showToast(`Receipt sent to ${phoneNumber}`, 'success');
                document.getElementById('phone-number-dialog').classList.add('hidden');
            } else {
                showToast(`Failed to send receipt: ${data.message}`, 'error');
            }
        })
        .catch(error => {
            console.error('Error sending receipt:', error);
            showToast('Failed to send receipt', 'error');
        });
    }

    function startNewTransaction() {
        // Reset app state
        appState.cart = [];
        appState.paymentComplete = false;
        appState.selectedPaymentMethod = null;
        appState.ewalletReceipt = null;
        appState.currentTransactionId = null;
        appState.cardDetails = {
            cardNumber: '',
            expiryDate: '',
            cvv: ''
        };
        
        // Clear form fields
        document.getElementById('card-number').value = '';
        document.getElementById('expiry-date').value = '';
        document.getElementById('cvv').value = '';
        document.getElementById('receipt-upload').value = '';
        document.getElementById('upload-preview').classList.add('hidden');
        
        // Reset UI
        renderUI();
        
        // Clear cart from local storage
        localStorage.removeItem('pos_cart');
        
        showToast('Ready for new transaction', 'info');
    }

    function generateBarcodeList() {
        window.open('/api/products/', '_blank');
    }

    function toggleProductCatalog() {
        appState.isProductCatalogCollapsed = !appState.isProductCatalogCollapsed;
        
        const mainLayout = document.getElementById('main-layout');
        const productCatalog = document.getElementById('product-catalog');
        const cartSummary = document.getElementById('cart-summary');
        
        if (appState.isProductCatalogCollapsed) {
            mainLayout.style.gridTemplateColumns = "0fr 1fr";
            productCatalog.classList.add('hidden');
            cartSummary.classList.add('col-span-2');
        } else {
            mainLayout.style.gridTemplateColumns = "1fr 1fr";
            productCatalog.classList.remove('hidden');
            cartSummary.classList.remove('col-span-2');
        }
    }

    function addToCart(product) {
        // Check if product is in stock
        if (product.stock <= 0) {
            showToast(`${product.name} is out of stock`, 'error');
            return;
        }
        
        // Reset payment state on cart changes
        appState.paymentComplete = false;
        appState.selectedPaymentMethod = null;
        
        // Check if item is already in cart
        const existingItem = appState.cart.find(item => item.id === product.id);
        
        if (existingItem) {
            // Check if adding one more would exceed stock
            if (existingItem.quantity >= product.stock) {
                showToast(`Cannot add more ${product.name}. Maximum stock reached.`, 'error');
                return;
            }
            
            // Increment quantity
            existingItem.quantity += 1;
        } else {
            // Add new item to cart
            appState.cart.push({
                ...product,
                quantity: 1
            });
        }
        
        // Save cart to local storage
        saveCartToStorage();
        
        // Update UI
        renderUI();
    }

    function updateQuantity(productId, change) {
        // Find item in cart
        const cartItemIndex = appState.cart.findIndex(item => item.id === productId);
        
        if (cartItemIndex === -1) return;
        
        // Reset payment state on cart changes
        appState.paymentComplete = false;
        appState.selectedPaymentMethod = null;
        
        const cartItem = appState.cart[cartItemIndex];
        const product = appState.products.find(p => p.id === productId);
        
        if (change < 0) {
            // Decreasing quantity
            if (cartItem.quantity + change <= 0) {
                // Remove item from cart
                appState.cart.splice(cartItemIndex, 1);
            } else {
                // Update quantity
                cartItem.quantity += change;
            }
        } else {
            // Increasing quantity - check stock
            if (product && cartItem.quantity + change > product.stock) {
                showToast(`Cannot add more ${product.name}. Maximum stock reached.`, 'error');
                return;
            }
            
            cartItem.quantity += change;
        }
        
        // Save cart to local storage
        saveCartToStorage();
        
        // Update UI
        renderUI();
    }

    function removeFromCart(productId) {
        // Reset payment state on cart changes
        appState.paymentComplete = false;
        appState.selectedPaymentMethod = null;
        
        // Remove item from cart
        appState.cart = appState.cart.filter(item => item.id !== productId);
        
        // Save cart to local storage
        saveCartToStorage();
        
        // Update UI
        renderUI();
    }

    function saveCartToStorage() {
        localStorage.setItem('pos_cart', JSON.stringify(appState.cart));
    }

    function loadCartFromStorage() {
        const savedCart = localStorage.getItem('pos_cart');
        if (savedCart) {
            try {
                appState.cart = JSON.parse(savedCart);
            } catch (e) {
                console.error('Failed to parse cart from storage:', e);
            }
        }
    }

    function calculateTotal() {
        return appState.cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    }

    function renderUI() {
        renderProductGrid();
        renderCart();
        updatePaymentSection();
    }

    function renderProductGrid(searchQuery = '') {
        const productGrid = document.getElementById('product-grid');
        
        if (!productGrid) return;
        
        // Filter products by category and search query
        const filteredProducts = appState.products.filter(product => {
            const matchesCategory = product.category === appState.selectedCategory;
            
            if (!searchQuery) {
                return matchesCategory;
            }
            
            const matchesSearch = 
                product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                product.barcode.includes(searchQuery);
                
            return matchesCategory && matchesSearch;
        });
        
        // Generate HTML for product grid
        const productsHTML = filteredProducts.map(product => `
            <button
                data-product-id="${product.id}"
                class="p-4 bg-white rounded-lg shadow-md hover:shadow-lg transition-all text-left flex flex-col h-full border border-gray-100 hover:border-[#8B4513] hover:scale-105 group product-item ${product.stock <= 0 ? 'opacity-50' : ''}"
                ${product.stock <= 0 ? 'disabled' : ''}
            >
                <div class="flex-shrink-0 h-32 w-full mb-2 overflow-hidden rounded-md bg-gray-100 relative">
                    <img 
                        src="${product.image || '/static/images/placeholder.svg'}" 
                        alt="${product.name}"
                        class="h-full w-full object-cover transition-all group-hover:scale-110"
                        onerror="this.src='/static/images/placeholder.svg'"
                    />
                    <div class="absolute bottom-0 right-0 bg-[#8B4513] text-white text-xs px-2 py-1 rounded-tl-md">
                        #${product.barcode.slice(-4)}
                    </div>
                </div>
                <div class="flex-1">
                    <h3 class="font-medium line-clamp-2 group-hover:text-[#8B4513]">${product.name}</h3>
                    <p class="text-[#8B4513] font-bold text-lg">₱${parseFloat(product.price).toFixed(2)}</p>
                    <div class="mt-1 flex items-center justify-between">
                        <span class="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-700">
                            Stock: ${product.stock}
                        </span>
                        <span class="text-xs text-[#8B4513] opacity-0 group-hover:opacity-100 transition-opacity">
                            ${product.stock > 0 ? 'Add to cart' : 'Out of stock'}
                        </span>
                    </div>
                </div>
            </button>
        `).join('');
        
        productGrid.innerHTML = productsHTML || `
            <div class="col-span-full text-center py-12">
                <svg xmlns="http://www.w3.org/2000/svg" width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-package-search mx-auto text-gray-300 mb-4"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="m7.5 4.27 9 5.15"/><polyline points="3.29 7 12 12 20.71 7"/><line x1="12" x2="12" y1="22" y2="12"/><circle cx="18.5" cy="15.5" r="2.5"/><path d="M20.27 17.27 22 19"/></svg>
                <p class="text-gray-500 text-lg">No products found</p>
            </div>
        `;
        
        // Add event listeners to product items
        document.querySelectorAll('.product-item').forEach(item => {
            item.addEventListener('click', function() {
                const productId = parseInt(this.getAttribute('data-product-id'));
                const product = appState.products.find(p => p.id === productId);
                
                if (product && product.stock > 0) {
                    addToCart(product);
                }
            });
        });
    }

    function renderCart() {
        const cartItemsContainer = document.getElementById('cart-items');
        const emptyCartMessage = document.getElementById('empty-cart-message');
        const cartTotalElement = document.getElementById('cart-total');
        
        if (!cartItemsContainer || !emptyCartMessage || !cartTotalElement) return;
        
        // Show/hide empty cart message
        if (appState.cart.length === 0) {
            emptyCartMessage.classList.remove('hidden');
            cartItemsContainer.innerHTML = '';
        } else {
            emptyCartMessage.classList.add('hidden');
            
            // Generate HTML for cart items
            const cartItemsHTML = appState.cart.map(item => `
                <div class="bg-white p-4 rounded-lg shadow-sm flex border border-gray-100">
                    <div class="w-16 h-16 bg-gray-100 rounded-md overflow-hidden flex-shrink-0">
                        <img 
                            src="${item.image || '/static/images/placeholder.svg'}" 
                            alt="${item.name}" 
                            class="w-full h-full object-cover"
                            onerror="this.src='/static/images/placeholder.svg'"
                        />
                    </div>
                    <div class="ml-4 flex-1">
                        <div class="flex justify-between">
                            <h4 class="font-medium text-gray-800">${item.name}</h4>
                            <button data-remove="${item.id}" class="text-red-500 hover:text-red-700">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-x"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>
                            </button>
                        </div>
                        <p class="text-[#8B4513] font-medium">₱${parseFloat(item.price).toFixed(2)}</p>
                        <div class="flex items-center mt-2">
                            <button data-decrease="${item.id}" class="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-minus"><path d="M5 12h14"/></svg>
                            </button>
                            <span class="mx-3 font-medium w-6 text-center">${item.quantity}</span>
                            <button data-increase="${item.id}" class="w-8 h-8 flex items-center justify-center rounded-full border border-gray-300 hover:bg-gray-100">
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-plus"><path d="M5 12h14"/><path d="M12 5v14"/></svg>
                            </button>
                            <span class="ml-auto font-medium">₱${(parseFloat(item.price) * item.quantity).toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            `).join('');
            
            cartItemsContainer.innerHTML = cartItemsHTML;
            
            // Add event listeners for cart item actions
            document.querySelectorAll('[data-decrease]').forEach(button => {
                button.addEventListener('click', function() {
                    const productId = parseInt(this.getAttribute('data-decrease'));
                    updateQuantity(productId, -1);
                });
            });
            
            document.querySelectorAll('[data-increase]').forEach(button => {
                button.addEventListener('click', function() {
                    const productId = parseInt(this.getAttribute('data-increase'));
                    updateQuantity(productId, 1);
                });
            });
            
            document.querySelectorAll('[data-remove]').forEach(button => {
                button.addEventListener('click', function() {
                    const productId = parseInt(this.getAttribute('data-remove'));
                    removeFromCart(productId);
                });
            });
        }
        
        // Update cart total
        cartTotalElement.textContent = `₱${calculateTotal().toFixed(2)}`;
        
        // Enable/disable pay now button
        const payNowBtn = document.getElementById('pay-now-btn');
        if (payNowBtn) {
            payNowBtn.disabled = appState.cart.length === 0 || !appState.selectedPaymentMethod;
        }
    }

    function updatePaymentSection() {
        const paymentSection = document.getElementById('payment-section');
        const paymentComplete = document.getElementById('payment-complete');
        
        if (!paymentSection || !paymentComplete) return;
        
        // Show payment section if cart is not empty and payment is not complete
        paymentSection.classList.toggle('hidden', appState.cart.length === 0 || appState.paymentComplete);
        
        // Show payment complete section if payment is complete
        paymentComplete.classList.toggle('hidden', !appState.paymentComplete);
        
        if (appState.paymentComplete) {
            const paymentStatus = document.getElementById('payment-status');
            
            if (paymentStatus) {
                if (appState.selectedPaymentMethod === 'cash') {
                    paymentStatus.innerHTML = `
                        <div class="bg-yellow-50 border-2 border-yellow-200 rounded-lg p-4 text-yellow-700">
                            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-banknote mx-auto mb-2"><rect width="20" height="12" x="2" y="6" rx="2"/><circle cx="12" cy="12" r="2"/><path d="M6 12h.01M18 12h.01"/></svg>
                            <p class="font-medium text-lg">Pending Payment</p>
                            <p class="text-base">Total Bill: ₱${calculateTotal().toFixed(2)}</p>
                            <p class="text-base">Method: Cash</p>
                        </div>
                    `;
                } else {
                    let icon = '';
                    
                    if (appState.selectedPaymentMethod === 'card') {
                        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-credit-card mx-auto mb-2"><rect width="20" height="14" x="2" y="5" rx="2"/><line x1="2" x2="22" y1="10" y2="10"/></svg>';
                    } else if (appState.selectedPaymentMethod === 'wallet') {
                        icon = '<svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-wallet mx-auto mb-2"><path d="M21 12V7H5a2 2 0 0 1 0-4h14v4"/><path d="M3 5v14a2 2 0 0 0 2 2h16v-5"/><path d="M18 12a2 2 0 0 0 0 4h4v-4Z"/></svg>';
                    }
                    
                    paymentStatus.innerHTML = `
                        <div class="bg-green-50 border-2 border-green-200 rounded-lg p-4 text-green-700">
                            ${icon}
                            <p class="font-medium text-lg">Payment Successful!</p>
                            <p class="text-base">Total paid: ₱${calculateTotal().toFixed(2)}</p>
                            <p class="text-base">Method: ${appState.selectedPaymentMethod === 'card' ? 'Card' : 'E-Wallet'}</p>
                        </div>
                    `;
                }
            }
        }
        
        // Reset payment forms when switching between payment methods
        if (!appState.selectedPaymentMethod) {
            document.getElementById('card-payment-form').classList.add('hidden');
            document.getElementById('ewallet-payment-form').classList.add('hidden');
            
            document.querySelectorAll('.payment-method-btn').forEach(btn => {
                btn.classList.remove('border-[#8B4513]', 'bg-[#8B4513]/10');
            });
        }
    }

    function updateCategoryButtons() {
        const meatButton = document.getElementById('meat-category-btn');
        const vegetableButton = document.getElementById('vegetable-category-btn');
        
        if (meatButton && vegetableButton) {
            if (appState.selectedCategory === 'meat') {
                meatButton.classList.add('bg-[#8B4513]', 'text-white');
                meatButton.classList.remove('border', 'border-gray-300');
                
                vegetableButton.classList.remove('bg-[#8B4513]', 'text-white');
                vegetableButton.classList.add('border', 'border-gray-300');
            } else {
                vegetableButton.classList.add('bg-[#8B4513]', 'text-white');
                vegetableButton.classList.remove('border', 'border-gray-300');
                
                meatButton.classList.remove('bg-[#8B4513]', 'text-white');
                meatButton.classList.add('border', 'border-gray-300');
            }
        }
    }

    function showToast(message, type = 'info') {
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

    function getCsrfToken() {
        const cookies = document.cookie.split(';');
        for (let i = 0; i < cookies.length; i++) {
            const cookie = cookies[i].trim();
            if (cookie.startsWith('csrftoken=')) {
                return cookie.substring('csrftoken='.length, cookie.length);
            }
        }
        return '';
    }
});
