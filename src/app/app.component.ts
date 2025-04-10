import { Component, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarService } from './sidebar.service';
import { MovimientosService } from './movimientosService.service';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isSidebarOpen = false;
  searchCodter: string = '';
  filteredCodters: string[] = [];
  allCodters: string[] = [];
  showSearch = false; // Controla la visibilidad del buscador
  private keyPressCount = 0; // Contador de pulsaciones
  private lastKeyPressTime = 0; // Timestamp de la última pulsación
  private readonly keyToTrigger = 'c'; // Tecla que activa el buscador (puedes cambiarla)
  private readonly requiredPresses = 5; // Número de pulsaciones necesarias
  private readonly timeWindow = 1000; // Ventana de tiempo en milisegundos (1 segundo)

  constructor(
    private sidebarService: SidebarService,
    private movimientosService: MovimientosService,
    private router: Router
  ) {
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isSidebarOpen = isOpen;
    });
    this.loadAllCodters();
  }

  // Escuchar eventos de teclado a nivel global
  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const currentTime = Date.now();

    // Verificar si la tecla presionada es la que queremos (por ejemplo, "c")
    if (event.key.toLowerCase() === this.keyToTrigger) {
      // Si ha pasado demasiado tiempo desde la última pulsación, reiniciar el contador
      if (currentTime - this.lastKeyPressTime > this.timeWindow) {
        this.keyPressCount = 0;
      }

      this.keyPressCount++;
      this.lastKeyPressTime = currentTime;

      // Si se alcanza el número requerido de pulsaciones y el sidebar está abierto, mostrar el buscador
      if (this.keyPressCount >= this.requiredPresses && this.isSidebarOpen) {
        this.showSearch = true;
        this.keyPressCount = 0; // Reiniciar para futuras activaciones
      }
    } else {
      // Si se presiona otra tecla, reiniciar el contador
      this.keyPressCount = 0;
    }
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
    if (!this.isSidebarOpen) {
      this.searchCodter = '';
      this.filteredCodters = [];
      this.showSearch = false; // Ocultar buscador al cerrar sidebar
    }
  }

  loadAllCodters() {
    this.movimientosService.getCodigoCliente().subscribe({
      next: (codters: any[]) => {
        const uniqueCodters = [...new Set(codters.map(codter => codter.CODTER || codter.codigo || codter))];
        this.allCodters = uniqueCodters;
        this.filteredCodters = [];
      },
      error: (error) => {
        console.error('Error al cargar codters:', error);
      }
    });
  }

  onSearchCodter() {
    if (!this.searchCodter) {
      this.filteredCodters = [];
      return;
    }

    this.filteredCodters = this.allCodters
      .filter(codter => codter.toLowerCase().includes(this.searchCodter.toLowerCase()))
      .slice(0, 10);
  }

  onCodterSelected(codter: string) {
    this.searchCodter = codter;
    this.filteredCodters = [];
    this.navigateToCliente(codter);
  }

  onEnterPressed(event: KeyboardEvent) {
    event.preventDefault();
    if (this.searchCodter) {
      const selectedCodter = this.filteredCodters.length > 0 ? this.filteredCodters[0] : this.searchCodter;
      this.searchCodter = selectedCodter;
      this.filteredCodters = [];
      this.navigateToCliente(selectedCodter);
    }
  }

  private navigateToCliente(codter: string) {
    this.router.navigate(['/clientes', codter]);
  }
}
