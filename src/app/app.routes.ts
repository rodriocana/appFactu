import { Routes } from '@angular/router';
import { InvoicesListComponent } from './invoices-list/invoices-list.component';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { ClientesComponent } from './clientes/clientes.component';

export const routes: Routes = [
  { path: '', redirectTo: '/invoices', pathMatch: 'full' },
  { path: 'invoices', component: InvoicesListComponent },
  { path: 'create-invoice', component: InvoiceFormComponent },
  { path: 'dashboard', component: DashboardComponent },
  // { path: 'clientes', component: ClientesComponent }
  { path: 'clientes/:codigo', component: ClientesComponent },


];
