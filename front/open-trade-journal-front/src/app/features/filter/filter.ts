import {
  Component,
  inject,
  OnInit
} from '@angular/core';

import {
  MatDatepickerModule,
  MatDatepickerInputEvent
} from '@angular/material/datepicker';

import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';

import { TradesService } from '../../core/services/trades.service';
import { CookieService } from '../../core/services/cookie.service';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule
  ],
  templateUrl: './filter.html',
  styleUrl: './filter.css'
})
export class Filter implements OnInit {

  selectedPeriod = '';
  periodLabel = '';
  startDate = '';
  endDate = '';
  dashboardService = inject(TradesService);
  cookieService = inject(CookieService);
  todayDate = this.formatDate(new Date());
  minTradeDate = '';

  ngOnInit(): void {
    this.restoreFilterFromCookie();
  }



  private restoreFilterFromCookie(): void {
    const savedPeriod = this.cookieService.getCookie('dashboardSelectedPeriod');
    if(!savedPeriod || savedPeriod.length==0)
      savedPeriod="month";
    const savedStartDate = this.cookieService.getCookie('dashboardStartDate');
    const savedEndDate = this.cookieService.getCookie('dashboardEndDate');
    const savedPeriodLabel = this.cookieService.getCookie('dashboardPeriodLabel');


    if (
      savedPeriod &&
      [
        'today',
        'yesterday',
        'week',
        'lastWeek',
        'month',
        'custom'
      ].includes(savedPeriod)
    ) {
       this.cookieService.setCookie('dashboardSelectedPeriod' , 'month')
      this.selectedPeriod = savedPeriod;
    }


    if (this.selectedPeriod === 'custom') {
      this.startDate = savedStartDate ?? '';
      this.endDate = savedEndDate ?? '';
    } else {
      this.startDate = '';
      this.endDate = '';
    }


    if (savedPeriodLabel) {
      this.periodLabel = savedPeriodLabel;
    } else if (this.selectedPeriod !== 'custom') {
      this.periodLabel = this.selectedPeriod;
    } else if (this.startDate && this.endDate) {
      this.periodLabel =
        `${this.startDate}-${this.endDate}`;

    }
  }



  applyFilter(): void {
    const dates = this.getDateRange();
    if (!dates.startDate || !dates.endDate) {
      return;
    }

    if (dates.startDate > dates.endDate) {
      return;
    }

    if (
      this.minTradeDate &&
      (
        dates.startDate < this.minTradeDate ||
        dates.endDate < this.minTradeDate
      )
    ) {
      return;
    }

    if (
      dates.startDate > this.todayDate ||
      dates.endDate > this.todayDate
    ) {
      return;
    }

    if (this.selectedPeriod === 'custom') {
      this.periodLabel =
        `${dates.startDate}-${dates.endDate}`;
    } else {
      this.periodLabel = this.selectedPeriod;
    }
    this.cookieService.setCookie('dashboardSelectedPeriod', this.selectedPeriod);

    if (this.selectedPeriod === 'custom') {
      this.cookieService.setCookie('dashboardStartDate', this.startDate);
      this.cookieService.setCookie('dashboardEndDate', this.endDate);
    } else {
      this.cookieService.deleteCookie('dashboardStartDate');
      this.cookieService.deleteCookie('dashboardEndDate');
    }

    this.cookieService.setCookie('dashboardPeriodLabel', this.periodLabel);
    this.dashboardService.loadStats(dates.startDate, dates.endDate);
  }


  onPeriodChange(event: Event): void {
    const select = event.target as HTMLSelectElement;
    this.selectedPeriod = select.value;
    if (this.selectedPeriod !== 'custom') {
      this.startDate = '';
      this.endDate = '';
    }
  }


  onStartDateChange(event: MatDatepickerInputEvent<Date>): void {
    if (!event.value) {
      this.startDate = '';
      return;
    }
    let date = event.value;
    if (
      this.minTradeDate &&
      this.toDateKey(date) < this.minTradeDate
    ) {
      date = this.parseDate(this.minTradeDate);
    }
    if (
      this.toDateKey(date) > this.todayDate
    ) {
      date = this.parseDate(this.todayDate);
    }
    this.startDate = this.formatDate(date);
  }


  onEndDateChange(event: MatDatepickerInputEvent<Date>): void {
    if (!event.value)
    {this.endDate = '';
      return;
    }
    let date = event.value;
    if (
      this.minTradeDate &&
      this.toDateKey(date) < this.minTradeDate
    ) {
      date = this.parseDate(this.minTradeDate);
    }

    if (
      this.toDateKey(date) > this.todayDate
    ) {
      date = this.parseDate(this.todayDate);
    }
    this.endDate = this.formatDate(date);
  }



  private getDateRange(): {
    startDate: string;
    endDate: string;
  } {

    const today = new Date();
    let start: Date;
    let end: Date;

    switch (this.selectedPeriod) {
      case 'today':

        start = new Date(today);
        end = new Date(today);

        break;


      case 'yesterday':

        start = new Date(today);

        start.setDate(
          start.getDate() - 1
        );

        end = new Date(start);

        break;


      case 'week':

        start = new Date(today);

        const day =
          start.getDay();

        const diff =
          day === 0
            ? 6
            : day - 1;

        start.setDate(
          start.getDate() - diff
        );

        end = new Date(today);

        break;


      case 'lastWeek':

        start = new Date(today);

        const currentDay =
          start.getDay();

        const mondayDiff =
          currentDay === 0
            ? 6
            : currentDay - 1;

        start.setDate(
          start.getDate() - mondayDiff
        );

        start.setDate(
          start.getDate() - 7
        );

        end = new Date(start);

        end.setDate(
          end.getDate() + 6
        );

        break;


      case 'month':

        start = new Date(
          today.getFullYear(),
          today.getMonth(),
          1
        );

        end = new Date(today);

        break;


      case 'custom':

        return {
          startDate: this.startDate,
          endDate: this.endDate
        };


      default:

        return {
          startDate: '',
          endDate: ''
        };
    }


    return {
      startDate: this.formatDate(start),
      endDate: this.formatDate(end)
    };
  }



  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }


  private toDateKey(date: Date): string {
    return this.formatDate(date);
  }


  private parseDate(value: string): Date {
    const [
      year,
      month,
      day
    ] = value.split('-').map(Number);

    return new Date(
      year,
      month - 1,
      day
    );
  }




  get isApplyDisabled(): boolean {
    if (this.selectedPeriod !== 'custom') {
      return false;
    }
    if (!this.startDate || !this.endDate) {
      return true;
    }
    return this.startDate > this.endDate;
  }
}
