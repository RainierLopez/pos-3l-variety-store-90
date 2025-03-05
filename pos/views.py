
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
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
    products = Product.objects.all()
    categories = Product._meta.get_field('category').choices
    
    # Get session cart or initialize empty one
    cart = request.session.get('cart', [])
    
    context = {
        'products': products,
        'categories': categories,
        'cart': cart,
    }
    return render(request, 'pos/home.html', context)

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
    
    context = {
        'transactions': transactions,
        'status_filter': status_filter,
        'payment_filter': payment_filter,
    }
    return render(request, 'pos/transactions.html', context)

@login_required
def transaction_detail(request, transaction_id):
    """View transaction details"""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    return render(request, 'pos/transaction_detail.html', {'transaction': transaction})

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
    products = Product.objects.all().order_by('category', 'name')
    return render(request, 'pos/inventory.html', {'products': products})

@login_required
def add_product(request):
    """Add a new product"""
    categories = Product._meta.get_field('category').choices
    
    if request.method == 'POST':
        # Process form submission
        name = request.POST.get('name')
        price = request.POST.get('price')
        category = request.POST.get('category')
        barcode = request.POST.get('barcode')
        stock = request.POST.get('stock', 0)
        image = request.POST.get('image', '')
        
        # Create new product
        product = Product(
            name=name,
            price=price,
            category=category,
            barcode=barcode,
            stock=stock,
            image=image
        )
        
        try:
            product.save()
            messages.success(request, f'Product "{name}" has been added successfully.')
            return redirect('inventory_management')
        except Exception as e:
            messages.error(request, f'Error adding product: {str(e)}')
    
    return render(request, 'pos/add_product.html', {'categories': categories})

@login_required
def edit_product(request, product_id):
    """Edit an existing product"""
    product = get_object_or_404(Product, id=product_id)
    categories = Product._meta.get_field('category').choices
    
    if request.method == 'POST':
        # Update product with form data
        product.name = request.POST.get('name')
        product.price = request.POST.get('price')
        product.category = request.POST.get('category')
        product.barcode = request.POST.get('barcode')
        product.stock = request.POST.get('stock', 0)
        product.image = request.POST.get('image', '')
        
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
    for method_id, method_name in Transaction._meta.get_field('payment_method').choices:
        payment_transactions = transactions.filter(payment_method=method_id)
        payment_methods[method_name] = {
            'count': payment_transactions.count(),
            'total': payment_transactions.aggregate(Sum('total'))['total__sum'] or 0
        }
    
    # Top selling products
    top_products = []
    items = TransactionItem.objects.filter(transaction__in=transactions)
    
    # Group by product and calculate total sales
    products_data = {}
    for item in items:
        if item.product_id not in products_data:
            products_data[item.product_id] = {
                'name': item.name,
                'quantity': 0,
                'sales': 0
            }
        products_data[item.product_id]['quantity'] += item.quantity
        products_data[item.product_id]['sales'] += item.quantity * item.price
    
    # Convert to list and sort by sales
    top_products = sorted(
        products_data.values(),
        key=lambda x: x['sales'],
        reverse=True
    )[:10]  # Top 10 products
    
    context = {
        'start_date': start_date,
        'end_date': end_date,
        'total_sales': total_sales,
        'total_transactions': total_transactions,
        'payment_methods': payment_methods,
        'top_products': top_products,
        'transactions': transactions,
    }
    return render(request, 'pos/sales_report.html', context)

# API endpoints for AJAX requests
@login_required
def get_products(request):
    """API: Get all products"""
    products = Product.objects.all()
    products_data = []
    
    for product in products:
        products_data.append({
            'id': product.id,
            'name': product.name,
            'price': float(product.price),
            'category': product.category,
            'barcode': product.barcode,
            'image': product.image,
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
            'image': product.image,
            'stock': product.stock
        }
        return JsonResponse(product_data)
    except Product.DoesNotExist:
        return JsonResponse({'error': 'Product not found'}, status=404)

@login_required
def get_product_by_barcode(request, barcode):
    """API: Get product by barcode"""
    try:
        product = Product.objects.get(barcode=barcode)
        product_data = {
            'id': product.id,
            'name': product.name,
            'price': float(product.price),
            'category': product.category,
            'barcode': product.barcode,
            'image': product.image,
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
                item['quantity'] += quantity
                found = True
                break
        
        # If not in cart, add it
        if not found:
            cart.append({
                'id': product.id,
                'name': product.name,
                'price': float(product.price),
                'quantity': quantity,
                'image': product.image,
                'barcode': product.barcode
            })
        
        # Update session
        request.session['cart'] = cart
        return JsonResponse({'success': True, 'cart': cart})
        
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
        
        # Get cart from session
        cart = request.session.get('cart', [])
        
        # Find and update product in cart
        found = False
        for item in cart:
            if item['id'] == product_id:
                # Check stock
                try:
                    product = Product.objects.get(id=product_id)
                    if product.stock < quantity:
                        return JsonResponse({'error': 'Not enough stock'}, status=400)
                except Product.DoesNotExist:
                    pass  # Allow updating even if product was deleted
                
                item['quantity'] = quantity
                found = True
                break
        
        if not found:
            return JsonResponse({'error': 'Product not in cart'}, status=404)
        
        # Update session
        request.session['cart'] = cart
        return JsonResponse({'success': True, 'cart': cart})
        
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
        return JsonResponse({'success': True, 'cart': updated_cart})
        
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
    return JsonResponse({'success': True, 'cart': []})

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
        
        # Get cart from session
        cart = request.session.get('cart', [])
        
        if not cart:
            return JsonResponse({'error': 'Cart is empty'}, status=400)
        
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
            TransactionItem.objects.create(
                transaction=transaction,
                product_id=item['id'],
                name=item['name'],
                quantity=item['quantity'],
                price=item['price'],
                barcode=item.get('barcode', '')
            )
            
            # Update product stock
            try:
                product = Product.objects.get(id=item['id'])
                product.stock -= item['quantity']
                product.save()
            except Product.DoesNotExist:
                pass  # Skip if product was deleted
        
        # If payment method is cash, transaction is pending
        # If card or wallet, need additional info but mark as completed
        if payment_method == 'cash':
            pass  # Keep as pending
        elif payment_method == 'card':
            # Card details will be added in separate request
            pass
        elif payment_method == 'wallet':
            # Receipt will be uploaded in separate request
            pass
        
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
        
        status = request.POST.get('status')
        if status not in [s[0] for s in Transaction.STATUS_CHOICES]:
            return JsonResponse({'error': 'Invalid status'}, status=400)
        
        # Update status
        transaction.status = status
        transaction.save()
        
        return JsonResponse({'success': True})
        
    except Transaction.DoesNotExist:
        return JsonResponse({'error': 'Transaction not found'}, status=404)
    except Exception as e:
        return JsonResponse({'error': str(e)}, status=400)
