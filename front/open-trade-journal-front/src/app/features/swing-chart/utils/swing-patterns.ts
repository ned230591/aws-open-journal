import { DailySwingData } from '../models/swing.models';
import { minutesFromSessionOpen } from './shift-reliability';

export interface SwingLegInfo {
  date: string;
  fromMinutes: number;
  amplitudePct: number;
  durationMinutes: number;
  direction: 'UP' | 'DOWN';
}

/**
 * Consecutive-swing legs, scoped to the same day (mirrors the same-day-only
 * rule used for structure-shift verification and streaks elsewhere in this
 * panel) — a leg from one day's last swing to the next day's first swing
 * would conflate overnight gap with intraday move, so it's excluded.
 */
export function computeSwingLegs(days: DailySwingData[]): SwingLegInfo[] {
  const legs: SwingLegInfo[] = [];
  for (const day of days) {
    const swings = [
      ...day.swingHighs.map((s) => ({ time: s.time, price: s.price })),
      ...day.swingLows.map((s) => ({ time: s.time, price: s.price })),
    ].sort((a, b) => a.time.localeCompare(b.time));

    for (let i = 1; i < swings.length; i++) {
      const from = swings[i - 1];
      const to = swings[i];
      const fromMinutes = minutesFromSessionOpen(from.time);
      const durationMinutes = minutesFromSessionOpen(to.time) - fromMinutes;
      if (durationMinutes <= 0 || from.price === 0) {
        continue;
      }
      legs.push({
        date: day.date,
        fromMinutes,
        amplitudePct: (Math.abs(to.price - from.price) / from.price) * 100,
        durationMinutes,
        direction: to.price >= from.price ? 'UP' : 'DOWN',
      });
    }
  }
  return legs;
}

export interface FirstSwingInfo {
  date: string;
  type: 'HIGH' | 'LOW';
  minutesFromOpen: number;
  /** Absolute price distance from the day's own open to this first swing. */
  amplitude: number;
  amplitudePct: number;
}

/**
 * The very first swing (high or low, whichever prints first) of each day,
 * with how far it moved from that day's open — the earliest read available
 * each session, before a second swing exists to compare it against.
 */
export function computeFirstSwings(days: DailySwingData[]): FirstSwingInfo[] {
  const result: FirstSwingInfo[] = [];
  for (const day of days) {
    if (day.open === 0) {
      continue;
    }
    const swings = [
      ...day.swingHighs.map((s) => ({ time: s.time, price: s.price, type: 'HIGH' as const })),
      ...day.swingLows.map((s) => ({ time: s.time, price: s.price, type: 'LOW' as const })),
    ].sort((a, b) => a.time.localeCompare(b.time));
    const first = swings[0];
    if (!first) {
      continue;
    }
    result.push({
      date: day.date,
      type: first.type,
      minutesFromOpen: minutesFromSessionOpen(first.time),
      amplitude: Math.abs(first.price - day.open),
      amplitudePct: (Math.abs(first.price - day.open) / day.open) * 100,
    });
  }
  return result;
}

export interface RateBucket {
  label: string;
  key?: string;
  n: number;
  positive: number;
  positivePct: number;
}

export function rateBucketize(
  groups: { label: string; key?: string; items: { positive: boolean }[] }[],
): RateBucket[] {
  return groups
    .filter((g) => g.items.length > 0)
    .map((g) => {
      const positive = g.items.filter((i) => i.positive).length;
      return {
        label: g.label,
        key: g.key,
        n: g.items.length,
        positive,
        positivePct: (positive / g.items.length) * 100,
      };
    });
}

/**
 * For each day with a usable trend (UPTREND/DOWNTREND), pairs the length of
 * the same-direction run ending at that day with whether the FOLLOWING day
 * reversed. A NEUTRAL/unknown trend breaks the running streak and is
 * excluded as a pair endpoint, since "reversed" isn't well defined for it.
 */
export function computeStreakReversals(
  days: DailySwingData[],
): { streakLength: number; reversed: boolean }[] {
  const sorted = [...days].sort((a, b) => a.date.localeCompare(b.date));
  const results: { streakLength: number; reversed: boolean }[] = [];
  const trendOf = (d: DailySwingData): 'UPTREND' | 'DOWNTREND' | null =>
    d.trend === 'UPTREND' || d.trend === 'DOWNTREND' ? d.trend : null;

  let streak = 0;
  let currentTrend: string | null = null;
  for (let i = 0; i < sorted.length; i++) {
    const trend = trendOf(sorted[i]);
    if (trend === null) {
      streak = 0;
      currentTrend = null;
      continue;
    }
    streak = trend === currentTrend ? streak + 1 : 1;
    currentTrend = trend;

    const nextTrend = sorted[i + 1] ? trendOf(sorted[i + 1]) : null;
    if (nextTrend !== null) {
      results.push({ streakLength: streak, reversed: nextTrend !== trend });
    }
  }
  return results;
}
