import { Component, OnInit } from '@angular/core';
import { InvoiceService } from '../invoice.service';
import { Invoice } from '../invoice.model';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData, ChartType } from 'chart.js';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  totalInvoices: number = 0;
  totalRevenue: number = 0;
  pendingCount: number = 0;
  paidCount: number = 0;
  cancelledCount: number = 0;

  // Gráfico Pie
  chartData: ChartData<'pie'> = {
    labels: ['Pendientes', 'Pagadas', 'Canceladas'],
    datasets: [{ data: [0, 0, 0], backgroundColor: ['#FFCE56', '#36A2EB', '#FF6384'] }]
  };

  chartOptions: ChartConfiguration<'pie'>['options'] = {
    responsive: true,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2500, // Duración de la animación
      easing: 'easeOutCubic' // Tipo de animación
    }
  };

  // Gráfico Polar Area
  polarChartData: ChartData<'polarArea'> = {
    labels: ['Pendientes', 'Pagadas', 'Canceladas'],
    datasets: [{ data: [0, 0, 0], backgroundColor: ['#FFCE56', '#36A2EB', '#FF6384'] }]
  };

  polarChartOptions: ChartConfiguration<'polarArea'>['options'] = {
    responsive: true,
    animation: {
      animateRotate: true,
      animateScale: true,
      duration: 2500,
      easing: 'easeOutCubic'
    }
  };

  chartType: ChartType = 'pie';

  constructor(private invoiceService: InvoiceService) {}

  ngOnInit() {
    const invoices = this.invoiceService.getInvoices();
    this.calculateStats(invoices);
    this.updateChartData();
    this.updatePolarChartData(); // Asegurándonos de actualizar el gráfico PolarArea
  }

  calculateStats(invoices: Invoice[]) {
    this.totalInvoices = invoices.length;
    this.totalRevenue = invoices.reduce((sum, invoice) => sum + invoice.total, 0);
    this.pendingCount = invoices.filter(invoice => invoice.status === 'Pendiente').length;
    this.paidCount = invoices.filter(invoice => invoice.status === 'Pagada').length;
    this.cancelledCount = invoices.filter(invoice => invoice.status === 'Cancelada').length;
  }

  updateChartData() {
    this.chartData.datasets[0].data = [this.pendingCount, this.paidCount, this.cancelledCount];
    this.chartData.datasets[0].borderColor = ['#ffffff', '#ffffff', '#ffffff'];  // Colores de borde
    this.chartData.datasets[0].borderWidth = 2;  // Ancho de borde
  }

  updatePolarChartData() {

    this.polarChartData.datasets[0].data = [this.pendingCount, this.paidCount, this.cancelledCount];
    this.polarChartData.datasets[0].borderColor = ['#ffffff', '#ffffff', '#ffffff'];  // Colores de borde
    this.polarChartData.datasets[0].borderWidth = 2;  // Ancho de borde
  }
}
