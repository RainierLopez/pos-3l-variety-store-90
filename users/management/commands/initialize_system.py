
from django.core.management.base import BaseCommand
from django.contrib.auth.models import User
from users.models import UserProfile
from pos.models import Product
import random

class Command(BaseCommand):
    help = 'Initialize the POS system with sample data'

    def handle(self, *args, **options):
        self.stdout.write(self.style.SUCCESS('Starting system initialization...'))
        
        # Create admin and cashier users if they don't exist
        if not User.objects.filter(username='admin').exists():
            admin_user = User.objects.create_user(username='admin', password='password', is_staff=True)
            admin_profile = UserProfile.objects.get(user=admin_user)
            admin_profile.role = 'admin'
            admin_profile.save()
            self.stdout.write(self.style.SUCCESS('Admin user created'))
        
        if not User.objects.filter(username='cashier').exists():
            cashier_user = User.objects.create_user(username='cashier', password='password')
            cashier_profile = UserProfile.objects.get(user=cashier_user)
            cashier_profile.role = 'cashier'
            cashier_profile.save()
            self.stdout.write(self.style.SUCCESS('Cashier user created'))
        
        # Create sample products if none exist
        if Product.objects.count() == 0:
            # Meat products
            meat_products = [
                {'name': 'Chicken Breast', 'price': 150.00, 'category': 'meat', 'barcode': '8801234567891', 'stock': 50},
                {'name': 'Ground Beef', 'price': 220.00, 'category': 'meat', 'barcode': '8801234567892', 'stock': 30},
                {'name': 'Pork Chops', 'price': 180.00, 'category': 'meat', 'barcode': '8801234567893', 'stock': 25},
                {'name': 'Beef Tenderloin', 'price': 450.00, 'category': 'meat', 'barcode': '8801234567894', 'stock': 15},
                {'name': 'Lamb Shoulder', 'price': 350.00, 'category': 'meat', 'barcode': '8801234567895', 'stock': 10},
            ]
            
            # Vegetable products
            vegetable_products = [
                {'name': 'Carrots', 'price': 30.00, 'category': 'vegetable', 'barcode': '8801234567896', 'stock': 100},
                {'name': 'Potatoes', 'price': 25.00, 'category': 'vegetable', 'barcode': '8801234567897', 'stock': 150},
                {'name': 'Onions', 'price': 20.00, 'category': 'vegetable', 'barcode': '8801234567898', 'stock': 120},
                {'name': 'Tomatoes', 'price': 35.00, 'category': 'vegetable', 'barcode': '8801234567899', 'stock': 80},
                {'name': 'Bell Peppers', 'price': 40.00, 'category': 'vegetable', 'barcode': '8801234567900', 'stock': 60},
            ]
            
            # Insert all products
            for product_data in meat_products + vegetable_products:
                Product.objects.create(**product_data)
            
            self.stdout.write(self.style.SUCCESS(f'Created {len(meat_products) + len(vegetable_products)} sample products'))
        
        self.stdout.write(self.style.SUCCESS('System initialization complete!'))
