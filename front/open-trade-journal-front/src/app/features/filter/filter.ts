import { ChangeDetectionStrategy, Component, inject, OnInit } from '@angular/core';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { TradesService } from '../../core/services/trades.service';
import { CookieService } from '../../core/services/cookie.service';
import { formatDateKey, parseDateKey } from '../../core/utils/date-utils';
import {
  DASHBOARD_FILTER_COOKIE,
  DashboardFilterCookie,
} from '../../core/models/dashboard-filter.model';
import { dateRangeValidator } from '../../shared/validators/date-range.validator';

@Component({
  selector: 'app-filter',
  standalone: true,
  imports: [MatDatepickerModule, MatInputModule, MatNativeDateModule, ReactiveFormsModule],
  templateUrl: './filter.html',
  styleUrl: './filter.css',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Filter implements OnInit {
  private readonly fb = inject(FormBuilder);
  dashboardService = inject(TradesService);
  cookieService = inject(CookieService);

  periodLabel = '';
  todayDate = formatDateKey(new Date());
  minTradeDate = '';

  readonly filterForm = this.fb.group(
    {
      selectedPeriod: this.fb.nonNullable.control('month'),
      startDate: this.fb.control<Date | null>(null),
      endDate: this.fb.control<Date | null>(null),
    },
    { validators: dateRangeValidator('startDate', 'endDate') },
  );

  ngOnInit(): void {
    this.filterForm.controls.selectedPeriod.valueChanges.subscribe((period) => {
      if (period !== 'custom') {
        this.filterForm.patchValue({ startDate: null, endDate: null }, { emitEvent: false });
      }
    });
    this.filterForm.controls.startDate.valueChanges.subscribe((date) =>
      this.clampControl('startDate', date),
    );
    this.filterForm.controls.endDate.valueChanges.subscribe((date) =>
      this.clampControl('endDate', date),
    );

    this.restoreFilterFromCookie();
    this.applyFilter();
  }

  private clampControl(name: 'startDate' | 'endDate', date: Date | null): void {
    if (!date) {
      return;
    }
    let clamped = date;
    if (this.minTradeDate && formatDateKey(clamped) < this.minTradeDate) {
      clamped = parseDateKey(this.minTradeDate);
    }
    if (formatDateKey(clamped) > this.todayDate) {
      clamped = parseDateKey(this.todayDate);
    }
    if (clamped.getTime() !== date.getTime()) {
      this.filterForm.controls[name].setValue(clamped, { emitEvent: false });
    }
  }

  private restoreFilterFromCookie(): void {
    const saved = this.cookieService.getJson<DashboardFilterCookie>(DASHBOARD_FILTER_COOKIE);
    let savedPeriod = saved?.selectedPeriod;
    if (!savedPeriod || savedPeriod.length == 0) savedPeriod = 'month';
    const savedStartDate = saved?.startDate ?? null;
    const savedEndDate = saved?.endDate ?? null;
    const savedPeriodLabel = saved?.periodLabel ?? null;

    let selectedPeriod = this.filterForm.controls.selectedPeriod.value;
    if (
      savedPeriod &&
      ['today', 'yesterday', 'week', 'lastWeek', 'month', 'custom'].includes(savedPeriod)
    ) {
      selectedPeriod = savedPeriod;
    }

    const startDate =
      selectedPeriod === 'custom' && savedStartDate ? parseDateKey(savedStartDate) : null;
    const endDate = selectedPeriod === 'custom' && savedEndDate ? parseDateKey(savedEndDate) : null;

    this.filterForm.patchValue({ selectedPeriod, startDate, endDate }, { emitEvent: false });

    if (savedPeriodLabel) {
      this.periodLabel = savedPeriodLabel;
    } else if (selectedPeriod !== 'custom') {
      this.periodLabel = selectedPeriod;
    } else if (startDate && endDate) {
      this.periodLabel = `${formatDateKey(startDate)}-${formatDateKey(endDate)}`;
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
      (dates.startDate < this.minTradeDate || dates.endDate < this.minTradeDate)
    ) {
      return;
    }

    if (dates.startDate > this.todayDate || dates.endDate > this.todayDate) {
      return;
    }

    const selectedPeriod = this.filterForm.controls.selectedPeriod.value;
    if (selectedPeriod === 'custom') {
      this.periodLabel = `${dates.startDate}-${dates.endDate}`;
    } else {
      this.periodLabel = selectedPeriod;
    }
    this.cookieService.setJson<DashboardFilterCookie>(DASHBOARD_FILTER_COOKIE, {
      selectedPeriod,
      startDate: selectedPeriod === 'custom' ? dates.startDate : '',
      endDate: selectedPeriod === 'custom' ? dates.endDate : '',
      periodLabel: this.periodLabel,
    });
    this.dashboardService.loadStats(dates.startDate, dates.endDate);
  }

  private getDateRange(): { startDate: string; endDate: string } {
    const today = new Date();
    let start: Date;
    let end: Date;
    const { selectedPeriod, startDate, endDate } = this.filterForm.value;
    switch (selectedPeriod) {
      case 'today':
        start = new Date(today);
        end = new Date(today);
        break;
      case 'yesterday':
        start = new Date(today);
        start.setDate(start.getDate() - 1);
        end = new Date(start);
        break;
      case 'week':
        start = new Date(today);
        const day = start.getDay();
        const diff = day === 0 ? 6 : day - 1;
        start.setDate(start.getDate() - diff);
        end = new Date(today);
        break;
      case 'lastWeek':
        start = new Date(today);
        const currentDay = start.getDay();
        const mondayDiff = currentDay === 0 ? 6 : currentDay - 1;
        start.setDate(start.getDate() - mondayDiff);
        start.setDate(start.getDate() - 7);
        end = new Date(start);
        end.setDate(end.getDate() + 6);
        break;
      case 'month':
        start = new Date(today.getFullYear(), today.getMonth(), 1);
        end = new Date(today);
        break;
      case 'custom':
        return {
          startDate: startDate ? formatDateKey(startDate) : '',
          endDate: endDate ? formatDateKey(endDate) : '',
        };
      default:
        return { startDate: '', endDate: '' };
    }
    return { startDate: formatDateKey(start), endDate: formatDateKey(end) };
  }

  get startDateKey(): string {
    const value = this.filterForm.controls.startDate.value;
    return value ? formatDateKey(value) : '';
  }

  get endDateKey(): string {
    const value = this.filterForm.controls.endDate.value;
    return value ? formatDateKey(value) : '';
  }

  get isApplyDisabled(): boolean {
    const { selectedPeriod, startDate, endDate } = this.filterForm.value;
    if (selectedPeriod !== 'custom') {
      return false;
    }
    if (!startDate || !endDate) {
      return true;
    }
    return startDate > endDate;
  }
}
