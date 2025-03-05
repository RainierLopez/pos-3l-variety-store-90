
// Main JavaScript file for POS System

document.addEventListener('DOMContentLoaded', function() {
    // Initialize any page components
    initializeComponents();
    
    // Set up event handlers
    setupEventHandlers();
});

function initializeComponents() {
    // Initialize tooltips, modals, or other UI components
    const dropdowns = document.querySelectorAll('.dropdown-toggle');
    
    dropdowns.forEach(dropdown => {
        dropdown.addEventListener('click', function(e) {
            e.preventDefault();
            const dropdownMenu = this.nextElementSibling;
            if (dropdownMenu) {
                dropdownMenu.classList.toggle('hidden');
            }
        });
    });
    
    // Close dropdowns when clicking outside
    document.addEventListener('click', function(e) {
        dropdowns.forEach(dropdown => {
            const dropdownMenu = dropdown.nextElementSibling;
            if (!dropdown.contains(e.target) && dropdownMenu && !dropdownMenu.contains(e.target)) {
                dropdownMenu.classList.add('hidden');
            }
        });
    });
}

function setupEventHandlers() {
    // Setup event handlers for common elements
    
    // Flash messages auto-dismiss
    const flashMessages = document.querySelectorAll('.flash-message');
    flashMessages.forEach(message => {
        setTimeout(() => {
            message.style.opacity = '0';
            setTimeout(() => {
                message.style.display = 'none';
            }, 500);
        }, 5000);
    });
}

// Cart functions for POS
function addToCart(productId, name, price, image = '', barcode = '') {
    fetch('/pos/api/cart/add/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            product_id: productId,
            quantity: 1
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateCartUI(data.cart);
            showNotification('Product added to cart', 'success');
        } else {
            showNotification(data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error adding to cart:', error);
        showNotification('Failed to add product to cart', 'error');
    });
}

function updateCartItem(productId, quantity) {
    fetch('/pos/api/cart/update/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            product_id: productId,
            quantity: quantity
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateCartUI(data.cart);
        } else {
            showNotification(data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error updating cart:', error);
        showNotification('Failed to update cart', 'error');
    });
}

function removeFromCart(productId) {
    fetch('/pos/api/cart/remove/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            product_id: productId
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateCartUI(data.cart);
            showNotification('Product removed from cart', 'success');
        } else {
            showNotification(data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error removing from cart:', error);
        showNotification('Failed to remove product from cart', 'error');
    });
}

function clearCart() {
    fetch('/pos/api/cart/clear/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({})
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            updateCartUI(data.cart);
            showNotification('Cart cleared', 'success');
        } else {
            showNotification(data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error clearing cart:', error);
        showNotification('Failed to clear cart', 'error');
    });
}

function updateCartUI(cart) {
    // This should be implemented based on your specific UI
    const cartContainer = document.getElementById('cart-items');
    const cartTotal = document.getElementById('cart-total');
    const cartCount = document.getElementById('cart-count');
    
    if (cartContainer) {
        cartContainer.innerHTML = '';
        
        let total = 0;
        
        cart.forEach(item => {
            const itemTotal = item.price * item.quantity;
            total += itemTotal;
            
            const itemElement = document.createElement('div');
            itemElement.className = 'cart-item flex justify-between items-center p-2 border-b';
            itemElement.innerHTML = `
                <div>
                    <p class="font-medium">${item.name}</p>
                    <p class="text-sm text-gray-600">₱${item.price} x ${item.quantity}</p>
                </div>
                <div class="flex items-center">
                    <span class="font-medium">₱${itemTotal.toFixed(2)}</span>
                    <button onclick="removeFromCart(${item.id})" class="ml-2 text-red-500 hover:text-red-700">
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"></path><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"></path><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></svg>
                    </button>
                </div>
            `;
            
            cartContainer.appendChild(itemElement);
        });
        
        if (cartTotal) {
            cartTotal.textContent = `₱${total.toFixed(2)}`;
        }
        
        if (cartCount) {
            cartCount.textContent = cart.length;
        }
        
        // Show or hide the empty cart message
        const emptyCartMessage = document.getElementById('empty-cart-message');
        if (emptyCartMessage) {
            if (cart.length === 0) {
                emptyCartMessage.classList.remove('hidden');
            } else {
                emptyCartMessage.classList.add('hidden');
            }
        }
        
        // Enable or disable checkout button
        const checkoutButton = document.getElementById('checkout-button');
        if (checkoutButton) {
            checkoutButton.disabled = cart.length === 0;
            if (cart.length === 0) {
                checkoutButton.classList.add('opacity-50', 'cursor-not-allowed');
            } else {
                checkoutButton.classList.remove('opacity-50', 'cursor-not-allowed');
            }
        }
    }
}

