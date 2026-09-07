import {Component, Input, OnChanges, SimpleChanges} from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import {PnlPoint} from '../../core/models/pnl-point.model';



@Component({
  selector: 'app-chart',
  standalone: true,
  imports: [NgxEchartsDirective, DecimalPipe],
  templateUrl: './chart.html',
  styleUrl: './chart.scss'
})
export class Chart implements OnChanges {

  @Input() pnlHistory: PnlPoint[] = [];
  cumulativePnl = 0;
  chartOptions: any = {};
  protected readonly Math = Math;

/** DOM UPDATE ON CHANGE ****/
  ngOnChanges(changes: SimpleChanges): void {
    if (changes['pnlHistory']) {
      this.updateChart();
    }
  }


  private updateChart(): void {
    let cumulativePnl = 0;
    const dates: string[] = [];
    const cumulativeValues: number[] = [];
    for (const item of this.pnlHistory) {
      cumulativePnl += item.pnl;
      dates.push(this.formatDate(item.date));
      cumulativeValues.push(Number(cumulativePnl.toFixed(2)));
    }
    this.cumulativePnl = cumulativePnl;

    this.chartOptions = {
      backgroundColor: 'transparent',
      textStyle: {
        fontFamily: '"Courier New", Courier, monospace',
        color: '#00ff66',
        fontSize: 14
      },

      tooltip: {
        trigger: 'axis',
        backgroundColor: 'rgb(21,21,21)',
        borderWidth: 2,
        padding: 12,
        textStyle: {
          color: '#00ff66',
          fontFamily: '"Courier New", monospace',
          fontSize: 16,
          fontWeight: 'bold'
        },

        formatter: (params: any) => {
          const point = params[0];
          const value = Number(point.value);
          const isProfit = value >= 0;
          const color = isProfit ? '#00ff66' : '#ff3333';
          const sign = value < 0 ? '-' : '+';
          return `
      <div style=" font-family: 'Courier New', monospace; max-width: 120px;">
        <div style="   color: #ffffff;   font-size: 12px  font-weight: bold;  ">  ${point.axisValue}     </div>

        <div style="     color: ${color};   font-size: 12px;   font-weight: bold;  ">
          CUMULATIVE PNL:
        </div>
            <div style="    color: ${color};   font-size: 14px;   font-weight: bold;  ">
         ${sign}$${Math.abs(value).toFixed(2)}
        </div>
      </div>
    `;
        },
        extraCssText: `border-radius: 0;  box-shadow: 0 0 12px rgba(0, 255, 102, 0.15);
  `
      },
      grid: {
        top: 35,
        left: 20,
        right: 25,
        bottom: 35,
        containLabel: true
      },

      xAxis: {
        type: 'category',
        boundaryGap: false,
        data: dates,
        axisLine: {
          lineStyle: {
            show: true,
            color:  '#6d706d',
            width: 2
          }
        },

        axisTick: {
          show: false
        },

        axisLabel: {
          color: '#e8e6e6',
          fontFamily: '"Courier New", monospace',
          fontSize: 14,
          fontWeight: 'bold',
          margin: 12
        },

        splitLine: {
          show: false
        }
      },

      yAxis: {
        type: 'value',
        axisLine: {
          show: true,
          lineStyle: {
            color: '#969a96',
            width: 2
          }
        },
        axisTick: {
          show: false
        },
        axisLabel: {
          color: '#bdbbbb',
          fontFamily: '"Courier New", monospace',
          fontSize: 14,
          fontWeight: 'bold',
          margin: 12,
          formatter: (value: number) => {
            const sign = value < 0 ? '-' : '';
            return `${sign}$${Math.abs(value).toFixed(0)}`;
          }
        },

        splitLine: {
          lineStyle: {
            show: true,
            color: '#6e7170',
            width: 1,
            type: 'dashed'
          }
        }
      },

      series: [
        {
          type: 'line',
          smooth: false,

          // BIGGER CIRCLES
          symbol: 'circle',
          symbolSize: 16,

          data: cumulativeValues,

          // THICKER LINE
          lineStyle: {
            width: 4,
            color: '#989c99',

            shadowColor: 'rgba(206,241,219,0.6)',
            shadowBlur: 8
          },

          itemStyle: {
            color: (params: any) => {
              return params.value >= 0
                ? '#00ff66'
                : '#ff3333';
            },

            borderColor: '#050805',
            borderWidth: 3,

            shadowColor: 'rgba(0, 255, 102, 0.5)',
            shadowBlur: 5
          },

          emphasis: {
            scale: true,
            itemStyle: {
              borderColor: '#ffffff',
              borderWidth: 3,
              shadowColor: '#00ff66',
              shadowBlur: 15
            }
          },

          areaStyle: {
            color: {
              type: 'linear',
              x: 0,
              y: 0,
              x2: 0,
              y2: 1,

              colorStops: [
                {
                  offset: 0,
                  color: 'rgba(0, 255, 102, 0.15)'
                },
                {
                  offset: 1,
                  color: 'rgba(0, 255, 102, 0.01)'
                }
              ]
            }
          }
        }
      ]
    };
  }


  private formatDate(date: string): string {
    const parsedDate = new Date(`${date}T00:00:00`);
    return parsedDate.toLocaleDateString('en-US', {month: 'short', day: 'numeric'});
  }

}
