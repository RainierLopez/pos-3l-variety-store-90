
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse, HttpResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import user_passes_test
from django.db import transaction
from django.utils import timezone
from django.contrib import messages
import json
import uuid
import datetime

from .models import Product, Transaction, TransactionItem, CardDetail, EWalletReceipt
from users.models import UserProfile

# Utility functions
def is_admin(user):
    try:
        return user.profile.role == 'admin'
    except:
        return False

# Views
@login_required
def pos_home(request):
    """Main POS interface view"""
    categories = Product.CATEGORY_CHOICES
    context = {
        'categories': categories
    }
    return render(request, 'pos/pos_home.html', context)

@login_required
def transactions_list(request):
    """View to list all transactions"""
    if is_admin(request.user):
        transactions = Transaction.objects.all().order_by('-timestamp')
    else:
        transactions = Transaction.objects.filter(cashier=request.user).order_by('-timestamp')
    
    # Filter handling
    status_filter = request.GET.get('status', 'all')
    payment_filter = request.GET.get('payment', 'all')
    date_filter = request.GET.get('date', 'all')
    
    if status_filter != 'all':
        transactions = transactions.filter(status=status_filter)
    
    if payment_filter != 'all':
        transactions = transactions.filter(payment_method=payment_filter)
    
    if date_filter == 'today':
        today = timezone.now().date()
        transactions = transactions.filter(timestamp__date=today)
    elif date_filter == 'week':
        start_of_week = timezone.now().date() - datetime.timedelta(days=timezone.now().weekday())
        transactions = transactions.filter(timestamp__date__gte=start_of_week)
    elif date_filter == 'month':
        today = timezone.now().date()
        start_of_month = datetime.date(today.year, today.month, 1)
        transactions = transactions.filter(timestamp__date__gte=start_of_month)
    
    # Calculate totals
    total_amount = sum(t.total for t in transactions)
    transaction_count = transactions.count()
    
    context = {
        'transactions': transactions,
        'status_filter': status_filter,
        'payment_filter': payment_filter,
        'date_filter': date_filter,
        'total_amount': total_amount,
        'transaction_count': transaction_count,
    }
    return render(request, 'pos/transactions.html', context)

@login_required
def transaction_detail(request, transaction_id):
    """View details of a specific transaction"""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    # Check if user has permission to view this transaction
    if not is_admin(request.user) and transaction.cashier != request.user:
        return redirect('transactions_list')
    
    context = {
        'transaction': transaction,
    }
    return render(request, 'pos/transaction_detail.html', context)

@login_required
def print_receipt(request, transaction_id):
    """View for printing a receipt"""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    # Check if user has permission
    if not is_admin(request.user) and transaction.cashier != request.user:
        return redirect('transactions_list')
    
    context = {
        'transaction': transaction,
        'print_mode': True,
    }
    return render(request, 'pos/receipt.html', context)

@login_required
def barcode_scanner(request):
    """Barcode scanner view"""
    return render(request, 'pos/barcode_scanner.html')

# API endpoints for AJAX requests
@login_required
@require_GET
def get_products(request):
    """API endpoint to get all products"""
    products = list(Product.objects.values('id', 'name', 'price', 'category', 'barcode', 'image', 'stock'))
    return JsonResponse({'products': products})

@login_required
@require_GET
def get_product(request, product_id):
    """API endpoint to get a product by ID"""
    try:
        product = Product.objects.get(id=product_id)
        return JsonResponse({
            'success': True,
            'product': {
                'id': product.id,
                'name': product.name,
                'price': float(product.price),
                'barcode': product.barcode,
                'category': product.category,
                'image': product.image,
                'stock': product.stock
            }
        })
    except Product.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Product not found'
        }, status=404)

@login_required
@require_GET
def get_product_by_barcode(request, barcode):
    """API endpoint to get a product by barcode"""
    try:
        product = Product.objects.get(barcode=barcode)
        return JsonResponse({
            'success': True,
            'product': {
                'id': product.id,
                'name': product.name,
                'price': float(product.price),
                'barcode': product.barcode,
                'category': product.category,
                'image': product.image,
                'stock': product.stock
            }
        })
    except Product.DoesNotExist:
        return JsonResponse({
            'success': False,
            'message': 'Product not found'
        }, status=404)

