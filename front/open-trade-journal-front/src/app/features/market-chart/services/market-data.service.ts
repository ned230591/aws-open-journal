import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environments } from '../../../../environments/environments';

export interface MarketCandle {
  id: number;
  symbol: string;
  timestamp: number;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

@Injectable({
  providedIn: 'root',
})
export class MarketDataService {
  private readonly http = inject(HttpClient);
  private readonly apiUrl = environments.apiUrl + '/market-data';

  getCandles(symbol: string, from: number, to: number): Observable<MarketCandle[]> {
    const params = new HttpParams().set('from', from).set('to', to);
    return this.http.get<MarketCandle[]>(`${this.apiUrl}/${symbol}/candles`, { params });
  }
}
