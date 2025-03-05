
// Main JavaScript file for POS System

document.addEventListener('DOMContentLoaded', function() {
    // Initialize barcode scanner functionality
    initializeBarcodeScanner();
    
    // Initialize product search
    initializeProductSearch();
    
    // Initialize cart functionality if on POS page
    if (document.getElementById('pos-interface')) {
        initializeCart();
    }
    
    // Initialize payment modals
    initializePaymentModals();
});

// Barcode scanner functionality
function initializeBarcodeScanner() {
    const barcodeForm = document.getElementById('barcode-form');
    if (!barcodeForm) return;
    
    barcodeForm.addEventListener('submit', function(e) {
        e.preventDefault();
        const barcode = document.getElementById('barcode-input').value;
        
        if (!barcode) return;
        
        // Call API to get product by barcode
        fetch(`/pos/api/products/barcode/${barcode}/`)
            .then(response => response.json())
            .then(data => {
                if (data.success) {
                    addToCart(data.product);
                    document.getElementById('barcode-input').value = '';
                } else {
                    showToast('Product not found', 'error');
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showToast('Failed to scan product', 'error');
            });
    });
}

// Product search functionality
function initializeProductSearch() {
    const searchInput = document.getElementById('product-search');
    if (!searchInput) return;
    
    searchInput.addEventListener('input', function() {
        const searchValue = this.value.toLowerCase();
        const productElements = document.querySelectorAll('.product-item');
        
        productElements.forEach(product => {
            const productName = product.getAttribute('data-name').toLowerCase();
            const productBarcode = product.getAttribute('data-barcode').toLowerCase();
            
            if (productName.includes(searchValue) || productBarcode.includes(searchValue)) {
                product.style.display = 'block';
            } else {
                product.style.display = 'none';
            }
        });
    });
}

// Cart functionality
function initializeCart() {
    // Add product to cart
    document.querySelectorAll('.add-to-cart').forEach(button => {
        button.addEventListener('click', function() {
            const productId = this.getAttribute('data-product-id');
            
            fetch(`/pos/api/products/${productId}/`)
                .then(response => response.json())
                .then(data => {
                    if (data.success) {
                        addToCart(data.product);
                    } else {
                        showToast('Failed to add product', 'error');
                    }
                })
                .catch(error => {
                    console.error('Error:', error);
                    showToast('Failed to add product', 'error');
                });
        });
    });
    
    // Update cart item quantity
    document.addEventListener('click', function(e) {
        if (e.target.matches('.quantity-btn')) {
            const productId = e.target.getAttribute('data-product-id');
            const change = parseInt(e.target.getAttribute('data-change'));
            updateCartItemQuantity(productId, change);
        }
    });
    
    // Remove item from cart
    document.addEventListener('click', function(e) {
        if (e.target.matches('.remove-item')) {
            const productId = e.target.getAttribute('data-product-id');
            removeFromCart(productId);
        }
    });
    
    // Select payment method
    document.querySelectorAll('.payment-method').forEach(method => {
        method.addEventListener('click', function() {
            document.querySelectorAll('.payment-method').forEach(m => {
                m.classList.remove('selected');
            });
            this.classList.add('selected');
            
            const methodId = this.getAttribute('data-method');
            document.getElementById('payment_method').value = methodId;
            
            // Show relevant payment forms
            document.querySelectorAll('.payment-form').forEach(form => {
                form.style.display = 'none';
            });
            
            if (methodId === 'card') {
                document.getElementById('card-payment-form').style.display = 'block';
            } else if (methodId === 'wallet') {
                document.getElementById('ewallet-payment-form').style.display = 'block';
            }
        });
    });
}

// Payment modals
function initializePaymentModals() {
    // Card payment form
    const cardForm = document.getElementById('card-payment-form');
    if (cardForm) {
        cardForm.addEventListener('submit', function(e) {
            e.preventDefault();
            processPayment();
        });
    }
    
    // E-wallet payment form
    const walletForm = document.getElementById('ewallet-payment-form');
    if (walletForm) {
        const fileInput = document.getElementById('receipt-upload');
        fileInput.addEventListener('change', function() {
            if (this.files && this.files[0]) {
                const reader = new FileReader();
                reader.onload = function(e) {
                    document.getElementById('receipt-preview').src = e.target.result;
                    document.getElementById('receipt-preview-container').style.display = 'block';
                };
                reader.readAsDataURL(this.files[0]);
            }
        });
        
        walletForm.addEventListener('submit', function(e) {
            e.preventDefault();
            if (!document.getElementById('receipt-upload').files[0]) {
                showToast('Please upload a receipt', 'error');
                return;
            }
            processPayment();
        });
    }
}

// Helper functions
function addToCart(product) {
    let cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    
    // Check if product already exists in cart
    const existingProductIndex = cart.findIndex(item => item.id === product.id);
    
    if (existingProductIndex !== -1) {
        // Update quantity if product already in cart
        cart[existingProductIndex].quantity += 1;
    } else {
        // Add new product to cart
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            barcode: product.barcode,
            quantity: 1
        });
    }
    
    localStorage.setItem('pos_cart', JSON.stringify(cart));
    updateCartDisplay();
    showToast(`Added ${product.name} to cart`, 'success');
}

