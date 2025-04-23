import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  // Estado de la barra lateral
  private sidebarOpenSubject = new BehaviorSubject<boolean>(false);
  sidebarOpen$ = this.sidebarOpenSubject.asObservable();

  private darkModeSubject = new BehaviorSubject<boolean>(false);
  darkMode$ = this.darkModeSubject.asObservable();

  // Nombre del cliente
  private clientNameSubject = new BehaviorSubject<string>(''); // Inicialmente vacío
  clientName$ = this.clientNameSubject.asObservable();

  toggleSidebar() {
    this.sidebarOpenSubject.next(!this.sidebarOpenSubject.value);
  }

  setSidebarState(isOpen: boolean) {
    this.sidebarOpenSubject.next(isOpen);
  }

  // Método para actualizar el nombre del cliente
  setClientName(clientName: string) {
    this.clientNameSubject.next(clientName);
  }

  // Método opcional para limpiar el nombre del cliente (por ejemplo, al salir de la vista de clientes)
  clearClientName() {
    this.clientNameSubject.next('');
  }

  toggleDarkMode() {
    this.darkModeSubject.next(!this.darkModeSubject.value);
  }

  setDarkMode(isDark: boolean) {
    this.darkModeSubject.next(isDark);
  }

}
