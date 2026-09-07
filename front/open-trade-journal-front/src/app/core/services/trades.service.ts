import { Injectable, inject, signal } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import {
  Observable,
  tap,
  finalize,
  catchError,
  throwError,
  expand,
  reduce, map, EMPTY
} from 'rxjs';

import { DashboardStats } from '../models/dashboard-stats.model';
import { environments } from '../../../environments/environments';
import { Page } from '../../features/trades-history/models/page';
import { Trade } from '../models/trade.model';
import { PnlPoint } from '../models/pnl-point.model';
import { TradePage } from '../../features/trades-history/models/trade-page';
import { TradeEvaluationRequest } from '../models/trade-evaluation-request.model';
import { TradeEvaluation } from '../models/trade-evaluation.model';
import { TradeEvaluationScreenshot } from '../models/trade-evaluation-screenshot.model';

@Injectable({
  providedIn: 'root'
})
export class TradesService {

  private readonly http = inject(HttpClient);

  private readonly statsState = signal<DashboardStats | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal<string | null>(null);

  readonly stats = this.statsState.asReadonly();
  readonly isLoading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();


  getStats(
    startDate: string,
    endDate: string
  ): Observable<DashboardStats> {

    return this.http.get<DashboardStats>(
      environments.apiUrl + '/trades/stats',
      {
        params: {
          startDate,
          endDate
        }
      }
    );
  }


  loadStats(
    startDate: string,
    endDate: string
  ): void {

    this.loadingState.set(true);
    this.errorState.set(null);

    this.getStats(startDate, endDate)
      .pipe(
        tap((data: DashboardStats) => {
          this.statsState.set(data);
        }),

        catchError((error) => {
          console.error(
            'Failed to load dashboard stats',
            error
          );

          this.errorState.set(
            'Failed to load dashboard data.'
          );

          return throwError(() => error);
        }),

        finalize(() => {
          this.loadingState.set(false);
        })
      )
      .subscribe();
  }


  getTrades(
    page: number,
    size: number,
    symbol?: string,
    sortBy?: string,
    sortDirection?: string
  ): Observable<any> {
    console.log("eeeeeeeeeeeeeeeeeeee")
    let params = new HttpParams()
      .set('page', page)
      .set('size', size);

    if (symbol) {
      params = params.set('symbol', symbol);
    }

    if (sortBy) {
      params = params.set('sortBy', sortBy);
    }

    if (sortDirection) {
      params = params.set('sortDirection', sortDirection);
    }

    return this.http.get<TradePage>(
      `${environments.apiUrl}/trades`,
      { params }
    );
  }


  getAllTradesForMonth(
    year: number,
    month: number
  ): Observable<Trade[]> {

    const startDate = this.formatDate(
      new Date(year, month, 1)
    );

    const endDate = this.formatDate(
      new Date(year, month + 1, 0)
    );

    const params = new HttpParams()
      .set('sort', 'tradeDate,desc')
      .set('startDate', startDate)
      .set('endDate', endDate);

    return this.http
      .get<Page<Trade>>(
        environments.apiUrl + '/trades/by-date',
        { params }
      )
      .pipe(
        map(response => response.content)
      );
  }


  private formatDate(date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');

    return `${year}-${month}-${day}`;
  }


  getTradingActivity(year: number): Observable<PnlPoint[]> {
    return this.http.get<PnlPoint[]>(
      environments.apiUrl + `/trades/activities?year=${year}`
    );
  }


  deleteAllTrades(): Observable<string> {

    return this.http.delete(
      environments.apiUrl + '/trades',
      {
        responseType: 'text'
      }
    ).pipe(
      tap(() => {
        this.statsState.set(null);
      })
    );
  }


  // ================================
  // TRADE EVALUATION
  // ================================

  saveTradeEvaluation(
    ibExecId: string,
    request: TradeEvaluationRequest
  ): Observable<TradeEvaluation> {

    return this.http.put<TradeEvaluation>(
      `${environments.apiUrl}/trades/${ibExecId}/evaluation`,
      request
    );
  }


  uploadTradeEvaluationScreenshot(
    ibExecId: string,
    file: File | null
  ): Observable<TradeEvaluationScreenshot> {

    if (!file) {
      return EMPTY;
    }

    const formData = new FormData();

    formData.append(
      'file',

      file,
      file.name,

    );

    return this.http.post<TradeEvaluationScreenshot>(
      `${environments.apiUrl}/trades/${ibExecId}/evaluation/screenshots`,
      formData
    );
  }


  getTradeEvaluation(
    ibExecId: string
  ): Observable<TradeEvaluation> {

    return this.http.get<TradeEvaluation>(
      `${environments.apiUrl}/trades/${ibExecId}/evaluation`
    );
  }


  deleteTradeEvaluationScreenshot(
    ibExecId: string,
    screenshotId: number
  ): Observable<void> {

    return this.http.delete<void>(
      `${environments.apiUrl}/trades/${ibExecId}/evaluation/screenshots/${screenshotId}`
    );
  }

  getTradeEvaluationScreenshot(
    ibExecId: string,
    screenshotId: number
  ): Observable<Blob> {

    return this.http.get(
      `${environments.apiUrl}/trades/${ibExecId}/evaluation/screenshots/${screenshotId}`,
      {
        responseType: 'blob'
      }
    );
  }

  getTradeEvaluationScreenshotUrl(
    ibExecId: string,
    screenshotId: number
  ): string {
    return `${environments.apiUrl}/trades/${ibExecId}/evaluation/screenshots/${screenshotId}`;
  }
}
