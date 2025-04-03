import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule], // Importa RouterOutlet y RouterModule para usar <router-outlet> y [routerLink]
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss'] // Opcional, si quieres agregar estilos
})
export class AppComponent {}