function updateCartItemQuantity(productId, change) {
    let cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    
    const productIndex = cart.findIndex(item => item.id === parseInt(productId));
    
    if (productIndex !== -1) {
        cart[productIndex].quantity += change;
        
        if (cart[productIndex].quantity <= 0) {
            // Remove item if quantity is zero or less
            cart.splice(productIndex, 1);
        }
        
        localStorage.setItem('pos_cart', JSON.stringify(cart));
        updateCartDisplay();
    }
}

function removeFromCart(productId) {
    let cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    
    const productIndex = cart.findIndex(item => item.id === parseInt(productId));
    
    if (productIndex !== -1) {
        const productName = cart[productIndex].name;
        cart.splice(productIndex, 1);
        
        localStorage.setItem('pos_cart', JSON.stringify(cart));
        updateCartDisplay();
        showToast(`Removed ${productName} from cart`, 'info');
    }
}

function updateCartDisplay() {
    const cartContainer = document.getElementById('cart-items');
    if (!cartContainer) return;
    
    const cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    
    if (cart.length === 0) {
        cartContainer.innerHTML = `
            <div class="empty-cart">
                <svg xmlns="http://www.w3.org/2000/svg" class="h-16 w-16 mx-auto text-gray-300 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p class="text-gray-500 text-center">Cart is empty. Add some products!</p>
            </div>
        `;
    } else {
        let cartHTML = '';
        let total = 0;
        
        cart.forEach(item => {
            const subtotal = item.price * item.quantity;
            total += subtotal;
            
            cartHTML += `
                <div class="cart-item card mb-3">
                    <div class="card-body">
                        <div class="d-flex justify-content-between align-items-center">
                            <div>
                                <h5 class="card-title mb-1">${item.name}</h5>
                                <p class="card-subtitle mb-2">₱${item.price.toFixed(2)} × ${item.quantity}</p>
                            </div>
                            <div class="text-right">
                                <p class="font-weight-bold">₱${subtotal.toFixed(2)}</p>
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-outline quantity-btn" data-product-id="${item.id}" data-change="-1">-</button>
                                    <span class="btn btn-sm disabled">${item.quantity}</span>
                                    <button class="btn btn-sm btn-outline quantity-btn" data-product-id="${item.id}" data-change="1">+</button>
                                </div>
                                <button class="btn btn-sm btn-danger remove-item" data-product-id="${item.id}">
                                    <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                </button>
                            </div>
                        </div>
                    </div>
                </div>
            `;
        });
        
        cartContainer.innerHTML = cartHTML;
        
        // Update total
        document.getElementById('cart-total').textContent = `₱${total.toFixed(2)}`;
        document.getElementById('total').value = total.toFixed(2);
        
        // Show payment section
        document.getElementById('payment-section').style.display = 'block';
    }
}

