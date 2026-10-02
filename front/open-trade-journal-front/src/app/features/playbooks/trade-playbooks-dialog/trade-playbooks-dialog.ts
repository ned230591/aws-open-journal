import { ChangeDetectionStrategy, Component, Inject, OnInit, signal } from '@angular/core';

import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';

import { CommonModule } from '@angular/common';
import { MatIcon } from '@angular/material/icon';
import { MatCheckboxModule } from '@angular/material/checkbox';

import { PlaybookService } from '../playbook-component/services/playbook.service';
import { PlaybookDto } from '../playbook-component/models/playbook.model';
import { Trade } from '../../../core/models/trade.model';
import { logger } from '../../../core/utils/logger';

@Component({
  selector: 'app-trade-playbooks-dialog',
  standalone: true,
  imports: [CommonModule, MatIcon, MatCheckboxModule],
  templateUrl: './trade-playbooks-dialog.html',
  styleUrl: './trade-playbooks-dialog.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradePlaybooksDialog implements OnInit {
  playbooks: PlaybookDto[] = [];

  selectedPlaybookIds = signal<Set<number>>(new Set<number>());

  loading = signal(true);

  constructor(
    private readonly dialogRef: MatDialogRef<TradePlaybooksDialog>,
    private readonly playbookService: PlaybookService,
    @Inject(MAT_DIALOG_DATA)
    public readonly data: {
      trade: Trade;
    },
  ) {
    // Pre-select currently assigned playbooks
    const selectedIds = new Set<number>();

    for (const playbook of data.trade.playbooks ?? []) {
      selectedIds.add(playbook.id);
    }

    this.selectedPlaybookIds.set(selectedIds);
  }

  ngOnInit(): void {
    this.loadPlaybooks();
  }

  private loadPlaybooks(): void {
    this.loading.set(true);

    this.playbookService.findAll(0, 100, 'strategy', 'asc').subscribe({
      next: (response) => {
        this.playbooks = response.content;
        this.loading.set(false);
      },

      error: (error) => {
        logger.error('Failed to load playbooks:', error);

        this.loading.set(false);
      },
    });
  }

  isSelected(playbookId: number): boolean {
    return this.selectedPlaybookIds().has(playbookId);
  }

  togglePlaybook(playbookId: number): void {
    const selected = new Set(this.selectedPlaybookIds());

    if (selected.has(playbookId)) {
      selected.delete(playbookId);
    } else {
      selected.add(playbookId);
    }

    this.selectedPlaybookIds.set(selected);
  }

  cancel(): void {
    this.dialogRef.close();
  }

  save(): void {
    this.dialogRef.close(Array.from(this.selectedPlaybookIds()));
  }
}
