export interface TradeEvaluation {
  id: number;
  tradeId: number;
  // Structured evaluation
  playbookAdherence: EvaluationRating | null;
  entryQuality: EvaluationRating | null;
  exitQuality: EvaluationRating | null;
  riskManagementQuality: EvaluationRating | null;
  executionQuality: EvaluationRating | null;
  mistakeType: MistakeType | null;
  // Manual evaluation
  positivePoints: string[];
  negativePoints: string[];
  comment: string;
  // Screenshots
  screenshots: TradeEvaluationScreenshot[];
  createdAt: string;
  updatedAt: string;
}

export interface TradeEvaluationScreenshot {
  id: number;
  filename: string;
  contentType: string;
  size: number;
  content: string;
}

export type EvaluationRating = 'EXCELLENT' | 'GOOD' | 'AVERAGE' | 'POOR' | 'VERY_POOR';

export type MistakeType =
  | 'NO_MISTAKE'
  | 'CHASING'
  | 'EARLY_ENTRY'
  | 'LATE_ENTRY'
  | 'EARLY_EXIT'
  | 'LATE_EXIT'
  | 'OVERSIZED_POSITION'
  | 'MOVED_STOP'
  | 'IGNORED_STOP'
  | 'REVENGE_TRADE'
  | 'OVERTRADING'
  | 'FOMO'
  | 'TRADED_OUTSIDE_PLAYBOOK'
  | 'POOR_RISK_REWARD'
  | 'HESITATION'
  | 'OTHER';

export interface TradeEvaluationRequest {
  playbookAdherence: EvaluationRating | null;
  entryQuality: EvaluationRating | null;
  exitQuality: EvaluationRating | null;
  riskManagementQuality: EvaluationRating | null;
  executionQuality: EvaluationRating | null;
  mistakeType: MistakeType | null;
  positivePoints: string[];
  negativePoints: string[];
  comment: string;
}
