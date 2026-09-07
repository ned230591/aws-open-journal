import {ChangeDetectionStrategy, Component, OnInit, signal, computed} from '@angular/core';
import { MatTooltip } from '@angular/material/tooltip';
import { PnlPoint } from '../../core/models/pnl-point.model';
import { TradesService } from '../../core/services/trades.service';
import {DecimalPipe} from '@angular/common';


@Component({
  selector: 'app-trading-activity',
  standalone: true,
  imports: [
    MatTooltip,
    DecimalPipe
  ],
  templateUrl: './trading-activity.html',
  styleUrl: './trading-activity.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TradingActivity implements OnInit {
  months: MonthActivity[] = [];
  selectedYear = new Date().getFullYear();
  loading = signal(false);
  readonly totalTrades = signal(0);
  readonly tradedDays = signal(0);
  readonly nonTradedDays = signal(0);
  readonly greenDays = signal(0);
  readonly redDays = signal(0);
  readonly zeroDays = signal(0);

  readonly greenDayRate = computed(() => {
    const traded = this.tradedDays();
    if (traded === 0) {
      return 0;
    }
    return (this.greenDays()/traded  ) * 100;
  });


  ngOnInit(): void {
    this.loadYear(this.selectedYear);
  }

  previousYear(): void {
    if (this.loading()) {
      return;
    }
    this.loadYear( this.selectedYear - 1 );
  }

  nextYear(): void {
    if (this.loading()) {
      return;
    }
    this.loadYear(  this.selectedYear + 1);
  }


  private loadYear(  year: number ): void {
    this.loading.set(true);
    this.resetSummary();
    this.months = [];
    this.tradingService .getTradingActivity(year) .subscribe({
        next: (data: PnlPoint[]) => {
          this.selectedYear = year;
          this.generateActivity(data ?? []);
          this.calculateYearSummary(data ?? []);
          this.loading.set(false);
        },
        error: (error) => {
          console.error(  'Failed to load trading activity',    error);
          this.months = [];
          this.resetSummary();
          this.loading.set(false);
        }
      });
  }

  private generateActivity(pnlHistory: PnlPoint[]): void {
    this.months = [];
    const pnlMap = new Map<string, number>();

    for (const item of pnlHistory ?? []) {
      if (!item?.date) {
        continue;
      }
      const date = item.date.substring(0, 10);
      const pnl = Number(item.pnl ?? 0);
      const current = pnlMap.get(date) ?? 0;
      pnlMap.set(date, current + pnl);
    }

    for (let month = 0; month < 12; month++) {
      const numberOfDays = new Date(this.selectedYear, month + 1, 0).getDate();
      const days: TradingDay[] = [];
      for (let day = 1; day <= numberOfDays; day++) {
        const date = new Date(this.selectedYear, month, day);
        const dateString = this.formatDate(date);
        const traded = pnlMap.has(dateString);
        const pnl = pnlMap.get(dateString) ?? 0;
        const status: 'no-trade' | 'profit' | 'loss' | 'zero' =
          !traded ? 'no-trade' : pnl > 0 ? 'profit' : pnl < 0 ? 'loss' : 'zero';
        days.push({date: dateString, pnl, traded, status,
          tooltip:
            this.buildTooltip(dateString, traded, pnl)
        });
      }
      this.months.push({name: new Date(this.selectedYear, month, 1).toLocaleString('en-US', {month: 'short'}), days});
    }
  }
  private calculateYearSummary(pnlHistory: PnlPoint[]): void {
    const pnlMap = new Map<string, number>();
    for (const item of pnlHistory ?? []) {
      if (!item?.date) {
        continue;
      }
      const date = item.date.substring(0, 10);
      const pnl = Number(item.pnl ?? 0);
      const current = pnlMap.get(date) ?? 0;
      pnlMap.set(date, current + pnl);
    }


    // -------------------------------------------------------
    // Calculate summary from ALL days
    // -------------------------------------------------------

    let tradedDays = 0;
    let greenDays = 0;
    let redDays = 0;
    let zeroDays = 0;


    for (
      const pnl of pnlMap.values()
      ) {

      tradedDays++;


      if (pnl > 0) {

        greenDays++;

      } else if (pnl < 0) {

        redDays++;

      } else {

        zeroDays++;
      }
    }


    // -------------------------------------------------------
    // Calculate number of calendar days
    // -------------------------------------------------------

    const totalDays =
      this.isLeapYear(
        this.selectedYear
      )
        ? 366
        : 365;


    const nonTradedDays =
      Math.max(
        totalDays - tradedDays,
        0
      );


    // -------------------------------------------------------
    // Update signals
    // -------------------------------------------------------

    this.totalTrades.set(
      tradedDays
    );

    this.tradedDays.set(
      tradedDays
    );

    this.nonTradedDays.set(
      nonTradedDays
    );

    this.greenDays.set(
      greenDays
    );

    this.redDays.set(
      redDays
    );

    this.zeroDays.set(
      zeroDays
    );
  }
  private resetSummary(): void {
    this.totalTrades.set(0);
    this.tradedDays.set(0);
    this.nonTradedDays.set(0);
    this.greenDays.set(0);
    this.redDays.set(0);
    this.zeroDays.set(0);
  }
  private buildTooltip(dateString: string, traded: boolean, pnl: number): string {
    const date = this.formatTooltipDate(dateString);
    if (!traded) {
      return `${date} : No trades`;
    }
    if (pnl > 0) {
      return `${date} : +$${pnl.toFixed(2)}`;
    }
    if (pnl < 0) {
      return `${date} : -$${Math.abs(pnl).toFixed(2)}`;
    }
    return `${date} : $0.00`;
  }
  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  private parseDate(date: string): Date {
    return new Date(`${date}T00:00:00`);
  }
  private formatTooltipDate(date: string): string {
    return this
      .parseDate(date)
      .toLocaleDateString(
        'en-US',
        {
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        }
      );
  }
  private isLeapYear(year: number): boolean {
    return (
      year % 4 === 0 &&
      (
        year % 100 !== 0 ||
        year % 400 === 0
      )
    );
  }
  constructor(
    private readonly tradingService: TradesService
  ) {}
}
