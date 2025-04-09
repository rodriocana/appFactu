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
  styleUrls: ['./clientes.component.scss'],
})
export class ClientesComponent implements OnInit {
  Movimiento: Movimiento[] = [];
  totalImporteFacturas: number = 0;
  comparisonTotals: { [year: number]: number } = {};
  importe: number = 0;
  selectedYear: number = 0;
  selectedComparisonYears: number[] = [];
  years: number[] = [];
  comparisonData: { [year: number]: Movimiento[] } = {};
  isSidebarOpen = false;
  defaultComparisonYear: number = 0;
  showCheckboxes: boolean = false;
  AñoActual: Date = new Date(); // Año actual
  chartDataGeneral: ChartData<'line' | 'bar'> = { labels: [], datasets: [] };

  isLineChart = true; // Comienza con la gráfica de líneas

  constructor(
    private movimientosService: MovimientosService,
    private sidebarService: SidebarService
  ) {}

  ngOnInit() {
    this.loadAvailableYears();
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isSidebarOpen = isOpen;
    });
  }

  toggleCheckboxes() {
    this.showCheckboxes = !this.showCheckboxes;
    this.loadAllData(); // Cargar datos cada vez que se alterna la visibilidad de los checkboxes
  }

  toggleChartType(): void {
    this.isLineChart = !this.isLineChart;
    this.chartDataGeneral = this.isLineChart ? this.chartDataLine : this.chartDataBar;
  }

  loadAvailableYears() {
    this.movimientosService.getAvailableYears().subscribe((availableYears: number[]) => {
      this.selectedYear = this.AñoActual.getFullYear(); // Usar el año actual
      this.defaultComparisonYear = this.selectedYear - 1;

      this.years = availableYears
        .filter(year => year < this.selectedYear - 1)
        .sort((a, b) => b - a)
        .slice(0, 5);

      const allYears = [this.selectedYear, this.defaultComparisonYear];
      this.movimientosService.getMovimientosMultiple(allYears).subscribe((data: { [year: string]: Movimiento[] }) => {
        this.Movimiento = data[this.selectedYear] || [];
        this.totalImporteFacturas = this.Movimiento.reduce((acc, mov) => {
          const basebas = parseFloat(mov.BASEBAS) || 0;
          const imptbas = parseFloat(mov.IMPTBAS) || 0;
          const recbas = parseFloat(mov.RECBAS) || 0;
          return acc + (basebas + imptbas + recbas);
        }, 0);
        this.importe = this.Movimiento.reduce((acc, mov) => acc + parseFloat(mov.BASEBAS), 0);

        this.comparisonData = {};
        this.comparisonTotals = {};
        this.comparisonData[this.defaultComparisonYear] = data[this.defaultComparisonYear] || [];
        this.comparisonTotals[this.defaultComparisonYear] = this.comparisonData[this.defaultComparisonYear].reduce((acc, mov) => {
          const basebas = parseFloat(mov.BASEBAS) || 0;
          const imptbas = parseFloat(mov.IMPTBAS) || 0;
          const recbas = parseFloat(mov.RECBAS) || 0;
          return acc + (basebas + imptbas + recbas);
        }, 0);

        this.updatePieChart(); // Actualizar gráfica de pastel
        this.updateComparisonCharts(); // Actualizar gráfica de líneas/barras
      });
    });
  }

  onCheckboxChange(year: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (isChecked) {
      if (this.selectedComparisonYears.length < 4 && !this.selectedComparisonYears.includes(year)) {
        this.selectedComparisonYears.push(year);
      }
    } else {
      this.selectedComparisonYears = this.selectedComparisonYears.filter(y => y !== year);
    }

    if (this.showCheckboxes) {
      this.loadAllData();
    }
  }

  loadAllData() {
    let comparisonYears = [this.defaultComparisonYear]; // Siempre incluir el año anterior por defecto
    if (this.showCheckboxes) {
      comparisonYears = [...comparisonYears, ...this.selectedComparisonYears]; // Incluir años seleccionados solo si los checkboxes están visibles
    }

    const allYears = [this.selectedYear, ...comparisonYears];

    this.movimientosService.getMovimientosMultiple(allYears).subscribe((data: { [year: string]: Movimiento[] }) => {
      this.Movimiento = data[this.selectedYear] || [];
      this.totalImporteFacturas = this.Movimiento.reduce((acc, mov) => {
        const basebas = parseFloat(mov.BASEBAS) || 0;
        const imptbas = parseFloat(mov.IMPTBAS) || 0;
        const recbas = parseFloat(mov.RECBAS) || 0;
        return acc + (basebas + imptbas + recbas);
      }, 0);

      this.comparisonData = {};
      this.comparisonTotals = {};

      comparisonYears.forEach(year => {
        const filteredData = data[year] || [];
        this.comparisonData[year] = filteredData;
        this.comparisonTotals[year] = filteredData.reduce((acc, mov) => {
          const basebas = parseFloat(mov.BASEBAS) || 0;
          const imptbas = parseFloat(mov.IMPTBAS) || 0;
          const recbas = parseFloat(mov.RECBAS) || 0;
          return acc + (basebas + imptbas + recbas);
        }, 0);
      });

      this.updateComparisonCharts();
    });
  }

  onComparisonYearsChange() {
    if (this.selectedComparisonYears.length > 4) {
      this.selectedComparisonYears = this.selectedComparisonYears.slice(0, 4);
    }
    this.loadAllData();
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
      title: { display: true, text: 'Comparativa por Años', font: { size: 16 }, padding: { top: 25, bottom: 10 } }
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
      title: { display: true, text: 'Total mensual', font: { size: 16 }, padding: { top: 0, bottom: 20 } }
    }
  };

  chartDataBar: ChartData<'bar'> = { labels: [], datasets: [] };
  chartOptionsBar: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      title: { display: true, text: 'Comparativa por Años', font: { size: 16 }, padding: { top: 25, bottom: 10 } },
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
    this.updatePieChart();
    this.updateComparisonCharts();
  }

  updatePieChart() {
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

    const coloresBase = [
      '#FF6384', '#36A2EB', '#FFCE56', '#4BC0C0', '#9966FF', '#FF9F40',
      '#C9CBCF', '#8BC34A', '#FF5722', '#03A9F4', '#E91E63', '#CDDC39'
    ];
    const backgroundColors = valoresPrimary.map((valor, index) =>
      valor === 0 ? 'rgba(200, 200, 200, 0.3)' : coloresBase[index]
    );

    this.chartDataPie = {
      labels: labels,
      datasets: [{
        label: `Distribución mensual ${this.selectedYear} (€)`,
        data: valoresPrimary,
        backgroundColor: backgroundColors,
        hoverOffset: 10
      }]
    };
  }

  updateComparisonCharts() {
    const importesPorMesPrimary: { [mes: string]: number } = {};
    const importesPorMesComparison: { [year: number]: { [mes: string]: number } } = {};
    const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

    meses.forEach((mes) => {
      importesPorMesPrimary[mes] = 0;
      const yearsToShow = this.showCheckboxes ? [this.defaultComparisonYear, ...this.selectedComparisonYears] : [this.defaultComparisonYear];
      yearsToShow.forEach(year => {
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

    const yearsToShow = this.showCheckboxes ? [this.defaultComparisonYear, ...this.selectedComparisonYears] : [this.defaultComparisonYear];
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
    const valoresPrimary = Object.values(importesPorMesPrimary);

    const lineDatasets = [
      {
        data: valoresPrimary,
        label: `Año ${this.selectedYear} (€)`,
        fill: false,
        tension: 0.1,
        borderColor: '#3e95cd',
        backgroundColor: 'rgba(62,149,205,0.4)',
        pointBackgroundColor: '#3e95cd'
      },
      ...yearsToShow.map((year, index) => ({
        data: Object.values(importesPorMesComparison[year]),
        label: `Año ${year} (€)`,
        fill: false,
        tension: 0.1,
        borderColor: year === this.defaultComparisonYear ? '#ff5733' : ['#8BC34A', '#FFCE56', '#9966FF', '#635b5b'][index % 4],
        backgroundColor: year === this.defaultComparisonYear ? 'rgba(255,87,51,0.4)' : ['rgba(139,195,74,0.4)', 'rgba(255,206,86,0.4)', 'rgba(153,102,255,0.4)', '#635b5b'][index % 4],
        pointBackgroundColor: year === this.defaultComparisonYear ? '#ff5733' : ['#8BC34A', '#FFCE56', '#9966FF', '#635b5b'][index % 4]
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
      ...yearsToShow.map((year, index) => ({
        label: `Año ${year}`,
        data: Object.values(importesPorMesComparison[year]),
        backgroundColor: year === this.defaultComparisonYear ? 'rgba(255, 87, 51, 0.6)' : ['rgba(139, 195, 74, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(153, 102, 255, 0.6)', '#635b5b'][index % 4],
        borderColor: year === this.defaultComparisonYear ? '#ff5733' : ['#8BC34A', '#FFCE56', '#9966FF', '#635b5b'][index % 4],
        borderWidth: 1
      }))
    ];

    this.chartDataBar = { labels, datasets: barDatasets };
    this.chartDataGeneral = this.isLineChart ? this.chartDataLine : this.chartDataBar;
  }

  generatePDF() {
    const doc = new jsPDF('p', 'mm', 'a4');
    const charts = document.querySelectorAll<HTMLElement>('.pie-container, .chart-toggle-container, .info-card');
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
