import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isSidebarOpen = false; // Estado inicial: cerrada, definido como propiedad de la clase

  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen; // Alterna el estado, usando 'this' para acceder a la propiedad
  }
}
