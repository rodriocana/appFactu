import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable({
  providedIn: 'root'
})
export class ServicioPythonService {
  // URL del endpoint en tu backend
  private apiUrl = 'http://192.168.210.176:3000/api/procesar-dbf';

  constructor(private http: HttpClient) {}

  /**
   * Inicia el proceso del script de Python enviando una solicitud al backend.
   * @returns Observable con la respuesta del backend (éxito o error).
   */
  procesarDbf(): Observable<any> {
    return this.http.post(this.apiUrl, {}).pipe(
      catchError(this.handleError) // Manejo de errores
    );
  }

  /**
   * Maneja los errores de las solicitudes HTTP.
   * @param error Error recibido de la solicitud HTTP.
   * @returns Observable con el mensaje de error.
   */
  private handleError(error: HttpErrorResponse): Observable<never> {
    let errorMessage = 'Ocurrió un error desconocido';
    if (error.error instanceof ErrorEvent) {
      // Error del lado del cliente
      errorMessage = `Error: ${error.error.message}`;
    } else {
      // Error del lado del servidor
      errorMessage = `Código: ${error.status}, Mensaje: ${error.error.error || error.message}`;
    }
    console.error(errorMessage);
    return throwError(() => new Error(errorMessage));
  }
}
