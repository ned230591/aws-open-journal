import { ChangeDetectionStrategy, Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { forkJoin } from 'rxjs';
import { MatDialog } from '@angular/material/dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatInputModule } from '@angular/material/input';
import { MatNativeDateModule } from '@angular/material/core';
import { PageHeader } from '../../shared/page-header/page-header';
import { dateRangeValidator } from '../../shared/validators/date-range.validator';
import { formatDateKey, parseDateKey } from '../../core/utils/date-utils';
import { CoveragePeriod } from '../../core/models/coverage-period.model';
import {
  ConfirmOverwriteDialog,
  ConfirmOverwriteDialogData,
} from '../confirm-overwrite-dialog/confirm-overwrite-dialog';
import { MarketDataImportService } from './services/market-data-import.service';
import { SwingService } from '../swing-chart/services/swing.service';
import { logger } from '../../core/utils/logger';

@Component({
  selector: 'app-market-data-import',
  standalone: true,
  imports: [
    ReactiveFormsModule,
    PageHeader,
    MatTooltip,
    MatDatepickerModule,
    MatInputModule,
    MatNativeDateModule,
  ],
  templateUrl: './market-data-import.html',
  styleUrl: './market-data-import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class MarketDataImport {
  private readonly fb = inject(FormBuilder);
  private readonly importService = inject(MarketDataImportService);
  private readonly swingService = inject(SwingService);
  private readonly dialog = inject(MatDialog);

  readonly timeframeExplanation =
    "Databento is always queried for 1-minute bars regardless of this value — it's only the " +
    'label saved on each candle row. Leave it as "1 minute" unless you know another part of the ' +
    'app expects a different label; other features (like the swing detector) look specifically ' +
    'for candles labeled "1 minute".';

  readonly generateExplanation =
    'Builds the swing-pattern daily dataset (used by Swing Analysis) from the 1-minute candles ' +
    "already saved in the database for this symbol/range — it doesn't download anything new. " +
    'Re-running it over a range you already generated updates those days in place rather than ' +
    'erroring.';

  readonly coverageExplanation =
    'Shows which date ranges actually have data saved for this symbol — as separate periods if ' +
    'there are gaps (e.g. imported 2020-2021, then separately May-June 2022), rather than a ' +
    'single misleading min/max that spans the gap. A gap of up to about a week (weekends, a ' +
    'short holiday) still counts as one period; a wider gap means a real missing stretch.';

  readonly importForm = this.fb.nonNullable.group(
    {
      symbol: ['NVDA'],
      fromDate: [parseDateKey('2026-09-10')],
      toDate: [parseDateKey('2026-09-21')],
      timeframe: ['1 minute'],
    },
    { validators: dateRangeValidator('fromDate', 'toDate') },
  );

  loading = signal(false);
  errorMessage = '';
  successMessage = '';

  readonly generateForm = this.fb.nonNullable.group(
    {
      symbol: ['NVDA'],
      fromDate: [parseDateKey('2026-09-10')],
      toDate: [parseDateKey('2026-09-21')],
    },
    { validators: dateRangeValidator('fromDate', 'toDate') },
  );

  generating = signal(false);
  generateErrorMessage = '';
  generateSuccessMessage = '';

  import(): void {
    const { symbol, fromDate, toDate, timeframe } = this.importForm.getRawValue();
    if (!symbol || !fromDate || !toDate || !timeframe) {
      return;
    }
    if (fromDate > toDate) {
      this.errorMessage = 'From date cannot be after to date.';
      this.successMessage = '';
      return;
    }
    const upperSymbol = symbol.trim().toUpperCase();
    const fromKey = formatDateKey(fromDate);
    const toKey = formatDateKey(toDate);
    this.errorMessage = '';
    this.successMessage = '';
    this.loading.set(true);
    this.importService.checkCandleOverlap(upperSymbol, fromKey, toKey, timeframe).subscribe({
      next: (overlaps) => {
        this.loading.set(false);
        if (overlaps.length === 0) {
          this.performImport(upperSymbol, fromKey, toKey, timeframe);
          return;
        }
        this.dialog
          .open(ConfirmOverwriteDialog, {
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            disableClose: true,
            data: {
              title: 'Overwrite existing candles?',
              message: `Candles for ${upperSymbol} already exist for part of this range. Re-downloading will delete and re-save them:`,
              periods: overlaps,
              confirmLabel: 'Overwrite & download',
            } satisfies ConfirmOverwriteDialogData,
          })
          .afterClosed()
          .subscribe((confirmed) => {
            if (confirmed) {
              this.performImport(upperSymbol, fromKey, toKey, timeframe);
            }
          });
      },
      error: (error) => {
        this.loading.set(false);
        logger.error('Failed to check candle coverage:', error);
        this.errorMessage = 'Failed to check existing data before import.';
      },
    });
  }

  private performImport(symbol: string, fromKey: string, toKey: string, timeframe: string): void {
    this.loading.set(true);
    this.errorMessage = '';
    this.successMessage = '';
    const start = `${fromKey}T00:00:00`;
    const end = `${toKey}T23:59:59`;
    this.importService.importCandles(symbol, start, end, timeframe).subscribe({
      next: (message) => {
        this.loading.set(false);
        this.successMessage = message || 'Import finished.';
      },
      error: (error) => {
        this.loading.set(false);
        logger.error('Failed to import market candles:', error);
        this.errorMessage = 'Failed to import candles from Databento.';
      },
    });
  }

  generate(): void {
    const { symbol, fromDate, toDate } = this.generateForm.getRawValue();
    if (!symbol || !fromDate || !toDate) {
      return;
    }
    if (fromDate > toDate) {
      this.generateErrorMessage = 'From date cannot be after to date.';
      this.generateSuccessMessage = '';
      return;
    }
    const upperSymbol = symbol.trim().toUpperCase();
    const fromKey = formatDateKey(fromDate);
    const toKey = formatDateKey(toDate);
    this.generateErrorMessage = '';
    this.generateSuccessMessage = '';
    this.generating.set(true);
    this.swingService.checkDailyDatasetOverlap(upperSymbol, fromKey, toKey).subscribe({
      next: (overlaps) => {
        this.generating.set(false);
        if (overlaps.length === 0) {
          this.performGenerate(upperSymbol, fromKey, toKey);
          return;
        }
        this.dialog
          .open(ConfirmOverwriteDialog, {
            width: '420px',
            maxWidth: 'calc(100vw - 32px)',
            disableClose: true,
            data: {
              title: 'Overwrite existing daily dataset?',
              message: `A daily dataset for ${upperSymbol} already exists for part of this range. Regenerating will delete and re-save it:`,
              periods: overlaps,
              confirmLabel: 'Overwrite & generate',
            } satisfies ConfirmOverwriteDialogData,
          })
          .afterClosed()
          .subscribe((confirmed) => {
            if (confirmed) {
              this.performGenerate(upperSymbol, fromKey, toKey);
            }
          });
      },
      error: (error) => {
        this.generating.set(false);
        logger.error('Failed to check daily dataset coverage:', error);
        this.generateErrorMessage = 'Failed to check existing data before generating.';
      },
    });
  }

  private performGenerate(symbol: string, fromKey: string, toKey: string): void {
    this.generating.set(true);
    this.generateErrorMessage = '';
    this.generateSuccessMessage = '';
    this.swingService.generateSwingData(symbol, fromKey, toKey).subscribe({
      next: (days) => {
        this.generating.set(false);
        const count = days?.length ?? 0;
        const dayWord = count === 1 ? 'day' : 'days';
        this.generateSuccessMessage = `Generated daily dataset for ${count} ${dayWord}.`;
      },
      error: (error) => {
        this.generating.set(false);
        logger.error('Failed to generate daily dataset:', error);
        this.generateErrorMessage =
          'Failed to generate daily dataset. Make sure 1-minute candles exist for this range.';
      },
    });
  }

  readonly coverageForm = this.fb.nonNullable.group({
    symbol: ['NVDA'],
  });

  checkingCoverage = signal(false);
  coverageError = '';
  coverageSymbol = '';
  candleCoverage: CoveragePeriod[] | null = null;
  datasetCoverage: CoveragePeriod[] | null = null;

  checkCoverage(): void {
    const { symbol } = this.coverageForm.getRawValue();
    if (!symbol) {
      return;
    }
    const upperSymbol = symbol.trim().toUpperCase();
    this.checkingCoverage.set(true);
    this.coverageError = '';
    this.candleCoverage = null;
    this.datasetCoverage = null;
    forkJoin({
      candles: this.importService.getCandleCoverage(upperSymbol),
      dataset: this.swingService.getDailyDatasetCoverage(upperSymbol),
    }).subscribe({
      next: ({ candles, dataset }) => {
        this.checkingCoverage.set(false);
        this.coverageSymbol = upperSymbol;
        this.candleCoverage = candles;
        this.datasetCoverage = dataset;
      },
      error: (error) => {
        this.checkingCoverage.set(false);
        logger.error('Failed to check data coverage:', error);
        this.coverageError = 'Failed to check data coverage.';
      },
    });
  }
}
