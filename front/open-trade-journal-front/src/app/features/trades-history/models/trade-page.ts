import {Trade} from '../../../core/models/trade.model';

export interface TradePage {
  content: Trade[];

  number: number;
  size: number;

  totalElements: number;
  totalPages: number;

  first: boolean;
  last: boolean;

  numberOfElements: number;
  empty: boolean;
}
