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
  selector: 'app-clientes',
  imports: [CommonModule, NgChartsModule, FormsModule],
  templateUrl: './clientes.component.html',
  styleUrls: ['./clientes.component.scss']
})
export class ClientesComponent implements OnInit {
  Movimiento: Movimiento[] = [];
  totalImporteFacturas: number = 0; // Total del año actual (2025)
  comparisonTotals: { [year: number]: number } = {}; // Totales individuales por año
  importe: number = 0;
  selectedYear: number = 2025; // Año principal fijo en 2025
  selectedComparisonYears: number[] = []; // Años de comparación adicionales (excluye 2024 por defecto)
  selectedClient: string = '';
  years: number[] = [2020, 2021, 2022, 2023]; // Excluye 2024 y 2025 (2024 es fijo, 2025 es principal)
  clients: any[] = [];
  comparisonData: { [year: number]: Movimiento[] } = {};
  isSidebarOpen = false;
  defaultComparisonYear: number = 2024; // Año anterior fijo

  constructor(
    private movimientosService: MovimientosService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit() {
    this.loadClients();
    this.loadData(this.selectedYear);
    this.loadComparisonData([this.defaultComparisonYear, ...this.selectedComparisonYears]);
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isSidebarOpen = isOpen;
    });
  }

  loadClients() {
    this.movimientosService.getCodigoCliente().subscribe({
      next: (data: any[]) => {
        this.clients = data;
      },
      error: (error) => {
        console.error('Error al cargar los clientes:', error);
      }
    });
  }

  loadData(year: number) {
    this.movimientosService.getMovimientos(year).subscribe((data: Movimiento[]) => {
      this.Movimiento = this.selectedClient
        ? data.filter(mov => mov.CODTER === this.selectedClient)
        : data;

      this.totalImporteFacturas = this.Movimiento.reduce((acc, mov) => {
        const basebas = parseFloat(mov.BASEBAS) || 0;
        const imptbas = parseFloat(mov.IMPTBAS) || 0;
        const recbas = parseFloat(mov.RECBAS) || 0;
        return acc + (basebas + imptbas + recbas);
      }, 0);
      this.importe = this.Movimiento.reduce((acc, mov) => acc + parseFloat(mov.BASEBAS), 0);
      this.updateCharts();
    });
  }

  loadComparisonData(years: number[]) {
    this.comparisonData = {};
    this.comparisonTotals = {};

    const loadPromises = years.map(year =>
      this.movimientosService.getMovimientos(year).toPromise().then((data: Movimiento[] | undefined) => {
        const filteredData = this.selectedClient
          ? data?.filter(mov => mov.CODTER === this.selectedClient) || []
          : data || [];
        this.comparisonData[year] = filteredData;
        this.comparisonTotals[year] = filteredData.reduce((acc, mov) => {
          const basebas = parseFloat(mov.BASEBAS) || 0;
          const imptbas = parseFloat(mov.IMPTBAS) || 0;
          const recbas = parseFloat(mov.RECBAS) || 0;
          return acc + (basebas + imptbas + recbas);
        }, 0);
      })
    );

    Promise.all(loadPromises).then(() => {
      this.updateComparisonCharts();
    });
  }

  onClientChange() {
    this.loadData(this.selectedYear);
    this.loadComparisonData([this.defaultComparisonYear, ...this.selectedComparisonYears]);
  }

  onComparisonYearsChange() {
    if (this.selectedComparisonYears.length > 4) { // Limita a 4 adicionales + 2024 = 5 total
      this.selectedComparisonYears = this.selectedComparisonYears.slice(0, 4);
    }
    this.loadComparisonData([this.defaultComparisonYear, ...this.selectedComparisonYears]);
  }

  getPercentageDifference(year: number): number {
    const comparisonTotal = this.comparisonTotals[year] || 0;
    if (comparisonTotal === 0) return 0;
    const difference = this.totalImporteFacturas - comparisonTotal;
    return (difference / comparisonTotal) * 100;
  }

  chartDataLine: ChartData<'line'> = { labels: [], datasets: [] };
  chartOptionsLine: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            const formattedValue = value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `${formattedValue} €`;
          }
        }
      },
      title: { display: true, text: 'Comparativa por Años', font: { size: 16 }, padding: { top: 10, bottom: 10 } }
    },
    scales: {
      x: {},
      y: { beginAtZero: true, ticks: { callback: (value) => `${value} €` } }
    }
  };

  chartDataPie: ChartData<'pie'> = { labels: [], datasets: [{ data: [] }] };
  chartOptionsPie: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const formattedValue = value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `${formattedValue} €`;
          }
        }
      }
    }
  };

  chartDataBar: ChartData<'bar'> = { labels: [], datasets: [] };
  chartOptionsBar: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      title: { display: true, text: 'Comparativa por Años', font: { size: 16 }, padding: { top: 10, bottom: 10 } },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed.y;
            const formattedValue = value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return `${formattedValue} €`;
          }
        }
      }
    },
    scales: {
      x: {},
      y: { beginAtZero: true, ticks: { callback: (value) => `${value} €` } }
    }
  };

  updateCharts() {
    const importesPorMesPrimary: { [mes: string]: number } = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    meses.forEach((mes) => {
      importesPorMesPrimary[mes] = 0;
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

    const labels = meses;
    const valoresPrimary = Object.values(importesPorMesPrimary);

    this.chartDataPie = {
      labels: labels,
      datasets: [{
        label: `Distribución mensual ${this.selectedYear} (€)`,
        data: valoresPrimary,
        backgroundColor: ['#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40', '#C9CBCF', '#8BC34A', '#FF5722', '#03A9F4', '#E91E63', '#CDDC39'],
        hoverOffset: 10
      }]
    };

    this.updateComparisonCharts();
  }

  updateComparisonCharts() {
    const importesPorMesPrimary: { [mes: string]: number } = {};
    const importesPorMesComparison: { [year: number]: { [mes: string]: number } } = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    meses.forEach((mes) => {
      importesPorMesPrimary[mes] = 0;
      [this.defaultComparisonYear, ...this.selectedComparisonYears].forEach(year => {
        importesPorMesComparison[year] = importesPorMesComparison[year] || {};
        importesPorMesComparison[year][mes] = 0;
      });
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

    [this.defaultComparisonYear, ...this.selectedComparisonYears].forEach(year => {
      const yearData = this.comparisonData[year] || [];
      yearData.forEach((mov) => {
        const fecha = new Date(mov.DOCFEC);
        const mes = fecha.getMonth();
        const mesNombre = meses[mes];
        const basebas = parseFloat(mov.BASEBAS) || 0;
        const imptbas = parseFloat(mov.IMPTBAS) || 0;
        const recbas = parseFloat(mov.RECBAS) || 0;
        importesPorMesComparison[year][mesNombre] += basebas + imptbas + recbas;
      });
    });

    const labels = meses;
    const valoresPrimary = Object.values(importesPorMesPrimary);

    const lineDatasets = [
      {
        data: valoresPrimary,
        label: `Año ${this.selectedYear} (€)`,
        fill: true,
        tension: 0.1,
        borderColor: '#3e95cd',
        backgroundColor: 'rgba(62,149,205,0.4)',
        pointBackgroundColor: '#3e95cd'
      },
      {
        data: Object.values(importesPorMesComparison[this.defaultComparisonYear]),
        label: `Año ${this.defaultComparisonYear} (€)`,
        fill: false,
        tension: 0.1,
        borderColor: '#ff5733',
        backgroundColor: 'rgba(255,87,51,0.4)',
        pointBackgroundColor: '#ff5733'
      },
      ...this.selectedComparisonYears.map((year, index) => ({
        data: Object.values(importesPorMesComparison[year]),
        label: `Año ${year} (€)`,
        fill: false,
        tension: 0.1,
        borderColor: ['#8BC34A', '#FFCE56', '#9966FF', '#c40c0c'][index % 4],
        backgroundColor: ['rgba(139,195,74,0.4)', 'rgba(255,206,86,0.4)', 'rgba(153,102,255,0.4)', '#c40c0c'][index % 4],
        pointBackgroundColor: ['#8BC34A', '#FFCE56', '#9966FF', '#c40c0c'][index % 4]
      }))
    ];

    this.chartDataLine = { labels, datasets: lineDatasets };

    const barDatasets = [
      {
        label: `Año ${this.selectedYear}`,
        data: valoresPrimary,
        backgroundColor: 'rgba(75, 192, 192, 0.6)',
        borderColor: '#4bc0c0',
        borderWidth: 1
      },
      {
        label: `Año ${this.defaultComparisonYear}`,
        data: Object.values(importesPorMesComparison[this.defaultComparisonYear]),
        backgroundColor: 'rgba(255, 87, 51, 0.6)',
        borderColor: '#ff5733',
        borderWidth: 1
      },
      ...this.selectedComparisonYears.map((year, index) => ({
        label: `Año ${year}`,
        data: Object.values(importesPorMesComparison[year]),
        backgroundColor: ['rgba(139, 195, 74, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(153, 102, 255, 0.6)', '#c40c0c'][index % 4],
        borderColor: ['#8BC34A', '#FFCE56', '#9966FF', '#c40c0c'][index % 4],
        borderWidth: 1
      }))
    ];

    this.chartDataBar = { labels, datasets: barDatasets };
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
