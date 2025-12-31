import { Routes } from '@angular/router';
import { LayoutComponent } from './pages/layout/layout.component';
import { NotfoundComponent } from './pages/notfound/notfound.component';
import { DashboardComponent } from './pages/dashboard/dashboard.component';
import { ProductsComponent } from './pages/products/products.component';
import { OrdersComponent } from './pages/orders/orders.component';
import { AddUserComponent } from './pages/users/add-user.component';
import { SettingsComponent } from './pages/settings/settings.component';
import { CategoriesComponent } from './pages/categories/categories.component';
import { LoginComponent } from './pages/login/login.component';

export const appRoutes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: '', component: LayoutComponent,
    children: [
      { path: 'dashboard', component: DashboardComponent},
      { path: 'products', component: ProductsComponent},
      { path: 'orders', component: OrdersComponent},
      { path: 'users',component: AddUserComponent},
      { path: 'settings', component:SettingsComponent},
      { path: 'categories', component:CategoriesComponent},
    ],
  },
  { path: 'login',component:LoginComponent},
  { path: '**', component: NotfoundComponent},
];
