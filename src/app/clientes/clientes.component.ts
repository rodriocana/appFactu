import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
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
  styleUrls: ['./clientes.component.scss'],
})
export class ClientesComponent implements OnInit {
  Movimiento: Movimiento[] = [];
  totalImporteFacturas: number = 0;
  comparisonTotals: { [year: number]: number } = {};
  importe: number = 0;
  selectedYear: number = 0; // Año actual (2025 por defecto)
  selectedComparisonYears: number[] = []; // Años seleccionados para comparación
  years: number[] = []; // Lista completa de años disponibles
  comparisonData: { [year: number]: Movimiento[] } = {};
  isSidebarOpen = false;
  showCheckboxes: boolean = false;
  AñoActual: Date = new Date();
  chartDataGeneral: ChartData<'line' | 'bar'> = { labels: [], datasets: [] };
  isLineChart = true;
  codigoCliente: string = '';
  defaultComparisonYear: number = 0; // Año anterior fijo (2024 por defecto)
  pieChartYear: number = 0; // Año actualmente mostrado en el gráfico de pastel

  constructor(
    private movimientosService: MovimientosService,
    private sidebarService: SidebarService,
    private route: ActivatedRoute
  ) {}

  // en este getter devolvemos los años de comparacion ordenados de mayor a menor
  get sortedComparisonYears(): number[] {
    return [...this.selectedComparisonYears].sort((a, b) => b - a);
  }

  get mostRecentYear(): number {
    return this.sortedComparisonYears[0] || this.selectedYear;
  }

