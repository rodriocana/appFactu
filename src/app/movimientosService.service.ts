import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Movimiento } from './models/movimiento.model';

@Injectable({
  providedIn: 'root'
})
export class MovimientosService {
  private apiUrl = 'http://192.168.210.176:3000/api/movimientos'; // Ajusta la URL según tu configuración

  constructor(private http: HttpClient) {}

  getMovimientos(year: number): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.apiUrl}?year=${year}`);
  }
}
