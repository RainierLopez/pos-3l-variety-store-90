
from django.urls import path
from . import views

urlpatterns = [
    # Main pages
    path('', views.pos_home, name='pos_home'),
    path('transactions/', views.transactions_list, name='transactions_list'),
    path('transactions/<uuid:transaction_id>/', views.transaction_detail, name='transaction_detail'),
    path('print-receipt/<uuid:transaction_id>/', views.print_receipt, name='print_receipt'),
    
    # API endpoints
    path('api/products/', views.get_products, name='get_products'),
    path('api/products/barcode/<str:barcode>/', views.get_product_by_barcode, name='get_product_by_barcode'),
    path('api/transactions/create/', views.create_transaction, name='create_transaction'),
    path('api/transactions/<uuid:transaction_id>/upload-receipt/', views.upload_ewallet_receipt, name='upload_ewallet_receipt'),
    path('api/transactions/<uuid:transaction_id>/update-status/', views.update_transaction_status, name='update_transaction_status'),
]
