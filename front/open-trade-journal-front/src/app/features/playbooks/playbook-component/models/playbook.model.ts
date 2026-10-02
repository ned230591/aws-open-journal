export interface PlaybookDto {
  id: number;
  userId: string | null;
  strategy: string;
  description?: string;
  tradingType: TradingType;
  timeframe: Timeframe;
  entryRules: string[];
  exitRules: string[];
  riskManagement?: string;
  tradingConditions?: string;
  systemDefined: boolean;
  active: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PlaybookSummaryDto {
  id: number;
  strategy: string;
  tradingType: TradingType;
  timeframe: Timeframe;
}

export enum TradingType {
  SCALPING = 'SCALPING',
  DAY_TRADING = 'DAY_TRADING',
  SWING_TRADING = 'SWING_TRADING',
  POSITION_TRADING = 'POSITION_TRADING',
}

export enum Timeframe {
  ONE_MINUTE = 'ONE_MINUTE',
  FIVE_MINUTES = 'FIVE_MINUTES',
  FIFTEEN_MINUTES = 'FIFTEEN_MINUTES',
  THIRTY_MINUTES = 'THIRTY_MINUTES',
  ONE_HOUR = 'ONE_HOUR',
  FOUR_HOURS = 'FOUR_HOURS',
  ONE_DAY = 'ONE_DAY',
  ONE_WEEK = 'ONE_WEEK',
  ONE_MONTH = 'ONE_MONTH',
}

export interface PageResponse<T> {
  content: T[];
  totalElements: number;
  totalPages: number;
  size: number;
  number: number;
  first: boolean;
  last: boolean;
}

export interface PlaybookPerformance {
  playbookId: number;
  playbookName: string;
  trades: number;
  wins: number;
  losses: number;
  winRate: number;
  netPnl: number;
  averageWin: number;
  averageLoss: number;
  expectancy: number;
  profitFactor: number;
}
