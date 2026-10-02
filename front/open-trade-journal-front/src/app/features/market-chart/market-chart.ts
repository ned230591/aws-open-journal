import * as echarts from 'echarts';

import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  OnInit,
  ViewChild,
  inject,
  signal,
} from '@angular/core';

import { FormsModule } from '@angular/forms';
import { MarketCandle, MarketDataService } from './services/market-data.service';
import { logger } from '../../core/utils/logger';

@Component({
  selector: 'app-market-chart',
  standalone: true,
  imports: [FormsModule],
  templateUrl: './market-chart.html',
  styleUrls: ['./market-chart.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketChart implements OnInit, OnDestroy {
  @ViewChild('chartContainer', { static: true })
  chartContainer!: ElementRef<HTMLDivElement>;

  private chart!: echarts.ECharts;

  private resizeObserver!: ResizeObserver;

  candles: MarketCandle[] = [];

  selectedDate = '';

  /*
   * True while the initial market-data request
   * is running.
   */
  loadingCandles = signal(true);

  /*
   * True while loading candles for a selected date.
   */
  loadingDate = signal(false);

  /*
   * Boundaries for the native HTML date picker.
   */
  minDate = '';
  maxDate = '';

  private readonly SYMBOL = 'NVDA';

  private readonly marketDataService = inject(MarketDataService);

  // ============================================================
  // LIFECYCLE
  // ============================================================

  ngOnInit(): void {
    this.createChart();
    this.loadInitialCandles();
  }

  ngOnDestroy(): void {
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
    }

    if (this.chart) {
      this.chart.dispose();
    }
  }

  // ============================================================
  // CREATE CHART
  // ============================================================

  private createChart(): void {
    this.chart = echarts.init(this.chartContainer.nativeElement);

    this.chart.setOption({
      backgroundColor: '#0f172a',

      grid: {
        left: 60,
        right: 25,
        top: 20,
        bottom: 70,
        containLabel: true,
      },

      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'cross' },
        backgroundColor: '#111827',
        borderColor: '#334155',
        textStyle: { color: '#cbd5e1' },
      },

      xAxis: {
        type: 'category',
        data: [],
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1' },
        splitLine: { show: false },
      },

      yAxis: {
        type: 'value',
        scale: true,
        axisLine: { lineStyle: { color: '#334155' } },
        axisLabel: { color: '#cbd5e1' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },

      dataZoom: [
        { type: 'inside', xAxisIndex: 0 },
        { type: 'slider', xAxisIndex: 0, bottom: 10 },
      ],

      series: [
        {
          name: this.SYMBOL,
          type: 'candlestick',
          data: [],
          itemStyle: {
            color: '#22c55e',
            color0: '#ef4444',
            borderColor: '#22c55e',
            borderColor0: '#ef4444',
          },
        },
      ],
    });

    this.resizeObserver = new ResizeObserver(() => {
      if (!this.chart) {
        return;
      }

      this.chart.resize();
    });

    this.resizeObserver.observe(this.chartContainer.nativeElement);
  }

  // ============================================================
  // LOAD INITIAL CANDLES
  // ============================================================

  private loadInitialCandles(): void {
    /*
     * Load the complete period currently stored
     * in PostgreSQL.
     */
    const from = new Date('2025-01-01T00:00:00Z').getTime();

    const to = new Date('2026-12-31T23:59:59Z').getTime();

    this.loadingCandles.set(true);

    this.marketDataService.getCandles(this.SYMBOL, from, to).subscribe({
      next: (candles) => {
        if (!candles || candles.length === 0) {
          logger.warn('No candles returned');

          this.loadingCandles.set(false);

          return;
        }

        this.candles = [...candles].sort((a, b) => a.timestamp - b.timestamp);

        /*
         * Calculate the actual first and last
         * available trading dates.
         */
        this.updateDatePickerRange();

        /*
         * Default to the last available date.
         */
        this.selectedDate = this.maxDate;

        /*
         * Push candles into the chart.
         */
        this.setChartData();

        /*
         * Initially display the complete dataset.
         */
        this.chart.dispatchAction({
          type: 'dataZoom',
          start: 0,
          end: 100,
        });

        /*
         * Important:
         * Hide "Loading market data..." and show
         * the date picker only after everything
         * has been initialized.
         */
        this.loadingCandles.set(false);
      },

      error: (error) => {
        logger.error('Failed to load market candles:', error);

        this.loadingCandles.set(false);
      },
    });
  }

  // ============================================================
  // SET CHART DATA
  // ============================================================

  private setChartData(): void {
    const categories = this.candles.map((candle) => this.formatCandleLabel(candle.timestamp));

    const data = this.candles.map((candle) => [candle.open, candle.close, candle.low, candle.high]);

    this.chart.setOption({
      xAxis: {
        data: categories,
      },
      series: [
        {
          data,
        },
      ],
    });
  }

  private formatCandleLabel(timestamp: number): string {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    })
      .format(new Date(timestamp))
      .replace(',', '');
  }

  // ============================================================
  // GO TO DATE
  // ============================================================

  goToDate(): void {
    if (!this.selectedDate) {
      return;
    }

    if (this.loadingDate()) {
      return;
    }

    /*
     * Protect against manually entered dates
     * outside the available range.
     */
    if (this.minDate && this.selectedDate < this.minDate) {
      logger.warn('Selected date is before available data');

      return;
    }

    if (this.maxDate && this.selectedDate > this.maxDate) {
      logger.warn('Selected date is after available data');

      return;
    }

    const date = this.selectedDate;

    const range = this.getNewYorkDayRange(date);

    /*
     * Check whether this date is already
     * available in memory.
     */
    const existingCandles = this.candles.filter(
      (candle) => candle.timestamp >= range.from && candle.timestamp < range.to,
    );

    if (existingCandles.length > 0) {
      this.showCandlesForDay(existingCandles);

      return;
    }

    /*
     * Date is not currently loaded.
     */
    this.loadDate(date, range.from, range.to);
  }

  // ============================================================
  // LOAD SPECIFIC DATE
  // ============================================================

  private loadDate(date: string, from: number, to: number): void {
    this.loadingDate.set(true);

    this.marketDataService.getCandles(this.SYMBOL, from, to).subscribe({
      next: (candles) => {
        this.loadingDate.set(false);

        if (!candles || candles.length === 0) {
          logger.warn(`No market data found for ${date}`);

          return;
        }

        /*
         * Add new candles to the existing dataset.
         */
        this.mergeCandles(candles);

        /*
         * Recalculate the date picker boundaries.
         */
        this.updateDatePickerRange();

        const dayCandles = this.candles.filter(
          (candle) => candle.timestamp >= from && candle.timestamp < to,
        );

        this.showCandlesForDay(dayCandles);
      },

      error: (error) => {
        this.loadingDate.set(false);

        logger.error(`Failed to load ${date}:`, error);
      },
    });
  }

  // ============================================================
  // SHOW DAY
  // ============================================================

  private showCandlesForDay(candles: MarketCandle[]): void {
    if (!candles || candles.length === 0) {
      return;
    }

    /*
     * Make sure candles are chronological.
     */
    const sortedCandles = [...candles].sort((a, b) => a.timestamp - b.timestamp);

    const first = sortedCandles[0];

    const last = sortedCandles[sortedCandles.length - 1];

    const firstIndex = this.candles.findIndex((candle) => candle.timestamp === first.timestamp);

    const lastIndex = this.candles.findIndex((candle) => candle.timestamp === last.timestamp);

    if (firstIndex === -1 || lastIndex === -1) {
      return;
    }

    this.chart.dispatchAction({
      type: 'dataZoom',
      startValue: firstIndex,
      endValue: lastIndex,
    });
  }

  // ============================================================
  // MERGE CANDLES
  // ============================================================

  private mergeCandles(newCandles: MarketCandle[]): void {
    const map = new Map<number, MarketCandle>();

    /*
     * Existing candles.
     */
    for (const candle of this.candles) {
      map.set(candle.timestamp, candle);
    }

    /*
     * New candles.
     */
    for (const candle of newCandles) {
      map.set(candle.timestamp, candle);
    }

    /*
     * Rebuild sorted dataset.
     */
    this.candles = Array.from(map.values()).sort((a, b) => a.timestamp - b.timestamp);

    this.setChartData();
  }

  // ============================================================
  // UPDATE DATE PICKER RANGE
  // ============================================================

  private updateDatePickerRange(): void {
    if (this.candles.length === 0) {
      this.minDate = '';
      this.maxDate = '';

      return;
    }

    this.minDate = this.formatDateForPicker(this.candles[0].timestamp);

    this.maxDate = this.formatDateForPicker(this.candles[this.candles.length - 1].timestamp);
  }

  // ============================================================
  // FORMAT DATE FOR DATE PICKER
  // ============================================================

  private formatDateForPicker(timestamp: number): string {
    /*
     * Convert timestamp to the US Eastern
     * calendar date.
     */
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: 'America/New_York',

      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(new Date(timestamp));
  }

  // ============================================================
  // NEW YORK DAY RANGE
  // ============================================================

  private getNewYorkDayRange(date: string): {
    from: number;
    to: number;
  } {
    const from = this.newYorkDateToUtc(date, '00:00:00');

    const nextDate = this.addOneDay(date);

    const to = this.newYorkDateToUtc(nextDate, '00:00:00');

    return {
      from,
      to,
    };
  }

  // ============================================================
  // NEW YORK DATE → UTC
  // ============================================================

  private newYorkDateToUtc(date: string, time: string): number {
    const [year, month, day] = date.split('-').map(Number);

    const [hours, minutes, seconds] = time.split(':').map(Number);

    /*
     * Initial UTC guess.
     */
    const utcGuess = Date.UTC(year, month - 1, day, hours, minutes, seconds);

    /*
     * Determine the corresponding
     * New York wall-clock time.
     */
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',

      year: 'numeric',
      month: '2-digit',
      day: '2-digit',

      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',

      hourCycle: 'h23',
    });

    const parts = formatter.formatToParts(new Date(utcGuess));

    const values: Record<string, number> = {};

    for (const part of parts) {
      if (part.type !== 'literal') {
        values[part.type] = Number(part.value);
      }
    }

    const nyAsUtc = Date.UTC(
      values['year'],
      values['month'] - 1,
      values['day'],
      values['hour'],
      values['minute'],
      values['second'],
    );

    /*
     * Calculate the actual New York UTC offset.
     *
     * This handles EST/EDT automatically.
     */
    const offset = nyAsUtc - utcGuess;

    return utcGuess - offset;
  }

  // ============================================================
  // ADD ONE DAY
  // ============================================================

  private addOneDay(date: string): string {
    const d = new Date(`${date}T12:00:00Z`);

    d.setUTCDate(d.getUTCDate() + 1);

    return d.toISOString().slice(0, 10);
  }
}
