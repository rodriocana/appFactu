import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class SidebarService {
  private sidebarOpenSubject = new BehaviorSubject<boolean>(false);
  sidebarOpen$ = this.sidebarOpenSubject.asObservable();

  toggleSidebar() {
    this.sidebarOpenSubject.next(!this.sidebarOpenSubject.value);
  }

  setSidebarState(isOpen: boolean) {
    this.sidebarOpenSubject.next(isOpen);
  }
}
