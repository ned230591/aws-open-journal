import { ChangeDetectionStrategy, Component, Inject } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

@Component({
  selector: 'app-delete-playbook-dialog',
  imports: [],
  templateUrl: './delete-playbook-dialog.html',
  styleUrl: './delete-playbook-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class DeletePlaybookDialog {
  constructor(
    private dialogRef: MatDialogRef<DeletePlaybookDialog>,
    @Inject(MAT_DIALOG_DATA)
    public data: { name: string },
  ) {}

  cancel(): void {
    this.dialogRef.close(false);
  }

  confirm(): void {
    this.dialogRef.close(true);
  }
}
