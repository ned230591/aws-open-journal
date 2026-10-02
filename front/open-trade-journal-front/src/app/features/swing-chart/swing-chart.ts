import {
  AfterViewInit,
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  inject,
  signal,
} from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import * as echarts from 'echarts';
import type { EChartsOption } from 'echarts';
import { SwingService } from './services/swing.service';
import {
  DailySwingData,
  ChartPoint,
  PeriodSwing,
  SwingLeg,
  ShiftVerification,
} from './models/swing.models';
import { dateRangeValidator } from '../../shared/validators/date-range.validator';
import { formatDateKey, parseDateKey } from '../../core/utils/date-utils';
import { CoveragePeriod } from '../../core/models/coverage-period.model';
import { logger } from '../../core/utils/logger';
import { SwingStatsPanel } from './swing-stats-panel/swing-stats-panel';

@Component({
  selector: 'app-swing-chart',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    SwingStatsPanel,
    MatTooltip,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
    RouterLink,
  ],
  templateUrl: './swing-chart.html',
  styleUrl: './swing-chart.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwingChart implements AfterViewInit, OnDestroy {
  @ViewChild('chart', { static: true })
  chartElement!: ElementRef<HTMLDivElement>;
  private readonly swingService = inject(SwingService);
  private readonly fb = inject(FormBuilder);
  private chart!: echarts.ECharts;
  private resizeObserver?: ResizeObserver;
  days: DailySwingData[] = [];

  readonly swingForm = this.fb.nonNullable.group(
    {
      symbol: ['NVDA'],
      fromDate: [parseDateKey('2026-09-10')],
      toDate: [parseDateKey('2026-09-21')],
    },
    { validators: dateRangeValidator('fromDate', 'toDate') },
  );

  loading = signal(false);
  errorMessage = '';

  readonly datasetCoverage = signal<CoveragePeriod[]>([]);
  coverageLoading = signal(false);

  /** Bound to [matDatepickerFilter] — only dates covered by a saved daily dataset are pickable. */
  readonly isDateInCoverage = (date: Date | null): boolean => {
    if (!date) {
      return false;
    }
    const key = formatDateKey(date);
    return this.datasetCoverage().some((period) => key >= period.from && key <= period.to);
  };
  private readonly DAY_WIDTH = 800;
  private readonly DAY_GAP = 80;
  private readonly DAY_STEP = this.DAY_WIDTH + this.DAY_GAP;
  private readonly SESSION_OPEN_MINUTES = 9 * 60 + 30;
  private readonly SESSION_LENGTH_MINUTES = 390;

  readonly viewMode = signal<'sequential' | 'overlay'>('sequential');

  readonly structureShiftExplanation =
    'LH: a swing high prints lower than the prior swing high — upward momentum may be fading.\n' +
    'HL: a swing low prints higher than the prior swing low — downward momentum may be fading.\n' +
    'Either can be the first sign the prevailing trend is about to reverse.\n' +
    '✓ / ✗ show whether it was confirmed: by the next swing of the same type ' +
    "the same day, or by that day's close if there was no later swing. " +
    'A dashed line connects the shift point to whichever one decided it.';

  ngAfterViewInit(): void {
    this.chart = echarts.init(this.chartElement.nativeElement);
    this.resizeObserver = new ResizeObserver(() => {
      if (this.chart) {
        this.chart.resize();
      }
    });
    this.resizeObserver.observe(this.chartElement.nativeElement);
    this.swingForm.controls.symbol.valueChanges.subscribe(() => this.loadCoverage());
    this.loadCoverage();
    this.loadData();
  }

  ngOnDestroy(): void {
    this.resizeObserver?.disconnect();
    this.chart?.dispose();
  }

  isValidInputs(errorMsg: string): boolean {
    const { symbol, fromDate, toDate } = this.swingForm.getRawValue();
    if (!symbol || !fromDate || !toDate) {
      return false;
    }
    if (fromDate > toDate) {
      this.errorMessage = errorMsg;
      return false;
    }
    return true;
  }

  loadData(): void {
    if (!this.isValidInputs('From date cannot be after to date.')) {
      return;
    }
    this.loading.set(true);
    this.errorMessage = '';
    const { symbol, fromDate, toDate } = this.swingForm.getRawValue();
    this.swingService
      .getSwingData(symbol, formatDateKey(fromDate), formatDateKey(toDate))
      .subscribe({
        next: (days) => {
          this.loading.set(false);
          this.days = days ?? [];
          if (this.days.length === 0) {
            this.errorMessage =
              'No swing data saved for this period. Load candles and generate the dataset for ' +
              'this range from the Market Data page.';
            this.renderEmptyChart();
            return;
          }
          this.renderCurrentView();
        },
        error: (error) => {
          this.loading.set(false);
          logger.error('Failed to load swing data:', error);
          this.errorMessage = 'Failed to load market data.';
          this.renderEmptyChart();
        },
      });
  }

  private loadCoverage(): void {
    const symbol = this.swingForm.controls.symbol.value;
    if (!symbol) {
      this.datasetCoverage.set([]);
      return;
    }
    this.coverageLoading.set(true);
    this.swingService.getDailyDatasetCoverage(symbol.trim().toUpperCase()).subscribe({
      next: (periods) => {
        this.coverageLoading.set(false);
        this.datasetCoverage.set(periods);
      },
      error: (error) => {
        this.coverageLoading.set(false);
        logger.error('Failed to load dataset coverage:', error);
        this.datasetCoverage.set([]);
      },
    });
  }

  toggleViewMode(): void {
    this.viewMode.update((mode) => (mode === 'sequential' ? 'overlay' : 'sequential'));
    if (this.days.length > 0) {
      this.renderCurrentView();
    }
  }

  private renderCurrentView(): void {
    if (this.viewMode() === 'overlay') {
      this.renderOverlayChart(this.days);
    } else {
      this.renderChart(this.days);
    }
  }

  private renderChart(days: DailySwingData[]): void {
    const { map: shiftMap, links: shiftLinks } = this.computeShiftVerifications(days);
    const dailyPaths = days.map((day, index) => this.buildDailyPath(day, index, shiftMap));
    const swingHighs = this.buildSwingHighs(days, shiftMap);
    const swingLows = this.buildSwingLows(days, shiftMap);
    const openPoints = this.buildOpenPoints(days);
    const closePoints = this.buildClosePoints(days);
    const dayAreas = this.buildDayAreas(days);
    const dayLines = this.buildDayLines(days);
    const option: EChartsOption = {
      backgroundColor: '#080808',
      animation: true,
      grid: { left: 40, right: 40, top: 40, bottom: 70, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#140333c4',
        borderColor: '#3b82f6',
        textStyle: { color: '#d4d4d4' },
        formatter: (params: any) => {
          if (params?.data?.chartPoint) {
            return this.formatPointTooltip(params.data.chartPoint);
          }
          return '';
        },
      },
      dataZoom: [
        {
          type: 'inside',
          xAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
          moveOnMouseMove: true,
          moveOnMouseWheel: true,
        },
        {
          type: 'slider',
          xAxisIndex: 0,
          bottom: 20,
          height: 28,
          backgroundColor: '#140333c4',
          borderColor: '#3b82f6',
          handleStyle: { color: 'white' },
          textStyle: { color: 'white' },
          showDetail: false,
        },
        {
          type: 'inside',
          yAxisIndex: 0,
          filterMode: 'none',
          zoomOnMouseWheel: true,
        },
      ],
      xAxis: {
        type: 'value',
        min: 0,
        max: Math.max(this.DAY_STEP, days.length * this.DAY_STEP),
        axisLabel: {
          color: '#9ca3af',
          formatter: (value: number) => this.formatXAxisTime(value),
        },
        axisLine: {
          lineStyle: { color: '#3a3a3a' },
        },
        axisTick: {
          lineStyle: { color: '#3a3a3a' },
        },
        splitLine: { show: false },
        axisPointer: {
          show: true,
          snap: false,
          label: {
            show: true,
            backgroundColor: '#111111',
            color: '#4ade80',
            formatter: (params: any) => {
              const value = Number(params.value);
              return this.formatXAxisPointer(value);
            },
          },
        },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: { show: true },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: '#d4d4d436', width: 1 },
        },
        axisPointer: {
          show: true,
          label: {
            backgroundColor: '#111111',
            color: '#4ade80',
          },
        },
      },
      series: [
        {
          name: 'Day areas',
          type: 'line',
          data: [],
          silent: true,
          markArea: {
            silent: true,
            itemStyle: { color: 'rgba(255,255,255,0.05)' },
            data: dayAreas,
          },
        },
        {
          name: 'Day boundaries',
          type: 'line',
          data: [],
          silent: true,
          markLine: {
            silent: true,
            symbol: 'none',
            label: { show: false },
            lineStyle: {
              color: '#2563eb',
              type: 'dashed',
              width: 1,
            },
            data: dayLines,
          },
        },
        ...dailyPaths,

        {
          name: 'Open',
          type: 'scatter',
          data: openPoints,
          symbol: 'rect',
          symbolSize: [15, 15],
          itemStyle: { color: '#facc15' },
          label: {
            show: true,
            position: 'inside',
            color: '#000000',
            fontSize: 11,
            fontWeight: 'bold',
            formatter: 'O',
          },
          z: 10,
        },

        {
          name: 'Close',
          type: 'scatter',
          data: closePoints,
          symbol: 'rect',
          symbolSize: [15, 15],
          itemStyle: { color: '#a855f7' },
          label: {
            show: true,
            position: 'inside',
            color: '#ffffff',
            fontSize: 11,
            fontWeight: 'bold',
            formatter: 'C',
          },
          z: 10,
        },
        {
          name: 'Swing Highs',
          type: 'scatter',
          data: swingHighs,
          symbol: 'triangle',
          symbolSize: (value: any, params: any) =>
            this.isReversalClassification(params.data?.chartPoint?.classification) ? 22 : 16,
          itemStyle: {
            color: '#22c55e',
          },
          label: {
            show: true,
            position: 'top',
            fontSize: 11,
            fontWeight: 'bold',
            ...this.verificationRichLabel('#22c55e'),
          },
          z: 20,
        },
        {
          name: 'Swing Lows',
          type: 'scatter',
          data: swingLows,
          symbol: 'circle',
          symbolSize: (value: any, params: any) =>
            this.isReversalClassification(params.data?.chartPoint?.classification) ? 20 : 14,
          itemStyle: {
            color: '#ef4444',
          },
          label: {
            show: true,
            position: 'bottom',
            fontSize: 11,
            fontWeight: 'bold',
            ...this.verificationRichLabel('#ff5252'),
          },
          z: 20,
        },
        this.buildShiftLinksSeries(shiftLinks),
      ],
    };
    this.chart.setOption(option, true);
    this.chart.resize();
  }

  /**
   * Overlays every day's intraday path on a shared time-of-day x-axis
   * (minutes since 09:30 ET) instead of laying days out left-to-right.
   * Each day's price is normalized to % change from that day's own open,
   * so days at very different absolute price levels can still be compared
   * by shape. Color stays trend-based (green/red); opacity fades older
   * days out so the most recent day reads as the brightest line.
   */
  private renderOverlayChart(days: DailySwingData[]): void {
    const { map: shiftMap } = this.computeShiftVerifications(days);
    const series = days.map((day, index) =>
      this.buildOverlayDayLine(day, index, days.length, shiftMap),
    );
    const option: EChartsOption = {
      backgroundColor: '#080808',
      animation: true,
      grid: { left: 50, right: 40, top: 40, bottom: 70, containLabel: true },
      tooltip: {
        trigger: 'item',
        backgroundColor: '#140333c4',
        borderColor: '#3b82f6',
        textStyle: { color: '#d4d4d4' },
        formatter: (params: any) => {
          if (params?.data?.chartPoint) {
            return this.formatOverlayTooltip(params.data.chartPoint);
          }
          return '';
        },
      },
      xAxis: {
        type: 'value',
        min: 0,
        max: this.SESSION_LENGTH_MINUTES,
        axisLabel: {
          color: '#9ca3af',
          formatter: (value: number) => this.formatSessionMinutes(value),
        },
        axisLine: { lineStyle: { color: '#3a3a3a' } },
        axisTick: { lineStyle: { color: '#3a3a3a' } },
        splitLine: { show: false },
      },
      yAxis: {
        type: 'value',
        scale: true,
        axisLabel: {
          color: '#9ca3af',
          formatter: (value: number) => `${value >= 0 ? '+' : ''}${value.toFixed(2)}%`,
        },
        axisLine: { show: false },
        axisTick: { show: false },
        splitLine: {
          show: true,
          lineStyle: { color: '#d4d4d436', width: 1 },
        },
      },
      series,
    };
    this.chart.setOption(option, true);
    this.chart.resize();
  }

  private buildOverlayDayLine(
    day: DailySwingData,
    index: number,
    total: number,
    shiftMap: Map<string, ShiftVerification>,
  ): any {
    const swings = [
      ...day.swingHighs.map((swing) => ({ ...swing, type: 'HIGH' as const })),
      ...day.swingLows.map((swing) => ({ ...swing, type: 'LOW' as const })),
    ].sort((a, b) => a.time.localeCompare(b.time));

    const toPct = (price: number) => (day.open === 0 ? 0 : ((price - day.open) / day.open) * 100);

    interface OverlayPoint {
      minutes: number;
      pct: number;
      date: string;
      time: string;
      price: number;
      label: string;
      classification: string | null;
      shiftVerification: ShiftVerification | null;
    }

    const points: OverlayPoint[] = [
      {
        minutes: 0,
        pct: 0,
        date: day.date,
        time: `${day.date}T09:30:00`,
        price: day.open,
        label: 'OPEN',
        classification: null,
        shiftVerification: null,
      },
      ...swings.map((swing) => ({
        minutes: this.minutesFromSessionOpen(swing.time),
        pct: toPct(swing.price),
        date: day.date,
        time: swing.time,
        price: swing.price,
        label: swing.classification ?? swing.type,
        classification: swing.classification,
        shiftVerification: shiftMap.get(this.shiftKey(swing.time, swing.type)) ?? null,
      })),
      {
        minutes: this.SESSION_LENGTH_MINUTES,
        pct: toPct(day.close),
        date: day.date,
        time: `${day.date}T16:00:00`,
        price: day.close,
        label: 'CLOSE',
        classification: null,
        shiftVerification: null,
      },
    ].sort((a, b) => a.minutes - b.minutes);

    const isUptrend = String(day.trend).toUpperCase() === 'UPTREND';
    const isDowntrend = String(day.trend).toUpperCase() === 'DOWNTREND';
    const baseColor = isUptrend ? '34,197,94' : isDowntrend ? '239,68,68' : '96,165,250';
    const opacity = total <= 1 ? 1 : 0.15 + 0.85 * (index / (total - 1));
    const isLatest = index === total - 1;

    return {
      name: day.date,
      type: 'line',
      data: points.map((point) => ({
        value: [point.minutes, point.pct],
        chartPoint: point,
      })),
      symbol: 'none',
      smooth: false,
      connectNulls: false,
      lineStyle: {
        color: `rgba(${baseColor}, ${opacity})`,
        width: isLatest ? 3 : 1.5,
      },
      z: isLatest ? 10 : 5,
    };
  }

  private minutesFromSessionOpen(time: string): number {
    const timePart = time.split('T')[1];
    if (!timePart) {
      return 0;
    }
    const [hour, minute, second = '0'] = timePart.split(':');
    const totalMinutes = Number(hour) * 60 + Number(minute) + Number(second) / 60;
    return Math.max(
      0,
      Math.min(this.SESSION_LENGTH_MINUTES, totalMinutes - this.SESSION_OPEN_MINUTES),
    );
  }

  private formatSessionMinutes(value: number): string {
    const totalMinutes = this.SESSION_OPEN_MINUTES + value;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
  }

  private formatOverlayTooltip(point: {
    date: string;
    time: string;
    price: number;
    label: string;
    classification: string | null;
    shiftVerification: ShiftVerification | null;
  }): string {
    const structureNote = this.isReversalClassification(point.classification)
      ? `<br/><span style="color:#f59e0b;">&#9650; possible structure shift</span>`
      : '';
    const verificationNote = this.verificationExplanation(point);
    return `
      <div
        style="
          min-width:220px;
          font-family:Consolas,monospace;
        "
      >
        <b>  Date: ${point.date}  </b>
        <br/>
        <b>   ${point.label}  </b>
        ${structureNote}
        ${verificationNote}
        <br/><br/>
        Price: ${Number(point.price)}     <br/>
        Time:    ${point.time}
      </div>

    `;
  }

  private buildOpenPoints(days: DailySwingData[]): any[] {
    const result: any[] = [];
    days.forEach((day, dayIndex) => {
      const point: ChartPoint = {
        value: [this.getDayX(dayIndex), day.open],
        type: 'OPEN',
        classification: null,
        time: `${day.date}T09:30:00`,
        date: day.date,
      };
      result.push({
        value: point.value,
        chartPoint: point,
      });
    });
    return result;
  }

  private buildClosePoints(days: DailySwingData[]): any[] {
    const result: any[] = [];
    days.forEach((day, dayIndex) => {
      const point: ChartPoint = {
        value: [this.getDayX(dayIndex) + this.DAY_WIDTH, day.close],
        type: 'CLOSE',
        classification: null,
        time: `${day.date}T16:00:00`,
        date: day.date,
      };
      result.push({
        value: point.value,
        chartPoint: point,
      });
    });
    return result;
  }

  private buildDailyPath(
    day: DailySwingData,
    dayIndex: number,
    shiftMap: Map<string, ShiftVerification>,
  ): any {
    const swings = [
      ...day.swingHighs.map((swing) => ({
        ...swing,
        type: 'HIGH' as const,
      })),
      ...day.swingLows.map((swing) => ({
        ...swing,
        type: 'LOW' as const,
      })),
    ].sort((a, b) => a.time.localeCompare(b.time));
    const points: ChartPoint[] = [];
    points.push({
      value: [this.getDayX(dayIndex), day.open],
      type: 'OPEN',
      classification: null,
      time: `${day.date}T09:30:00`,
      date: day.date,
    });
    for (const swing of swings) {
      points.push({
        value: [this.getSwingX(day, swing.time, dayIndex), swing.price],
        type: swing.type,
        classification: swing.classification,
        time: swing.time,
        date: day.date,
        shiftVerification: shiftMap.get(this.shiftKey(swing.time, swing.type)) ?? null,
      });
    }
    points.push({
      value: [this.getDayX(dayIndex) + this.DAY_WIDTH, day.close],
      type: 'CLOSE',
      classification: null,
      time: `${day.date}T16:00:00`,
      date: day.date,
    });
    const trend = String(day.trend).toUpperCase();
    let lineColor = '#60a5fa';
    if (trend === 'UP' || trend === 'UPTREND') {
      lineColor = '#22c55e';
    }
    if (trend === 'DOWN' || trend === 'DOWNTREND') {
      lineColor = '#ef4444';
    }
    return {
      name: day.date,
      type: 'line',
      data: points.map((point) => ({
        value: point.value,
        chartPoint: point,
      })),
      symbol: 'none',
      smooth: false,
      connectNulls: false,
      lineStyle: {
        color: lineColor,
        width: 2,
      },
      z: 5,
    };
  }

  private buildSwingHighs(days: DailySwingData[], shiftMap: Map<string, ShiftVerification>): any[] {
    const result: any[] = [];
    days.forEach((day, dayIndex) => {
      for (const swing of day.swingHighs) {
        const point: ChartPoint = {
          value: [this.getSwingX(day, swing.time, dayIndex), swing.price],
          type: 'HIGH',
          classification: swing.classification,
          time: swing.time,
          date: day.date,
          shiftVerification: shiftMap.get(this.shiftKey(swing.time, 'HIGH')) ?? null,
        };
        result.push({
          value: point.value,
          chartPoint: point,
          itemStyle: this.reversalItemStyle(swing.classification),
        });
      }
    });

    return result;
  }

  private buildSwingLows(days: DailySwingData[], shiftMap: Map<string, ShiftVerification>): any[] {
    const result: any[] = [];
    days.forEach((day, dayIndex) => {
      for (const swing of day.swingLows) {
        const point: ChartPoint = {
          value: [this.getSwingX(day, swing.time, dayIndex), swing.price],
          type: 'LOW',
          classification: swing.classification,
          time: swing.time,
          date: day.date,
          shiftVerification: shiftMap.get(this.shiftKey(swing.time, 'LOW')) ?? null,
        };
        result.push({
          value: point.value,
          chartPoint: point,
          itemStyle: this.reversalItemStyle(swing.classification),
        });
      }
    });
    return result;
  }

  /**
   * A glowing amber ring, layered on top of the plain green/red fill, so a
   * possible structure shift (LH/HL) is visible on the chart at a glance —
   * no hover required. Returns an empty override for non-reversal points.
   */
  private reversalItemStyle(classification: string | null | undefined): Record<string, unknown> {
    if (!this.isReversalClassification(classification)) {
      return {};
    }
    return {
      borderColor: '#f59e0b',
      borderWidth: 3,
      shadowColor: 'rgba(245, 158, 11, 0.85)',
      shadowBlur: 14,
    };
  }

  private buildDayAreas(days: DailySwingData[]): any[] {
    return days.map((_day, index) => [
      {
        xAxis: this.getDayX(index),
      },
      {
        xAxis: this.getDayX(index) + this.DAY_WIDTH,
      },
    ]);
  }

  private buildDayLines(days: DailySwingData[]): any[] {
    const lines: any[] = [];
    days.forEach((_day, index) => {
      lines.push({
        xAxis: this.getDayX(index),
      });
      lines.push({
        xAxis: this.getDayX(index) + this.DAY_WIDTH,
      });
    });
    return lines;
  }

  private getDayX(dayIndex: number): number {
    return dayIndex * this.DAY_STEP;
  }

  private getSwingX(_day: DailySwingData, time: string, dayIndex: number): number {
    const timePart = time.split('T')[1];
    if (!timePart) {
      return this.getDayX(dayIndex);
    }
    const [hour, minute, second = '0'] = timePart.split(':');
    const timestampMinutes = Number(hour) * 60 + Number(minute) + Number(second) / 60;
    const marketOpenMinutes = 9 * 60 + 30;
    const marketCloseMinutes = 16 * 60;
    const sessionMinutes = marketCloseMinutes - marketOpenMinutes;
    let fraction = (timestampMinutes - marketOpenMinutes) / sessionMinutes;
    fraction = Math.max(0, Math.min(1, fraction));
    return this.getDayX(dayIndex) + fraction * this.DAY_WIDTH;
  }

  private formatXAxisTime(value: number): string {
    const dayIndex = Math.floor(value / this.DAY_STEP);
    const dayStart = this.getDayX(dayIndex);
    const relativeX = value - dayStart;
    if (relativeX < 0 || relativeX > this.DAY_WIDTH) {
      return '';
    }
    const marketOpenMinutes = 9 * 60 + 30;
    const marketCloseMinutes = 16 * 60;
    const sessionMinutes = marketCloseMinutes - marketOpenMinutes;
    const fraction = Math.max(0, Math.min(1, relativeX / this.DAY_WIDTH));
    const totalMinutes = marketOpenMinutes + fraction * sessionMinutes;
    const hours = Math.floor(totalMinutes / 60);
    const minutes = Math.floor(totalMinutes % 60);
    return `${String(hours).padStart(2, '0')}:` + `${String(minutes).padStart(2, '0')}`;
  }

  /**
   * LH (lower high) and HL (higher low) are the classifications that flag a
   * potential structure shift — a swing against the prevailing trend.
   * HH/LL are plain trend continuation.
   */
  private isReversalClassification(classification: string | null | undefined): boolean {
    return classification === 'LH' || classification === 'HL';
  }

  private shiftKey(time: string, type: 'HIGH' | 'LOW'): string {
    return `${time}|${type}`;
  }

  /**
   * Confirms a possible structure shift (LH/HL) against the NEXT swing of
   * the SAME type, scoped to the SAME day — not next-day swing data, and
   * not a day-level trend label. Swings strictly alternate HIGH/LOW, so
   * comparing an LH to the very next (opposite-type) swing is trivial (a
   * low is definitionally below the high that preceded it); the meaningful
   * test is price vs. the next swing of the same type:
   *  - LH confirmed if the next HIGH (same day) is still lower.
   *  - HL confirmed if the next LOW (same day) is still higher.
   * If this is the day's LAST swing of that type, there is no later
   * same-type swing to compare within the session — fall back to that same
   * day's own close instead of reaching into the next day at all.
   * Returns a lookup `map` (keyed by `shiftKey`) of every LH/HL point's
   * verdict, plus `links`: chart coordinates for a dashed connector from
   * each shift point to whichever point (next swing, or the day's close)
   * decided it.
   */
  private computeShiftVerifications(days: DailySwingData[]): {
    map: Map<string, ShiftVerification>;
    links: {
      verification: 'confirmed' | 'refuted';
      from: { x: number; y: number };
      to: { x: number; y: number };
    }[];
  } {
    interface Entry {
      dayIndex: number;
      day: DailySwingData;
      time: string;
      price: number;
      classification: string | null;
    }

    const highs: Entry[] = [];
    const lows: Entry[] = [];
    days.forEach((day, dayIndex) => {
      for (const swing of day.swingHighs) {
        highs.push({
          dayIndex,
          day,
          time: swing.time,
          price: swing.price,
          classification: swing.classification,
        });
      }
      for (const swing of day.swingLows) {
        lows.push({
          dayIndex,
          day,
          time: swing.time,
          price: swing.price,
          classification: swing.classification,
        });
      }
    });
    highs.sort((a, b) => a.time.localeCompare(b.time));
    lows.sort((a, b) => a.time.localeCompare(b.time));

    const map = new Map<string, ShiftVerification>();
    const links: {
      verification: 'confirmed' | 'refuted';
      from: { x: number; y: number };
      to: { x: number; y: number };
    }[] = [];

    const process = (
      sequence: Entry[],
      type: 'HIGH' | 'LOW',
      reversalClassification: 'LH' | 'HL',
      isConfirmed: (shiftPrice: number, comparisonPrice: number) => boolean,
    ): void => {
      for (let i = 0; i < sequence.length; i++) {
        const current = sequence[i];
        if (current.classification !== reversalClassification) {
          continue;
        }
        const key = this.shiftKey(current.time, type);
        const next = sequence[i + 1];
        const nextIsSameDay = next !== undefined && next.dayIndex === current.dayIndex;

        const comparisonPrice = nextIsSameDay ? next.price : current.day.close;
        const to = nextIsSameDay
          ? { x: this.getSwingX(next.day, next.time, next.dayIndex), y: next.price }
          : { x: this.getDayX(current.dayIndex) + this.DAY_WIDTH, y: current.day.close };

        const verification: 'confirmed' | 'refuted' = isConfirmed(current.price, comparisonPrice)
          ? 'confirmed'
          : 'refuted';
        map.set(key, verification);
        links.push({
          verification,
          from: {
            x: this.getSwingX(current.day, current.time, current.dayIndex),
            y: current.price,
          },
          to,
        });
      }
    };

    process(highs, 'HIGH', 'LH', (shiftPrice, comparisonPrice) => comparisonPrice < shiftPrice);
    process(lows, 'LOW', 'HL', (shiftPrice, comparisonPrice) => comparisonPrice > shiftPrice);

    return { map, links };
  }

  private buildShiftLinksSeries(
    links: {
      verification: 'confirmed' | 'refuted';
      from: { x: number; y: number };
      to: { x: number; y: number };
    }[],
  ): any {
    return {
      name: 'Structure Shift Links',
      type: 'line',
      data: [],
      silent: true,
      markLine: {
        silent: true,
        symbol: 'none',
        label: { show: false },
        data: links.map((link) => [
          {
            coord: [link.from.x, link.from.y],
            lineStyle: {
              type: 'dashed',
              width: 1.5,
              color: link.verification === 'confirmed' ? '#22c55e' : '#ef4444',
            },
          },
          { coord: [link.to.x, link.to.y] },
        ]),
      },
      z: 15,
    };
  }

  private verificationGlyph(verification: ShiftVerification | null | undefined): string {
    switch (verification) {
      case 'confirmed':
        return '✓';
      case 'refuted':
        return '✗';
      case 'unknown':
        return '?';
      default:
        return '';
    }
  }

  /**
   * ECharts rich-text label config: renders the classification (HH/LH/HL/LL)
   * in `baseColor`, followed by a colored ✓/✗/? glyph when the point is a
   * verified-or-not structure shift. Spread into a series' `label` object.
   */
  private verificationRichLabel(baseColor: string): {
    formatter: (params: any) => string;
    rich: Record<string, unknown>;
  } {
    return {
      formatter: (params: any) => {
        const point: ChartPoint | undefined = params.data?.chartPoint;
        const base = point?.classification ?? point?.type ?? '';
        const glyph = this.verificationGlyph(point?.shiftVerification);
        if (!glyph) {
          return `{base|${base}}`;
        }
        const glyphTag =
          point?.shiftVerification === 'confirmed'
            ? 'ok'
            : point?.shiftVerification === 'refuted'
              ? 'bad'
              : 'unk';
        return `{base|${base}} {${glyphTag}|${glyph}}`;
      },
      rich: {
        base: { color: baseColor, fontWeight: 'bold', fontSize: 11 },
        ok: { color: '#22c55e', fontWeight: 'bold', fontSize: 13 },
        bad: { color: '#ef4444', fontWeight: 'bold', fontSize: 13 },
        unk: { color: '#f59e0b', fontWeight: 'bold', fontSize: 13 },
      },
    };
  }

  private verificationExplanation(point: {
    classification: string | null;
    shiftVerification?: ShiftVerification | null;
  }): string {
    const verification = point.shiftVerification;
    if (!verification) {
      return '';
    }
    if (verification === 'unknown') {
      return `<br/><span style="color:#f59e0b;">? not enough data to verify this signal</span>`;
    }
    const isLH = point.classification === 'LH';
    if (verification === 'confirmed') {
      const detail = isLH
        ? 'price stayed below this level afterward (next high, or the close if there was none)'
        : 'price stayed above this level afterward (next low, or the close if there was none)';
      return `<br/><span style="color:#22c55e;">&#10003; confirmed — ${detail}</span>`;
    }
    const detail = isLH ? 'price broke back above this level' : 'price broke back below this level';
    return `<br/><span style="color:#ef4444;">&#10007; not confirmed — ${detail}</span>`;
  }

  private formatXAxisPointer(value: number): string {
    if (!Number.isFinite(value)) {
      return '';
    }
    return this.formatXAxisTime(value);
  }

  private formatPointTooltip(point: ChartPoint): string {
    const structureNote = this.isReversalClassification(point.classification)
      ? `<br/><span style="color:#f59e0b;">&#9650; possible structure shift</span>`
      : '';
    const verificationNote = this.verificationExplanation(point);
    return `
      <div
        style="
          min-width:220px;
          font-family:Consolas,monospace;
        "
      >
        <b>  Date: ${point.date}  </b>
        <br/>
        <b>   ${point.classification ?? point.type}  </b>
        ${structureNote}
        ${verificationNote}
        <br/><br/>
        Price: ${Number(point.value[1])}     <br/>
        Time:    ${point.time}
      </div>

    `;
  }

  private renderEmptyChart(): void {
    if (!this.chart) {
      return;
    }
    this.chart.clear();
    this.chart.setOption({
      backgroundColor: '#080808',
      graphic: {
        type: 'text',
        left: 'center',
        top: 'middle',
        style: {
          text: 'NO MARKET DATA',
          fill: '#555555',
          font: '14px Consolas, monospace',
        },
      },
    });
  }

  private getPeriodSwings(days: DailySwingData[]): PeriodSwing[] {
    return days
      .flatMap((day) => [
        ...day.swingHighs.map((swing) => ({
          date: day.date,
          time: swing.time,
          price: swing.price,
          type: 'HIGH' as const,
          classification: swing.classification,
        })),
        ...day.swingLows.map((swing) => ({
          date: day.date,
          time: swing.time,
          price: swing.price,
          type: 'LOW' as const,
          classification: swing.classification,
        })),
      ])
      .sort((a, b) => this.parseLocalDateTime(a.time) - this.parseLocalDateTime(b.time));
  }

  private parseLocalDateTime(value: string): number {
    const [datePart, timePart] = value.split('T');
    if (!datePart || !timePart) {
      return NaN;
    }
    const [year, month, day] = datePart.split('-').map(Number);
    const [hour, minute, second = 0] = timePart.split(':').map(Number);
    return Date.UTC(year, month - 1, day, hour, minute, second);
  }

  private buildSwingLegs(swings: PeriodSwing[]): SwingLeg[] {
    const legs: SwingLeg[] = [];
    for (let i = 1; i < swings.length; i++) {
      const from = swings[i - 1];
      const to = swings[i];
      const priceChange = to.price - from.price;
      const fromMs = this.parseLocalDateTime(from.time);
      const toMs = this.parseLocalDateTime(to.time);
      const durationMinutes = (toMs - fromMs) / 60000;
      legs.push({
        from,
        to,
        priceChange,
        durationMinutes,
        direction: priceChange >= 0 ? 'UP' : 'DOWN',
      });
    }
    return legs;
  }
}
