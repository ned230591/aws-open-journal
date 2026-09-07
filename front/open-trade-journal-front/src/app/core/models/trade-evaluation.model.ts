import {TradeEvaluationScreenshot} from './trade-evaluation-screenshot.model';

export interface TradeEvaluation {
  id: number;
  tradeId: number;
  positivePoints: string[];
  negativePoints: string[];
  comment: string;
  screenshots: TradeEvaluationScreenshot[];

}
