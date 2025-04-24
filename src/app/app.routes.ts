import { Routes } from '@angular/router';
import { InvoicesListComponent } from './invoices-list/invoices-list.component';
import { InvoiceFormComponent } from './invoice-form/invoice-form.component';
import { ClientesComponent } from './clientes/clientes.component';
import { DashboardComponent } from './dashboard/dashboard.component';
import { PedidosComponent } from './pedidos/pedidos.component';

export const routes: Routes = [
  { path: '', redirectTo: '/invoices', pathMatch: 'full' },
  { path: 'invoices', component: InvoicesListComponent },
  { path: 'invoices-invoice', component: InvoiceFormComponent },
  { path: 'dashboard', component: DashboardComponent },
  // { path: ':dbfPath/:clientName', component: ClientesComponent }, // Ruta para clientes
  { path: 'clientes/:dbfPath/:clientName', component: ClientesComponent }, // Ruta para clientes
  { path: 'pedidos/:dbfPath/:clientName', component: PedidosComponent }  // Ruta para pedidos
  // { path: 'pedidos', component: PedidosComponent }  // Ruta para pedidos
];
