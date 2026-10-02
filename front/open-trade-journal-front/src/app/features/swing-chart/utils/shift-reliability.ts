import { DailySwingData } from '../models/swing.models';

/** Minutes from 09:30 ET (session open) — mirrors SwingChart's own session-minutes math. */
const SESSION_OPEN_MINUTES = 9 * 60 + 30;

export type ShiftOutcome = 'confirmed' | 'refuted';

export interface ShiftSignal {
  date: string;
  type: 'HIGH' | 'LOW';
  classification: 'LH' | 'HL';
  minutesFromOpen: number;
  dayRangePct: number;
  /** Consecutive same-direction continuation swings (HH/LL) immediately preceding this one, same day. */
  precedingStreak: number;
  outcome: ShiftOutcome;
}

export interface ReliabilityBucket {
  label: string;
  /** Stable identifier for the group, for explanation text that shouldn't parse `label`. */
  key?: string;
  n: number;
  confirmed: number;
  confirmedPct: number;
}

interface Entry {
  dayIndex: number;
  day: DailySwingData;
  time: string;
  price: number;
  classification: string | null;
}

export function minutesFromSessionOpen(time: string): number {
  const timePart = time.split('T')[1];
  if (!timePart) {
    return 0;
  }
  const [hour, minute, second = '0'] = timePart.split(':');
  return Number(hour) * 60 + Number(minute) + Number(second) / 60 - SESSION_OPEN_MINUTES;
}

/**
 * Mirrors the confirmed/refuted decision in SwingChart.computeShiftVerifications:
 * an LH/HL is confirmed against the next same-type swing the same day, or that
 * day's close if there is no later one. Duplicated (not shared) deliberately to
 * keep the chart's rendering path free of this panel's analytics — if that
 * decision rule ever changes, update both.
 */
export function computeShiftSignals(days: DailySwingData[]): ShiftSignal[] {
  const highs: Entry[] = [];
  const lows: Entry[] = [];
  days.forEach((day, dayIndex) => {
    for (const swing of day.swingHighs) {
      highs.push({
        dayIndex,
        day,
        time: swing.time,
        price: swing.price,
        classification: swing.classification,
      });
    }
    for (const swing of day.swingLows) {
      lows.push({
        dayIndex,
        day,
        time: swing.time,
        price: swing.price,
        classification: swing.classification,
      });
    }
  });
  highs.sort((a, b) => a.time.localeCompare(b.time));
  lows.sort((a, b) => a.time.localeCompare(b.time));

  const signals: ShiftSignal[] = [];

  const process = (
    sequence: Entry[],
    type: 'HIGH' | 'LOW',
    reversal: 'LH' | 'HL',
    continuation: 'HH' | 'LL',
    isConfirmed: (shiftPrice: number, comparisonPrice: number) => boolean,
  ): void => {
    for (let i = 0; i < sequence.length; i++) {
      const current = sequence[i];
      if (current.classification !== reversal) {
        continue;
      }
      const next = sequence[i + 1];
      const nextIsSameDay = next !== undefined && next.dayIndex === current.dayIndex;
      const comparisonPrice = nextIsSameDay ? next.price : current.day.close;

      let precedingStreak = 0;
      for (let j = i - 1; j >= 0 && sequence[j].dayIndex === current.dayIndex; j--) {
        if (sequence[j].classification !== continuation) {
          break;
        }
        precedingStreak++;
      }

      signals.push({
        date: current.day.date,
        type,
        classification: reversal,
        minutesFromOpen: minutesFromSessionOpen(current.time),
        dayRangePct: current.day.rangePct,
        precedingStreak,
        outcome: isConfirmed(current.price, comparisonPrice) ? 'confirmed' : 'refuted',
      });
    }
  };

  process(highs, 'HIGH', 'LH', 'HH', (shiftPrice, comparisonPrice) => comparisonPrice < shiftPrice);
  process(lows, 'LOW', 'HL', 'LL', (shiftPrice, comparisonPrice) => comparisonPrice > shiftPrice);

  return signals;
}

export function confirmationRate(signals: ShiftSignal[]): {
  n: number;
  confirmed: number;
  confirmedPct: number;
} {
  if (signals.length === 0) {
    return { n: 0, confirmed: 0, confirmedPct: 0 };
  }
  const confirmed = signals.filter((s) => s.outcome === 'confirmed').length;
  return { n: signals.length, confirmed, confirmedPct: (confirmed / signals.length) * 100 };
}

export function bucketizeByOutcome(
  groups: { label: string; key?: string; signals: ShiftSignal[] }[],
): ReliabilityBucket[] {
  return groups
    .filter((g) => g.signals.length > 0)
    .map((g) => ({ label: g.label, key: g.key, ...confirmationRate(g.signals) }));
}
