import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { MatTooltip } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { Trade } from '../../core/models/trade.model';
import {
  TradeEvaluation,
  TradeEvaluationScreenshot,
  EvaluationRating,
  MistakeType,
  TradeEvaluationRequest,
} from '../../core/models/trade-evaluation.model';
import { TradesService } from '../../core/services/trades.service';
import { logger } from '../../core/utils/logger';

@Component({
  selector: 'app-trade-evaluation-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIcon, MatTooltip],
  templateUrl: './trade-evaluation-dialog.html',
  styleUrls: ['./trade-evaluation-dialog.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradeEvaluationDialog implements OnInit {
  trade: Trade;
  playbookAdherence = signal<EvaluationRating | null>(null);
  entryQuality = signal<EvaluationRating | null>(null);
  exitQuality = signal<EvaluationRating | null>(null);
  riskManagementQuality = signal<EvaluationRating | null>(null);
  executionQuality = signal<EvaluationRating | null>(null);
  mistakeType = signal<MistakeType | null>(null);
  positivePoints = signal<string[]>([]);
  negativePoints = signal<string[]>([]);
  newPositivePoint = signal('');
  newNegativePoint = signal('');
  comment = signal('');
  screenshots = signal<TradeEvaluationScreenshot[]>([]);
  screenshotsToUpload = signal<File[]>([]);
  screenshotPreviews = signal<string[]>([]);
  screenshotUrls = signal<Record<number, string>>({});
  loading = signal(false);
  saving = signal(false);

  readonly mistakeTypes: MistakeType[] = [
    'NO_MISTAKE',
    'CHASING',
    'EARLY_ENTRY',
    'LATE_ENTRY',
    'EARLY_EXIT',
    'LATE_EXIT',
    'OVERSIZED_POSITION',
    'MOVED_STOP',
    'IGNORED_STOP',
    'REVENGE_TRADE',
    'OVERTRADING',
    'FOMO',
    'TRADED_OUTSIDE_PLAYBOOK',
    'POOR_RISK_REWARD',
    'HESITATION',
    'OTHER',
  ];

  readonly evaluationRatings: EvaluationRating[] = [
    'EXCELLENT',
    'GOOD',
    'AVERAGE',
    'POOR',
    'VERY_POOR',
  ];

  constructor(
    private readonly dialogRef: MatDialogRef<TradeEvaluationDialog>,
    private readonly tradesService: TradesService,
    @Inject(MAT_DIALOG_DATA)
    data: { trade: Trade },
  ) {
    this.trade = data.trade;
  }

  ngOnInit(): void {
    this.loadEvaluation();
  }

  loadEvaluation(): void {
    if (!this.trade?.id) {
      return;
    }
    this.loading.set(true);
    this.tradesService.getTradeEvaluation(this.trade.ibExecID).subscribe({
      next: (evaluation: TradeEvaluation | null) => {
        if (!evaluation) {
          this.loading.set(false);
          return;
        }
        this.playbookAdherence.set(evaluation.playbookAdherence ?? null);
        this.entryQuality.set(evaluation.entryQuality ?? null);
        this.exitQuality.set(evaluation.exitQuality ?? null);
        this.riskManagementQuality.set(evaluation.riskManagementQuality ?? null);
        this.executionQuality.set(evaluation.executionQuality ?? null);
        this.mistakeType.set(evaluation.mistakeType ?? null);
        this.positivePoints.set([...(evaluation.positivePoints ?? [])]);
        this.negativePoints.set([...(evaluation.negativePoints ?? [])]);
        this.comment.set(evaluation.comment ?? '');
        this.screenshots.set([...(evaluation.screenshots ?? [])]);
        this.loadSavedScreenshotUrls(evaluation.screenshots ?? []);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
      },
    });
  }

  setPlaybookAdherence(value: EvaluationRating): void {
    this.playbookAdherence.set(value);
  }

  setEntryQuality(value: EvaluationRating): void {
    this.entryQuality.set(value);
  }

  setExitQuality(value: EvaluationRating): void {
    this.exitQuality.set(value);
  }

  setRiskManagementQuality(value: EvaluationRating): void {
    this.riskManagementQuality.set(value);
  }

  setExecutionQuality(value: EvaluationRating): void {
    this.executionQuality.set(value);
  }

  setMistakeType(value: MistakeType): void {
    this.mistakeType.set(value);
  }

  formatRating(value: EvaluationRating | null): string {
    if (!value) {
      return '';
    }
    return value
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  formatMistake(value: MistakeType | null): string {
    if (!value) {
      return '';
    }
    return value
      .replaceAll('_', ' ')
      .toLowerCase()
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }

  addPositivePoint(): void {
    const point = this.newPositivePoint().trim();
    if (!point) {
      return;
    }
    this.positivePoints.update((points) => [...points, point]);
    this.newPositivePoint.set('');
  }

  updatePositivePoint(index: number, value: string): void {
    this.positivePoints.update((points) => {
      const updated = [...points];
      updated[index] = value;
      return updated;
    });
  }

  removePositivePoint(index: number): void {
    this.positivePoints.update((points) => points.filter((_, i) => i !== index));
  }

  addNegativePoint(): void {
    const point = this.newNegativePoint().trim();
    if (!point) {
      return;
    }
    this.negativePoints.update((points) => [...points, point]);
    this.newNegativePoint.set('');
  }

  updateNegativePoint(index: number, value: string): void {
    this.negativePoints.update((points) => {
      const updated = [...points];
      updated[index] = value;
      return updated;
    });
  }

  removeNegativePoint(index: number): void {
    this.negativePoints.update((points) => points.filter((_, i) => i !== index));
  }

  onPositivePointKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addPositivePoint();
    }
  }
  onNegativePointKeydown(event: KeyboardEvent): void {
    if (event.key === 'Enter') {
      event.preventDefault();
      this.addNegativePoint();
    }
  }

  onScreenshotSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    if (!input.files?.length) {
      return;
    }
    const files = Array.from(input.files);
    const validFiles = files.filter((file) => file.type.startsWith('image/'));
    this.screenshotsToUpload.update((existing) => [...existing, ...validFiles]);
    validFiles.forEach((file) => {
      const reader = new FileReader();
      reader.onload = () => {
        this.screenshotPreviews.update((previews) => [...previews, reader.result as string]);
      };
      reader.readAsDataURL(file);
    });
    input.value = '';
  }

  removeScreenshotToUpload(index: number): void {
    this.screenshotsToUpload.update((files) => files.filter((_, i) => i !== index));
    this.screenshotPreviews.update((previews) => previews.filter((_, i) => i !== index));
  }

  loadSavedScreenshotUrls(screenshots: TradeEvaluationScreenshot[]): void {
    if (!screenshots?.length) {
      return;
    }
    const requests = screenshots.map((screenshot) =>
      this.tradesService.getTradeEvaluationScreenshot(this.trade.ibExecID, screenshot.id),
    );

    forkJoin(requests).subscribe({
      next: (blobs) => {
        blobs.forEach((blob, index) => {
          const screenshot = screenshots[index];
          const reader = new FileReader();
          reader.onload = () => {
            this.screenshotUrls.update((urls) => ({
              ...urls,
              [screenshot.id]: reader.result as string,
            }));
          };
          reader.readAsDataURL(blob);
        });
      },
    });
  }

  getSavedScreenshotUrl(screenshotId: number): string | null {
    return this.screenshotUrls()[screenshotId] ?? null;
  }

  deleteSavedScreenshot(screenshot: TradeEvaluationScreenshot): void {
    if (!this.trade?.id) {
      return;
    }
    this.tradesService.deleteTradeEvaluationScreenshot(screenshot.id).subscribe({
      next: () => {
        this.screenshots.update((screenshots) =>
          screenshots.filter((item) => item.id !== screenshot.id),
        );
        this.screenshotUrls.update((urls) => {
          const updated = { ...urls };
          delete updated[screenshot.id];
          return updated;
        });
      },
    });
  }

  openScreenshot(screenshotId: number): void {
    this.tradesService.getTradeEvaluationScreenshot(this.trade.ibExecID, screenshotId).subscribe({
      next: (blob: Blob) => {
        const url = URL.createObjectURL(blob);
        window.open(url, '_blank', 'noopener,noreferrer');
        setTimeout(() => {
          URL.revokeObjectURL(url);
        }, 60_000);
      },
      error: (error) => {
        logger.error('Failed to load screenshot', error);
      },
    });
  }

  save(): void {
    if (!this.trade?.id) {
      return;
    }
    this.saving.set(true);
    const request: TradeEvaluationRequest = {
      playbookAdherence: this.playbookAdherence(),
      entryQuality: this.entryQuality(),
      exitQuality: this.exitQuality(),
      riskManagementQuality: this.riskManagementQuality(),
      executionQuality: this.executionQuality(),
      mistakeType: this.mistakeType(),
      positivePoints: this.positivePoints()
        .map((point) => point.trim())
        .filter(Boolean),
      negativePoints: this.negativePoints()
        .map((point) => point.trim())
        .filter(Boolean),
      comment: this.comment().trim(),
    };
    this.tradesService.saveTradeEvaluation(this.trade.ibExecID, request).subscribe({
      next: (evaluation) => {
        const files = this.screenshotsToUpload();
        if (!files.length) {
          this.saving.set(false);
          this.dialogRef.close(evaluation);
          return;
        }
        const uploads = files.map((file) =>
          this.tradesService.uploadTradeEvaluationScreenshot(this.trade.ibExecID, file),
        );
        forkJoin(uploads).subscribe({
          next: () => {
            this.saving.set(false);
            this.dialogRef.close(evaluation);
          },
          error: () => {
            this.saving.set(false);
          },
        });
      },
      error: () => {
        this.saving.set(false);
      },
    });
  }
  cancel(): void {
    this.dialogRef.close();
  }
}
