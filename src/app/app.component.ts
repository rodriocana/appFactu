import { Component } from '@angular/core';
import { RouterOutlet, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { SidebarService } from './sidebar.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent {
  isSidebarOpen = false;

  constructor(private sidebarService: SidebarService) {
    this.sidebarService.sidebarOpen$.subscribe((isOpen) => {
      this.isSidebarOpen = isOpen;
    });
  }

  toggleSidebar() {
    this.sidebarService.toggleSidebar();
  }
}
