
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

const Transactions = () => {
  const navigate = useNavigate();

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
          <h1 className="text-2xl font-bold">Transaction History</h1>
        </div>
        <div className="bg-white rounded-lg shadow p-6">
          <p className="text-gray-500 text-center">Transaction history will be displayed here.</p>
        </div>
      </div>
    </div>
  );
};

export default Transactions;
