import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Movimiento } from './models/movimiento.model';

@Injectable({
  providedIn: 'root'
})
export class MovimientosService {
  private apiUrl = 'http://192.168.210.176:3000/api/movimientos'; // Ajusta la URL según tu configuración
  private yearsUrl = 'http://localhost:3000/api/years'; // Nuevo endpoint

  constructor(private http: HttpClient) {}


  // solo se usa en dashboard, en clientes no
  getMovimientos(year: number): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.apiUrl}?year=${year}`);
  }

  // Es el método principal que usas en ClientesComponent dentro de loadAllData()
  // para cargar los movimientos de varios años a la vez (selectedYear, defaultComparisonYear, y selectedComparisonYears).
  getMovimientosMultiple(years: number[]): Observable<{ [year: string]: Movimiento[] }> {
    const yearsParam = years.join(',');
    return this.http.get<{ [year: string]: Movimiento[] }>(`${this.apiUrl}?years=${yearsParam}`);
  }

  getCodigoCliente(){
    return this.http.get<any[]>(`http://192.168.210.176:3000/api/codigoCliente`);
  }

  // lo uso par determinar selectedYear (el año mas reciente en la base de datos)  y luego llenar el selector multiple en el front.
  getAvailableYears(): Observable<number[]> {
    return this.http.get<number[]>(this.yearsUrl);
  }

  getMovimientosPorCliente(codigo: string, year: number): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`http://192.168.210.176:3000/api/movimientos/cliente/${codigo}?year=${year}`);
  }
}
