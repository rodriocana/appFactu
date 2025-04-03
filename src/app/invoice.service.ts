import { Injectable } from '@angular/core';
import { Invoice } from './invoice.model';

@Injectable({
  providedIn: 'root'
})
export class InvoiceService {
  private invoices: Invoice[] = [];

  constructor() {
    // Cargar facturas desde localStorage si existen
    const storedInvoices = localStorage.getItem('invoices');
    if (storedInvoices) {
      this.invoices = JSON.parse(storedInvoices);
    }
  }

  getInvoices(): Invoice[] {
    return this.invoices;
  }

  addInvoice(invoice: Invoice) {
    this.invoices.push(invoice);
    this.saveToLocalStorage();
  }

  private saveToLocalStorage() {
    localStorage.setItem('invoices', JSON.stringify(this.invoices));
  }
}
