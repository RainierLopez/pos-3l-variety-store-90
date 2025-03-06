from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from django.contrib import messages
from django.views.decorators.csrf import csrf_exempt
from django.db.models import Sum, Count, F, Q
from django.utils import timezone
import json
from datetime import datetime, timedelta
from decimal import Decimal
import uuid

from .models import Product, Transaction, TransactionItem, CardDetail, EWalletReceipt
from users.models import UserProfile

# Main POS view
@login_required
def pos_home(request):
    """Main POS interface"""
    products = Product.objects.all().order_by('category', 'name')
    categories = dict(Product.CATEGORY_CHOICES)
    
    # Get session cart or initialize empty one
    cart = request.session.get('cart', [])
    
    context = {
        'products': products,
        'categories': categories,
        'cart': cart,
        'cart_count': sum(item.get('quantity', 0) for item in cart),
        'cart_total': sum(item.get('price', 0) * item.get('quantity', 0) for item in cart),
    }
    return render(request, 'pos/pos_home.html', context)

# Transaction views
@login_required
def transactions_list(request):
    """Display list of transactions"""
    status_filter = request.GET.get('status', 'all')
    payment_filter = request.GET.get('payment', 'all')
    
    transactions = Transaction.objects.all()
    
    # Apply filters
    if status_filter != 'all':
        transactions = transactions.filter(status=status_filter)
    
    if payment_filter != 'all':
        transactions = transactions.filter(payment_method=payment_filter)
    
    # For dashboard stats
    pending_count = Transaction.objects.filter(status='pending').count()
    completed_count = Transaction.objects.filter(status='completed').count()
    cancelled_count = Transaction.objects.filter(status='cancelled').count()
    
    total_sales = Transaction.objects.filter(status='completed').aggregate(total=Sum('total'))['total'] or 0
    
    context = {
        'transactions': transactions,
        'status_filter': status_filter,
        'payment_filter': payment_filter,
        'pending_count': pending_count,
        'completed_count': completed_count, 
        'cancelled_count': cancelled_count,
        'total_sales': total_sales,
    }
    return render(request, 'pos/transactions.html', context)

@login_required
def transaction_detail(request, transaction_id):
    """View transaction details"""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    if request.method == 'POST' and 'update_status' in request.POST:
        new_status = request.POST.get('status')
        if new_status in dict(Transaction.STATUS_CHOICES):
            transaction.status = new_status
            transaction.save()
            messages.success(request, f'Transaction status updated to {transaction.get_status_display()}')
            return redirect('transaction_detail', transaction_id=transaction.id)
    
    context = {
        'transaction': transaction,
        'status_choices': Transaction.STATUS_CHOICES,
    }
    return render(request, 'pos/transaction_detail.html', context)

@login_required
def print_receipt(request, transaction_id):
    """Print receipt for a transaction"""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    context = {
        'transaction': transaction,
        'print_mode': True,
    }
    return render(request, 'pos/receipt.html', context)

# Inventory Management views
@login_required
def inventory_management(request):
    """Inventory management interface"""
    category_filter = request.GET.get('category', '')
    search_query = request.GET.get('search', '')
    
    products = Product.objects.all()
    
    if category_filter:
        products = products.filter(category=category_filter)
    
    if search_query:
        products = products.filter(
            Q(name__icontains=search_query) | 
            Q(barcode__icontains=search_query)
        )
    
    products = products.order_by('category', 'name')
    
    # Stats for dashboard
    total_products = Product.objects.count()
    low_stock_products = Product.objects.filter(stock__lt=10).count()
    out_of_stock_products = Product.objects.filter(stock=0).count()
    
    context = {
        'products': products,
        'categories': Product.CATEGORY_CHOICES,
        'category_filter': category_filter,
        'search_query': search_query,
        'total_products': total_products,
        'low_stock_products': low_stock_products,
        'out_of_stock_products': out_of_stock_products,
    }
    return render(request, 'pos/inventory.html', context)

