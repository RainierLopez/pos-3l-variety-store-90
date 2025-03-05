
from django.db import models
from django.utils import timezone
import uuid
from django.contrib.auth.models import User

class Product(models.Model):
    CATEGORY_CHOICES = (
        ('meat', 'Meat'),
        ('vegetable', 'Vegetable'),
    )
    
    id = models.AutoField(primary_key=True)
    name = models.CharField(max_length=100)
    price = models.DecimalField(max_digits=10, decimal_places=2)
    category = models.CharField(max_length=20, choices=CATEGORY_CHOICES)
    barcode = models.CharField(max_length=20, unique=True)
    image = models.URLField(blank=True)
    stock = models.IntegerField(default=0)
    
    def __str__(self):
        return f"{self.name} - ₱{self.price}"
    
    class Meta:
        ordering = ['category', 'name']
        verbose_name = 'Product'
        verbose_name_plural = 'Products'

class Transaction(models.Model):
    PAYMENT_CHOICES = (
        ('cash', 'Cash'),
        ('card', 'Card Payment'),
        ('wallet', 'E-Wallet'),
    )
    
    STATUS_CHOICES = (
        ('pending', 'Pending'),
        ('completed', 'Completed'),
        ('cancelled', 'Cancelled'),
    )
    
    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    cashier = models.ForeignKey(User, on_delete=models.SET_NULL, null=True, related_name='transactions')
    timestamp = models.DateTimeField(default=timezone.now)
    total = models.DecimalField(max_digits=10, decimal_places=2)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='pending')
    payment_method = models.CharField(max_length=20, choices=PAYMENT_CHOICES)
    customer_contact = models.CharField(max_length=20, blank=True, null=True)
    
    def __str__(self):
        return f"Transaction {self.id} - ₱{self.total}"
    
    class Meta:
        ordering = ['-timestamp']
        verbose_name = 'Transaction'
        verbose_name_plural = 'Transactions'

class TransactionItem(models.Model):
    transaction = models.ForeignKey(Transaction, on_delete=models.CASCADE, related_name='items')
    product = models.ForeignKey(Product, on_delete=models.SET_NULL, null=True)
    name = models.CharField(max_length=100)  # Store name in case product is deleted
    quantity = models.PositiveIntegerField()
    price = models.DecimalField(max_digits=10, decimal_places=2)  # Store price at time of purchase
    barcode = models.CharField(max_length=20, blank=True)
    
    def subtotal(self):
        return self.quantity * self.price
    
    def __str__(self):
        return f"{self.name} x {self.quantity}"

class CardDetail(models.Model):
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='card_details')
    card_number = models.CharField(max_length=20)  # Last 4 digits for display
    expiry_date = models.CharField(max_length=10)
    
    def __str__(self):
        return f"Card ending in {self.card_number[-4:]}"

class EWalletReceipt(models.Model):
    transaction = models.OneToOneField(Transaction, on_delete=models.CASCADE, related_name='wallet_receipt')
    receipt_image = models.ImageField(upload_to='receipts/')
    uploaded_at = models.DateTimeField(auto_now_add=True)
    
    def __str__(self):
        return f"E-Wallet Receipt for {self.transaction.id}"
