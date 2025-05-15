import { Routes } from '@angular/router';
import { LayoutComponent } from './pages/layout/layout.component';

export const appRoutes: Routes = [
  {
    path: '',
    component: LayoutComponent,
    children: [
      {
        path: 'dashboard',
        loadComponent: () =>
          import('./pages/dashboard/dashboard.component').then(
            (m) => m.DashboardComponent
          ),
      },
      {
        path: 'orders',
        loadComponent: () =>
          import('./pages/orders/orders.component').then(
            (m) => m.OrdersComponent
          ),
      },
      {
        path: 'customers',
        loadComponent: () =>
          import('./pages/customers/customers.component').then(
            (m) => m.CustomersComponent
          ),
      },
      {
        path: 'products',
        loadComponent: () =>
          import('./pages/products/products.component').then(
            (m) => m.ProductsComponent
          ),
      },
      {
        path: 'settings',
        loadComponent: () =>
          import('./pages/settings/settings.component').then(
            (m) => m.SettingsComponent
          ),
      },
      { path: '', redirectTo: 'dashboard', pathMatch: 'full' },
    ],
  },
  {
    path: 'login',
    loadComponent: () =>
      import('./pages/login/login.component').then((m) => m.LoginComponent),
  },
];
