
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Movimiento } from './models/movimiento.model';

@Injectable({
  providedIn: 'root'
})
export class MovimientosService {
  private apiUrl = 'http://192.168.210.176:3000/api/movimientos';
  private yearsUrl = 'http://192.168.210.176:3000/api/years';

  constructor(private http: HttpClient) {}

  getMovimientos(year: number): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.apiUrl}?year=${year}`);
  }

  getMovimientosMultiple(years: number[]): Observable<{ [year: string]: Movimiento[] }> {
    const yearsParam = years.join(',');
    return this.http.get<{ [year: string]: Movimiento[] }>(`${this.apiUrl}?years=${yearsParam}`);
  }

  getCodigoCliente(): Observable<any[]> {
    return this.http.get<any[]>(`http://192.168.210.176:3000/api/codigoCliente`);
  }

  getAvailableYears(): Observable<number[]> {
    return this.http.get<number[]>(this.yearsUrl);
  }

  getMovimientosPorCliente(codigo: string, year: number): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`http://192.168.210.176:3000/api/movimientos/cliente/${codigo}?year=${year}`);
  }

  // Método añadido para soportar múltiples años por cliente
  getMovimientosPorClienteMultiple(codigo: string, years: number[]): Observable<{ [year: string]: Movimiento[] }> {
    const yearsParam = years.join(',');
    return this.http.get<{ [year: string]: Movimiento[] }>(`http://192.168.210.176:3000/api/movimientos/cliente/${codigo}?years=${yearsParam}`);
  }
}
