import { ChangeDetectionStrategy, Component, input, model, output } from '@angular/core';

@Component({
  selector: 'app-pagination',
  standalone: true,
  imports: [],
  templateUrl: './pagination.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Pagination {
  readonly currentPage = input.required<number>();
  readonly totalPages = input.required<number>();
  readonly disabled = input(false);
  readonly pageInput = model.required<number>();

  readonly previous = output<void>();
  readonly next = output<void>();
  readonly go = output<void>();

  onPageInputChange(value: number): void {
    this.pageInput.set(value);
  }
}
