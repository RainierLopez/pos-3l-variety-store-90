
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Check, X, Eye } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
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
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [transactions, setTransactions] = useState<Transaction[]>([
    {
      id: "1",
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
  ]);

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

  const handleOrderAction = (action: 'complete' | 'cancel') => {
    if (!selectedTransaction) return;

    setTransactions(current => 
      current.filter(t => t.id !== selectedTransaction.id)
    );

    toast({
      title: action === 'complete' ? "Order Completed" : "Order Cancelled",
      description: `Order #${selectedTransaction.id} has been ${action === 'complete' ? 'completed' : 'cancelled'}.`,
    });

    setSelectedTransaction(null);
  };

  const pendingTransactions = transactions.filter(t => t.status === "pending");

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
            Back
          </Button>
          <h1 className="text-2xl font-bold">Transactions</h1>
        </div>

        {pendingTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No pending transactions</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {pendingTransactions.map((transaction) => (
              <div
                key={transaction.id}
                className="bg-white rounded-lg shadow-sm hover:shadow-md transition-all duration-200 p-4 border border-gray-100"
                onClick={() => setSelectedTransaction(transaction)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div>
                    <h3 className="font-medium text-lg">Order #{transaction.id}</h3>
                    <p className="text-sm text-gray-500">
                      {new Date(transaction.timestamp).toLocaleString()}
                    </p>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-xs font-medium ${getStatusColor(transaction.status)}`}>
                    {transaction.status.charAt(0).toUpperCase() + transaction.status.slice(1)}
                  </span>
                </div>
                <div className="mb-3">
                  <p className="font-medium text-lg text-[#8B4513]">₱{transaction.total.toFixed(2)}</p>
                  <p className="text-sm text-gray-500 capitalize">{transaction.paymentMethod}</p>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1"
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
                      className="flex-1"
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
        )}

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
                  <div key={index} className="flex justify-between text-sm py-1">
                    <span>{item.name} × {item.quantity}</span>
                    <span>₱{(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>
              <div className="border-t pt-4">
                <div className="flex justify-between font-medium text-lg">
                  <span>Total Amount</span>
                  <span className="text-[#8B4513]">₱{selectedTransaction?.total.toFixed(2)}</span>
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
                    onClick={() => handleOrderAction('complete')}
                  >
                    <Check className="h-4 w-4 mr-1" />
                    Complete Order
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={() => handleOrderAction('cancel')}
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
