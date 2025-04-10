import { Component, OnInit } from '@angular/core';
import { ActivatedRoute } from '@angular/router'; // Añadido para obtener el parámetro de la ruta
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
  AñoActual: Date = new Date();
  chartDataGeneral: ChartData<'line' | 'bar'> = { labels: [], datasets: [] };
  isLineChart = true;
  codigoCliente: string = ''; // Añadido para almacenar el código del cliente

  constructor(
    private movimientosService: MovimientosService,
    private sidebarService: SidebarService,
    private route: ActivatedRoute // Añadido para leer el parámetro de la ruta
  ) {}

  ngOnInit() {
    this.codigoCliente = this.route.snapshot.paramMap.get('codigo') || '';
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isSidebarOpen = isOpen;
    });
    this.loadAvailableYears();
  }

  toggleCheckboxes() {
    this.showCheckboxes = !this.showCheckboxes;
    if (this.showCheckboxes) {
      // Reiniciar los años seleccionados adicionales al abrir los checkboxes
      this.selectedComparisonYears = [];
    }
    this.loadAllData(); // Recargar datos con los años por defecto
  }

  toggleChartType(): void {
    this.isLineChart = !this.isLineChart;
    this.chartDataGeneral = this.isLineChart ? this.chartDataLine : this.chartDataBar;
  }

  loadAvailableYears() {
    this.movimientosService.getAvailableYears().subscribe((availableYears: number[]) => {
      this.selectedYear = this.AñoActual.getFullYear(); // Año actual (2025)
      this.defaultComparisonYear = this.selectedYear - 1; // Año anterior (2024)
      this.years = availableYears
        .filter(year => year < this.defaultComparisonYear)
        .sort((a, b) => b - a)
        .slice(0, 15); // Últimos 5 años disponibles antes de 2024

      // Cargar datos iniciales solo para selectedYear para la gráfica de pastel
      this.movimientosService.getMovimientosPorClienteMultiple(this.codigoCliente, [this.selectedYear]).subscribe(
        (data: { [year: string]: Movimiento[] }) => {
          this.Movimiento = data[this.selectedYear] || [];
          this.totalImporteFacturas = this.Movimiento.reduce((acc, mov) => {
            const basebas = parseFloat(mov.BASEBAS) || 0;
            const imptbas = parseFloat(mov.IMPTBAS) || 0;
            const recbas = parseFloat(mov.RECBAS) || 0;
            return acc + (basebas + imptbas + recbas);
          }, 0);
          this.updatePieChart(); // Configurar la gráfica de pastel una vez
        },
        (error) => {
          console.error('Error al cargar datos iniciales del pastel:', error);
        }
      );

      this.loadAllData(); // Cargar datos iniciales para las gráficas comparativas
    });
  }

  onCheckboxChange(year: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (isChecked) {
      if (this.selectedComparisonYears.length < 5 && !this.selectedComparisonYears.includes(year)) {
        this.selectedComparisonYears.push(year);
      }
    } else {
      this.selectedComparisonYears = this.selectedComparisonYears.filter(y => y !== year);
    }

    this.loadAllData(); // Recargar datos cada vez que cambie un checkbox
  }

  loadAllData() {
    let comparisonYears = [this.defaultComparisonYear];
    if (this.showCheckboxes) {
      comparisonYears = [...comparisonYears, ...this.selectedComparisonYears];
    }

    const allYears = [this.selectedYear, ...comparisonYears];


    this.movimientosService.getMovimientosPorClienteMultiple(this.codigoCliente, allYears).subscribe(
      (data: { [year: string]: Movimiento[] }) => {

        // No sobrescribimos this.Movimiento aquí para mantener la gráfica de pastel fija
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

        // Actualizar totalImporteFacturas solo si no se ha calculado antes
        if (this.totalImporteFacturas === 0) {
          this.totalImporteFacturas = (data[this.selectedYear] || []).reduce((acc, mov) => {
            const basebas = parseFloat(mov.BASEBAS) || 0;
            const imptbas = parseFloat(mov.IMPTBAS) || 0;
            const recbas = parseFloat(mov.RECBAS) || 0;
            return acc + (basebas + imptbas + recbas);
          }, 0);
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
      // Solo incluir defaultComparisonYear por defecto, y selectedComparisonYears si showCheckboxes es true
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
        borderColor: year === this.defaultComparisonYear ? '#ff5733' : ['#8BC34A', '#FFCE56', '#9966FF', '#635b5b','#11adc2'][index % 5],
        backgroundColor: year === this.defaultComparisonYear ? 'rgba(255, 87, 51, 0.6)' : ['rgba(139, 195, 74, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(153, 102, 255, 0.6)', 'rgba(85, 79, 79, 0.53)','rgba(17, 173, 194, 0.54)','#a7db6b', ][index % 6],
        pointBackgroundColor: year === this.defaultComparisonYear ? '#ff5733' : ['#8BC34A', '#FFCE56', '#9966FF', '#635b5b', '#a7db6b','#11adc2' ][index % 6],
      }))
    ];

    this.chartDataLine = { labels, datasets: lineDatasets };

    const barDatasets = [
      {
        label: `Año ${this.selectedYear}`,
        data: valoresPrimary,
        backgroundColor: '#1189a7b2',
        borderColor: '#4bc0c0',
        borderWidth: 1
      },
      ...yearsToShow.map((year, index) => ({
        label: `Año ${year}`,
        data: Object.values(importesPorMesComparison[year]),
        backgroundColor: year === this.defaultComparisonYear ? 'rgba(255, 87, 51, 0.6)' : ['rgba(139, 195, 74, 0.6)', 'rgba(255, 206, 86, 0.6)', 'rgba(153, 102, 255, 0.6)', '#635b5b', '#a7db6b', '#11adc2'][index % 6],
        borderColor: year === this.defaultComparisonYear ? '#ff5733' : ['#8BC34A', '#FFCE56', '#9966FF', '#635b5b', '#a7db6b','#11adc2' ][index % 6],
        borderWidth: 1
      }))
    ];

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

    // Función para agregar fondo y encabezado
    const addBackgroundAndHeader = () => {
      doc.setFillColor(237,244, 245); // Azul muy claro, puedes cambiarlo a lo que quieras
      doc.rect(0, 0, pageWidth, pageHeight, 'F');

      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(40);
      doc.text(`Reporte de Gráficas - Cliente: ${this.codigoCliente}`, 105, 10, { align: 'center' });
    };

    // Primera página
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
