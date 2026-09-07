import {Component, inject, OnDestroy, OnInit, signal} from '@angular/core';

import {CommonModule, CurrencyPipe} from '@angular/common';

import {Subject, takeUntil} from 'rxjs';

import {TradesService} from '../../core/services/trades.service';
import {Trade} from '../../core/models/trade.model';
import {TradeSocketService} from '../../core/services/trade-socket.service';
import {MatIcon} from '@angular/material/icon';
import {MatDialog} from '@angular/material/dialog';
import {TradeEvaluationDialog} from '../trade-evaluation-dialog/trade-evaluation-dialog';


@Component({
  selector: 'app-trades-history',
  standalone: true,
  imports: [
    CommonModule,
    CurrencyPipe,
    MatIcon
  ],
  templateUrl: './trades-history.html',
  styleUrl: './trades-history.scss',
})
export class TradesHistory implements OnInit, OnDestroy {

  private tradeSocketService = inject(TradeSocketService);
  private tradesService = inject(TradesService);

  private destroy$ = new Subject<void>();

  private readonly dialog =
    inject(MatDialog);
  // ================================
  // DATA
  // ================================

  trades: Trade[] = [];


  // ================================
  // PAGINATION
  // ================================

  currentPage = 0;
  pageSize = 10;

  totalElements = 0;
  totalPages = 0;

  pageInput = 1;


  // ================================
  // FILTER
  // ================================

  symbolFilter = '';


  // ================================
  // SORT
  // ================================

  sortBy = 'orderTime';

  sortDirection: 'asc' | 'desc' = 'desc';


  // ================================
  // UI STATE
  // ================================

  loading = signal(false);

  expandedTrade = signal<number | null>(null);


  // ================================
  // INIT
  // ================================

  ngOnInit(): void {

    this.loadTrades(0);

    this.listenForNewTrades();
  }

constructor() {

}
  // ================================
  // WEBSOCKET
  // ================================

  private listenForNewTrades(): void {

    this.tradeSocketService.trades$
      .pipe(takeUntil(this.destroy$))
      .subscribe({

        next: (event) => {

          console.log(
            '🔥 History received new trade:',
            event
          );

          // Reload first page so newest trade appears.
          this.loadTrades(0);
        }

      });
  }


  // ================================
  // LOAD TRADES
  // ================================

  loadTrades(page: number): void {

    if (page < 0) {
      page = 0;
    }

    if (
      this.totalPages > 0 &&
      page >= this.totalPages
    ) {
      page = this.totalPages - 1;
    }


    this.loading.set(true);


    this.tradesService
      .getTrades(
        page,
        this.pageSize,
        this.symbolFilter,
        this.sortBy,
        this.sortDirection
      )
      .subscribe({

        next: (response) => {

          this.trades = response.content;

          this.currentPage = response.number;

          this.pageInput =
            response.number + 1;

          this.totalElements =
            response.totalElements;

          this.totalPages =
            response.totalPages;

          this.expandedTrade.set(null);

          this.loading.set(false);


          console.log(
            'Trades loaded:',
            this.trades.length
          );

        },


        error: (error) => {

          console.error(
            'Failed to load trades:',
            error
          );

          this.trades = [];

          this.totalElements = 0;
          this.totalPages = 0;

          this.loading.set(false);

        }

      });
  }


  // ================================
  // SYMBOL FILTER
  // ================================

  onSymbolFilterChange(value: string): void {

    this.symbolFilter = value.trim();

    // Whenever filter changes,
    // start from first page.
    this.loadTrades(0);
  }


  clearSymbolFilter(): void {

    this.symbolFilter = '';

    this.loadTrades(0);
  }


  // ================================
  // SORTING
  // ================================
  sortByColumn(column: string): void {

    if (this.sortBy === column) {
      this.sortDirection =
        this.sortDirection === 'asc'
          ? 'desc'
          : 'asc';

    } else {
      this.sortBy = column;

      // Date/time and numeric trade columns:
      // newest/highest first by default
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

  // ================================
  // RESET
  // ================================

  resetFilters(): void {

    this.symbolFilter = '';

    this.sortBy = 'orderTime';

    this.sortDirection = 'desc';

    this.loadTrades(0);
  }


  // ================================
  // PAGINATION
  // ================================

  nextPage(): void {

    if (
      this.currentPage <
      this.totalPages - 1
    ) {

      this.loadTrades(
        this.currentPage + 1
      );

    }
  }


  previousPage(): void {

    if (this.currentPage > 0) {

      this.loadTrades(
        this.currentPage - 1
      );

    }
  }


  goToPage(): void {

    const page =
      Number(this.pageInput);


    if (!Number.isInteger(page)) {

      this.pageInput =
        this.currentPage + 1;

      return;
    }


    if (
      page < 1 ||
      page > this.totalPages
    ) {

      this.pageInput =
        this.currentPage + 1;

      return;
    }


    this.loadTrades(page - 1);
  }


  // ================================
  // MOBILE EXPANSION
  // ================================

  toggleTrade(index: number): void {

    this.expandedTrade.update(
      current =>
        current === index
          ? null
          : index
    );
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
      hour12: false
    });
  }
  // ================================
  // SIDE
  // ================================

  getSideClass(side: string): string {

    return side?.toUpperCase() === 'BUY'
      ? 'buy'
      : 'sell';
  }


  // ================================
  // PRICE
  // ================================

  formatPrice(
    price: number | null
  ): string {

    if (
      price === null ||
      price === undefined
    ) {

      return '—';
    }


    return price.toLocaleString(
      'en-US',
      {
        minimumFractionDigits: 2,
        maximumFractionDigits: 4
      }
    );
  }


  // ================================
  // DESTROY
  // ================================

  ngOnDestroy(): void {

    this.destroy$.next();
    this.destroy$.complete();
  }


  openTradeEvaluation(trade: Trade): void {

    const dialogRef = this.dialog.open(
      TradeEvaluationDialog,
      {

        width:  'calc(100vw - 32px)',
        maxWidth: 'calc(100vw - 32px)',

        data: {
          trade
        },

        disableClose: false,

        panelClass:
          'trade-evaluation-dialog'
      }
    );


    dialogRef
      .afterClosed()
      .subscribe((saved: boolean) => {

        if (saved) {

          console.log(
            'Trade evaluation saved:',
            trade.id
          );

          // Optional:
          // reload the current page if the
          // evaluation indicator is displayed
          this.loadTrades(
            this.currentPage
          );
        }

      });
  }

}