function createTransaction(paymentMethod, customerContact = '') {
    fetch('/pos/api/transactions/create/', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': getCSRFToken()
        },
        body: JSON.stringify({
            payment_method: paymentMethod,
            customer_contact: customerContact
        })
    })
    .then(response => response.json())
    .then(data => {
        if (data.success) {
            // Transaction created successfully
            showNotification('Transaction created successfully', 'success');
            
            // Redirect to transaction detail or receipt page
            window.location.href = `/pos/transactions/${data.transaction.id}/`;
        } else {
            showNotification(data.error, 'error');
        }
    })
    .catch(error => {
        console.error('Error creating transaction:', error);
        showNotification('Failed to create transaction', 'error');
    });
}

// Utility functions
function getCSRFToken() {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
        const [name, value] = cookie.trim().split('=');
        if (name === 'csrftoken') {
            return value;
        }
    }
    return '';
}

function showNotification(message, type = 'info') {
    // Check if notifications container exists, create if not
    let notificationsContainer = document.getElementById('notifications-container');
    
    if (!notificationsContainer) {
        notificationsContainer = document.createElement('div');
        notificationsContainer.id = 'notifications-container';
        notificationsContainer.className = 'fixed top-4 right-4 z-50 flex flex-col items-end space-y-2';
        document.body.appendChild(notificationsContainer);
    }
    
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification p-3 rounded-lg shadow-lg transform transition-all duration-300 ease-in-out flex items-center max-w-md`;
    
    // Apply different styles based on type
    switch (type) {
        case 'success':
            notification.classList.add('bg-green-100', 'text-green-800', 'border-l-4', 'border-green-500');
            break;
        case 'error':
            notification.classList.add('bg-red-100', 'text-red-800', 'border-l-4', 'border-red-500');
            break;
        case 'warning':
            notification.classList.add('bg-yellow-100', 'text-yellow-800', 'border-l-4', 'border-yellow-500');
            break;
        default:
            notification.classList.add('bg-blue-100', 'text-blue-800', 'border-l-4', 'border-blue-500');
    }
    
    // Set content
    notification.innerHTML = `
        <div class="mr-3">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                ${type === 'success' ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clip-rule="evenodd" />' : ''}
                ${type === 'error' ? '<path fill-rule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clip-rule="evenodd" />' : ''}
                ${type === 'warning' ? '<path fill-rule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clip-rule="evenodd" />' : ''}
                ${type === 'info' ? '<path fill-rule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2h2a1 1 0 000-2H9z" clip-rule="evenodd" />' : ''}
            </svg>
        </div>
        <div>${message}</div>
        <button type="button" class="ml-auto text-gray-500 hover:text-gray-700" onclick="this.parentElement.remove()">
            <svg xmlns="http://www.w3.org/2000/svg" class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
            </svg>
        </button>
    `;
    
    // Add to container
    notificationsContainer.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        notification.classList.add('opacity-0');
        setTimeout(() => {
            notification.remove();
        }, 300);
    }, 5000);
}
