
export interface Product {
  id: number;
  name: string;
  price: number;
  quantity: number;
  category: string;
}

export interface CardDetails {
  cardNumber: string;
  expiryDate: string;
  cvv: string;
}

export interface CartItem extends Product {
  quantity: number;
}

export interface Transaction {
  id: string;
  timestamp: string;
  total: number;
  status: "pending" | "completed" | "cancelled";
  paymentMethod: "cash" | "card" | "wallet";
  items: {
    name: string;
    quantity: number;
    price: number;
  }[];
  customerContact?: string;
  cardDetails?: {
    cardNumber: string;
    expiryDate: string;
  };
  ewalletReceipt?: string;
}
