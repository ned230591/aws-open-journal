import { ChangeDetectionStrategy, Component, OnInit, inject, signal } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatDialog } from '@angular/material/dialog';
import { PlaybookService } from './services/playbook.service';
import { PlaybookDto, PlaybookPerformance } from './models/playbook.model';
import { DeletePlaybookDialog } from '../delete-playbook-dialog/delete-playbook-dialog';
import { Pagination } from '../../../shared/pagination/pagination';
import { PlaybookForm } from './playbook-form/playbook-form';
import { PlaybookComparator } from './playbook-comparator/playbook-comparator';
import { PlaybookPerformanceGrid } from './playbook-performance-grid/playbook-performance-grid';
import { logger } from '../../../core/utils/logger';

type PlaybookMode = 'LIST' | 'FORM';

@Component({
  selector: 'app-playbook',
  standalone: true,
  imports: [CommonModule, Pagination, PlaybookForm, PlaybookComparator, PlaybookPerformanceGrid],
  templateUrl: './playbook.html',
  styleUrl: './playbook.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Playbook implements OnInit {
  private playbookService = inject(PlaybookService);
  private dialog = inject(MatDialog);

  mode: PlaybookMode = 'LIST';
  playbooks: PlaybookDto[] = [];
  editingPlaybook: PlaybookDto | null = null;
  loading = signal(false);
  errorMessage = '';
  expandedPlaybook = signal<number | null>(null);
  analyzedPlaybookId = signal<number | null>(null);
  playbookAnalysis = signal<PlaybookPerformance | null>(null);
  analysisLoading = signal(false);
  analysisError = '';
  comparatorOpen = signal(false);
  sortColumn: 'id' | 'strategy' | 'status' | 'createdAt' = 'id';
  sortDirection: 'asc' | 'desc' = 'asc';
  pageInput = 1;
  currentPage = 0;
  pageSize = 2;
  totalPages = 0;
  totalElements = 0;

  ngOnInit(): void {
    this.loadPlaybooks(this.currentPage);
  }

  goToPage(): void {
    const page = Number(this.pageInput);
    if (!Number.isInteger(page)) {
      this.pageInput = this.currentPage + 1;
      return;
    }
    if (page < 1 || page > this.totalPages) {
      this.pageInput = this.currentPage + 1;
      return;
    }
    this.closeAnalysis();
    this.loadPlaybooks(page - 1);
  }

  previousPage(): void {
    if (this.currentPage <= 0) {
      return;
    }
    this.closeAnalysis();
    this.loadPlaybooks(this.currentPage - 1);
  }

  nextPage(): void {
    if (this.currentPage >= this.totalPages - 1) {
      return;
    }
    this.closeAnalysis();
    this.loadPlaybooks(this.currentPage + 1);
  }

  sortBy(column: 'id' | 'strategy' | 'status' | 'createdAt'): void {
    if (this.sortColumn === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortColumn = column;
      this.sortDirection = 'asc';
    }
    this.currentPage = 0;
    this.pageInput = 1;
    this.closeAnalysis();
    this.loadPlaybooks(0);
  }

  togglePlaybook(index: number): void {
    this.expandedPlaybook.update((current) => (current === index ? null : index));
  }

  analyze(playbook: PlaybookDto): void {
    if (!playbook.id) {
      return;
    }
    if (this.analyzedPlaybookId() === playbook.id) {
      this.closeAnalysis();
      return;
    }
    this.comparatorOpen.set(false);
    this.analyzedPlaybookId.set(playbook.id);
    this.playbookAnalysis.set(null);
    this.analysisError = '';
    this.analysisLoading.set(true);
    this.playbookService.getPerformance().subscribe({
      next: (performance) => {
        const result = performance.find((item) => item.playbookId === playbook.id);
        this.playbookAnalysis.set(result ?? null);
        this.analysisLoading.set(false);
      },
      error: (error) => {
        logger.error(error);
        this.analysisError = 'Unable to load playbook analysis.';
        this.analysisLoading.set(false);
      },
    });
  }

  closeAnalysis(): void {
    this.analyzedPlaybookId.set(null);
    this.playbookAnalysis.set(null);
    this.analysisError = '';
    this.analysisLoading.set(false);
  }

  toggleComparator(): void {
    if (this.comparatorOpen()) {
      this.comparatorOpen.set(false);
      return;
    }
    this.closeAnalysis();
    this.comparatorOpen.set(true);
  }

  showCreate(): void {
    this.mode = 'FORM';
    this.editingPlaybook = null;
    this.errorMessage = '';
    this.closeAnalysis();
    this.comparatorOpen.set(false);
  }

  showEdit(playbook: PlaybookDto): void {
    if (!playbook.id) {
      return;
    }
    this.mode = 'FORM';
    this.editingPlaybook = playbook;
    this.errorMessage = '';
    this.closeAnalysis();
    this.comparatorOpen.set(false);
  }

  onFormSaved(): void {
    const wasEditing = this.editingPlaybook !== null;
    this.mode = 'LIST';
    this.editingPlaybook = null;
    if (!wasEditing) {
      this.currentPage = 0;
      this.pageInput = 1;
    }
    this.loadPlaybooks(this.currentPage);
  }

  onFormCancelled(): void {
    this.mode = 'LIST';
    this.editingPlaybook = null;
    this.errorMessage = '';
  }

  loadPlaybooks(page: number): void {
    this.loading.set(true);
    this.errorMessage = '';
    this.playbookService
      .findAll(page, this.pageSize, this.sortColumn, this.sortDirection)
      .subscribe({
        next: (response) => {
          this.playbooks = response.content;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.currentPage = response.number;
          this.pageInput = this.currentPage + 1;
          this.expandedPlaybook.set(null);
          this.loading.set(false);
        },

        error: (error) => {
          logger.error(error);
          this.errorMessage = 'Unable to load playbooks.';
          this.loading.set(false);
        },
      });
  }

  delete(playbook: PlaybookDto): void {
    if (!playbook.id) {
      return;
    }

    const dialogRef = this.dialog.open(DeletePlaybookDialog, {
      width: '420px',
      maxWidth: '90vw',
      panelClass: 'cmd-dialog-panel',
      data: {
        name: playbook.strategy,
      },
    });

    dialogRef.afterClosed().subscribe((confirmed) => {
      if (!confirmed) {
        return;
      }
      this.playbookService.delete(playbook.id!).subscribe({
        next: () => {
          this.closeAnalysis();
          this.comparatorOpen.set(false);
          this.expandedPlaybook.set(null);
          if (this.playbooks.length === 1 && this.currentPage > 0) {
            this.currentPage--;
          }
          this.loadPlaybooks(this.currentPage);
        },

        error: (error) => {
          logger.error(error);
          this.errorMessage = 'Unable to delete playbook.';
        },
      });
    });
  }
}
