import {
  ChangeDetectionStrategy,
  Component,
  inject,
  OnDestroy,
  OnInit,
  signal,
} from '@angular/core';
import { TradePlaybooksDialog } from '../playbooks/trade-playbooks-dialog/trade-playbooks-dialog';
import { CommonModule, CurrencyPipe } from '@angular/common';
import { Subject, takeUntil, forkJoin } from 'rxjs';
import { TradesService } from '../../core/services/trades.service';
import { Trade } from '../../core/models/trade.model';
import { TradeSocketService } from '../../core/services/trade-socket.service';
import { MatIcon } from '@angular/material/icon';
import { MatDialog } from '@angular/material/dialog';
import { TradeEvaluationDialog } from '../trade-evaluation-dialog/trade-evaluation-dialog';
import { MatTooltip } from '@angular/material/tooltip';
import { Pagination } from '../../shared/pagination/pagination';
import { logger } from '../../core/utils/logger';

@Component({
  selector: 'app-trades-history',
  standalone: true,
  imports: [CommonModule, CurrencyPipe, MatIcon, MatTooltip, Pagination],
  templateUrl: './trades-history.html',
  styleUrl: './trades-history.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TradesHistory implements OnInit, OnDestroy {
  private tradeSocketService = inject(TradeSocketService);
  private tradesService = inject(TradesService);
  private destroy$ = new Subject<void>();
  private readonly dialog = inject(MatDialog);
  trades: Trade[] = [];
  currentPage = 0;
  pageSize = 10;
  totalElements = 0;
  totalPages = 0;
  pageInput = 1;
  symbolFilter = '';
  sortBy = 'orderTime';
  sortDirection: 'asc' | 'desc' = 'desc';
  loading = signal(false);
  expandedTrade = signal<number | null>(null);

  ngOnInit(): void {
    this.loadTrades(0);
    this.listenForNewTrades();
  }

  constructor() {}

  openTradePlaybooks(trade: Trade): void {
    const dialogRef = this.dialog.open(TradePlaybooksDialog, {
      width: 'calc(100vw - 32px)',
      maxWidth: '600px',
      data: {
        trade,
      },
      disableClose: false,
      panelClass: 'trade-playbooks-dialog',
    });

    dialogRef.afterClosed().subscribe((selectedPlaybookIds: number[] | undefined) => {
      if (!selectedPlaybookIds) {
        return;
      }
      this.updateTradePlaybooks(trade, selectedPlaybookIds);
    });
  }

  private updateTradePlaybooks(trade: Trade, selectedPlaybookIds: number[]): void {
    const currentIds = new Set((trade.playbooks ?? []).map((playbook) => playbook.id));
    const selectedIds = new Set(selectedPlaybookIds);
    const idsToAssign = selectedPlaybookIds.filter((id) => !currentIds.has(id));
    const idsToRemove = Array.from(currentIds).filter((id) => !selectedIds.has(id));
    const requests = [
      ...idsToAssign.map((playbookId) => this.tradesService.assignPlaybook(trade.id, playbookId)),
      ...idsToRemove.map((playbookId) => this.tradesService.unassignPlaybook(trade.id, playbookId)),
    ];
    if (requests.length === 0) {
      return;
    }
    this.loading.set(true);
    forkJoin(requests).subscribe({
      next: () => {
        this.loadTrades(this.currentPage);
      },
      error: (error) => {
        logger.error('Failed to update trade playbooks:', error);
        this.loading.set(false);
      },
    });
  }

  private listenForNewTrades(): void {
    this.tradeSocketService.trades$.pipe(takeUntil(this.destroy$)).subscribe({
      next: (event) => {
        logger.log('History received new trade:', event);
        this.loadTrades(0);
      },
    });
  }

  loadTrades(page: number): void {
    if (page < 0) {
      page = 0;
    }
    if (this.totalPages > 0 && page >= this.totalPages) {
      page = this.totalPages - 1;
    }
    this.loading.set(true);
    this.tradesService
      .getTrades(page, this.pageSize, this.symbolFilter, this.sortBy, this.sortDirection)
      .subscribe({
        next: (response) => {
          this.trades = response.content;
          this.currentPage = response.number;
          this.pageInput = response.number + 1;
          this.totalElements = response.totalElements;
          this.totalPages = response.totalPages;
          this.expandedTrade.set(null);
          this.loading.set(false);
          logger.log('Trades loaded:', this.trades.length);
        },
        error: (error) => {
          logger.error('Failed to load trades:', error);
          this.trades = [];
          this.totalElements = 0;
          this.totalPages = 0;
          this.loading.set(false);
        },
      });
  }

  onSymbolFilterChange(value: string): void {
    this.symbolFilter = value.trim();
    this.loadTrades(0);
  }

  clearSymbolFilter(): void {
    this.symbolFilter = '';
    this.loadTrades(0);
  }
  sortByColumn(column: string): void {
    if (this.sortBy === column) {
      this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
    } else {
      this.sortBy = column;
      this.sortDirection =
        column === 'orderTime' ||
        column === 'tradePrice' ||
        column === 'quantity' ||
        column === 'fifoPnlRealized'
          ? 'desc'
          : 'asc';
    }
    this.loadTrades(0);
  }

  resetFilters(): void {
    this.symbolFilter = '';
    this.sortBy = 'orderTime';
    this.sortDirection = 'desc';
    this.loadTrades(0);
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages - 1) {
      this.loadTrades(this.currentPage + 1);
    }
  }

  previousPage(): void {
    if (this.currentPage > 0) {
      this.loadTrades(this.currentPage - 1);
    }
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
    this.loadTrades(page - 1);
  }

  toggleTrade(index: number): void {
    this.expandedTrade.update((current) => (current === index ? null : index));
  }
  formatOrderTime(orderTime: string | null | undefined): string {
    if (!orderTime) {
      return '—';
    }
    const date = new Date(orderTime);
    if (isNaN(date.getTime())) {
      return '—';
    }
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: false,
    });
  }

  getSideClass(side: string): string {
    return side?.toUpperCase() === 'BUY' ? 'buy' : 'sell';
  }

  formatPrice(price: number | null): string {
    if (price === null || price === undefined) {
      return '—';
    }
    return price.toLocaleString('en-US', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 4,
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  openTradeEvaluation(trade: Trade): void {
    const dialogRef = this.dialog.open(TradeEvaluationDialog, {
      width: 'calc(100vw - 21vw)',
      maxWidth: 'calc(100vw - 21vw)',
      data: { trade },
      disableClose: false,
      panelClass: 'trade-evaluation-dialog',
    });

    dialogRef.afterClosed().subscribe((saved: boolean) => {
      if (saved) {
        logger.log('Trade evaluation saved:', trade.id);
        this.loadTrades(this.currentPage);
      }
    });
  }
}
