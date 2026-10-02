import {
  ChangeDetectionStrategy,
  Component,
  ChangeDetectorRef,
  inject,
  signal,
} from '@angular/core';
import { MatIcon } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatProgressSpinner } from '@angular/material/progress-spinner';
import { CsvImportService } from './services/csv-import.service';
import { DeleteDialog } from '../delete-dialog/delete-dialog';
import { TradesService } from '../../core/services/trades.service';
import { PageHeader } from '../../shared/page-header/page-header';
import { logger } from '../../core/utils/logger';

@Component({
  selector: 'app-csv-import',
  imports: [
    MatTooltipModule,
    MatProgressSpinnerModule,
    MatIcon,
    MatSnackBarModule,
    MatProgressSpinner,
    MatDialogModule,
    PageHeader,
  ],
  templateUrl: './csv-import.html',
  styleUrl: './csv-import.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class CsvImport {
  private readonly tradeService: TradesService = inject(TradesService);
  private readonly importService: CsvImportService = inject(CsvImportService);

  constructor(
    private readonly snackBar: MatSnackBar,
    private readonly cdr: ChangeDetectorRef,
    private readonly dialog: MatDialog,
  ) {}

  selectedFile?: File;
  loading = signal(false);
  deleting = signal(false);
  fileInput?: HTMLInputElement;

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    this.fileInput = input;
    if (input.files && input.files.length > 0) {
      this.selectedFile = input.files[0];
    }
  }

  upload(): void {
    if (!this.selectedFile) {
      return;
    }
    this.loading.set(true);
    this.importService.uploadCsv(this.selectedFile).subscribe({
      next: (message) => {
        this.loading.set(false);
        this.showMessage(message, 'success');
        this.clearFile();
        this.cdr.detectChanges();
      },
      error: (error) => {
        this.loading.set(false);
        let message = 'Import failed';
        if (error?.error) {
          message = typeof error.error === 'string' ? error.error : 'Import failed';
        }
        this.showMessage(message, 'error');
        this.clearFile();
        this.cdr.detectChanges();
      },
    });
  }

  confirmDeleteAllTrades(): void {
    if (this.loading() || this.deleting()) {
      return;
    }
    const dialogRef = this.dialog.open(DeleteDialog, {
      width: '420px',
      maxWidth: 'calc(100vw - 32px)',
      disableClose: true,
      panelClass: 'delete-confirm-dialog',
    });
    dialogRef.afterClosed().subscribe((confirmed: boolean) => {
      if (confirmed) {
        this.deleteAllTrades();
      }
    });
  }

  private deleteAllTrades(): void {
    if (this.deleting()) {
      return;
    }
    this.deleting.set(true);
    this.tradeService.deleteAllTrades().subscribe({
      next: (message) => {
        this.deleting.set(false);
        this.showMessage(message || 'All trades deleted successfully', 'success');
        this.cdr.detectChanges();
      },
      error: (error) => {
        logger.log('error ' + JSON.stringify(error));
        this.deleting.set(false);
        let message = 'Failed to delete trades';
        if (error?.error) {
          message = typeof error.error === 'string' ? error.error : message;
        }
        this.showMessage(message, 'error');
        this.cdr.detectChanges();
      },
    });
  }

  private clearFile(): void {
    this.selectedFile = undefined;
    if (this.fileInput) {
      this.fileInput.value = '';
    }
  }

  private showMessage(message: string, type: 'success' | 'error'): void {
    this.snackBar.open(message, 'Close', {
      duration: 4000,
      horizontalPosition: 'right',
      verticalPosition: 'top',
      panelClass: type === 'success' ? 'success-snackbar' : 'error-snackbar',
    });
  }
}