@login_required
def add_product(request):
    """Add a new product"""
    if not request.user.profile.role == 'admin':
        messages.error(request, 'You do not have permission to add products.')
        return redirect('inventory_management')
        
    categories = Product.CATEGORY_CHOICES
    
    if request.method == 'POST':
        # Process form submission
        name = request.POST.get('name')
        price = request.POST.get('price')
        category = request.POST.get('category')
        barcode = request.POST.get('barcode')
        stock = request.POST.get('stock', 0)
        image = request.POST.get('image', '')
        
        if not name or not price or not category or not barcode:
            messages.error(request, 'All required fields must be filled.')
            return render(request, 'pos/add_product.html', {
                'categories': categories,
                'form_data': request.POST,
            })
        
        # Check if barcode already exists
        if Product.objects.filter(barcode=barcode).exists():
            messages.error(request, f'A product with barcode {barcode} already exists.')
            return render(request, 'pos/add_product.html', {
                'categories': categories,
                'form_data': request.POST,
            })
        
        # Create new product
        try:
            product = Product(
                name=name,
                price=price,
                category=category,
                barcode=barcode,
                stock=stock,
                image=image
            )
            product.save()
            messages.success(request, f'Product "{name}" has been added successfully.')
            return redirect('inventory_management')
        except Exception as e:
            messages.error(request, f'Error adding product: {str(e)}')
    
    return render(request, 'pos/add_product.html', {'categories': categories})

@login_required
def edit_product(request, product_id):
    """Edit an existing product"""
    if not request.user.profile.role == 'admin':
        messages.error(request, 'You do not have permission to edit products.')
        return redirect('inventory_management')
        
    product = get_object_or_404(Product, id=product_id)
    categories = Product.CATEGORY_CHOICES
    
    if request.method == 'POST':
        # Update product with form data
        product.name = request.POST.get('name')
        product.price = request.POST.get('price')
        product.category = request.POST.get('category')
        product.barcode = request.POST.get('barcode')
        product.stock = request.POST.get('stock', 0)
        product.image = request.POST.get('image', '')
        
        # Validate barcode uniqueness
        if Product.objects.exclude(id=product_id).filter(barcode=product.barcode).exists():
            messages.error(request, f'A product with barcode {product.barcode} already exists.')
            return render(request, 'pos/edit_product.html', {
                'product': product,
                'categories': categories
            })
        
        try:
            product.save()
            messages.success(request, f'Product "{product.name}" has been updated successfully.')
            return redirect('inventory_management')
        except Exception as e:
            messages.error(request, f'Error updating product: {str(e)}')
    
    return render(request, 'pos/edit_product.html', {
        'product': product,
        'categories': categories
    })

@login_required
def delete_product(request, product_id):
    """Delete a product"""
    if not request.user.profile.role == 'admin':
        messages.error(request, 'You do not have permission to delete products.')
        return redirect('inventory_management')
        
    product = get_object_or_404(Product, id=product_id)
    
    if request.method == 'POST':
        try:
            product_name = product.name
            product.delete()
            messages.success(request, f'Product "{product_name}" has been deleted successfully.')
            return redirect('inventory_management')
        except Exception as e:
            messages.error(request, f'Error deleting product: {str(e)}')
    
    return render(request, 'pos/delete_product.html', {'product': product})

# Reports
@login_required
def sales_report(request):
    """Sales report view"""
    if not request.user.profile.role == 'admin':
        messages.error(request, 'You do not have permission to view reports.')
        return redirect('pos_home')
        
    # Get date range from request or use default (last 30 days)
    end_date = timezone.now().date()
    start_date = request.GET.get('start_date', (end_date - timedelta(days=30)).isoformat())
    end_date_param = request.GET.get('end_date', end_date.isoformat())
    
    # Parse dates
    try:
        start_date = datetime.fromisoformat(start_date).date()
        end_date = datetime.fromisoformat(end_date_param).date()
        # Include the entire end date
        end_date = datetime.combine(end_date, datetime.max.time())
    except ValueError:
        start_date = end_date - timedelta(days=30)
        end_date = datetime.combine(end_date, datetime.max.time())
    
    # Get completed transactions in date range
    transactions = Transaction.objects.filter(
        timestamp__gte=start_date,
        timestamp__lte=end_date,
        status='completed'
    )
    
    # Calculate totals
    total_sales = transactions.aggregate(Sum('total'))['total__sum'] or 0
    total_transactions = transactions.count()
    
    # Payment method breakdown
    payment_methods = {}
    for method_id, method_name in Transaction.PAYMENT_CHOICES:
        payment_transactions = transactions.filter(payment_method=method_id)
        payment_methods[method_name] = {
            'count': payment_transactions.count(),
            'total': payment_transactions.aggregate(Sum('total'))['total__sum'] or 0
        }
    
    # Top selling products
    top_products = TransactionItem.objects.filter(
        transaction__in=transactions
    ).values(
        'product__name'
    ).annotate(
        total_quantity=Sum('quantity'),
        total_sales=Sum(F('quantity') * F('price'))
    ).order_by('-total_sales')[:10]
    
    # Daily sales for chart
    daily_sales = transactions.values(
        'timestamp__date'
    ).annotate(
        date=F('timestamp__date'),
        total=Sum('total')
    ).values('date', 'total').order_by('date')
    
    context = {
        'start_date': start_date,
        'end_date': end_date.date(),
        'total_sales': total_sales,
        'total_transactions': total_transactions,
        'payment_methods': payment_methods,
        'top_products': top_products,
        'daily_sales': daily_sales,
        'transactions': transactions,
    }
    return render(request, 'pos/sales_report.html', context)