  ngOnInit() {
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isSidebarOpen = isOpen;
    });

    // Suscribirse a los cambios en los parámetros de la ruta
    this.route.paramMap.subscribe(params => {
      const codigo = params.get('codigo');
      if (codigo && codigo !== this.codigoCliente) {
        this.codigoCliente = codigo;
        this.loadAvailableYears(); // Recargar datos cuando cambie el código
      }
    });
  }

  toggleCheckboxes() {
    this.showCheckboxes = !this.showCheckboxes;
    if (!this.showCheckboxes) {
      this.selectedComparisonYears = [this.selectedYear, this.defaultComparisonYear];
      this.pieChartYear = this.selectedYear;
      this.updatePieChart();
    }
    this.loadAllData();
  }

  toggleChartType(): void {
    this.isLineChart = !this.isLineChart;
    this.chartDataGeneral = this.isLineChart ? this.chartDataLine : this.chartDataBar;
  }

  loadAvailableYears() {
    this.movimientosService.getAvailableYears().subscribe((availableYears: number[]) => {
      this.selectedYear = this.AñoActual.getFullYear(); // año del sistema
      this.defaultComparisonYear = this.selectedYear - 1; // año del sistema - 1

      this.years = availableYears
        .filter(year => year <= this.selectedYear)
        .sort((a, b) => b - a)
        .slice(0, 15);

      this.selectedComparisonYears = [this.selectedYear, this.defaultComparisonYear];
      this.pieChartYear = this.selectedYear;


      this.movimientosService.getMovimientosPorClienteMultiple(this.codigoCliente, [this.selectedYear]).subscribe(
        (data: { [year: string]: Movimiento[] }) => {
          this.Movimiento = data[this.selectedYear] || [];
          this.totalImporteFacturas = this.Movimiento.reduce((acc, mov) => {
            const basebas = parseFloat(mov.BASEBAS) || 0;
            const imptbas = parseFloat(mov.IMPTBAS) || 0;
            const recbas = parseFloat(mov.RECBAS) || 0;
            return acc + (basebas + imptbas + recbas);
          }, 0);
          this.updatePieChart();
        },
        (error) => {
          console.error('Error al cargar datos iniciales del pastel:', error);
        }
      );

      this.loadAllData();
    });
  }

  onCheckboxChange(year: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (isChecked) {
      if (this.selectedComparisonYears.length < 5 && !this.selectedComparisonYears.includes(year)) {
        this.selectedComparisonYears.push(year);
        // Actualizar el gráfico de pastel solo si el nuevo año es mayor que pieChartYear
        if (year > this.pieChartYear) {
          this.pieChartYear = year;
          this.loadAllData(); // Cargar datos primero
          this.updatePieChartAfterDataLoad(year); // Actualizar después de cargar
        } else {
          this.loadAllData(); // Solo cargar datos, sin actualizar el pastel
        }
      }
    } else {
      this.selectedComparisonYears = this.selectedComparisonYears.filter(y => y !== year);
      if (this.selectedComparisonYears.length === 0) {
        this.showCheckboxes = false;
        this.selectedComparisonYears = [this.selectedYear, this.defaultComparisonYear];
        this.pieChartYear = this.selectedYear;
        this.loadAllData();
        this.updatePieChartAfterDataLoad(this.pieChartYear);
      } else if (year === this.pieChartYear) {
        this.pieChartYear = this.mostRecentYear;
        this.loadAllData();
        this.updatePieChartAfterDataLoad(this.pieChartYear);
      } else {
        this.loadAllData(); // Solo actualizar otros gráficos
      }
    }
  }

  // Nueva función para actualizar el gráfico después de cargar los datos
  updatePieChartAfterDataLoad(year: number) {
    this.movimientosService.getMovimientosPorClienteMultiple(this.codigoCliente, [year]).subscribe({
      next: (data: { [year: string]: Movimiento[] }) => {
        this.comparisonData[year] = data[year] || [];
        this.updatePieChart();
      },
      error: (error) => {
        console.error(`Error al cargar datos para el año ${year}:`, error);
      }
    });
  }

  loadAllData() {
    const allYears = [...this.selectedComparisonYears];

    this.movimientosService.getMovimientosPorClienteMultiple(this.codigoCliente, allYears).subscribe(
      (data: { [year: string]: Movimiento[] }) => {
        this.comparisonData = {};
        this.comparisonTotals = {};

        allYears.forEach(year => {
          const filteredData = data[year] || [];
          this.comparisonData[year] = filteredData;
          this.comparisonTotals[year] = filteredData.reduce((acc, mov) => {
            const basebas = parseFloat(mov.BASEBAS) || 0;
            const imptbas = parseFloat(mov.IMPTBAS) || 0;
            const recbas = parseFloat(mov.RECBAS) || 0;
            return acc + (basebas + imptbas + recbas);
          }, 0);
        });

        if (this.selectedComparisonYears.includes(this.selectedYear)) {
          this.comparisonTotals[this.selectedYear] = this.totalImporteFacturas;
        }

        this.updateCharts();
      },
      (error) => {
        console.error('Error al cargar datos:', error);
      }
    );
  }

  onComparisonYearsChange() {
    if (this.selectedComparisonYears.length > 5) {
      this.selectedComparisonYears = this.selectedComparisonYears.slice(0, 5);
    }
    this.loadAllData();
  }

  getPercentageDifference(year: number): number {
    const baseTotal = this.showCheckboxes ? (this.comparisonTotals[this.mostRecentYear] || 0) : (this.totalImporteFacturas || 0);
    const comparisonTotal = this.comparisonTotals[year] || 0;
    if (baseTotal === 0) return 0;
    const difference = comparisonTotal - baseTotal;
    return (difference / baseTotal) * 100;
  }

  getAmountDifference(year: number): number {
    const baseTotal = this.comparisonTotals[this.mostRecentYear] || 0;
    const comparisonTotal = this.comparisonTotals[year] || 0;
    return comparisonTotal - baseTotal;
  }



  chartDataLine: ChartData<'line'> = { labels: [], datasets: [] };
  chartOptionsLine: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
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
      title: { display: true, text: `Comparativa por Años - Cliente ${this.codigoCliente}`, font: { size: 16 }, padding: { top: 25, bottom: 10 } }
    },
    scales: {
      x: {},
      y: { beginAtZero: true, ticks: { callback: (value) => `${value} €` } }
    }
  };

  chartDataPie: ChartData<'pie'> = { labels: [], datasets: [{ data: [] }] };
  chartOptionsPie: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed;
            const label = context.label || '';
            const formattedValue = value.toLocaleString('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
            return value === 0 ? `${label}: Sin datos` : `${label}: ${formattedValue} €`;
          }
        }
      },
      title: { display: true, text: `Total mensual - Cliente ${this.codigoCliente}`, font: { size: 16 }, padding: { top: 0, bottom: 14 } }
    },
    layout: {
      padding: 7
    }
  };

  chartDataBar: ChartData<'bar'> = { labels: [], datasets: [] };
  chartOptionsBar: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: `Comparativa por Años - Cliente ${this.codigoCliente}`, font: { size: 16 }, padding: { top: 25, bottom: 10 } },
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
    this.updateComparisonCharts();
  }

  updatePieChart() {
    const importesPorMesPrimary: { [mes: string]: number } = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    meses.forEach((mes) => {
      importesPorMesPrimary[mes] = 0;
    });

    const yearToShow = this.pieChartYear;
    const movimientosToShow = this.showCheckboxes ? (this.comparisonData[yearToShow] || []) : this.Movimiento;

    if (!movimientosToShow || movimientosToShow.length === 0) {
      console.warn(`No hay datos disponibles para el año ${yearToShow}`);
    }

    movimientosToShow.forEach((mov) => {
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

    const coloresBase = [
      '#FF6384', '#91c7eb', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#94faff', '#8BC34A', '#FF5722', '#03A9F4', '#E91E63', '#CDDC39'
    ];
    const backgroundColors = valoresPrimary.map((valor, index) =>
      valor === 0 ? 'rgba(200, 200, 200, 0.3)' : coloresBase[index]
    );

    this.chartDataPie = {
      labels: labels,
      datasets: [{
        label: `Distribución mensual ${yearToShow} (€)`,
        data: valoresPrimary,
        backgroundColor: backgroundColors,
        hoverOffset: 10
      }]
    };

    this.chartOptionsPie = {
      ...this.chartOptionsPie,
      plugins: {
        ...this.chartOptionsPie?.plugins,
        title: {
          display: true,
          text: `Total mensual ${yearToShow} - Cliente ${this.codigoCliente}`,
          font: { size: 16 },
          padding: { top: 0, bottom: 14 }
        }
      }
    };
  }

  updateComparisonCharts() {
    const importesPorMesComparison: { [year: number]: { [mes: string]: number } } = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    const yearsToShow = this.showCheckboxes ? this.sortedComparisonYears : [this.selectedYear, this.defaultComparisonYear];

    meses.forEach((mes) => {
      yearsToShow.forEach(year => {
        importesPorMesComparison[year] = importesPorMesComparison[year] || {};
        importesPorMesComparison[year][mes] = 0;
      });
    });

    yearsToShow.forEach(year => {
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

    const lineDatasets = yearsToShow.map((year, index) => ({
      data: Object.values(importesPorMesComparison[year]),
      label: `Año ${year} (€)`,
      fill: false,
      tension: 0.1,
      borderColor: ['#3e95cd', '#ff5733', '#8BC34A', '#FFCE56', '#9966FF'][index % 5],
      backgroundColor: ['rgba(62,149,205,0.4)', 'rgba(255,87,51,0.6)', 'rgba(139,195,74,0.6)', 'rgba(255,206,86,0.6)', 'rgba(153,102,255,0.6)'][index % 5],
      pointBackgroundColor: ['#3e95cd', '#ff5733', '#8BC34A', '#FFCE56', '#9966FF'][index % 5]
    }));

    this.chartDataLine = { labels, datasets: lineDatasets };

    const barDatasets = yearsToShow.map((year, index) => ({
      label: `Año ${year}`,
      data: Object.values(importesPorMesComparison[year]),
      backgroundColor: ['#1189a7b2', 'rgba(255,87,51,0.6)', 'rgba(139,195,74,0.6)', 'rgba(255,206,86,0.6)', 'rgba(153,102,255,0.6)'][index % 5],
      borderColor: ['#4bc0c0', '#ff5733', '#8BC34A', '#FFCE56', '#9966FF'][index % 5],
      borderWidth: 1
    }));

    this.chartDataBar = { labels, datasets: barDatasets };
    this.chartDataGeneral = this.isLineChart ? this.chartDataLine : this.chartDataBar;
  }

  generatePDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const charts = document.querySelectorAll<HTMLElement>('.pie-container, .chart-toggle-container, .info-card');
    let yPosition = 20;
    const margin = 10;
    const pageWidth = 210;
    const pageHeight = 297;

    const addBackgroundAndHeader = () => {
      doc.setFillColor(237, 244, 245);
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40);
      doc.text(`Reporte de Gráficas - Cliente: ${this.codigoCliente}`, 105, 10, { align: 'center' });
    };

    addBackgroundAndHeader();

    const promises = Array.from(charts).map((chartElement, index) => {
      return html2canvas(chartElement, { scale: 4 }).then((canvas) => {
        const imgData = canvas.toDataURL('image/png');

        const isFirst = index === 0;
        const imgWidth = isFirst ? 180 : 100;
        const imgHeight = (canvas.height * imgWidth) / canvas.width;
        const xPosition = (pageWidth - imgWidth) / 2;

        if (yPosition + imgHeight > 277) {
          doc.addPage();
          addBackgroundAndHeader();
          yPosition = 20;
        }

        doc.addImage(imgData, 'PNG', xPosition, yPosition, imgWidth, imgHeight);
        yPosition += imgHeight + margin;
      });
    });

    Promise.all(promises).then(() => {
      doc.save(`cliente_${this.codigoCliente}_charts.pdf`);
    }).catch((error) => {
      console.error('Error generando el PDF:', error);
    });
  }
}
