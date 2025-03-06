
# Variety Store POS System

A comprehensive Point of Sale (POS) system designed for small retail stores, featuring inventory management, sales processing, and reporting.

## Core Components

1. **User Management**
   - User Roles: Admin (full access) and Cashier (limited to POS operations)
   - Authentication: Login/logout functionality with session-based authentication
   - User Profile: Each user has an associated profile with additional details

2. **Inventory Management**
   - Product Catalog: Products organized by categories (meat, vegetable)
   - Product Details: Name, price, category, barcode, stock quantity, image
   - Stock Tracking: Automatic reduction of stock when items are sold

3. **Point of Sale (POS)**
   - Shopping Cart: Add/remove items, update quantities
   - Barcode Scanning: Support for physical barcode scanners and camera-based scanning
   - Payment Methods: Cash, Card payments, E-Wallet payments
   - Receipt Generation: Digital receipts that can be printed or sent to customers

4. **Transaction Management**
   - Transaction Records: Complete history of all sales
   - Receipt Printing: Generate and print customer receipts
   - Transaction Status: Pending, Completed, Cancelled
   - Customer Data: Optional capture of customer contact information

5. **Reporting**
   - Sales Reports: View sales data by period, category, or product
   - Stock Alerts: Notifications for low stock items

## Setup Instructions

### Prerequisites
- Python 3.8 or higher
- Node.js 14 or higher
- npm or yarn

### Backend Setup

1. **Create and activate a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows, use: venv\Scripts\activate
   ```

2. **Install Python dependencies**
   ```bash
   pip install django django-extensions djangorestframework pillow
   ```

3. **Initialize the database**
   ```bash
   python manage.py migrate
   ```

4. **Create a superuser (for admin access)**
   ```bash
   python manage.py createsuperuser
   ```

5. **Initialize the system with sample data**
   ```bash
   python manage.py initialize_system
   ```

6. **Run the Django development server**
   ```bash
   python manage.py runserver
   ```

### Frontend Setup

1. **Install JavaScript dependencies**
   ```bash
   npm install
   # OR
   yarn
   ```

2. **Run the Vite development server**
   ```bash
   npm run dev
   # OR
   yarn dev
   ```

3. **Access the application**
   - Open your browser and navigate to `http://localhost:5173`
   - Log in with one of the sample accounts:
     - Admin: username `admin`, password `password`
     - Cashier: username `cashier`, password `password`

## Usage

### POS Operations

1. **Adding Products to Cart**
   - Browse products by category
   - Search by name or scan barcode
   - Click product to add to cart

2. **Processing Payment**
   - Select payment method (Cash, Card, E-Wallet)
   - For Card payments, enter card details
   - For E-Wallet payments, upload a receipt image
   - Confirm payment to create transaction

3. **Generating Receipt**
   - Click "Print Receipt" button to print or preview receipt
   - Optionally enter customer's phone number to send receipt

### Admin Functions

1. **Inventory Management**
   - Add, edit, and delete products
   - Update stock levels
   - Generate barcode list for printing

2. **User Management**
   - Add new cashiers or admin users
   - Edit user roles and information

3. **Transaction Management**
   - View all transactions
   - Filter by date, status, or payment method
   - Change transaction status (e.g., mark as completed)

4. **Reports**
   - View sales reports for different time periods
   - Analyze top-selling products
   - Monitor stock levels
