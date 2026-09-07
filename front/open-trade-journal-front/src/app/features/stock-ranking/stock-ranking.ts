import {Component, Input, Signal} from '@angular/core';
import { CurrencyPipe } from '@angular/common';
import { DashboardStats} from '../../core/models/dashboard-stats.model';

@Component({
  selector: 'app-stock-ranking',
  imports: [CurrencyPipe],
  templateUrl: './stock-ranking.html',
  styleUrl: './stock-ranking.css',
})
export class StockRanking {

  @Input() stats!: Signal<DashboardStats | null>;
  pageSize = 4;
  currentPage = 1;
  get stockPnl() {
    return this.stats()?.stockPnl ?? [];
  }

  get totalPages(): number {
    return Math.ceil(this.stockPnl.length / this.pageSize);
  }


  get paginatedStocks() {
    const start = (this.currentPage - 1) * this.pageSize;
   if(this.stockPnl.length <= this.pageSize)
     return this.stockPnl ;
    return this.stockPnl.slice(start, start + this.pageSize);
  }


  get pageStart(): number {
    if (this.stockPnl.length === 0) {
      return 0;
    }
    return (this.currentPage - 1) * this.pageSize + 1;
  }


  get pageEnd(): number {
    return Math.min(this.currentPage * this.pageSize, this.stockPnl.length);
  }

  previousPage(): void {
    if (this.currentPage > 1) {
      this.currentPage--;
    }
  }

  nextPage(): void {
    if (this.currentPage < this.totalPages) {
      this.currentPage++;
    }
  }


}
