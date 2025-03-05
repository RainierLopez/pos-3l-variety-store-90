
from django.contrib import admin
from .models import Product, Transaction, TransactionItem, CardDetail, EWalletReceipt

class TransactionItemInline(admin.TabularInline):
    model = TransactionItem
    extra = 0

class CardDetailInline(admin.StackedInline):
    model = CardDetail
    extra = 0

class EWalletReceiptInline(admin.StackedInline):
    model = EWalletReceipt
    extra = 0

@admin.register(Product)
class ProductAdmin(admin.ModelAdmin):
    list_display = ('id', 'name', 'price', 'category', 'barcode', 'stock')
    list_filter = ('category',)
    search_fields = ('name', 'barcode')
    list_editable = ('price', 'stock')

@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'cashier', 'timestamp', 'total', 'payment_method', 'status')
    list_filter = ('status', 'payment_method', 'timestamp')
    search_fields = ('id', 'cashier__username', 'customer_contact')
    inlines = [TransactionItemInline, CardDetailInline, EWalletReceiptInline]
    readonly_fields = ('id', 'timestamp')
