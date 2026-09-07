import {PnlPoint} from './pnl-point.model';
import {StockPnl} from './stock-pnl.model';

export interface DashboardStats {
  totalTrades: number;
  winningTrades: number;
  winRate: number;
  totalPnl: number;
  bestTrade: number;
  worstTrade: number;
  bestPnl: number;
  worstPnl: number;
  firstTradeDate: string | null;
  pnlHistory: PnlPoint[];
  stockPnl: StockPnl[];
}











