import { Injectable } from '@angular/core';
import { Client } from '@stomp/stompjs';
import { Subject } from 'rxjs';
import {Trade} from '../models/trade.model';


@Injectable({
  providedIn: 'root'
})
export class TradeSocketService {

  private client: Client;

  private tradeSubject =
    new Subject<Trade>();

  trades$ =
    this.tradeSubject.asObservable();

  constructor() {

    console.log('TradeSocketService started');

    this.client = new Client({

      brokerURL: 'ws://13.36.36.86:4200/ws',

      reconnectDelay: 5000,

      debug: message => {
        console.log('STOMP:', message);
      },

      onConnect: () => {

        console.log('WEBSOCKET CONNECTED');

        this.client.subscribe(
          '/topic/trades',
          message => {

            console.log(
              'NEW TRADE RECEIVED'
            );

            const trade: Trade =
              JSON.parse(message.body);

            console.log(
              'Trade:',
              trade
            );

            this.tradeSubject.next(trade);
          }
        );

        console.log(
          'Subscribed to /topic/trades'
        );
      },

      onStompError: frame => {

        console.error(
          'STOMP ERROR',
          JSON.stringify(frame)
        );
      },

      onWebSocketError: error => {

        console.error(
          'WEBSOCKET ERROR',
          JSON.stringify(error)
        );
      },

      onWebSocketClose: event => {

        console.warn(
          'WEBSOCKET CLOSED',
          event
        );
      }
    });

    this.client.activate();
  }
}
