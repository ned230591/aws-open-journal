import { Component, computed, inject } from '@angular/core';
import { TradesService} from '../../core/services/trades.service';
import {Histogram} from '../histogram/histogram';
import {StockRanking} from '../stock-ranking/stock-ranking';
import {Filter} from '../filter/filter';
import {CookieService} from '../../core/services/cookie.service';
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [
    Histogram,
    StockRanking,
    Filter
  ],
  templateUrl: './analysis.html',
  styleUrl: './analysis.css',
})
export class Analysis {

  cookieService=inject(CookieService) ;
  private readonly dashboardService = inject(TradesService);
  stats = this.dashboardService.stats;
  readonly error = this.dashboardService.error;

  get periodLabelFromCookie(): string {
    return this.cookieService.getCookie('dashboardPeriodLabel') ?? '';
  }


}
