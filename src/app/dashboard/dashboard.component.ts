import { Component, OnInit } from '@angular/core';
import { MovimientosService } from '../movimientosService.service';
import { Movimiento } from '../models/movimiento.model';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FormsModule } from '@angular/forms';
import { SidebarService } from '../sidebar.service';
import jsPDF from 'jspdf'; // Importar jsPDF
import html2canvas from 'html2canvas'; // Importar html2canvas

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
  // Cargar datos del año principal (afecta todas las gráficas)
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
      this.cargarGraficaLineal(this.Movimiento, this.comparisonData); // Actualizar gráfica con ambos datasets
      console.log(this.Movimiento);
    });
  }

  // Cargar datos del año de comparación (solo afecta la gráfica de líneas)
  loadComparisonData(year: number) {
    this.movimientosService.getMovimientos(year).subscribe((data: Movimiento[]) => {
      this.comparisonData = data;
      this.cargarGraficaLineal2(this.Movimiento, this.comparisonData); // Actualizar gráfica con ambos datasets
    });
  }

  // Configuración de la gráfica de líneas
  chartDataLine: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Importe facturas por mes (€)',
        fill: true,
        tension: 0.1,
        borderColor: '#3e95cd',
        backgroundColor: 'rgba(62,149,205,0.4)',
        pointBackgroundColor: '#3e95cd',
      },
      {
        data: [],
        label: 'Importe facturas comparación (€)',
        fill: false, // Sin relleno para diferenciar
        tension: 0.1,
        borderColor: '#ff5733', // Color naranja para la comparación
        backgroundColor: 'rgba(255,87,51,0.4)',
        pointBackgroundColor: '#ff5733',
      }
    ]
  };

  chartOptionsLine: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: {
        callbacks: {
          label: (context) => `${context.parsed.y.toFixed(2)} €`
        }
      }
    },
    scales: {
      x: {},
      y: {
        beginAtZero: true,
        ticks: {
          callback: (value) => `${value} €`
        }
      }
    }
  };

  chartDataPie: ChartData<'pie'> = { labels: [], datasets: [{ data: [] }] };
  chartOptionsPie: ChartConfiguration['options'] = { responsive: true, plugins: { tooltip: { callbacks: { label: (context) => `${context.parsed.toFixed(2)} €` } } } };
  chartDataBar: ChartData<'bar'> = { labels: [], datasets: [{ data: [] }] };
  chartOptionsBar: ChartConfiguration['options'] = { responsive: true, plugins: { tooltip: { callbacks: { label: (context) => `${context.parsed.y.toFixed(2)} €` } } }, scales: { y: { beginAtZero: true, ticks: { callback: (value) => `${value} €` } } } };

  // Cargar datos en las gráficas
  cargarGraficaLineal(primaryData: Movimiento[], comparisonData: Movimiento[]) {
    const importesPorMesPrimary: { [mes: string]: number } = {};
    const importesPorMesComparison: { [mes: string]: number } = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    meses.forEach((mes) => {
      importesPorMesPrimary[mes] = 0;
      importesPorMesComparison[mes] = 0;
    });

    // Calcular importes del año principal
    primaryData.forEach((mov) => {
      const fecha = new Date(mov.DOCFEC);
      const mes = fecha.getMonth();
      const mesNombre = meses[mes];
      const basebas = parseFloat(mov.BASEBAS) || 0;
      const imptbas = parseFloat(mov.IMPTBAS) || 0;
      const recbas = parseFloat(mov.RECBAS) || 0;
      importesPorMesPrimary[mesNombre] += basebas + imptbas + recbas;
    });

    // Calcular importes del año de comparación
    comparisonData.forEach((mov) => {
      const fecha = new Date(mov.DOCFEC);
      const mes = fecha.getMonth();
      const mesNombre = meses[mes];
      const basebas = parseFloat(mov.BASEBAS) || 0;
      const imptbas = parseFloat(mov.IMPTBAS) || 0;
      const recbas = parseFloat(mov.RECBAS) || 0;
      importesPorMesComparison[mesNombre] += basebas + imptbas + recbas;
    });

    const labels = meses; // Usar todos los meses como etiquetas
    const valoresPrimary = Object.values(importesPorMesPrimary);
    const valoresComparison = Object.values(importesPorMesComparison);

    // Actualizar gráfica de líneas con dos datasets
    this.chartDataLine = {
      labels: labels,
      datasets: [
        {
          data: valoresPrimary,
          label: `Importe facturas Año ${this.selectedYear} (€)`,
          fill: true,
          tension: 0.1,
          borderColor: '#3e95cd',
          backgroundColor: 'rgba(62,149,205,0.4)',
          pointBackgroundColor: '#3e95cd',
        },
        {
          data: valoresComparison,
          label: `Importe facturas Año ${this.selectedYearComparison} (€)`,
          fill: false,
          tension: 0.1,
          borderColor: '#ff5733',
          backgroundColor: 'rgba(255,87,51,0.4)',
          pointBackgroundColor: '#ff5733',
        }
      ]
    };

    // Actualizar gráfica de barras (solo año principal)
    this.chartDataBar = {
      labels: labels,
      datasets: [
        {
          label: `Importe facturas Año ${this.selectedYear} (€)`,
          data: valoresPrimary,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: '#4bc0c0',
          borderWidth: 1
        }
      ]
    };

    // Actualizar gráfica de pastel (solo año principal)
    this.chartDataPie = {
      labels: labels,
      datasets: [
        {
          label: `Distribución mensual ${this.selectedYear} (€)`,
          data: valoresPrimary,
          backgroundColor: [
            '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0',
            '#9966FF', '#FF9F40', '#C9CBCF', '#8BC34A',
            '#FF5722', '#03A9F4', '#E91E63', '#CDDC39'
          ],
          hoverOffset: 10
        }
      ]
    };
  }

  cargarGraficaLineal2(primaryData: Movimiento[], comparisonData: Movimiento[]) {
    const importesPorMesPrimary: { [mes: string]: number } = {};
    const importesPorMesComparison: { [mes: string]: number } = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    meses.forEach((mes) => {
      importesPorMesPrimary[mes] = 0;
      importesPorMesComparison[mes] = 0;
    });

    // Calcular importes del año principal
    primaryData.forEach((mov) => {
      const fecha = new Date(mov.DOCFEC);
      const mes = fecha.getMonth();
      const mesNombre = meses[mes];
      const basebas = parseFloat(mov.BASEBAS) || 0;
      const imptbas = parseFloat(mov.IMPTBAS) || 0;
      const recbas = parseFloat(mov.RECBAS) || 0;
      importesPorMesPrimary[mesNombre] += basebas + imptbas + recbas;
    });

    // Calcular importes del año de comparación
    comparisonData.forEach((mov) => {
      const fecha = new Date(mov.DOCFEC);
      const mes = fecha.getMonth();
      const mesNombre = meses[mes];
      const basebas = parseFloat(mov.BASEBAS) || 0;
      const imptbas = parseFloat(mov.IMPTBAS) || 0;
      const recbas = parseFloat(mov.RECBAS) || 0;
      importesPorMesComparison[mesNombre] += basebas + imptbas + recbas;
    });

    const labels = meses; // Usar todos los meses como etiquetas
    const valoresPrimary = Object.values(importesPorMesPrimary);
    const valoresComparison = Object.values(importesPorMesComparison);

    // Actualizar gráfica de líneas con dos datasets
    this.chartDataLine = {
      labels: labels,
      datasets: [
        {
          data: valoresPrimary,
          label: `Importe facturas Año ${this.selectedYear} (€)`,
          fill: true,
          tension: 0.1,
          borderColor: '#3e95cd',
          backgroundColor: 'rgba(62,149,205,0.4)',
          pointBackgroundColor: '#3e95cd',
        },
        {
          data: valoresComparison,
          label: `Importe facturas Año ${this.selectedYearComparison} (€)`,
          fill: false,
          tension: 0.1,
          borderColor: '#ff5733',
          backgroundColor: 'rgba(255,87,51,0.4)',
          pointBackgroundColor: '#ff5733',
        }
      ]

    };
  }


  onYearChange() {
    this.loadData(this.selectedYear);
  }

  onComparisonYearChange() {
    this.loadComparisonData(this.selectedYearComparison);
  }

  // Método para generar el PDF
  generatePDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const charts = document.querySelectorAll<HTMLElement>('.pie, .bar, .line, .info-card');
    let yPosition = 10;
    const margin = 10;

    const promises = Array.from(charts).map((chartElement) => {
      return html2canvas(chartElement, { scale: 3 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');
        const imgWidth = 80; // Más pequeño: 80mm
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const xPosition = (210 - imgWidth) / 2; // Centrar horizontalmente (210mm es el ancho de A4)

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

