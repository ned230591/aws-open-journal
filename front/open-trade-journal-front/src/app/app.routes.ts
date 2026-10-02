import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';

export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
  {
    path: 'swing',
    canActivate: [authGuard],
    loadComponent: () => import('./features/swing-chart/swing-chart').then((m) => m.SwingChart),
  },
  {
    path: 'market-data',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/market-data-import/market-data-import').then((m) => m.MarketDataImport),
  },
  {
    path: 'chart',
    canActivate: [authGuard],
    loadComponent: () => import('./features/market-chart/market-chart').then((m) => m.MarketChart),
  },
  {
    path: 'playbook',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/playbooks/playbook-component/playbook').then((m) => m.Playbook),
  },

  {
    path: 'vwap',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/vwap-difference/vwap-difference').then((m) => m.VwapDifference),
  },
  {
    path: 'architecture',
    canActivate: [authGuard],
    loadComponent: () =>
      import('./features/architecture-guide/architecture-guide').then((m) => m.ArchitectureGuide),
  },
  {
    path: 'analysis',
    canActivate: [authGuard],
    loadComponent: () => import('./features/analysis/analysis').then((m) => m.Analysis),
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    loadComponent: () => import('./features/login/login').then((m) => m.Login),
  },
  {
    path: 'trace',
    canActivate: [authGuard],
    loadComponent: () => import('./features/trade-trace/trade-trace').then((m) => m.TradeTrace),
  },
  {
    path: 'import',
    canActivate: [authGuard],
    loadComponent: () => import('./features/csv-import/csv-import').then((m) => m.CsvImport),
  },
  {
    path: 'help',
    canActivate: [authGuard],
    loadComponent: () => import('./features/support/support').then((m) => m.Support),
  },
  {
    path: 'error',
    loadComponent: () => import('./features/error/error').then((m) => m.Error),
  },
  {
    path: '**',
    canActivate: [authGuard],
    loadComponent: () => import('./features/dashboard/dashboard').then((m) => m.Dashboard),
  },
];
