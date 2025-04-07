
import { Component, OnInit } from '@angular/core';
import { MovimientosService } from '../movimientosService.service';
import { Movimiento } from '../models/movimiento.model';
import { CommonModule } from '@angular/common';
import { NgChartsModule } from 'ng2-charts';
import { ChartConfiguration, ChartData } from 'chart.js';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [CommonModule, NgChartsModule, FormsModule],
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss']
})
export class DashboardComponent implements OnInit {
  Movimiento: Movimiento[] = [];
  totalFacturas: number = 0;
  importe: number = 0;
  selectedYear: number = 2024; // Año por defecto
  years: number[] = [2020, 2021, 2022, 2023, 2024, 2025]; // Lista de años disponibles en el selector

  constructor(private movimientosService: MovimientosService) {}

  ngOnInit() {
    this.loadData(this.selectedYear); // Carga inicial con el año por defecto
  }

  // Método para cargar datos del backend según el año
  loadData(year: number) {
    this.movimientosService.getMovimientos(year).subscribe((data: Movimiento[]) => {
      this.Movimiento = data;
      this.totalFacturas = data.length;
      this.importe = data.reduce((acc, mov) => acc + parseFloat(mov.BASEBAS), 0);
      this.cargarGraficaLineal(data, year);
    });
  }

  // Configuración de la gráfica de líneas (solo una gráfica dinámica)
  chartDataLine: ChartData<'line'> = {
    labels: [],
    datasets: [
      {
        data: [],
        label: 'Facturas por mes',
        fill: true,
        tension: 0.1,
        borderColor: '#3e95cd',
        backgroundColor: 'rgba(62,149,205,0.4)',
        pointBackgroundColor: '#3e95cd',
      }
    ]
  };

  chartOptionsLine: ChartConfiguration['options'] = {
    responsive: true,
    plugins: {
      legend: { display: true },
      tooltip: { enabled: true }
    },
    scales: {
      x: {},
      y: {
        beginAtZero: true,
        ticks: { stepSize: 1 }
      }
    }
  };

  chartDataPie: ChartData<'pie'> = { labels: [], datasets: [{ data: [] }] };
  chartOptionsPie: ChartConfiguration['options'] = { responsive: true };
  chartDataBar: ChartData<'bar'> = { labels: [], datasets: [{ data: [] }] };
  chartOptionsBar: ChartConfiguration['options'] = { responsive: true };

  // Cargar datos en la gráfica según el año
  cargarGraficaLineal(data: Movimiento[], year: number) {
    const facturasPorMes: { [mes: string]: number } = {};
    const meses = [
      'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
      'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'
    ];
    meses.forEach((mes) => (facturasPorMes[mes] = 0));

    data.forEach((mov) => {
      const fecha = new Date(mov.DOCFEC);
      const mes = fecha.getMonth(); // 0 = Enero
      const mesNombre = meses[mes];
      facturasPorMes[mesNombre]++;
    });

    const labels = Object.keys(facturasPorMes);
    const valores = Object.values(facturasPorMes);

    // Reasignar completamente chartDataLine para forzar la actualización
    this.chartDataLine = {
      labels: labels,
      datasets: [
        {
          data: valores,
          label: `Facturas por mes Año ${year}`,
          fill: true,
          tension: 0.1,
          borderColor: '#3e95cd',
          backgroundColor: 'rgba(62,149,205,0.4)',
          pointBackgroundColor: '#3e95cd',
        }
      ]
    };

    // Actualizar gráfica de barras
    this.chartDataBar = {
      labels: labels,
      datasets: [
        {
          label: `Facturas por mes ${year}`,
          data: valores,
          backgroundColor: 'rgba(75, 192, 192, 0.6)',
          borderColor: '#4bc0c0',
          borderWidth: 1
        }
      ]
    };

    // Actualizar gráfica de pastel
    this.chartDataPie = {
      labels: labels,
      datasets: [
        {
          label: `Distribución mensual ${year}`,
          data: valores,
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

  // Método ejecutado al cambiar el año
  onYearChange() {
    this.loadData(this.selectedYear);
  }
}
