import {
  Component, inject,
  Input,
  OnChanges,
  SimpleChanges
} from '@angular/core';

import { NgxEchartsDirective } from 'ngx-echarts';
import { PnlPoint } from '../../core/models/pnl-point.model';
import {CookieService} from '../../core/services/cookie.service';
type PnlTimeframe = 'day' | 'week' | 'month' | 'year';

@Component({
  selector: 'app-histogram',
  standalone: true,
  imports: [
    NgxEchartsDirective
  ],
  templateUrl: './histogram.html',
  styleUrl: './histogram.scss'
})
export class Histogram implements OnChanges {
 private cookieService =inject(CookieService) ;
  @Input() pnlHistory: PnlPoint[] = [];

  chartOptions: any = {};
  chartWidth = 1000;
  cumulativePnl = 0;

  selectedTimeframe: PnlTimeframe = 'day';

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pnlHistory']) {
      this.updateChart();
    }
  }

  setTimeframe(timeframe: PnlTimeframe): void {
    this.selectedTimeframe = timeframe;
    this.updateChart();
  }

  private updateChart(): void {
    const grouped = this.groupPnlByTimeframe(
      this.pnlHistory,
      this.selectedTimeframe
    );

    const dates: string[] = [];
    const pnlValues: number[] = [];

    let cumulative = 0;

    for (const item of grouped) {
      const value = Number(item.pnl.toFixed(2));

      dates.push(item.label);
      pnlValues.push(value);

      cumulative += value;
    }

    this.cumulativePnl = Number(cumulative.toFixed(2));

    this.chartWidth = Math.max(
      700,
      pnlValues.length * 50
    );

    // Show bar labels only when there are 10 bars or fewer
    const showLabels = pnlValues.length <= 10;

    this.chartOptions = {
      animation: true,

      backgroundColor: 'rgba(5,8,5,0)',

      textStyle: {
        fontFamily: '"Courier New", Courier, monospace',
        color: '#e1dede',
        fontSize: 14
      },

      grid: {
        top: 45,
        left: 20,
        right: 20,
        bottom: 40,
        containLabel: true
      },

      tooltip: {
        trigger: 'axis',

        backgroundColor: '#020402',
        borderWidth: 2,
        borderColor: '#ffffff',
        padding: 12,

        textStyle: {
          color: '#e9edeb',
          fontFamily: '"Courier New", monospace',
          fontSize: 16,
          fontWeight: 'bold'
        },

        formatter: (params: any) => {
          const point = params[0];

          if (!point) {
            return '';
          }

          const value = Number(point.value);

          const color = value >= 0
            ? '#00ff66'
            : '#ff3333';

          const sign = value >= 0
            ? '+'
            : '-';

          return `
            <div style="
              font-family: 'Courier New', monospace;
              min-width: 220px;
            ">
              <div style="
                color: #ffffff;
                font-size: 16px;
                font-weight: bold;
              ">
                &gt; ${point.axisValue}
              </div>

              <div style="
                margin-top: 8px;
                color: ${color};
                font-size: 18px;
                font-weight: bold;
              ">
                &gt; ${this.selectedTimeframe.toUpperCase()}_PNL:
                ${sign}$${Math.abs(value).toFixed(2)}
              </div>
            </div>
          `;
        }
      },

      xAxis: {
        type: 'category',

        data: dates,

        axisLine: {
          show: true,

          lineStyle: {
            color: '#9fa59f',
            width: 3
          }
        },

        axisTick: {
          show: false
        },

        axisLabel: {
          color: '#9c9797',
          fontFamily: '"Courier New", monospace',
          fontSize: 14,
          fontWeight: 'bold',
          interval: 'auto',
          margin: 12
        }
      },

      yAxis: {
        type: 'value',
        show: true,

        axisLine: {
          show: true,

          lineStyle: {
            color: '#aeb5af',
            width: 2
          }
        },

        axisTick: {
          show: false
        },

        axisLabel: {
          color: '#a6a2a2',
          fontFamily: '"Courier New", monospace',
          fontSize: 14,
          fontWeight: 'bold',
          margin: 12,

          formatter: (value: number) => {
            const sign = value < 0
              ? '-'
              : '';

            return `${sign}$${Math.abs(value).toFixed(0)}`;
          }
        },

        splitLine: {
          show: true,

          lineStyle: {
            color: 'rgba(197,209,201,0.52)',
            width: 1,
            type: 'dashed'
          }
        }
      },

      series: [
        {
          name: 'P&L',
          type: 'bar',

          barWidth: 18,
          barMaxWidth: 22,

          data: pnlValues,

          itemStyle: {
            color: (params: any) => {
              return params.value >= 0
                ? 'rgba(22,223,103,0.91)'
                : '#ff3333';
            },

            borderRadius: 0,

            shadowColor: (params: any) => {
              return params.value >= 0
                ? 'rgba(0, 255, 102, 0.45)'
                : 'rgba(255, 51, 51, 0.45)';
            },

            shadowBlur: 8
          },

          emphasis: {
            itemStyle: {
              shadowColor: (params: any) => {
                return params.value >= 0
                  ? '#00ff66'
                  : '#ff3333';
              },

              shadowBlur: 18
            }
          },

          markLine: {
            silent: true,
            symbol: 'none',

            lineStyle: {
              color: '#00ff66',
              width: 2,
              type: 'solid',
              shadowColor: 'rgba(0, 255, 102, 0.5)',
              shadowBlur: 5
            },

            label: {
              show: false
            },

            data: [
              {
                yAxis: 0
              }
            ]
          },

          label: {
            show: showLabels,
            position: 'top',

            formatter: (params: any) => {
              const value = Number(params.value);

              if (value >= 0) {
                return `{profit|+$${value.toFixed(2)}}`;
              }

              return `{loss|-$${Math.abs(value).toFixed(2)}}`;
            },

            rich: {
              profit: {
                color: '#00ff66',
                fontFamily: '"Courier New", monospace',
                fontSize: 12,
                fontWeight: 'bold'
              },

              loss: {
                color: '#ff3333',
                fontFamily: '"Courier New", monospace',
                fontSize: 12,
                fontWeight: 'bold'
              }
            }
          }
        }
      ]
    };
  }

  private groupPnlByTimeframe(
    history: PnlPoint[],
    timeframe: PnlTimeframe
  ): { label: string; pnl: number }[] {

    const groups = new Map<string, {
      label: string;
      pnl: number;
      sortDate: Date;
    }>();

    for (const item of history) {

      const date = new Date(`${item.date}T00:00:00`);

      if (isNaN(date.getTime())) {
        continue;
      }

      const key = this.getGroupKey(date, timeframe);

      if (!groups.has(key)) {
        groups.set(key, {
          label: this.getGroupLabel(date, timeframe),
          pnl: 0,
          sortDate: new Date(date)
        });
      }

      groups.get(key)!.pnl += Number(item.pnl);
    }

    return Array.from(groups.values())
      .sort(
        (a, b) =>
          a.sortDate.getTime() - b.sortDate.getTime()
      )
      .map(item => ({
        label: item.label,
        pnl: Number(item.pnl.toFixed(2))
      }));
  }

  private getGroupKey(
    date: Date,
    timeframe: PnlTimeframe
  ): string {

    const year = date.getFullYear();
    const month = date.getMonth();
    const day = date.getDate();

    switch (timeframe) {

      case 'day':
        return `${year}-${month}-${day}`;

      case 'week': {
        const weekStart = this.getWeekStart(date);

        return [
          weekStart.getFullYear(),
          weekStart.getMonth(),
          weekStart.getDate()
        ].join('-');
      }

      case 'month':
        return `${year}-${month}`;

      case 'year':
        return `${year}`;
    }
  }

  private getGroupLabel(
    date: Date,
    timeframe: PnlTimeframe
  ): string {

    switch (timeframe) {

      case 'day':
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric'
        });

      case 'week': {
        const weekStart = this.getWeekStart(date);

        return `Week of ${weekStart.toLocaleDateString(
          'en-US',
          {
            month: 'short',
            day: 'numeric'
          }
        )}`;
      }

      case 'month':
        return date.toLocaleDateString('en-US', {
          month: 'short',
          year: 'numeric'
        });

      case 'year':
        return date.getFullYear().toString();
    }
  }

  private getWeekStart(date: Date): Date {
    const weekStart = new Date(date);

    const dayOfWeek = weekStart.getDay();

    // Monday is the first day of the week
    const diff = dayOfWeek === 0
      ? -6
      : 1 - dayOfWeek;

    weekStart.setDate(
      weekStart.getDate() + diff
    );

    return weekStart;
  }

  protected readonly Math = Math;
  getPeriodLabel(){
    return this.cookieService.getCookie('dashboardPeriodLabel')
  }
}
