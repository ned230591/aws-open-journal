import { ChangeDetectionStrategy, Component, computed, inject } from '@angular/core';
import { TradesService } from '../../core/services/trades.service';
import { Histogram } from '../histogram/histogram';
import { StockRanking } from '../stock-ranking/stock-ranking';
import { Filter } from '../filter/filter';
import { CookieService } from '../../core/services/cookie.service';
import {
  DASHBOARD_FILTER_COOKIE,
  DashboardFilterCookie,
} from '../../core/models/dashboard-filter.model';
import { PageHeader } from '../../shared/page-header/page-header';
@Component({
  selector: 'app-history',
  standalone: true,
  imports: [Histogram, StockRanking, Filter, PageHeader],
  templateUrl: './analysis.html',
  styleUrl: './analysis.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Analysis {
  cookieService = inject(CookieService);
  private readonly dashboardService = inject(TradesService);
  stats = this.dashboardService.stats;
  readonly error = this.dashboardService.error;

  get periodLabelFromCookie(): string {
    return (
      this.cookieService.getJson<DashboardFilterCookie>(DASHBOARD_FILTER_COOKIE)?.periodLabel ?? ''
    );
  }
}
