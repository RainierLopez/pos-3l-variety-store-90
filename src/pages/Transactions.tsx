
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Check, X, Eye } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

interface Transaction {
  id: string;
  timestamp: string;
  total: number;
  status: "pending" | "completed" | "cancelled";
  paymentMethod: string;
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  customerContact?: string;
}

const Transactions = () => {
  const navigate = useNavigate();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);

  // Mock data for demonstration
  const transactions: Transaction[] = [
    {
      id: "ORD001",
      timestamp: new Date().toISOString(),
      total: 535.00,
      status: "pending",
      paymentMethod: "cash",
      customerContact: "+63 912 345 6789",
      items: [
        { name: "Liempo (Per kg)", quantity: 2, price: 230 },
        { name: "Carrots (Per kg)", quantity: 1, price: 75 },
      ],
    },
    // Add more mock transactions as needed
  ];

  const getStatusColor = (status: string) => {
    switch (status) {
      case "pending":
        return "bg-yellow-100 text-yellow-800";
      case "completed":
        return "bg-green-100 text-green-800";
      case "cancelled":
        return "bg-red-100 text-red-800";
      default:
        return "bg-gray-100 text-gray-800";
    }
  };

  const handleCallCustomer = (phoneNumber: string) => {
    window.location.href = `tel:${phoneNumber}`;
  };

  return (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <Button 
            variant="outline" 
            onClick={() => navigate("/pos")}
            className="flex items-center gap-2"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to POS
          </Button>
          <h1 className="text-2xl font-bold">Order Management</h1>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {transactions.map((transaction) => (
            <div
              key={transaction.id}
              className="bg-white rounded-lg shadow p-4 hover:shadow-lg transition-shadow cursor-pointer"
              onClick={() => setSelectedTransaction(transaction)}
            >
              <div className="flex justify-between items-start mb-3">
                <div>
                  <h3 className="font-medium">Order #{transaction.id}</h3>
                  <p className="text-sm text-gray-500">
                    {new Date(transaction.timestamp).toLocaleString()}
                  </p>
                </div>
                <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                  {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                </span>
              </div>
              <div className="mb-3">
                <p className="font-medium">₱{transaction.total.toFixed(2)}</p>
                <p className="text-sm text-gray-500">{transaction.paymentMethod}</p>
              </div>
              <div className="flex justify-between items-center">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={(e) => {
                    e.stopPropagation();
                    setSelectedTransaction(transaction);
                  }}
                >
                  <Eye className="h-4 w-4 mr-1" />
                  View Details
                </Button>
                {transaction.customerContact && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleCallCustomer(transaction.customerContact!);
                    }}
                  >
                    <Phone className="h-4 w-4 mr-1" />
                    Contact
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>

        <Dialog open={!!selectedTransaction} onOpenChange={() => setSelectedTransaction(null)}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Order #{selectedTransaction?.id}</DialogTitle>
              <DialogDescription>
                {new Date(selectedTransaction?.timestamp || "").toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="border-t pt-4">
                <h4 className="font-medium mb-2">Order Items</h4>
                {selectedTransaction?.items.map((item, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-medium">
                  <span>Total Amount</span>
                  <span>₱{selectedTransaction?.total.toFixed(2)}</span>
                </div>
                <p className="text-sm text-gray-500 mt-1">
                  Payment Method: {selectedTransaction?.paymentMethod}
                </p>
              </div>
              {selectedTransaction?.status === "pending" && (
                <div className="border-t pt-4 flex gap-2">
                  <Button
                    className="flex-1"
                    style={{ backgroundColor: '#8B4513', color: 'white' }}
                    onClick={() => {
                      // Handle order completion
                      setSelectedTransaction(null);
                    }}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Complete Order
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => {
                      // Handle order cancellation
                      setSelectedTransaction(null);
                    }}
                  >
                    <X className="h-4 w-4 mr-1" />
                    Cancel Order
                  </Button>
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Transactions;
