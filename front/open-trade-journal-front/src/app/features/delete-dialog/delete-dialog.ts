import {MatDialogActions, MatDialogClose, MatDialogContent} from '@angular/material/dialog';
import {Component} from '@angular/core';
import {MatIcon} from '@angular/material/icon';

@Component({
  selector: 'app-delete-dialog',
  imports: [
    MatDialogActions,
    MatDialogContent,
    MatIcon,
    MatDialogClose
  ],
  templateUrl: './delete-dialog.html',
  styleUrl: './delete-dialog.scss',
})
export class DeleteDialog {

}
