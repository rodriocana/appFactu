export interface Invoice {
  id: number;
  clientName: string;
  items: { description: string; quantity: number; price: number }[];
  total: number;
  date: string;
  code: number;
  status: string;
  invoiceNumber: string;
}
