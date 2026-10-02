export interface SwingPoint {
  type: 'HIGH' | 'LOW';
  index: number;
  time: string;
  price: number;
  classification: 'HH' | 'LH' | 'HL' | 'LL' | null;
  structureEvent: string | null;
}

export interface DailySwingData {
  id: number;
  symbol: string;
  date: string;
  open: number;
  close: number;
  high: number;
  low: number;
  range: number;
  rangePct: number;
  closeLocation: number;
  highTime: number;
  lowTime: number;
  highLowTimeDiff: number;
  highFirst: boolean;
  trend: 'UPTREND' | 'DOWNTREND' | string;
  nextDayReturn: number | null;
  nextDayRange: number | null;
  nextDayTrend: string | null;
  createdAt: string;
  updatedAt: string;
  swingHighs: SwingPoint[];
  swingLows: SwingPoint[];
}

export type ShiftVerification = 'confirmed' | 'refuted' | 'unknown';

export interface ChartPoint {
  value: [number, number];
  type: 'OPEN' | 'CLOSE' | 'HIGH' | 'LOW';
  classification: 'HH' | 'LH' | 'HL' | 'LL' | null;
  time: string;
  date: string;
  /** Only set for LH/HL points: did next day's trend confirm the implied reversal? */
  shiftVerification?: ShiftVerification | null;
}

export interface PeriodSwing {
  date: string;
  time: string;
  price: number;
  type: 'HIGH' | 'LOW';
  classification: 'HH' | 'LH' | 'HL' | 'LL' | null;
}

export interface SwingLeg {
  from: PeriodSwing;
  to: PeriodSwing;
  priceChange: number;
  durationMinutes: number;
  direction: 'UP' | 'DOWN';
}
