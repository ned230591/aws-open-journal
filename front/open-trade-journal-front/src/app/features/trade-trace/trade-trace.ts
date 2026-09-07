import { Component } from '@angular/core';
import {Calendar} from '../calendar/calendar';
import {Filter} from '../filter/filter';
import {Histogram} from '../histogram/histogram';
import {StockRanking} from '../stock-ranking/stock-ranking';
import {TradesHistory} from '../trades-history/trades-history';
import {TradingActivity} from '../trading-activity/trading-activity';

@Component({
  selector: 'app-trade-trace',
  imports: [
    Calendar,
    TradesHistory,
    TradingActivity
  ],
  templateUrl: './trade-trace.html',
  styleUrl: './trade-trace.css',
})
export class TradeTrace {

}
