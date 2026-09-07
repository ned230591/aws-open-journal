import {Component, OnInit, inject, signal, computed} from '@angular/core';
import {CurrencyPipe, DatePipe, DecimalPipe} from '@angular/common';
import {MatDatepicker, MatDatepickerModule} from '@angular/material/datepicker';
import { MatIconModule } from '@angular/material/icon';
import { MatNativeDateModule } from '@angular/material/core';
import { TradesService } from '../../core/services/trades.service';
import { Trade } from '../../core/models/trade.model';
import { PnlPoint } from '../../core/models/pnl-point.model';

@Component({
  selector: 'app-trading-calendar',
  standalone: true,
  imports: [
    CurrencyPipe,
    DecimalPipe,
    MatIconModule,
    MatDatepickerModule,
    MatNativeDateModule
  ],

  templateUrl: './calendar.html',
  styleUrl: './calendar.scss'
})
export class Calendar implements OnInit {
  private readonly tradesService = inject(TradesService);
  readonly currentMonth = signal(new Date());
  readonly weeks = signal<CalendarDay[][]>([]);
  readonly isLoading = signal(false);
  readonly monthPnl = signal(0);
  readonly profitableDays = signal(0);
  readonly losingDays = signal(0);
  readonly monthTrades = signal<Trade[]>([]);
  readonly monthLabel = computed(() =>
    this.currentMonth().toLocaleDateString(
      'en-US',
      {
        month: 'long',
        year: 'numeric'
      }
    )
  );
  readonly bestTrade = computed(() => {
    const trades = this.monthTrades();
    const winningPnls = trades
        .map(trade => Number(trade.fifoPnlRealized))
        .filter(pnl => Number.isFinite(pnl) && pnl > 0);
    if (winningPnls.length === 0) {
      return 0;
    }
    return Math.max(
      ...winningPnls
    );
  });
  readonly worstTrade = computed(() => {
    const trades = this.monthTrades();
    const losingPnls = trades
        .map(trade => Number(trade.fifoPnlRealized))
        .filter(pnl => Number.isFinite(pnl) && pnl < 0);
    if (losingPnls.length === 0) {
      return 0;
    }
    return Math.min(
      ...losingPnls
    );
  });
  readonly totalWin = computed(() => {
    return this.monthTrades()
      .map(trade => Number(trade.fifoPnlRealized))
      .filter(pnl => Number.isFinite(pnl) && pnl > 0)
      .reduce((total, pnl) => total + pnl, 0);
  });
  readonly totalLoss = computed(() => {
    return this.monthTrades().map(trade => Number(trade.fifoPnlRealized))
      .filter(pnl => Number.isFinite(pnl) && pnl < 0)
      .reduce((total, pnl) => total + pnl, 0);
  });
  readonly winRate = computed(() => {
    const trades = this.monthTrades();
    const validTrades = trades.filter(trade => Number.isFinite(Number(trade.fifoPnlRealized)));
    if (validTrades.length === 0) {
      return 0;
    }
    const winningTrades = validTrades.filter(trade => Number(trade.fifoPnlRealized) > 0).length;
    return (winningTrades / validTrades.length) * 100;
  });
  readonly bestDay = computed(() => {
    const trades = this.monthTrades();
    const pnlByDate = this.calculateDailyPnl(trades);
    if (pnlByDate.length === 0) {
      return null;
    }
    const profitableDays = pnlByDate.filter(item => item.pnl > 0);
    if (profitableDays.length === 0) {
      return null;
    }
    return profitableDays.reduce((best, current) => current.pnl > best.pnl ? current : best);
  });
  readonly worstDay = computed(() => {
    const trades = this.monthTrades();
    const pnlByDate = this.calculateDailyPnl(trades);
    if (pnlByDate.length === 0) {
      return null;
    }
    const losingDays = pnlByDate.filter(item => item.pnl < 0);
    if (losingDays.length === 0) {
      return null;
    }
    return losingDays.reduce((worst, current) => current.pnl < worst.pnl ? current : worst);
  });
  readonly weekDays = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  ngOnInit(): void {
    this.loadMonth();
  }
  previousMonth(): void {
    const current = this.currentMonth();
    this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() - 1, 1));
    this.loadMonth();
  }
  nextMonth(): void {
    const current = this.currentMonth();this.currentMonth.set(new Date(current.getFullYear(), current.getMonth() + 1, 1));
    this.loadMonth();
  }
  selectMonth(date: Date, datepicker: MatDatepicker<Date>): void {
    this.currentMonth.set(new Date(date.getFullYear(), date.getMonth(), 1));
    datepicker.close();
    this.loadMonth();
  }

  private loadMonth(): void {
    const current = this.currentMonth();
    const year = current.getFullYear();
    const month = current.getMonth();
    this.isLoading.set(true);
    this.resetMonth();
    this.tradesService.getAllTradesForMonth(year, month)
      .subscribe({
        next: (trades: Trade[]) => {
          const safeTrades = Array.isArray(trades) ? trades : [];
          this.monthTrades.set(safeTrades);
          const pnlData = this.buildPnlData(safeTrades);
          this.buildCalendar(pnlData);
          this.isLoading.set(false);
        },
        error: (error) => {
          console.error('Failed to load calendar trades', error);
          this.resetMonth();
          this.isLoading.set(false);
        }
      });
  }

  private resetMonth(): void {
    this.monthTrades.set([]);
    this.weeks.set([]);
    this.monthPnl.set(0);
    this.profitableDays.set(0);
    this.losingDays.set(0);
  }
  private calculateDailyPnl(trades: Trade[]): PnlPoint[] {
    const pnlByDate = new Map<string, number>();
    for (const trade of trades) {
      if (!trade.tradeDate) {
        continue;
      }
      const date = trade.tradeDate.substring(0, 10);
      const pnl = Number(trade.fifoPnlRealized);
      if (!Number.isFinite(pnl)) {
        continue;
      }
      const currentPnl = pnlByDate.get(date) ?? 0;
      pnlByDate.set(date, currentPnl + pnl);
    }

    return Array.from(pnlByDate.entries())
      .map(([date, pnl]) => ({date, pnl}))
      .sort((a, b) => a.date.localeCompare(b.date));
  }
  private buildPnlData(trades: Trade[]): PnlPoint[] {
    return this.calculateDailyPnl(trades);
  }
  private buildCalendar(pnlData: PnlPoint[]): void {
    const pnlMap = new Map<string, PnlPoint>();
    for (const item of pnlData) {
      pnlMap.set(item.date, item);
    }
    const profitable = pnlData.filter(item => item.pnl > 0);
    const losing = pnlData.filter(item => item.pnl < 0);
    const bestDayPnl = profitable.length > 0 ? Math.max(...profitable.map(item => item.pnl)) : null;
    const worstDayPnl = losing.length > 0 ? Math.min(...losing.map(item => item.pnl)) : null;
    const bestDayDate = bestDayPnl !== null ? profitable.find(item => item.pnl === bestDayPnl)?.date ?? null : null;
    const worstDayDate = worstDayPnl !== null ? losing.find(item => item.pnl === worstDayPnl)?.date ?? null : null;
    const current = this.currentMonth();
    const year = current.getFullYear();
    const month = current.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7;
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const previousMonthDays = new Date(year, month, 0).getDate();
    const cells: CalendarDay[] = [];
    for (let i = startOffset - 1; i >= 0; i--) {
      const date = new Date(year, month - 1, previousMonthDays - i);
      cells.push(this.createCalendarDay(date, false, pnlMap, bestDayDate, worstDayDate));
    }
    for (let day = 1; day <= daysInMonth; day++) {
      const date = new Date(year, month, day);
      cells.push(this.createCalendarDay(date, true, pnlMap, bestDayDate, worstDayDate));
    }
    let nextDay = 1;
    while (cells.length % 7 !== 0) {
      const date = new Date(year, month + 1, nextDay++);
      cells.push(this.createCalendarDay(date, false, pnlMap, bestDayDate, worstDayDate));
    }
    const weeks: CalendarDay[][] = [];
    for (let i = 0; i < cells.length; i += 7) {
      weeks.push(cells.slice(i, i + 7));
    }
    this.weeks.set(weeks);
    this.calculateSummary(pnlData);
  }

  private createCalendarDay(
    date: Date,
    isCurrentMonth: boolean,
    pnlMap: Map<string, PnlPoint>,
    bestDayDate: string | null,
    worstDayDate: string | null
  ): CalendarDay {
    const dateKey = this.toDateKey(date);
    const data = pnlMap.get(dateKey);
    return {
      date, dateKey,
      dayNumber: date.getDate(),
      pnl: data?.pnl ?? null,
      isCurrentMonth,
      isToday: this.isToday(date),
      isBestDay: isCurrentMonth && dateKey === bestDayDate,
      isWorstDay: isCurrentMonth && dateKey === worstDayDate
    };
  }



  private calculateSummary(pnlData: PnlPoint[]): void {
    const totalPnl = pnlData.reduce((sum, item) => sum + Number(item.pnl), 0);
    this.monthPnl.set(totalPnl);
    this.profitableDays.set(pnlData.filter(item => item.pnl > 0).length);
    this.losingDays.set(pnlData.filter(item => item.pnl < 0).length);
  }
  private toDateKey(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }
  private isToday(date: Date): boolean {
    const today = new Date();
    return (date.getFullYear() === today.getFullYear() && date.getMonth() === today.getMonth() && date.getDate() === today.getDate());
  }
}