# Barcode Scanner
@login_required
def barcode_scanner(request):
    """Barcode scanner interface"""
    return render(request, 'pos/barcode_scanner.html')

# API endpoints for AJAX requests
@login_required
def get_products(request):
    """API: Get all products"""
    category = request.GET.get('category', '')
    
    products = Product.objects.all()
    
    if category:
        products = products.filter(category=category)
    
    products_data = []
    
    for product in products:
        products_data.append({
            'id': product.id,
            'name': product.name,
            'price': float(product.price),
            'category': product.category,
            'barcode': product.barcode,
            'image': product.image or '/static/images/placeholder.svg',
            'stock': product.stock
        })
    
    return JsonResponse(products_data, safe=False)

@login_required
def get_product(request, product_id):
    """API: Get product by ID"""
    try:
        product = Product.objects.get(id=product_id)
        product_data = {
            'id': product.id,
            'name': product.name,
            'price': float(product.price),
            'category': product.category,
            'barcode': product.barcode,
            'image': product.image or '/static/images/placeholder.svg',
            'stock': product.stock
        }
        return JsonResponse(product_data)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)

@login_required
def get_product_by_barcode(request):
    """API: Get product by barcode"""
    barcode = request.GET.get('barcode', '')
    
    if not barcode:
        return JsonResponse({'error': 'No barcode provided'}, status=400)
    
    try:
        product = Product.objects.get(barcode=barcode)
        product_data = {
            'id': product.id,
            'name': product.name,
            'price': float(product.price),
            'category': product.category,
            'barcode': product.barcode,
            'image': product.image or '/static/images/placeholder.svg',
            'stock': product.stock
        }
        return JsonResponse(product_data)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)

# Cart API endpoints
@login_required
def get_cart(request):
    """API: Get current cart contents"""
    cart = request.session.get('cart', [])
    return JsonResponse(cart, safe=False)

