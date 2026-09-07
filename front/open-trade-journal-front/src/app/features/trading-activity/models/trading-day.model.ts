interface TradingDay {
  date: string;
  pnl: number;
  traded: boolean;
  status: 'no-trade' | 'profit' | 'loss' | 'zero';
  tooltip: string;
}
