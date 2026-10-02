import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { MatIcon } from '@angular/material/icon';

@Component({
  selector: 'app-page-header',
  standalone: true,
  imports: [MatIcon],
  templateUrl: './page-header.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PageHeader {
  /** Bootstrap icon class, e.g. 'bi-speedometer2'. Ignored if matIcon is set. */
  readonly icon = input<string>('');
  /** Material icon ligature name, e.g. 'help_outline'. Takes precedence over icon. */
  readonly matIcon = input<string>('');
  readonly title = input.required<string>();
  readonly subtitle = input<string>('');
}