@login_required
@csrf_exempt
def add_to_cart(request):
    """API: Add product to cart"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)
    
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 1))
        
        if quantity <= 0:
            return JsonResponse({'error': 'Invalid quantity'}, status=400)
        
        # Get product
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return JsonResponse({'error': 'Product not found'}, status=404)
        
        # Check stock
        if product.stock < quantity:
            return JsonResponse({'error': 'Not enough stock'}, status=400)
        
        # Get cart from session
        cart = request.session.get('cart', [])
        
        # Check if product already in cart
        found = False
        for item in cart:
            if item['id'] == product_id:
                new_quantity = item['quantity'] + quantity
                
                # Check if new quantity exceeds stock
                if new_quantity > product.stock:
                    return JsonResponse({'error': 'Not enough stock'}, status=400)
                    
                item['quantity'] = new_quantity
                found = True
                break
        
        # If not in cart, add it
        if not found:
            cart.append({
                'id': product.id,
                'name': product.name,
                'price': float(product.price),
                'quantity': quantity,
                'image': product.image or '/static/images/placeholder.svg',
                'barcode': product.barcode,
                'category': product.category,
                'stock': product.stock
            })
        
        # Update session
        request.session['cart'] = cart
        
        # Calculate cart totals
        cart_total = sum(item['price'] * item['quantity'] for item in cart)
        cart_items = sum(item['quantity'] for item in cart)
        
        return JsonResponse({
            'success': True, 
            'cart': cart,
            'cart_total': cart_total,
            'cart_items': cart_items
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@csrf_exempt
def update_cart_item(request):
    """API: Update quantity of item in cart"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)
    
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity = int(data.get('quantity', 1))
        
        # Validate quantity
        if quantity <= 0:
            return JsonResponse({'error': 'Invalid quantity'}, status=400)
        
        # Get product
        try:
            product = Product.objects.get(id=product_id)
        except Product.DoesNotExist:
            return JsonResponse({'error': 'Product not found'}, status=404)
            
        # Check if new quantity exceeds stock
        if quantity > product.stock:
            return JsonResponse({'error': 'Not enough stock'}, status=400)
        
        # Get cart from session
        cart = request.session.get('cart', [])
        
        # Find and update product in cart
        found = False
        for item in cart:
            if item['id'] == product_id:
                item['quantity'] = quantity
                found = True
                break
        
        if not found:
            return JsonResponse({'error': 'Product not in cart'}, status=404)
        
        # Update session
        request.session['cart'] = cart
        
        # Calculate cart totals
        cart_total = sum(item['price'] * item['quantity'] for item in cart)
        cart_items = sum(item['quantity'] for item in cart)
        
        return JsonResponse({
            'success': True, 
            'cart': cart,
            'cart_total': cart_total,
            'cart_items': cart_items
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@csrf_exempt
def remove_from_cart(request):
    """API: Remove item from cart"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)
    
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        
        # Get cart from session
        cart = request.session.get('cart', [])
        
        # Remove product from cart
        updated_cart = [item for item in cart if item['id'] != product_id]
        
        # Update session
        request.session['cart'] = updated_cart
        
        # Calculate cart totals
        cart_total = sum(item['price'] * item['quantity'] for item in updated_cart)
        cart_items = sum(item['quantity'] for item in updated_cart)
        
        return JsonResponse({
            'success': True, 
            'cart': updated_cart,
            'cart_total': cart_total,
            'cart_items': cart_items
        })
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@csrf_exempt
def clear_cart(request):
    """API: Clear entire cart"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)
    
    # Clear cart in session
    request.session['cart'] = []
    return JsonResponse({
        'success': True, 
        'cart': [],
        'cart_total': 0,
        'cart_items': 0
    })

@login_required
@csrf_exempt
def create_transaction(request):
    """API: Create new transaction from cart"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)
    
    try:
        data = json.loads(request.body)
        payment_method = data.get('payment_method', 'cash')
        customer_contact = data.get('customer_contact', '')
        
        # Validate payment method
        if payment_method not in dict(Transaction.PAYMENT_CHOICES):
            return JsonResponse({'error': f'Invalid payment method: {payment_method}'}, status=400)
            
        # Get cart from session
        cart = request.session.get('cart', [])
        
        if not cart:
            return JsonResponse({'error': 'Cart is empty'}, status=400)
        
        # Validate stock for all items
        for item in cart:
            product = Product.objects.get(id=item['id'])
            if product.stock < item['quantity']:
                return JsonResponse({
                    'error': f'Not enough stock for {product.name}. Available: {product.stock}, Requested: {item["quantity"]}'
                }, status=400)
        
        # Calculate total
        total = sum(item['price'] * item['quantity'] for item in cart)
        
        # Create transaction
        transaction = Transaction.objects.create(
            cashier=request.user,
            total=total,
            payment_method=payment_method,
            customer_contact=customer_contact,
            status='pending'
        )
        
        # Create transaction items and update stock
        for item in cart:
            # Create transaction item
            TransactionItem.objects.create(
                transaction=transaction,
                product_id=item['id'],
                name=item['name'],
                quantity=item['quantity'],
                price=item['price'],
                barcode=item.get('barcode', '')
            )
            
            # Update product stock
            product = Product.objects.get(id=item['id'])
            product.stock -= item['quantity']
            product.save()
        
        # Process card details if payment method is card
        if payment_method == 'card' and 'card_details' in data:
            card_details = data.get('card_details', {})
            card_number = card_details.get('card_number', '')
            expiry_date = card_details.get('expiry_date', '')
            
            if card_number and expiry_date:
                CardDetail.objects.create(
                    transaction=transaction,
                    card_number=card_number[-4:],  # Only store last 4 digits
                    expiry_date=expiry_date
                )
        
        # If payment method is cash, mark as completed
        if payment_method == 'cash':
            transaction.status = 'completed'
            transaction.save()
        
        # Return transaction details
        transaction_data = {
            'id': str(transaction.id),
            'timestamp': transaction.timestamp.isoformat(),
            'total': float(transaction.total),
            'payment_method': transaction.payment_method,
            'status': transaction.status,
            'items': [
                {
                    'name': item.name,
                    'quantity': item.quantity,
                    'price': float(item.price),
                    'subtotal': float(item.price * item.quantity),
                    'barcode': item.barcode
                }
                for item in transaction.items.all()
            ]
        }
        
        # Clear cart after successful transaction
        request.session['cart'] = []
        
        return JsonResponse({'success': True, 'transaction': transaction_data})
        
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@csrf_exempt
def upload_ewallet_receipt(request, transaction_id):
    """API: Upload e-wallet receipt for transaction"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)
    
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        
        # Check if transaction payment method is wallet
        if transaction.payment_method != 'wallet':
            return JsonResponse({'error': 'Transaction is not an e-wallet payment'}, status=400)
        
        # Check if receipt already uploaded
        if hasattr(transaction, 'wallet_receipt'):
            return JsonResponse({'error': 'Receipt already uploaded'}, status=400)
        
        # Process uploaded file
        if 'receipt_image' not in request.FILES:
            return JsonResponse({'error': 'No receipt image provided'}, status=400)
        
        image = request.FILES['receipt_image']
        
        # Create receipt record
        receipt = EWalletReceipt.objects.create(
            transaction=transaction,
            receipt_image=image
        )
        
        # Update transaction status
        transaction.status = 'completed'
        transaction.save()
        
        return JsonResponse({'success': True})
        
    except Transaction.DoesNotExist:
        return JsonResponse({'error': 'Transaction not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
@csrf_exempt
def update_transaction_status(request, transaction_id):
    """API: Update transaction status"""
    if request.method != 'POST':
        return JsonResponse({'error': 'Invalid method'}, status=405)
    
    try:
        transaction = Transaction.objects.get(id=transaction_id)
        
        # Check if user is admin
        if not request.user.profile.role == 'admin':
            return JsonResponse({'error': 'Permission denied'}, status=403)
        
        data = json.loads(request.body)
        status = data.get('status')
        
        if status not in dict(Transaction.STATUS_CHOICES):
            return JsonResponse({'error': 'Invalid status'}, status=400)
        
        # Update status
        transaction.status = status
        transaction.save()
        
        return JsonResponse({'success': True})
        
    except Transaction.DoesNotExist:
        return JsonResponse({'error': 'Transaction not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)

@login_required
def camera_scanner(request):
    """Camera scanner interface"""
    # Create a test product with the specific barcode if it doesn't exist yet
    test_barcode = "8801234567891"
    if not Product.objects.filter(barcode=test_barcode).exists():
        try:
            Product.objects.create(
                name="Test Code-128 Product",
                price=99.99,
                category="meat",
                barcode=test_barcode,
                stock=100,
                image="https://images.unsplash.com/photo-1607623814075-e51df1bdc82f?auto=format&fit=crop&q=80&w=500"
            )
        except:
            # Product might already exist
            pass
            
    return render(request, 'pos/camera_scanner.html')

@csrf_exempt
def process_camera_scan(request):
    if request.method == 'POST':
        try:
            data = json.loads(request.body)
            barcode = data.get('barcode')

            if not barcode:
                return JsonResponse({'error': 'No barcode provided'}, status=400)

            try:
                product = Product.objects.get(barcode=barcode)
                product_data = {
                    'id': product.id,
                    'name': product.name,
                    'price': float(product.price),
                    'category': product.category,
                    'barcode': product.barcode,
                    'image': product.image or '/static/images/placeholder.svg',
                    'stock': product.stock
                }
                return JsonResponse(product_data)
            except Product.DoesNotExist:
                return JsonResponse({'error': 'Product not found'}, status=404)

        except json.JSONDecodeError:
            return JsonResponse({'error': 'Invalid JSON'}, status=400)

    return JsonResponse({'error': 'Invalid method'}, status=405)
