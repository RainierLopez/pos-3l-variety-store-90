
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
