import { Component, OnInit } from '@angular/core';
import { InvoiceService } from '../invoice.service';
import { Invoice } from '../invoice.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-invoices-list',
  standalone: true,
  imports: [CommonModule], // Para usar *ngFor
  templateUrl: './invoices-list.component.html',
  styleUrls: ['./invoices-list.component.scss']
})
export class InvoicesListComponent implements OnInit {

  invoices: Invoice[] = [];

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit() {
    this.invoices = this.invoiceService.getInvoices();
  }

  getStatusClass(status: string): string {
    switch (status.toLowerCase()) {
      case 'pendiente':
        return 'pending';
      case 'pagada':
        return 'paid';
      case 'cancelada':
        return 'cancelled';
      default:
        return '';
    }
  }
}
