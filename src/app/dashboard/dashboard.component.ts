import { Component, OnInit } from '@angular/core';
import { MovimientosService } from '../movimientosService.service';
import { Movimiento } from '../models/movimiento.model';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FormsModule } from '@angular/forms';
import { SidebarService } from '../sidebar.service';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  Movimiento: Movimiento[] = [];
  totalImporteFacturas: number = 0;
  totalImporteFacturasComparison: number = 0;
  importe: number = 0;
  selectedYear: number = 2024;
  selectedYearComparison: number = 2023;
  years: number[] = [2020, 2021, 2022, 2023, 2024, 2025];
  comparisonData: Movimiento[] = [];
  isSidebarOpen = false;

  constructor(
    private movimientosService: MovimientosService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit() {
    this.loadData(this.selectedYear);
    this.loadComparisonData(this.selectedYearComparison);
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isSidebarOpen = isOpen;
    });
  }

  loadData(year: number) {
    this.movimientosService.getMovimientos(year).subscribe((data: Movimiento[]) => {
      this.Movimiento = data;
      this.totalImporteFacturas = data.reduce((acc, mov) => {
        const basebas = parseFloat(mov.BASEBAS) || 0;
        const imptbas = parseFloat(mov.IMPTBAS) || 0;
        const recbas = parseFloat(mov.RECBAS) || 0;
        return acc + (basebas + imptbas + recbas);
      }, 0);
      this.importe = data.reduce((acc, mov) => acc + parseFloat(mov.BASEBAS), 0);
      this.updateCharts();
    });
  }

  loadComparisonData(year: number) {
    this.movimientosService.getMovimientos(year).subscribe((data: Movimiento[]) => {
      this.comparisonData = data;
      this.totalImporteFacturasComparison = data.reduce((acc, mov) => {
        const basebas = parseFloat(mov.BASEBAS) || 0;
        const imptbas = parseFloat(mov.IMPTBAS) || 0;
        const recbas = parseFloat(mov.RECBAS) || 0;
        return acc + (basebas + imptbas + recbas);
      }, 0);
      this.updateCharts();
    });
  }

  getPercentageDifference(): number {
    if (this.totalImporteFacturasComparison === 0) return 0;
    const difference = this.totalImporteFacturas - this.totalImporteFacturasComparison;
    return (difference / this.totalImporteFacturasComparison) * 100;
  }

  chartDataLine: ChartData<'line'> = {
    labels: [],
    datasets: [
      { data: [], label: 'Importe facturas por mes (€)', fill: true, tension: 0.1, borderColor: '#3e95cd', backgroundColor: 'rgba(62,149,205,0.4)', pointBackgroundColor: '#3e95cd' },
      { data: [], label: 'Importe facturas comparación (€)', fill: false, tension: 0.1, borderColor: '#ff5733', backgroundColor: 'rgba(255,87,51,0.4)', pointBackgroundColor: '#ff5733' }
    ]
  };

  chartOptionsLine: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { legend: { display: true }, tooltip: { callbacks: { label: (context) => `${context.parsed.y.toFixed(2)} €` } } },
    scales: { x: {}, y: { beginAtZero: true, ticks: { callback: (value) => `${value} €` } } }
  };

  chartDataPie: ChartData<'pie'> = { labels: [], datasets: [{ data: [] }] };
  chartOptionsPie: ChartConfiguration['options'] = { responsive: true, plugins: { tooltip: { callbacks: { label: (context) => `${context.parsed.toFixed(2)} €` } } } };

  chartDataBar: ChartData<'bar'> = { labels: [], datasets: [{ data: [] }] };
  chartOptionsBar: ChartConfiguration['options'] = {
    responsive: true,
    plugins: { tooltip: { callbacks: { label: (context) => `${context.parsed.y.toFixed(2)} €` } } },
    scales: { x: {}, y: { beginAtZero: true, ticks: { callback: (value) => `${value} €` } } }
  };

  updateCharts() {
    const importesPorMesPrimary: { [mes: string]: number } = {};
    const importesPorMesComparison: { [mes: string]: number } = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    meses.forEach((mes) => {
      importesPorMesPrimary[mes] = 0;
      importesPorMesComparison[mes] = 0;
    });

    this.Movimiento.forEach((mov) => {
      const fecha = new Date(mov.DOCFEC);
      const mes = fecha.getMonth();
      const mesNombre = meses[mes];
      const basebas = parseFloat(mov.BASEBAS) || 0;
      const imptbas = parseFloat(mov.IMPTBAS) || 0;
      const recbas = parseFloat(mov.RECBAS) || 0;
      importesPorMesPrimary[mesNombre] += basebas + imptbas + recbas;
    });

    this.comparisonData.forEach((mov) => {
      const fecha = new Date(mov.DOCFEC);
      const mes = fecha.getMonth();
      const mesNombre = meses[mes];
      const basebas = parseFloat(mov.BASEBAS) || 0;
      const imptbas = parseFloat(mov.IMPTBAS) || 0;
      const recbas = parseFloat(mov.RECBAS) || 0;
      importesPorMesComparison[mesNombre] += basebas + imptbas + recbas;
    });

    const labels = meses;
    const valoresPrimary = Object.values(importesPorMesPrimary);
    const valoresComparison = Object.values(importesPorMesComparison);

    // Gráfica de líneas
    this.chartDataLine = {
      labels: labels,
      datasets: [
        { data: valoresPrimary, label: `Importe facturas Año ${this.selectedYear} (€)`, fill: true, tension: 0.1, borderColor: '#3e95cd', backgroundColor: 'rgba(62,149,205,0.4)', pointBackgroundColor: '#3e95cd' },
        { data: valoresComparison, label: `Importe facturas Año ${this.selectedYearComparison} (€)`, fill: false, tension: 0.1, borderColor: '#ff5733', backgroundColor: 'rgba(255,87,51,0.4)', pointBackgroundColor: '#ff5733' }
      ]
    };

    // Gráfica de barras: Si los años son iguales, mostrar solo un dataset
    if (this.selectedYear === this.selectedYearComparison) {
      this.chartDataBar = {
        labels: labels,
        datasets: [
          {
            label: `Año ${this.selectedYear}`,
            data: valoresPrimary,
            backgroundColor: 'rgba(75, 192, 192, 0.6)', // Color para el año único
            borderColor: '#4bc0c0',
            borderWidth: 1
          }
        ]
      };
    } else {
      this.chartDataBar = {
        labels: labels,
        datasets: [
          {
            label: `Año ${this.selectedYear}`,
            data: valoresPrimary,
            backgroundColor: 'rgba(75, 192, 192, 0.6)', // Color para el año principal
            borderColor: '#4bc0c0',
            borderWidth: 1
          },
          {
            label: `Año ${this.selectedYearComparison}`,
            data: valoresComparison,
            backgroundColor: 'rgba(255, 87, 51, 0.6)', // Color para el año de comparación
            borderColor: '#ff5733',
            borderWidth: 1
          }
        ]
      };
    }

    // Gráfica de pastel (solo año principal)
    this.chartDataPie = {
      labels: labels,
      datasets: [{
        label: `Distribución mensual ${this.selectedYear} (€)`,
        data: valoresPrimary,
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8BC34A', '#FF5722', '#03A9F4', '#E91E63', '#CDDC39'],
        hoverOffset: 10
      }]
    };
  }

  onYearChange() {
    this.loadData(this.selectedYear);
  }

  onComparisonYearChange() {
    this.loadComparisonData(this.selectedYearComparison);
  }

  generatePDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const charts = document.querySelectorAll<HTMLElement>('.pie, .bar, .line, .info-card');
    let yPosition = 10;
    const margin = 10;

    const promises = Array.from(charts).map((chartElement) => {
      return html2canvas(chartElement, { scale: 3 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 80;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const xPosition = (210 - imgWidth) / 2;

        if (yPosition + imgHeight > 277) {
          doc.addPage();
          yPosition = 10;
        }

        doc.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + margin;
      });
    });

    Promise.all(promises).then(() => {
      doc.save('dashboard_charts.pdf');
    }).catch((error) => {
      console.error('Error generando el PDF:', error);
    });
  }
}
