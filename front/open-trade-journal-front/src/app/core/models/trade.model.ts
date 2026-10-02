import { PlaybookSummaryDto } from '../../features/playbooks/playbook-component/models/playbook.model';
export interface Trade {
  id: number;
  userId: string;
  currencyPrimary: string;
  tradeId: string;
  symbol: string;
  tradeDate?: string;
  transactionType: string;
  exchange: string;
  ibCommissionCurrency?: string;
  quantity: number;
  tradePrice: number;
  tradeMoney: number;
  taxes: number;
  ibCommission: number;
  netCash: number;
  closePrice: number;
  fifoPnlRealized: number;
  buySell: string;
  ibOrderId: string;
  orderTime: string;
  orderType: string;
  traderId: string;
  ibExecID: string;
  playbooks: PlaybookSummaryDto[];
}
