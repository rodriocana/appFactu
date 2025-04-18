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
import { ServicioPythonService } from '../servicio-python.service';

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
  isLoading: boolean = false;
  totalImporteCache: { [year: string]: number } = {};
  isYearLoading: { [year: number]: boolean } = {}; // Nueva bandera por año


  constructor(
    private movimientosService: MovimientosService,
    private sidebarService: SidebarService,
    private route: ActivatedRoute,
    private pythonService: ServicioPythonService
  ) {}

  // en este getter devolvemos los años de comparacion ordenados de mayor a menor
  get sortedComparisonYears(): number[] {
    return [...this.selectedComparisonYears].sort((a, b) => b - a);
  }

  get mostRecentYear(): number {
    return this.sortedComparisonYears[0] || this.selectedYear;
  }

  ngOnInit() {
    // Suscribirse al estado de la sidebar
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isSidebarOpen = isOpen;
    });

    // Suscribirse a los cambios en los parámetros de la ruta
    this.route.paramMap.subscribe(params => {
      const codigo = params.get('codigo');
      if (codigo && codigo !== this.codigoCliente) {
        this.codigoCliente = codigo;
        // Iniciar el proceso del script de Python
        this.iniciarProcesoPython();
      }
    });
  }

  // Método para iniciar el script de Python
  iniciarProcesoPython() {
    this.isLoading = true; // Indicar que está cargando
    this.pythonService.procesarDbf().subscribe({
      next: (response) => {
        console.log('Proceso de Python completado:', response.message);
        // Recargar los datos después de que el script termine
        this.loadAvailableYears();
      },
      error: (err) => {
        console.error('Error al ejecutar el script de Python:', err);
        this.isLoading = false; // Finalizar carga incluso si hay error
        // Opcional: Manejar el error sin recargar datos
        this.loadAvailableYears(); // Cargar datos aunque falle el script
      }
    });
  }

  toggleCheckboxes() {
    this.showCheckboxes = !this.showCheckboxes;
    if (this.showCheckboxes) {
      // Al abrir, inicializar con año actual y anterior
      this.selectedComparisonYears = [this.selectedYear, this.defaultComparisonYear];
      this.pieChartYear = this.selectedYear;
    } else {
      // Al cerrar, limpiar selección
      this.selectedComparisonYears = [];
      this.pieChartYear = this.selectedYear;
    }
    this.loadAllData();
    this.updatePieChart();
  }

  toggleChartType(): void {
    this.isLineChart = !this.isLineChart;
    this.chartDataGeneral = this.isLineChart ? this.chartDataLine : this.chartDataBar;
  }


  // aqui se maneja cuando añado un año nuevo al checkbox
  onCheckboxChange(year: number, event: Event) {
    const isChecked = (event.target as HTMLInputElement).checked;

    if (isChecked) {
      if (this.selectedComparisonYears.length < 5 && !this.selectedComparisonYears.includes(year)) {
        this.selectedComparisonYears.push(year);
        // Cargar solo los datos del nuevo año si no está en comparisonData
        if (!this.comparisonData[year]) {
          this.loadDataForYears([year]); // Cargar solo el nuevo año
        } else {
          // Si los datos ya están cargados, actualizar gráficos
          this.updateCharts();
          if (year > this.pieChartYear) {
            this.pieChartYear = year;
            this.updatePieChart();
          }
        }
      }
    } else {
      this.selectedComparisonYears = this.selectedComparisonYears.filter(y => y !== year);
      if (this.selectedComparisonYears.length === 0) {
        this.showCheckboxes = false;
        this.selectedComparisonYears = [];
        this.pieChartYear = this.selectedYear;
        this.comparisonTotals = {};
        this.comparisonData = {};
        this.loadDataForYears([this.selectedYear, this.defaultComparisonYear]); // Cargar datos para la vista inicial
      } else if (year === this.pieChartYear) {
        this.pieChartYear = this.mostRecentYear;
        this.updateCharts();
        this.updatePieChart();
      } else {
        this.updateCharts();
      }
    }
  }

  loadDataForYears(yearsToLoad: number[]) {
    this.isLoading = true;
    // Inicializar isYearLoading para los años que se van a cargar
    yearsToLoad.forEach(year => {
      this.isYearLoading[year] = true;
    });

    const validYears = [...new Set(yearsToLoad.filter(year => year > 0 && !isNaN(year)))];

    console.log('Cargando datos para años:', validYears);

    if (validYears.length === 0) {
      validYears.forEach(year => {
        this.isYearLoading[year] = false;
      });
      this.isLoading = false;
      return;
    }

    this.movimientosService.getMovimientosPorClienteMultiple(this.codigoCliente, validYears).subscribe(
      (data: { [year: string]: Movimiento[] }) => {
        validYears.forEach(year => {
          const filteredData = data[year] || [];
          this.comparisonData[year] = filteredData;
          this.comparisonTotals[year] = filteredData.reduce((acc, mov) => {
            const basebas = parseFloat(mov.BASEBAS) || 0;
            return acc + basebas;
          }, 0);
          this.isYearLoading[year] = false; // Marcar el año como cargado
        });

        console.log('comparisonTotals:', this.comparisonTotals);
        this.updateCharts();
        this.updatePieChart();
        this.isLoading = false;
      },
      (error) => {
        console.error('Error al cargar datos:', error);
        validYears.forEach(year => {
          this.isYearLoading[year] = false;
        });
        this.isLoading = false;
      }
    );
  }

  loadYearData(year: number) {
    if (year <= 0) return;

    // Verificar si los datos ya están en caché
    if (this.comparisonTotals[year] !== undefined && this.comparisonData[year]) {
      console.log(`Datos para el año ${year} ya en caché, omitiendo consulta`);
      if (year === this.selectedYear) {
        this.totalImporteFacturas = this.comparisonTotals[year];
      }
      this.updateCharts();
      this.updatePieChart();
      return;
    }

    this.isLoading = true;
    console.log(`Consultando SQL para el año ${year}`);
    this.movimientosService.getMovimientosPorClienteMultiple(this.codigoCliente, [year]).subscribe({
      next: (data: { [year: string]: Movimiento[] }) => {
        this.comparisonData[year] = data[year] || [];
        this.comparisonTotals[year] = this.comparisonData[year].reduce((acc, mov) => {
          const basebas = parseFloat(mov.BASEBAS) || 0;
          return acc + basebas;
        }, 0);

        if (year === this.selectedYear) {
          this.totalImporteFacturas = this.comparisonTotals[year];
        }

        this.updateCharts();
        this.updatePieChart();
        this.isLoading = false;
      },
      error: (error) => {
        console.error(`Error al cargar datos para el año ${year}:`, error);
        this.isLoading = false;
      }
    });
  }



  // Nueva función para actualizar el gráfico después de cargar los datos
