import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environments } from '../../../../environments/environments';
import { CoveragePeriod } from '../../../core/models/coverage-period.model';

@Injectable({
  providedIn: 'root',
})
export class MarketDataImportService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environments.apiUrl + '/market-candles';

  /**
   * `start`/`end` must be ISO-8601 without an offset (e.g. `2026-09-10T00:00:00`) —
   * the backend appends `Z` itself before parsing. The response is a plain status
   * string, not JSON, so this must be read as text or HttpClient's default JSON
   * parsing will throw on a valid 200 response. POST (not GET): the endpoint
   * downloads from Databento and writes to the DB, a side effect a GET shouldn't have.
   */
  importCandles(symbol: string, start: string, end: string, timeframe: string): Observable<string> {
    const params = new HttpParams()
      .set('symbol', symbol)
      .set('start', start)
      .set('end', end)
      .set('timeframe', timeframe);
    return this.http.post(`${this.apiUrl}/import`, null, { params, responseType: 'text' });
  }

  getCandleCoverage(symbol: string): Observable<CoveragePeriod[]> {
    return this.http.get<CoveragePeriod[]>(`${this.apiUrl}/${symbol}/coverage`);
  }

  /** The slice(s) of [from, to] (YYYY-MM-DD) that already have saved candles — empty if none. */
  checkCandleOverlap(
    symbol: string,
    from: string,
    to: string,
    timeframe: string,
  ): Observable<CoveragePeriod[]> {
    const params = new HttpParams().set('timeframe', timeframe).set('from', from).set('to', to);
    return this.http.get<CoveragePeriod[]>(`${this.apiUrl}/${symbol}/coverage/overlap`, {
      params,
    });
  }
}
