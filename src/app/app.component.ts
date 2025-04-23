import { Component, OnInit, OnDestroy, HostListener } from '@angular/core';
import { RouterOutlet, RouterModule, Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { SidebarService } from './sidebar.service';
import { MovimientosService } from './movimientosService.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule, FormsModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {

  isSidebarOpen = false;
  searchCodter: string = '';
  filteredCodters: string[] = [];
  allCodters: string[] = [];
  showSearch = false;
  clientName: string = ''; // Nueva propiedad para el nombre del cliente
  private keyPressCount = 0;
  private lastKeyPressTime = 0;
  private readonly keyToTrigger = 'c';
  private readonly requiredPresses = 5;
  private readonly timeWindow = 1000;
  private subscriptions = new Subscription(); // Agrupar todas las suscripciones
  isDarkMode = false; // Agregada propiedad para modo oscuro

  constructor(
    private sidebarService: SidebarService,
    private movimientosService: MovimientosService,
    private router: Router
  ) {}

  ngOnInit() {
    // Suscripción al estado de la barra lateral
    this.subscriptions.add(
      this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
        this.isSidebarOpen = isOpen;
      })
    );

    // Suscripción al nombre del cliente
    this.subscriptions.add(
      this.sidebarService.clientName$.subscribe((name) => {
        this.clientName = name;
      })
    );

    // Cargar los codters
    this.loadAllCodters();
  }

  ngOnDestroy() {
    // Desuscribir todas las suscripciones
    this.subscriptions.unsubscribe();
  }

  @HostListener('document:keydown', ['$event'])
  handleKeyboardEvent(event: KeyboardEvent) {
    const currentTime = Date.now();

    if (event.key.toLowerCase() === this.keyToTrigger) {
      if (currentTime - this.lastKeyPressTime > this.timeWindow) {
        this.keyPressCount = 0;
      }

      this.keyPressCount++;
      this.lastKeyPressTime = currentTime;

      if (this.keyPressCount >= this.requiredPresses && this.isSidebarOpen) {
        this.showSearch = true;
        this.keyPressCount = 0;
      }
    } else {
      this.keyPressCount = 0;
    }
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
    if (!this.isSidebarOpen) {
      this.searchCodter = '';
      this.filteredCodters = [];
      this.showSearch = false;
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

  switchmode() {
    this.isDarkMode = !this.isDarkMode;
    this.sidebarService.setDarkMode(this.isDarkMode);

    if (this.isDarkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }
  }
}
