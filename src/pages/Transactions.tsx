
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Phone, Check, X, Eye, Filter } from "lucide-react";
import { useToast } from "@/components/ui/use-toast";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { 
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Transaction } from "@/types/pos";

const Transactions = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [selectedTransaction, setSelectedTransaction] = useState<Transaction | null>(null);
  const [allTransactions, setAllTransactions] = useState<Transaction[]>([]);
  const [filteredTransactions, setFilteredTransactions] = useState<Transaction[]>([]);
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [paymentFilter, setPaymentFilter] = useState<string>("all");

  useEffect(() => {
    const storedTransactions = localStorage.getItem('transactions');
    if (storedTransactions) {
      const parsedTransactions = JSON.parse(storedTransactions);
      // Transform stored transactions to ensure they match the Transaction type
      const validatedTransactions = parsedTransactions.map((t: any, index: number) => ({
        ...t,
        id: t.id || (index + 1).toString(), // Set order number if not present
        status: t.status as "pending" | "completed" | "cancelled"
      }));
      setAllTransactions(validatedTransactions);
      setFilteredTransactions(validatedTransactions);
    }
  }, []);

  useEffect(() => {
    // Apply filters
    let result = [...allTransactions];
    
    // Apply status filter
    if (statusFilter !== "all") {
      result = result.filter(t => t.status === statusFilter);
    }
    
    // Apply payment filter
    if (paymentFilter !== "all") {
      result = result.filter(t => t.paymentMethod === paymentFilter);
    }
    
    setFilteredTransactions(result);
  }, [statusFilter, paymentFilter, allTransactions]);

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

    const updatedTransactions = allTransactions.map(t => {
      if (t.id === selectedTransaction.id) {
        return {
          ...t,
          status: action === 'complete' ? 'completed' as const : 'cancelled' as const
        };
      }
      return t;
    });

    setAllTransactions(updatedTransactions);
    localStorage.setItem('transactions', JSON.stringify(updatedTransactions));

    toast({
      title: action === 'complete' ? "Order Completed" : "Order Cancelled",
      description: `Order #${selectedTransaction.id} has been ${action === 'complete' ? 'completed' : 'cancelled'}.`,
    });

    setSelectedTransaction(null);
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'card':
        return 'Card Payment';
      case 'wallet':
        return 'E-wallet';
      case 'cash':
        return 'Cash';
      default:
        return 'Invalid Payment Method';
    }
  };

  const pendingTransactions = filteredTransactions.filter(t => t.status === "pending");

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
          <h1 className="text-2xl font-bold">Transaction Records</h1>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-4">
          <div>
            <label className="text-sm font-medium mb-1 block">Filter by Status</label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Orders</SelectItem>
                <SelectItem value="pending">Pending Orders</SelectItem>
                <SelectItem value="completed">Completed Orders</SelectItem>
                <SelectItem value="cancelled">Cancelled Orders</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <label className="text-sm font-medium mb-1 block">Filter by Payment</label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Select payment method" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Payments</SelectItem>
                <SelectItem value="cash">Cash Payments</SelectItem>
                <SelectItem value="card">Card Payments</SelectItem>
                <SelectItem value="wallet">E-Wallet Payments</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {filteredTransactions.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500 text-lg">No transactions found</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {filteredTransactions.map((transaction) => (
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
                  <p className="text-sm text-gray-500">{formatPaymentMethod(transaction.paymentMethod)}</p>
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
          <DialogContent className="sm:max-w-[425px] max-h-[90vh] flex flex-col">
            <DialogHeader>
              <DialogTitle>Order #{selectedTransaction?.id}</DialogTitle>
              <DialogDescription>
                {selectedTransaction && new Date(selectedTransaction.timestamp).toLocaleString()}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 overflow-y-auto flex-1 pr-2">
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
                <div className="text-sm text-gray-500 mt-1">
                  <p>Payment Method: {selectedTransaction && formatPaymentMethod(selectedTransaction.paymentMethod)}</p>
                  {selectedTransaction?.cardDetails && (
                    <div className="mt-1">
                      <p>Card ending in: {selectedTransaction.cardDetails.cardNumber}</p>
                      <p>Expires: {selectedTransaction.cardDetails.expiryDate}</p>
                    </div>
                  )}
                  {selectedTransaction?.ewalletReceipt && (
                    <div className="mt-2">
                      <p className="mb-1">E-wallet Receipt:</p>
                      <img 
                        src={selectedTransaction.ewalletReceipt} 
                        alt="E-wallet receipt" 
                        className="w-full rounded-lg border border-gray-200"
                      />
                    </div>
                  )}
                </div>
              </div>
            </div>
            {selectedTransaction?.status === "pending" && (
              <div className="border-t pt-4 mt-4 flex gap-2">
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
          </DialogContent>
        </Dialog>
      </div>
    </div>
  );
};

export default Transactions;
