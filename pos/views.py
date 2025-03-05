
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
        'products': json.dumps([{
            'id': p.id, 
            'name': p.name, 
            'price': float(p.price), 
            'category': p.category,
            'barcode': p.barcode,
            'image': p.image,
            'stock': p.stock
        } for p in products])
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

# API endpoints for AJAX requests
@login_required
@require_GET
def get_products(request):
    """API endpoint to get all products"""
    products = list(Product.objects.values())
    return JsonResponse({'products': products})

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
                TransactionItem.objects.create(
                    transaction=new_transaction,
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
            
            # If cash payment, leave as pending, otherwise mark as complete
            if data['payment_method'] != 'cash':
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
