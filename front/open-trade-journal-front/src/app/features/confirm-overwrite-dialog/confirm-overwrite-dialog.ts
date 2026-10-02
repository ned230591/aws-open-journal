import { ChangeDetectionStrategy, Component, inject } from '@angular/core';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogClose,
  MatDialogContent,
} from '@angular/material/dialog';
import { MatIcon } from '@angular/material/icon';
import { CoveragePeriod } from '../../core/models/coverage-period.model';

export interface ConfirmOverwriteDialogData {
  title: string;
  message: string;
  periods: CoveragePeriod[];
  confirmLabel: string;
}

@Component({
  selector: 'app-confirm-overwrite-dialog',
  imports: [MatDialogActions, MatDialogContent, MatIcon, MatDialogClose],
  templateUrl: './confirm-overwrite-dialog.html',
  styleUrl: './confirm-overwrite-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class ConfirmOverwriteDialog {
  readonly data = inject<ConfirmOverwriteDialogData>(MAT_DIALOG_DATA);
}
