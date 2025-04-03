import { Component } from '@angular/core';
import { InvoiceService } from '../invoice.service';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invoice-form',
  standalone: true,
  imports: [FormsModule, CommonModule], // FormsModule para ngModel
  templateUrl: './invoice-form.component.html',
  styleUrls: ['./invoice-form.component.scss']
})
export class InvoiceFormComponent {

  // Inicializa la factura con valores por defecto
  invoice = {
    id: Date.now(),
    clientName: '',
    items: [{ description: '', quantity: 0, price: 0 }],
    total: 0,
    code: 0,
    status: 'Pendiente',
    invoiceNumber: "",
    date: new Date().toISOString().split('T')[0]
  };

  constructor(private invoiceService: InvoiceService, private router: Router) {}

  ngOnInit() {
    this.invoice.invoiceNumber = `FAC-${Date.now().toString().slice(-6)}`;
  }

  addItem() {
    this.invoice.items.push({ description: '', quantity: 0, price: 0 });
    this.calculateTotal();
  }

  calculateTotal() {
    this.invoice.total = this.invoice.items.reduce(
      (sum, item) => sum + item.quantity * item.price,
      0
    );
  }

  onSubmit() {
    this.calculateTotal();
    this.invoiceService.addInvoice(this.invoice);
    this.router.navigate(['/invoices']);
  }
}
