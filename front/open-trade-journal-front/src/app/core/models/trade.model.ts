export interface Trade {
  id: number;
  tradeDate: string;
  symbol: string;
  buySell: string;
  tradePrice: number | null;
  quantity: number | null;
  fifoPnlRealized: number;
  ibExecID:string;
  orderTime: string;
  evaluation:any  | null;
}
