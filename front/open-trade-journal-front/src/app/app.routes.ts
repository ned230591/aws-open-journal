import { Routes } from '@angular/router';
import {CsvImport } from './features/csv-import/csv-import' ;
import {Dashboard} from './features/dashboard/dashboard';
import {Analysis} from './features/analysis/analysis';
import {Login}  from './features/login/login';
import {Error}  from './features/error/error';
import { authGuard } from './guards/auth.guard';
import { guestGuard } from './guards/guest.guard';
import {Support} from './features/support/support';
import {TradeTrace} from './features/trade-trace/trade-trace';
import {ArchitectureGuide} from './features/architecture-guide/architecture-guide';

export const routes: Routes = [
  {
    path: 'dashboard',
    canActivate: [authGuard],
    component: Dashboard
  },
  {
    path: 'architecture',
    canActivate: [authGuard],
    component: ArchitectureGuide
  },
  {
    path: 'analysis',
    canActivate: [authGuard],
    component: Analysis
  },
  {
    path: 'login',
    canActivate: [guestGuard],
    component: Login
  },
  {
    path: 'trace',
    canActivate: [authGuard],
    component: TradeTrace
  },
  {
    path: 'import',
    canActivate: [authGuard],
    component: CsvImport
  },
  {
    path: 'help',
    canActivate: [authGuard],
    component: Support
  },
  {
    path: 'error',
    component: Error
  },
  {
    path: '**',
    canActivate: [authGuard],
    component: Dashboard
  }


];
