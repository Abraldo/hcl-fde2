import { Routes } from '@angular/router';
import { adminGuard, authGuard, guestGuard } from './route.guards';

export const routes: Routes = [
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./pages/login.component').then((module) => module.LoginComponent),
  },
  {
    path: '',
    canActivate: [authGuard],
    loadComponent: () => import('./shell.component').then((module) => module.ShellComponent),
    children: [
      { path: '', pathMatch: 'full', redirectTo: 'dashboard' },
      {
        path: 'dashboard',
        loadComponent: () => import('./pages/dashboard.component').then((module) => module.DashboardComponent),
      },
      {
        path: 'configuration',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/configuration.component').then((module) => module.ConfigurationComponent),
      },
      {
        path: 'admin',
        canActivate: [adminGuard],
        loadComponent: () => import('./pages/admin.component').then((module) => module.AdminComponent),
      },
    ],
  },
  { path: '**', redirectTo: '' },
];
