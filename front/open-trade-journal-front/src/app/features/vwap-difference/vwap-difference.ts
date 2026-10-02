import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

import { NgxEchartsDirective } from 'ngx-echarts';
import { MarketCandle, VwapDifferenceService } from './services/vwap-difference.service';
import { dateRangeValidator } from '../../shared/validators/date-range.validator';
import { logger } from '../../core/utils/logger';

interface VwapPoint {
  time: string;
  close: number;
  vwap: number;
  difference: number;
}

@Component({
  selector: 'app-vwap-difference',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, NgxEchartsDirective],
  templateUrl: './vwap-difference.html',
  styleUrls: ['./vwap-difference.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class VwapDifference implements OnInit {
  private readonly fb = inject(FormBuilder);

  readonly vwapForm = this.fb.nonNullable.group(
    {
      symbol: ['NVDA'],
      fromDate: ['2026-09-01'],
      toDate: ['2026-09-16'],
    },
    { validators: dateRangeValidator('fromDate', 'toDate') },
  );

  loading = signal(false);

  error: string | null = null;

  chartOptions: any = {};

  private readonly vwapService = inject(VwapDifferenceService);

  ngOnInit(): void {
    this.loadPeriod();
  }

  loadPeriod(): void {
    const { symbol, fromDate, toDate } = this.vwapForm.getRawValue();

    if (!symbol.trim()) {
      this.error = 'Please enter a symbol.';
      return;
    }

    if (!fromDate || !toDate) {
      this.error = 'Please select both dates.';
      return;
    }

    if (fromDate > toDate) {
      this.error = 'From date must be before To date.';
      return;
    }

    this.loading.set(true);
    this.error = null;

    this.vwapService.loadMarketCandles(symbol.trim().toUpperCase(), fromDate, toDate).subscribe({
      next: (candles) => {
        // Regular Trading Hours:
        // 09:30 <= time < 16:00 America/New_York
        const regularSessionCandles = candles.filter((candle) =>
          this.isRegularSession(candle.timestamp),
        );

        this.buildChart(regularSessionCandles);

        this.loading.set(false);
      },

      error: (error) => {
        logger.error(error);

        this.error = 'Unable to load market candles.';

        this.loading.set(false);
      },
    });
  }

  /**
   * Keep only US Regular Trading Hours.
   *
   * 09:30 - 16:00 America/New_York
   */
  private isRegularSession(timestamp: number): boolean {
    const date = new Date(timestamp);

    const parts = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).formatToParts(date);

    const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 0);

    const minute = Number(parts.find((part) => part.type === 'minute')?.value ?? 0);

    const minutesSinceMidnight = hour * 60 + minute;

    const sessionStart = 9 * 60 + 30;

    const sessionEnd = 16 * 60;

    return minutesSinceMidnight >= sessionStart && minutesSinceMidnight < sessionEnd;
  }

  private buildChart(candles: MarketCandle[]): void {
    const values: VwapPoint[] = candles
      .filter((candle) => candle.vwap !== null && candle.vwap !== undefined)
      .map((candle) => {
        const close = candle.close;
        const vwap = candle.vwap as number;
        return {
          time: this.formatDateTime(candle.timestamp),
          close,
          vwap,
          difference: close - vwap,
        };
      });

    this.chartOptions = {
      backgroundColor: 'transparent',

      legend: {
        show: true,
        data: ['Close - VWAP'],
        textStyle: { color: '#e8edf2' },
      },

      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        formatter: (params: any) => {
          const point = Array.isArray(params) ? params[0] : params;
          const value = Number(point?.value ?? 0);
          return `Difference: ${value.toFixed(4)}`;
        },
      },

      grid: {
        left: 50,
        right: 25,
        top: 50,
        bottom: 70,
        containLabel: true,
      },

      xAxis: {
        type: 'category',
        name: 'Time',
        nameLocation: 'middle',
        nameGap: 55,
        data: values.map((value) => value.time),
        axisLabel: {
          rotate: 45,
          color: '#9ba7b4',
        },
        axisLine: {
          lineStyle: { color: 'rgba(255,255,255,0.16)' },
        },
      },

      yAxis: {
        type: 'value',
        name: 'Close - VWAP',
        nameLocation: 'middle',
        nameGap: 40,
        axisLabel: { color: '#9ba7b4' },
        splitLine: {
          lineStyle: { color: 'rgba(255,255,255,0.08)' },
        },
      },

      series: [
        {
          name: 'Close - VWAP',
          type: 'bar',
          data: values.map((value) => ({
            value: value.difference,
            itemStyle: {
              color: value.difference >= 0 ? 'rgba(34, 197, 94, 0.65)' : 'rgba(239, 68, 68, 0.65)',
              borderColor: value.difference >= 0 ? 'rgb(34, 197, 94)' : 'rgb(239, 68, 68)',
              borderWidth: 1,
            },
          })),
        },
      ],
    };
  }

  private formatDateTime(timestamp: number): string {
    return new Date(timestamp).toLocaleString('en-US', {
      timeZone: 'America/New_York',

      month: '2-digit',
      day: '2-digit',

      hour: '2-digit',
      minute: '2-digit',

      hour12: false,
    });
  }
}
