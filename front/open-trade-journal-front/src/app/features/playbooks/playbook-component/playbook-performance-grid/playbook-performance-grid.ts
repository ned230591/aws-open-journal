import { ChangeDetectionStrategy, Component, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { PlaybookPerformance } from '../models/playbook.model';

@Component({
  selector: 'app-playbook-performance-grid',
  standalone: true,
  imports: [DecimalPipe],
  templateUrl: './playbook-performance-grid.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaybookPerformanceGrid {
  readonly performance = input.required<PlaybookPerformance>();
}
