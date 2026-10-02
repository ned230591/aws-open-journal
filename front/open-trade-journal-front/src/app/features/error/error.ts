import { ChangeDetectionStrategy, Component } from '@angular/core';

@Component({
  selector: 'app-error',
  imports: [],
  templateUrl: './error.html',
  styleUrl: './error.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Error {
  retry(): void {
    window.location.href = window.location.origin;
  }
}