updatePieChartAfterDataLoad(year: number) {
  this.updatePieChart();
}
  // Modificar loadAllData para usar loadDataForYears
  loadAllData() {
    this.isLoading = true;
    let allYears = [...new Set([...this.selectedComparisonYears].filter(year => year > 0 && !isNaN(year)))];

    if (allYears.length === 0) {
      allYears = [this.selectedYear, this.defaultComparisonYear].filter(year => year > 0 && !isNaN(year));
    }

    // Filtrar solo los años que no están en comparisonData
    const yearsToLoad = allYears.filter(year => !this.comparisonData[year]);

    console.log('Años a cargar:', yearsToLoad);

    if (yearsToLoad.length === 0) {
      this.updateCharts();
      this.updatePieChart();
      this.isLoading = false;
      return;
    }

    this.loadDataForYears(yearsToLoad);
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
      importesPorMesPrimary[mesNombre] += basebas;
    });

    if (yearToShow === this.selectedYear && this.comparisonTotals[yearToShow] !== undefined) {
      this.totalImporteFacturas = this.comparisonTotals[yearToShow];
    }

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
        importesPorMesComparison[year][mesNombre] += basebas ;
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


  loadAvailableYears() {
    this.isLoading = true;
    this.movimientosService.getAvailableYears().subscribe({
      next: (availableYears: number[]) => {
        console.log('Años recibidos del backend:', availableYears); // Depuración

        this.selectedYear = this.AñoActual.getFullYear(); // Ej: 2025
        this.defaultComparisonYear = this.selectedYear - 1; // Ej: 2024

        console.log('selectedYear:', this.selectedYear);
        console.log('defaultComparisonYear:', this.defaultComparisonYear);

        // Filtrar años inválidos (0, NaN, undefined) y limitar a los últimos 15 años válidos
        this.years = availableYears
          .filter(year => year > 0 && !isNaN(year) && year <= this.selectedYear)
          .sort((a, b) => b - a)
          .slice(0, 15);

        console.log('Años filtrados para checkboxes:', this.years); // Depuración

        this.selectedComparisonYears = [this.selectedYear, this.defaultComparisonYear].filter(year => year > 0);
        this.pieChartYear = this.selectedYear;

        // Inicializar isYearLoading para los años iniciales
        this.isYearLoading[this.selectedYear] = true;
        this.movimientosService.getMovimientosPorClienteMultiple(this.codigoCliente, [this.selectedYear]).subscribe({
          next: (data: { [year: string]: Movimiento[] }) => {
            this.Movimiento = data[this.selectedYear] || [];
            this.totalImporteFacturas = this.Movimiento.reduce((acc, mov) => {
              const basebas = parseFloat(mov.BASEBAS) || 0;
              return acc + basebas;
            }, 0);
            this.comparisonData[this.selectedYear] = this.Movimiento;
            this.comparisonTotals[this.selectedYear] = this.totalImporteFacturas;
            this.isYearLoading[this.selectedYear] = false;
            this.updatePieChart();
            this.isLoading = false;
            this.loadAllData();
          },
          error: (error) => {
            console.error('Error al cargar datos iniciales del pastel:', error);
            this.isYearLoading[this.selectedYear] = false;
            this.isLoading = false;
          }
        });
      },
      error: (error) => {
        console.error('Error al cargar años disponibles:', error);
        this.isLoading = false;
      }
    });
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
