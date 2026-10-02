import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import { Trade } from '../models/trade.model';
import { environments } from '../../../environments/environments';
import { logger } from '../utils/logger';

@Injectable({
  providedIn: 'root',
})
export class TradeSocketService {
  private client: Client;
  private tradeSubject = new Subject<Trade>();
  trades$ = this.tradeSubject.asObservable();

  constructor() {
    logger.log('TradeSocketService started');
    this.client = new Client({
      brokerURL: environments.brokerURL,
      reconnectDelay: 5000,
      onConnect: () => {
        logger.log('WEBSOCKET CONNECTED');
        this.client.subscribe('/topic/trades', (message) => {
          logger.log('NEW TRADE RECEIVED');
          const trade: Trade = JSON.parse(message.body);
          logger.log('Trade:', trade);
          this.tradeSubject.next(trade);
        });
        logger.log('Subscribed to /topic/trades');
      },
      onStompError: (frame) => {
        logger.error('STOMP ERROR', JSON.stringify(frame));
      },

      onWebSocketError: (error) => {
        logger.error('WEBSOCKET ERROR', JSON.stringify(error));
      },

      onWebSocketClose: (event) => {
        logger.warn('WEBSOCKET CLOSED', event);
      },
    });
    this.client.activate();
  }
}
