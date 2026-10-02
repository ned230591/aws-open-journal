import { ChangeDetectionStrategy, Component, inject, OnInit, output, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { PlaybookService } from '../services/playbook.service';
import { PlaybookPerformance } from '../models/playbook.model';
import { logger } from '../../../../core/utils/logger';

@Component({
  selector: 'app-playbook-comparator',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './playbook-comparator.html',
  styleUrl: './playbook-comparator.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class PlaybookComparator implements OnInit {
  private readonly playbookService = inject(PlaybookService);

  readonly closed = output<void>();

  comparatorLoading = signal(false);
  comparatorError = '';
  comparatorData = signal<PlaybookPerformance[]>([]);
  selectedPlaybookIds = signal<number[]>([]);

  get selectedComparatorPlaybooks(): PlaybookPerformance[] {
    const selectedIds = this.selectedPlaybookIds();
    return this.comparatorData().filter((playbook) => selectedIds.includes(playbook.playbookId));
  }

  isPlaybookSelected(playbookId: number): boolean {
    return this.selectedPlaybookIds().includes(playbookId);
  }

  ngOnInit(): void {
    this.loadComparator();
  }

  toggleSelection(playbookId: number): void {
    this.selectedPlaybookIds.update((ids) => {
      if (ids.includes(playbookId)) {
        return ids.filter((id) => id !== playbookId);
      }
      return [...ids, playbookId];
    });
  }

  loadComparator(): void {
    this.comparatorLoading.set(true);
    this.comparatorError = '';
    this.playbookService.getPerformance().subscribe({
      next: (performance) => {
        const sorted = [...performance].sort((a, b) => b.netPnl - a.netPnl);
        this.comparatorData.set(sorted);
        const availableIds = new Set(sorted.map((item) => item.playbookId));
        let selectedIds = this.selectedPlaybookIds().filter((id) => availableIds.has(id));

        if (selectedIds.length === 0) {
          selectedIds = sorted.slice(0, 2).map((item) => item.playbookId);
        }

        if (selectedIds.length === 1 && sorted.length > 1) {
          const second = sorted.find((item) => item.playbookId !== selectedIds[0]);
          if (second) {
            selectedIds = [...selectedIds, second.playbookId];
          }
        }
        this.selectedPlaybookIds.set(selectedIds);
        this.comparatorLoading.set(false);
      },

      error: (error) => {
        logger.error(error);
        this.comparatorError = 'Unable to load playbook comparison.';
        this.comparatorLoading.set(false);
      },
    });
  }

  close(): void {
    this.closed.emit();
  }
}
