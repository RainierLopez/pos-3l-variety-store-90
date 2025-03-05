
from django.contrib import admin
from .models import Product, Transaction, TransactionItem, CardDetail, EWalletReceipt

class TransactionItemInline(admin.TabularInline):
    model = TransactionItem
    extra = 0
    readonly_fields = ('subtotal',)

class CardDetailInline(admin.StackedInline):
    model = CardDetail
    extra = 0

class EWalletReceiptInline(admin.StackedInline):
    model = EWalletReceipt
    extra = 0

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('name', 'category', 'price', 'stock', 'barcode')
    list_filter = ('category',)
    search_fields = ('name', 'barcode')
    ordering = ('category', 'name')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'cashier', 'timestamp', 'total', 'payment_method', 'status')
    list_filter = ('status', 'payment_method', 'timestamp')
    search_fields = ('id', 'cashier__username')
    inlines = [TransactionItemInline, CardDetailInline, EWalletReceiptInline]
    readonly_fields = ('id',)
    date_hierarchy = 'timestamp'
