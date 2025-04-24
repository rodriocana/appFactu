import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Movimiento } from './models/movimiento.model';

@Injectable({
  providedIn: 'root'
})
export class FacfecMovimientosService {
  private apiUrl = 'http://192.168.210.176:3000/api'; // Ajustado al puerto del nuevo servidor

  constructor(private http: HttpClient) {}

  getMovimientosByFacfec(year: number, nomfich: string): Observable<Movimiento[]> {
    return this.http.get<Movimiento[]>(`${this.apiUrl}/movimientos-facfec?year=${year}&nomfich=${nomfich}`);
  }

  getCodigoCliente(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/codigoCliente`);
  }


}