@login_required
@require_POST
def add_to_cart(request):
    """Add a product to cart (session-based)"""
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        product = get_object_or_404(Product, id=product_id)
        
        # Check if product is in stock
        if product.stock < quantity:
            return JsonResponse({
                'success': False,
                'message': f'Only {product.stock} units available in stock'
            })
        
        # Initialize cart in session if not exists
        if 'cart' not in request.session:
            request.session['cart'] = []
        
        cart = request.session['cart']
        
        # Check if product already in cart
        product_in_cart = False
        for item in cart:
            if item['id'] == product_id:
                # Check stock constraints
                if item['quantity'] + quantity > product.stock:
                    return JsonResponse({
                        'success': False,
                        'message': f'Cannot add more. Only {product.stock} units available in stock'
                    })
                
                item['quantity'] += quantity
                product_in_cart = True
                break
        
        # If product not in cart, add it
        if not product_in_cart:
            cart.append({
                'id': product.id,
                'name': product.name,
                'price': float(product.price),
                'quantity': quantity,
                'barcode': product.barcode,
                'image': product.image
            })
        
        # Save the updated cart back to session
        request.session['cart'] = cart
        request.session.modified = True
        
        return JsonResponse({
            'success': True,
            'message': f'Added {product.name} to cart',
            'cart': cart
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)

@login_required
@require_POST
def update_cart_item(request):
    """Update cart item quantity"""
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        quantity = data.get('quantity', 1)
        
        # Get the cart from session
        cart = request.session.get('cart', [])
        
        # Find the item and update it
        for item in cart:
            if item['id'] == product_id:
                # If quantity is 0 or less, remove the item
                if quantity <= 0:
                    cart.remove(item)
                else:
                    # Check stock constraints
                    product = get_object_or_404(Product, id=product_id)
                    if quantity > product.stock:
                        return JsonResponse({
                            'success': False,
                            'message': f'Only {product.stock} units available in stock'
                        })
                    
                    item['quantity'] = quantity
                break
        
        # Save the updated cart back to session
        request.session['cart'] = cart
        request.session.modified = True
        
        return JsonResponse({
            'success': True,
            'message': 'Cart updated',
            'cart': cart
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)

@login_required
@require_POST
def remove_from_cart(request):
    """Remove an item from cart"""
    try:
        data = json.loads(request.body)
        product_id = data.get('product_id')
        
        # Get the cart from session
        cart = request.session.get('cart', [])
        
        # Find the item and remove it
        for item in cart:
            if item['id'] == product_id:
                cart.remove(item)
                break
        
        # Save the updated cart back to session
        request.session['cart'] = cart
        request.session.modified = True
        
        return JsonResponse({
            'success': True,
            'message': 'Item removed from cart',
            'cart': cart
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)

@login_required
@require_GET
def get_cart(request):
    """Get the current cart contents"""
    cart = request.session.get('cart', [])
    
    # Calculate total
    total = sum(item['price'] * item['quantity'] for item in cart)
    
    return JsonResponse({
        'success': True,
        'cart': cart,
        'total': total,
        'item_count': len(cart)
    })

@login_required
@require_POST
def clear_cart(request):
    """Clear the entire cart"""
    request.session['cart'] = []
    request.session.modified = True
    
    return JsonResponse({
        'success': True,
        'message': 'Cart cleared'
    })

@login_required
@require_POST
@csrf_exempt
def create_transaction(request):
    """API endpoint to create a new transaction"""
    try:
        data = json.loads(request.body)
        cart = request.session.get('cart', [])
        
        if not cart:
            return JsonResponse({
                'success': False,
                'message': 'Cart is empty'
            }, status=400)
        
        with transaction.atomic():
            # Create the transaction
            new_transaction = Transaction.objects.create(
                cashier=request.user,
                total=data['total'],
                payment_method=data['payment_method'],
                status='pending',
                customer_contact=data.get('customer_contact')
            )
            
            # Create transaction items
            for item in cart:
                product = None
                try:
                    product = Product.objects.get(id=item['id'])
                    # Update stock
                    product.stock -= item['quantity']
                    if product.stock < 0:
                        product.stock = 0
                    product.save()
                except Product.DoesNotExist:
                    pass
                
                TransactionItem.objects.create(
                    transaction=new_transaction,
                    product=product,
                    name=item['name'],
                    quantity=item['quantity'],
                    price=item['price'],
                    barcode=item.get('barcode', '')
                )
            
            # Handle card payment
            if data['payment_method'] == 'card' and 'card_details' in data:
                CardDetail.objects.create(
                    transaction=new_transaction,
                    card_number=data['card_details']['card_number'],
                    expiry_date=data['card_details']['expiry_date']
                )
            
            # If cash payment, leave as pending, otherwise mark as completed
            if data['payment_method'] == 'card':
                new_transaction.status = 'completed'
                new_transaction.save()
            
            # Clear the cart in session
            request.session['cart'] = []
            request.session.modified = True
        
        return JsonResponse({
            'success': True, 
            'transaction_id': str(new_transaction.id)
        })
        
    except Exception as e:
        return JsonResponse({
            'success': False,
            'message': str(e)
        }, status=400)

@login_required
@require_POST
def upload_ewallet_receipt(request, transaction_id):
    """Upload e-wallet receipt for a transaction"""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    
    if request.FILES.get('receipt'):
        EWalletReceipt.objects.create(
            transaction=transaction,
            receipt_image=request.FILES['receipt']
        )
        
        transaction.status = 'completed'
        transaction.save()
        
        # Clear the cart in session (just to be safe)
        request.session['cart'] = []
        request.session.modified = True
        
        return JsonResponse({'success': True})
    
    return JsonResponse({'success': False, 'message': 'No file uploaded'}, status=400)

@login_required
@user_passes_test(is_admin)
@require_POST
def update_transaction_status(request, transaction_id):
    """Update transaction status (admin only)"""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    status = request.POST.get('status')
    customer_contact = request.POST.get('customer_contact')
    
    if status and status in [s[0] for s in Transaction.STATUS_CHOICES]:
        transaction.status = status
        
    if customer_contact:
        transaction.customer_contact = customer_contact
    
    transaction.save()
    return JsonResponse({'success': True})

@login_required
@user_passes_test(is_admin)
def inventory_management(request):
    """View for inventory management (admin only)"""
    products = Product.objects.all().order_by('category', 'name')
    
    context = {
        'products': products
    }
    return render(request, 'pos/inventory.html', context)

@login_required
@user_passes_test(is_admin)
def add_product(request):
    """Add a new product to inventory (admin only)"""
    if request.method == 'POST':
        name = request.POST.get('name')
        price = request.POST.get('price')
        category = request.POST.get('category')
        barcode = request.POST.get('barcode')
        stock = request.POST.get('stock', 0)
        image = request.POST.get('image', '')
        
        if not all([name, price, category, barcode]):
            messages.error(request, 'Please fill in all required fields.')
            return redirect('add_product')
        
        try:
            product = Product.objects.create(
                name=name,
                price=price,
                category=category,
                barcode=barcode,
                stock=stock,
                image=image
            )
            messages.success(request, f'Product "{name}" added successfully.')
            return redirect('inventory_management')
        except Exception as e:
            messages.error(request, f'Error adding product: {str(e)}')
    
    context = {
        'categories': Product.CATEGORY_CHOICES
    }
    return render(request, 'pos/add_product.html', context)

@login_required
@user_passes_test(is_admin)
def edit_product(request, product_id):
    """Edit an existing product (admin only)"""
    product = get_object_or_404(Product, id=product_id)
    
    if request.method == 'POST':
        product.name = request.POST.get('name')
        product.price = request.POST.get('price')
        product.category = request.POST.get('category')
        product.barcode = request.POST.get('barcode')
        product.stock = request.POST.get('stock', 0)
        product.image = request.POST.get('image', '')
        
        try:
            product.save()
            messages.success(request, f'Product "{product.name}" updated successfully.')
            return redirect('inventory_management')
        except Exception as e:
            messages.error(request, f'Error updating product: {str(e)}')
    
    context = {
        'product': product,
        'categories': Product.CATEGORY_CHOICES
    }
    return render(request, 'pos/edit_product.html', context)

@login_required
@user_passes_test(is_admin)
def delete_product(request, product_id):
    """Delete a product (admin only)"""
    product = get_object_or_404(Product, id=product_id)
    
    if request.method == 'POST':
        name = product.name
        product.delete()
        messages.success(request, f'Product "{name}" deleted successfully.')
        return redirect('inventory_management')
    
    context = {
        'product': product
    }
    return render(request, 'pos/delete_product.html', context)

@login_required
@user_passes_test(is_admin)
def sales_report(request):
    """Generate sales reports (admin only)"""
    start_date = request.GET.get('start_date')
    end_date = request.GET.get('end_date')
    
    transactions = Transaction.objects.filter(status='completed').order_by('-timestamp')
    
    if start_date:
        start_date = datetime.datetime.strptime(start_date, '%Y-%m-%d').date()
        transactions = transactions.filter(timestamp__date__gte=start_date)
    
    if end_date:
        end_date = datetime.datetime.strptime(end_date, '%Y-%m-%d').date()
        transactions = transactions.filter(timestamp__date__lte=end_date)
    
    # Calculate totals
    total_sales = sum(t.total for t in transactions)
    total_transactions = transactions.count()
    
    # Group by payment method
    payment_methods = {}
    for t in transactions:
        payment_method = t.get_payment_method_display()
        if payment_method in payment_methods:
            payment_methods[payment_method]['count'] += 1
            payment_methods[payment_method]['total'] += t.total
        else:
            payment_methods[payment_method] = {
                'count': 1,
                'total': t.total
            }
    
    # Get top selling products
    top_products = {}
    for t in transactions:
        for item in t.items.all():
            if item.product_id in top_products:
                top_products[item.product_id]['quantity'] += item.quantity
                top_products[item.product_id]['sales'] += item.price * item.quantity
            else:
                top_products[item.product_id] = {
                    'name': item.name,
                    'quantity': item.quantity,
                    'sales': item.price * item.quantity
                }
    
    # Convert to list and sort by sales
    top_products_list = [{'id': k, **v} for k, v in top_products.items()]
    top_products_list.sort(key=lambda x: x['sales'], reverse=True)
    
    context = {
        'transactions': transactions,
        'total_sales': total_sales,
        'total_transactions': total_transactions,
        'payment_methods': payment_methods,
        'top_products': top_products_list[:10],  # Top 10 products
        'start_date': start_date,
        'end_date': end_date
    }
    return render(request, 'pos/sales_report.html', context)
