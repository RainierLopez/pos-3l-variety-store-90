
from django.shortcuts import render, redirect, get_object_or_404
from django.http import JsonResponse
from django.contrib.auth.decorators import login_required
from django.views.decorators.http import require_POST, require_GET
from django.views.decorators.csrf import csrf_exempt
from django.contrib.auth.decorators import user_passes_test
from django.db import transaction
from django.utils import timezone
import json
import uuid

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
    products = Product.objects.all()
    context = {
        'products': products
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
@csrf_exempt
def create_transaction(request):
    """API endpoint to create a new transaction"""
    try:
        data = json.loads(request.body)
        
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
            for item_data in data['items']:
                product = None
                if 'barcode' in item_data and item_data['barcode']:
                    try:
                        product = Product.objects.get(barcode=item_data['barcode'])
                        # Update stock
                        product.stock -= item_data['quantity']
                        if product.stock < 0:
                            product.stock = 0
                        product.save()
                    except Product.DoesNotExist:
                        pass
                
                TransactionItem.objects.create(
                    transaction=new_transaction,
                    product=product,
                    name=item_data['name'],
                    quantity=item_data['quantity'],
                    price=item_data['price'],
                    barcode=item_data.get('barcode', '')
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
        
        return JsonResponse({'success': True})
    
    return JsonResponse({'success': False, 'message': 'No file uploaded'}, status=400)

@login_required
@user_passes_test(is_admin)
@require_POST
def update_transaction_status(request, transaction_id):
    """Update transaction status (admin only)"""
    transaction = get_object_or_404(Transaction, id=transaction_id)
    status = request.POST.get('status')
    
    if status in [s[0] for s in Transaction.STATUS_CHOICES]:
        transaction.status = status
        transaction.save()
        return JsonResponse({'success': True})
    
    return JsonResponse({'success': False, 'message': 'Invalid status'}, status=400)

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
    
    return render(request, 'pos/add_product.html')

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
        'product': product
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
        start_date = timezone.datetime.strptime(start_date, '%Y-%m-%d').date()
        transactions = transactions.filter(timestamp__date__gte=start_date)
    
    if end_date:
        end_date = timezone.datetime.strptime(end_date, '%Y-%m-%d').date()
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
    
    context = {
        'transactions': transactions,
        'total_sales': total_sales,
        'total_transactions': total_transactions,
        'payment_methods': payment_methods,
        'start_date': start_date,
        'end_date': end_date
    }
    return render(request, 'pos/sales_report.html', context)
