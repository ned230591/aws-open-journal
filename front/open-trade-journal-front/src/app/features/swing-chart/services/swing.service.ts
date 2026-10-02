import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { DailySwingData } from '../models/swing.models';
import { environments } from '../../../../environments/environments';
import { CoveragePeriod } from '../../../core/models/coverage-period.model';

@Injectable({
  providedIn: 'root',
})
export class SwingService {
  private http = inject(HttpClient);

  private readonly apiUrl = environments.apiUrl;

  getSwingData(symbol: string, from: string, to: string): Observable<DailySwingData[]> {
    const params = new HttpParams().set('symbol', symbol).set('from', from).set('to', to);
    return this.http.get<DailySwingData[]>(`${this.apiUrl}/daily/dataset`, { params });
  }

  generateSwingData(
    symbol: string,
    fromDate: string,
    toDate: string,
  ): Observable<DailySwingData[]> {
    // The real endpoint is /daily/dataset/generate, taking symbol/from/to as query
    // params, not a JSON body — this previously posted to the wrong path with the
    // wrong param names/shape entirely, so "Generate Data" was hitting a 404.
    const params = new HttpParams().set('symbol', symbol).set('from', fromDate).set('to', toDate);
    return this.http.post<DailySwingData[]>(`${this.apiUrl}/daily/dataset/generate`, null, {
      params,
    });
  }

  getDailyDatasetCoverage(symbol: string): Observable<CoveragePeriod[]> {
    return this.http.get<CoveragePeriod[]>(`${this.apiUrl}/daily/dataset/${symbol}/coverage`);
  }

  /** The slice(s) of [from, to] (YYYY-MM-DD) that already have a generated daily dataset. */
  checkDailyDatasetOverlap(symbol: string, from: string, to: string): Observable<CoveragePeriod[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<CoveragePeriod[]>(
      `${this.apiUrl}/daily/dataset/${symbol}/coverage/overlap`,
      { params },
    );
  }
}