function processPayment() {
    const cart = JSON.parse(localStorage.getItem('pos_cart') || '[]');
    if (cart.length === 0) {
        showToast('Cart is empty', 'error');
        return;
    }
    
    const paymentMethod = document.getElementById('payment_method').value;
    if (!paymentMethod) {
        showToast('Please select a payment method', 'error');
        return;
    }
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    // Prepare transaction data
    const transactionData = {
        items: cart.map(item => ({
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            barcode: item.barcode || ''
        })),
        total: total,
        payment_method: paymentMethod,
        customer_contact: document.getElementById('customer_contact')?.value || ''
    };
    
    // Add card details if payment method is card
    if (paymentMethod === 'card') {
        const cardNumber = document.getElementById('card_number').value;
        const expiryDate = document.getElementById('expiry_date').value;
        
        if (!cardNumber || !expiryDate) {
            showToast('Please fill in all card details', 'error');
            return;
        }
        
        transactionData.card_details = {
            card_number: cardNumber,
            expiry_date: expiryDate
        };
    }
    
    // Process the transaction
    fetch('/pos/api/transactions/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
        },
        body: JSON.stringify(transactionData)
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // If e-wallet payment, handle receipt upload
            if (paymentMethod === 'wallet') {
                const fileInput = document.getElementById('receipt-upload');
                if (fileInput.files.length > 0) {
                    const formData = new FormData();
                    formData.append('receipt', fileInput.files[0]);
                    
                    fetch(`/pos/api/transactions/${data.transaction_id}/upload-receipt/`, {
                        method: 'POST',
                        headers: {
                            'X-CSRFToken': document.querySelector('[name=csrfmiddlewaretoken]').value
                        },
                        body: formData
                    })
                    .then(response => response.json())
                    .then(uploadData => {
                        if (uploadData.success) {
                            completeTransaction(data.transaction_id);
                        } else {
                            showToast('Failed to upload receipt', 'error');
                        }
                    })
                    .catch(error => {
                        console.error('Error:', error);
                        showToast('Failed to upload receipt', 'error');
                    });
                } else {
                    completeTransaction(data.transaction_id);
                }
            } else {
                completeTransaction(data.transaction_id);
            }
        } else {
            showToast('Failed to create transaction', 'error');
        }
    })
    .catch(error => {
        console.error('Error:', error);
        showToast('Failed to create transaction', 'error');
    });
}

function completeTransaction(transactionId) {
    // Clear cart
    localStorage.removeItem('pos_cart');
    
    // Show success message
    showToast('Transaction completed successfully', 'success');
    
    // Show receipt options
    document.getElementById('payment-section').style.display = 'none';
    document.getElementById('success-section').style.display = 'block';
    document.getElementById('print-receipt-btn').href = `/pos/print-receipt/${transactionId}/`;
    
    // Update receipt transaction ID
    document.getElementById('receipt-transaction-id').textContent = transactionId.substring(0, 8);
}

function showToast(message, type = 'info') {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) {
        const container = document.createElement('div');
        container.id = 'toast-container';
        container.className = 'position-fixed bottom-0 right-0 p-3';
        document.body.appendChild(container);
    }
    
    const toastId = 'toast-' + Date.now();
    const toastHTML = `
        <div id="${toastId}" class="toast ${type === 'success' ? 'bg-success' : type === 'error' ? 'bg-danger' : 'bg-info'} text-white" role="alert" aria-live="assertive" aria-atomic="true">
            <div class="toast-body">
                ${message}
            </div>
        </div>
    `;
    
    document.getElementById('toast-container').innerHTML += toastHTML;
    
    // Show the toast
    setTimeout(() => {
        const toastElement = document.getElementById(toastId);
        toastElement.classList.add('show');
        
        // Auto-hide after 3 seconds
        setTimeout(() => {
            toastElement.classList.remove('show');
            setTimeout(() => {
                toastElement.remove();
            }, 300);
        }, 3000);
    }, 100);
}
