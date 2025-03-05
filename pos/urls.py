
from django.urls import path
from . import views

urlpatterns = [
    # Main pages
    path('', views.pos_home, name='pos_home'),
    path('transactions/', views.transactions_list, name='transactions_list'),
    path('transactions/<uuid:transaction_id>/', views.transaction_detail, name='transaction_detail'),
    path('print-receipt/<uuid:transaction_id>/', views.print_receipt, name='print_receipt'),
    
    # Inventory Management
    path('inventory/', views.inventory_management, name='inventory_management'),
    path('inventory/add/', views.add_product, name='add_product'),
    path('inventory/edit/<int:product_id>/', views.edit_product, name='edit_product'),
    path('inventory/delete/<int:product_id>/', views.delete_product, name='delete_product'),
    
    # Reports
    path('reports/sales/', views.sales_report, name='sales_report'),
    
    # API endpoints - Products
    path('api/products/', views.get_products, name='get_products'),
    path('api/products/<int:product_id>/', views.get_product, name='get_product'),
    
    # API endpoints - Cart
    path('api/cart/', views.get_cart, name='get_cart'),
    path('api/cart/add/', views.add_to_cart, name='add_to_cart'),
    path('api/cart/update/', views.update_cart_item, name='update_cart_item'),
    path('api/cart/remove/', views.remove_from_cart, name='remove_from_cart'),
    path('api/cart/clear/', views.clear_cart, name='clear_cart'),
    
    # API endpoints - Transactions
    path('api/transactions/create/', views.create_transaction, name='create_transaction'),
    path('api/transactions/<uuid:transaction_id>/upload-receipt/', views.upload_ewallet_receipt, name='upload_ewallet_receipt'),
    path('api/transactions/<uuid:transaction_id>/update-status/', views.update_transaction_status, name='update_transaction_status'),
]
