import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environments } from '../../../../environments/environments';

export interface MarketCandle {
  id: number;
  symbol: string;
  timeframe: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  vwap: number | null;
}

@Injectable({
  providedIn: 'root',
})
export class VwapDifferenceService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environments.apiUrl + '/research/daily-profiles';

  loadMarketCandles(symbol: string, start: string, end: string): Observable<MarketCandle[]> {
    const params = new HttpParams().set('symbol', symbol).set('start', start).set('end', end);
    return this.http.get<MarketCandle[]>(`${this.apiUrl}/loadMarketCandles`, { params });
  }
}
