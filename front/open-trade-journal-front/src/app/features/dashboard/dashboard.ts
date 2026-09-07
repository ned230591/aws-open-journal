import { Component, inject } from '@angular/core';
import { Chart } from '../chart/chart';
import { TradingActivity } from '../trading-activity/trading-activity';
import { TradesService } from '../../core/services/trades.service';
import { KeyPerformanceIndicators } from '../key-performance-indicators/key-performance-indicators';
import {Filter} from '../filter/filter';
import {CookieService} from '../../core/services/cookie.service';
@Component({
  selector: 'app-dashbord',
  standalone: true,

  imports: [
    Chart,
    KeyPerformanceIndicators,
    Filter
  ],

  templateUrl: './dashboard.html',
  styleUrl: './dashboard.scss',
})
export class Dashboard  {
  cookieService=inject(CookieService) ;
  private readonly dashboardService =
    inject(TradesService);

  // Shared state from DashboardService
   stats = this.dashboardService.stats;
  readonly isLoading = this.dashboardService.isLoading;
  readonly error = this.dashboardService.error;


  get hasTrades(): boolean {
    const data = this.stats();
    if (!data) {
      return false;
    }



    const hasPnlHistory =
      (data.pnlHistory?.length ?? 0) > 0;

    return  hasPnlHistory;
  }


  get periodLabelFromCookie(): string {
    return this.cookieService.getCookie('dashboardPeriodLabel') ?? '';
  }



}
