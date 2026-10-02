import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { DecimalPipe } from '@angular/common';
import { NgxEchartsDirective } from 'ngx-echarts';
import { MatTooltip } from '@angular/material/tooltip';
import { DailySwingData } from '../models/swing.models';
import { parseDateKey } from '../../../core/utils/date-utils';
import {
  ReliabilityBucket,
  ShiftSignal,
  bucketizeByOutcome,
  computeShiftSignals,
  confirmationRate,
} from '../utils/shift-reliability';
import {
  FirstSwingInfo,
  RateBucket,
  SwingLegInfo,
  computeFirstSwings,
  computeStreakReversals,
  computeSwingLegs,
  rateBucketize,
} from '../utils/swing-patterns';

/** Minutes from 09:30 ET (session open) to 16:00 ET (session close). */
const SESSION_LENGTH_MINUTES = 390;
const BUCKET_SIZE_MINUTES = 30;
const BUCKET_COUNT = Math.ceil(SESSION_LENGTH_MINUTES / BUCKET_SIZE_MINUTES);
const SESSION_OPEN_MINUTES = 9 * 60 + 30;

/** A bucket needs at least this many occurrences before a "pattern" built from it is shown. */
const MIN_PATTERN_SAMPLE = 5;
/** How far (in percentage points) a rate must sit from its baseline to count as a real pattern. */
const MIN_PATTERN_DEVIATION = 15;

const WEEKDAY_ORDER = [1, 2, 3, 4, 5] as const; // Mon..Fri
const WEEKDAY_LABELS: Record<number, string> = {
  1: 'Mon',
  2: 'Tue',
  3: 'Wed',
  4: 'Thu',
  5: 'Fri',
};

interface TimeBucket {
  label: string;
  highCount: number;
  lowCount: number;
}

interface CloseLocationBucket {
  label: string;
  count: number;
  pct: number;
}

interface TrendTransition {
  fromTrend: string;
  total: number;
  toUpCount: number;
  toDownCount: number;
  toUpPct: number;
  toDownPct: number;
  avgNextDayReturnPct: number | null;
}

interface WeekdayStat {
  label: string;
  count: number;
  upCount: number;
  avgRangePct: number;
  avgCloseLocation: number;
  upPct: number;
}

interface LegBucket {
  label: string;
  n: number;
  avgAmplitudePct: number;
  avgDurationMinutes: number;
  avgSpeedPctPerMin: number;
}

interface SwingCountBucket {
  label: string;
  key: string;
  n: number;
  avgRangePct: number;
  avgCloseExtremityPct: number;
  upPct: number;
}

interface FirstSwingBucket {
  label: string;
  n: number;
  upPct: number;
  avgCloseLocation: number;
}

interface FirstSwingTimeBucket {
  label: string;
  n: number;
  highPct: number;
  avgAmplitude: number;
  avgAmplitudePct: number;
}

interface PatternCard {
  title: string;
  detail: string;
  n: number;
  confidence: 'weak' | 'moderate' | 'strong';
}

@Component({
  selector: 'app-swing-stats-panel',
  standalone: true,
  imports: [DecimalPipe, NgxEchartsDirective, MatTooltip],
  templateUrl: './swing-stats-panel.html',
  styleUrl: './swing-stats-panel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class SwingStatsPanel {
  readonly days = input.required<DailySwingData[]>();

  readonly minPatternSample = MIN_PATTERN_SAMPLE;

  readonly uptrendDaysExplanation =
    'Share of days in this range that closed above their open (day-level UPTREND).';
  readonly highFirstExplanation =
    "Share of days where the session's swing high printed before its swing low — tells you whether buyers or sellers tended to take control first.";
  readonly avgRangeExplanation =
    "Average high-to-low range for the day, as a % of that day's open. Higher = more volatile sessions.";
  readonly avgCloseLocationExplanation =
    "Where the close sits inside the day's own high-low range, from 0 (at the low) to 1 (at the high). Above 0.5 means the day closed in the upper half of its range.";
  readonly avgCandleShapeExplanation =
    "Body % is the open-to-close move as a share of the day's range; the wick %s are the leftover range above/below the body. Small body + long wicks = an indecisive, choppy session.";
  readonly timeOfDayExplanation =
    'Counts, in 30-minute buckets, what time of day swing highs and lows tend to print — use it to spot session windows that reliably produce turning points.';
  readonly closeLocationDistributionExplanation =
    "How often the close lands in each fifth of the day's range, from 'Near low' to 'Near high'.";
  readonly nextDayFollowThroughExplanation =
    "Given today's day-level trend (UPTREND/DOWNTREND), how often tomorrow continued the same direction vs. reversed, and the average next-day return.";
  readonly chochSectionExplanation =
    'How often a possible structure shift (LH/HL) actually held up historically, broken down by when and how it formed — built from every LH/HL in this range and whether price later confirmed or refuted it.';
  readonly chochTimeOfDayExplanation =
    'Confirmation rate of LH/HL signals grouped by the time of day the shift point itself printed. Reveals whether reversals spotted early vs. late in the session hold up better.';
  readonly chochRangeRegimeExplanation =
    'Confirmation rate split by whether the shift happened on a below- or above-median range day for this period — tests whether calmer or more volatile sessions produce more reliable reversals.';
  readonly chochStreakExplanation =
    'Confirmation rate grouped by how many consecutive same-direction swings (HHs before an LH, LLs before an HL) came before the shift that day — tests whether reversals after a longer run hold up better.';
  readonly weekdayBreakdownExplanation =
    'Uptrend rate, average range, and average close location broken out by weekday.';
  readonly legSectionExplanation =
    'How far (amplitude) and how fast (speed) price typically moves between one swing and the next, broken out by the time of day the move started — spot the session windows where moves are bigger or quicker.';
  readonly swingCountSectionExplanation =
    'Groups days by how many total swings (highs + lows) they had, then shows each group\'s average range and how decisively the close finished away from the day\'s own midpoint — a "fingerprint" for telling a clean trend day from a choppy one.';
  readonly streakSectionExplanation =
    'Given a run of N consecutive same-direction trend days, how often the very next day reverses instead of continuing — mean-reversion odds after a streak, not just the single-day-ahead view above.';
  readonly firstSwingSectionExplanation =
    "Whether the day's first swing (the first turning point after the open) was a high or a low, cross-referenced with how that day actually ended — an early read available within the session's first swing.";
  readonly detectedPatternsExplanation =
    `Scans every breakdown below and surfaces the ones that stand out: a group with at least ${MIN_PATTERN_SAMPLE} occurrences ` +
    `whose rate sits ${MIN_PATTERN_DEVIATION}+ percentage points away from this range's own baseline (or, for amplitude/speed, simply the ` +
    "biggest standout window). These are historical tendencies from a limited sample, not guarantees — check each card's n before trusting it.";

  readonly dayCount = computed(() => this.days().length);

  readonly dateRangeLabel = computed(() => {
    const days = this.days();
    if (days.length === 0) {
      return '';
    }
    const dates = days.map((d) => d.date).sort();
    const first = dates[0];
    const last = dates[dates.length - 1];
    return first === last ? first : `${first} → ${last}`;
  });

  readonly highFirstPct = computed(() => {
    const days = this.days();
    if (days.length === 0) {
      return 0;
    }
    const highFirstCount = days.filter((d) => d.highFirst).length;
    return (highFirstCount / days.length) * 100;
  });

  readonly uptrendPct = computed(() => {
    const days = this.days();
    if (days.length === 0) {
      return 0;
    }
    const upCount = days.filter((d) => d.trend === 'UPTREND').length;
    return (upCount / days.length) * 100;
  });

  readonly avgRangePct = computed(() => this.average(this.days().map((d) => d.rangePct)));

  readonly avgCloseLocation = computed(() => this.average(this.days().map((d) => d.closeLocation)));

  readonly avgCandleShape = computed(() => {
    const days = this.days();
    const shapes = days.map((d) => this.candleShape(d));
    return {
      bodyPct: this.average(shapes.map((s) => s.bodyPct)),
      upperWickPct: this.average(shapes.map((s) => s.upperWickPct)),
      lowerWickPct: this.average(shapes.map((s) => s.lowerWickPct)),
    };
  });

  readonly timeBuckets = computed<TimeBucket[]>(() => {
    const buckets: TimeBucket[] = Array.from({ length: BUCKET_COUNT }, (_, i) => ({
      label: this.bucketLabel(i),
      highCount: 0,
      lowCount: 0,
    }));
    for (const day of this.days()) {
      const highIndex = this.bucketIndex(day.highTime);
      const lowIndex = this.bucketIndex(day.lowTime);
      if (buckets[highIndex]) {
        buckets[highIndex].highCount++;
      }
      if (buckets[lowIndex]) {
        buckets[lowIndex].lowCount++;
      }
    }
    return buckets;
  });

  readonly timeBucketChartOptions = computed(() => {
    const buckets = this.timeBuckets();
    return {
      backgroundColor: 'transparent',
      textStyle: { fontFamily: '"Courier New", Courier, monospace', color: '#cbd5e1' },
      legend: {
        show: true,
        data: ['Highs', 'Lows'],
        textStyle: { color: '#cbd5e1' },
        top: 0,
      },
      tooltip: {
        trigger: 'axis',
        axisPointer: { type: 'shadow' },
        backgroundColor: '#111827',
        borderColor: '#334155',
        textStyle: { color: '#cbd5e1' },
      },
      grid: { left: 40, right: 20, top: 40, bottom: 30, containLabel: true },
      xAxis: {
        type: 'category',
        data: buckets.map((b) => b.label),
        axisLabel: { color: '#9ca3af', rotate: 45, fontSize: 11 },
        axisLine: { lineStyle: { color: '#3a3a3a' } },
      },
      yAxis: {
        type: 'value',
        axisLabel: { color: '#9ca3af' },
        splitLine: { lineStyle: { color: '#1e293b' } },
      },
      series: [
        {
          name: 'Highs',
          type: 'bar',
          data: buckets.map((b) => b.highCount),
          itemStyle: { color: '#22c55e' },
        },
        {
          name: 'Lows',
          type: 'bar',
          data: buckets.map((b) => b.lowCount),
          itemStyle: { color: '#ef4444' },
        },
      ],
    };
  });

  readonly closeLocationBuckets = computed<CloseLocationBucket[]>(() => {
    const days = this.days();
    const labels = ['Near low', 'Low-mid', 'Mid', 'Mid-high', 'Near high'];
    const counts = [0, 0, 0, 0, 0];
    for (const day of days) {
      const value = Math.min(Math.max(day.closeLocation, 0), 1);
      const index = Math.min(Math.floor(value * 5), 4);
      counts[index]++;
    }
    return labels.map((label, i) => ({
      label,
      count: counts[i],
      pct: days.length === 0 ? 0 : (counts[i] / days.length) * 100,
    }));
  });

  readonly trendTransitions = computed<TrendTransition[]>(() => {
    const days = this.days();
    return (['UPTREND', 'DOWNTREND'] as const).map((fromTrend) => {
      const group = days.filter((d) => d.trend === fromTrend && d.nextDayTrend);
      const toUpCount = group.filter((d) => d.nextDayTrend === 'UPTREND').length;
      const toDownCount = group.filter((d) => d.nextDayTrend === 'DOWNTREND').length;
      const returns = group
        .map((d) => d.nextDayReturn)
        .filter((r): r is number => r !== null && r !== undefined);
      return {
        fromTrend,
        total: group.length,
        toUpCount,
        toDownCount,
        toUpPct: group.length === 0 ? 0 : (toUpCount / group.length) * 100,
        toDownPct: group.length === 0 ? 0 : (toDownCount / group.length) * 100,
        avgNextDayReturnPct: returns.length === 0 ? null : this.average(returns),
      };
    });
  });

  readonly shiftSignals = computed(() => computeShiftSignals(this.days()));

  readonly shiftReliabilityOverall = computed(() => confirmationRate(this.shiftSignals()));

  readonly shiftByTimeOfDay = computed<ReliabilityBucket[]>(() => {
    const groups: { label: string; signals: ShiftSignal[] }[] = Array.from(
      { length: BUCKET_COUNT },
      (_, i) => ({ label: this.bucketLabel(i), signals: [] }),
    );
    for (const signal of this.shiftSignals()) {
      const index = this.bucketIndex(signal.minutesFromOpen);
      groups[index]?.signals.push(signal);
    }
    return bucketizeByOutcome(groups);
  });

  readonly shiftByRangeRegime = computed<ReliabilityBucket[]>(() => {
    const signals = this.shiftSignals();
    if (signals.length === 0) {
      return [];
    }
    const sorted = [...signals].sort((a, b) => a.dayRangePct - b.dayRangePct);
    const median = sorted[Math.floor(sorted.length / 2)].dayRangePct;
    return bucketizeByOutcome([
      {
        label: `Low range (≤${median.toFixed(2)}%)`,
        key: 'low',
        signals: signals.filter((s) => s.dayRangePct <= median),
      },
      {
        label: `High range (>${median.toFixed(2)}%)`,
        key: 'high',
        signals: signals.filter((s) => s.dayRangePct > median),
      },
    ]);
  });

  readonly shiftByStreak = computed<ReliabilityBucket[]>(() => {
    const signals = this.shiftSignals();
    const streakLabel = (streak: string) =>
      streak === '0'
        ? 'First swing of its kind that day'
        : streak === '1'
          ? '1 prior same-direction swing'
          : '2+ prior same-direction swings';
    const keys = ['0', '1', '2+'] as const;
    const groups = keys.map((key) => ({
      label: streakLabel(key),
      key,
      signals: signals.filter((s) =>
        key === '2+' ? s.precedingStreak >= 2 : String(s.precedingStreak) === key,
      ),
    }));
    return bucketizeByOutcome(groups);
  });

  readonly weekdayStats = computed<WeekdayStat[]>(() => {
    const days = this.days();
    return WEEKDAY_ORDER.map((weekday) => {
      const group = days.filter((d) => parseDateKey(d.date).getDay() === weekday);
      const upCount = group.filter((d) => d.trend === 'UPTREND').length;
      return {
        label: WEEKDAY_LABELS[weekday],
        count: group.length,
        upCount,
        avgRangePct: this.average(group.map((d) => d.rangePct)),
        avgCloseLocation: this.average(group.map((d) => d.closeLocation)),
        upPct: group.length === 0 ? 0 : (upCount / group.length) * 100,
      };
    });
  });

  readonly swingLegs = computed(() => computeSwingLegs(this.days()));

  readonly legOverall = computed(() => {
    const legs = this.swingLegs();
    if (legs.length === 0) {
      return { n: 0, avgAmplitudePct: 0, avgDurationMinutes: 0, avgSpeedPctPerMin: 0 };
    }
    return {
      n: legs.length,
      avgAmplitudePct: this.average(legs.map((l) => l.amplitudePct)),
      avgDurationMinutes: this.average(legs.map((l) => l.durationMinutes)),
      avgSpeedPctPerMin: this.average(legs.map((l) => l.amplitudePct / l.durationMinutes)),
    };
  });

  readonly legsByTimeOfDay = computed<LegBucket[]>(() => {
    const groups: { label: string; legs: SwingLegInfo[] }[] = Array.from(
      { length: BUCKET_COUNT },
      (_, i) => ({ label: this.bucketLabel(i), legs: [] }),
    );
    for (const leg of this.swingLegs()) {
      const index = this.bucketIndex(leg.fromMinutes);
      groups[index]?.legs.push(leg);
    }
    return groups
      .filter((g) => g.legs.length > 0)
      .map((g) => ({
        label: g.label,
        n: g.legs.length,
        avgAmplitudePct: this.average(g.legs.map((l) => l.amplitudePct)),
        avgDurationMinutes: this.average(g.legs.map((l) => l.durationMinutes)),
        avgSpeedPctPerMin: this.average(g.legs.map((l) => l.amplitudePct / l.durationMinutes)),
      }));
  });

  readonly maxLegAmplitude = computed(() =>
    Math.max(1, ...this.legsByTimeOfDay().map((b) => b.avgAmplitudePct)),
  );

  readonly swingCountFingerprint = computed<SwingCountBucket[]>(() => {
    const days = this.days();
    if (days.length < 2) {
      return [];
    }
    const withCounts = days
      .map((day) => ({ day, count: day.swingHighs.length + day.swingLows.length }))
      .sort((a, b) => a.count - b.count);
    const n = withCounts.length;
    const cut1 = Math.max(1, Math.floor(n / 3));
    const cut2 = Math.max(cut1 + 1, Math.floor((2 * n) / 3));
    const groups: { label: string; key: string; items: typeof withCounts }[] = [
      { label: 'Low', key: 'low', items: withCounts.slice(0, cut1) },
      { label: 'Mid', key: 'mid', items: withCounts.slice(cut1, cut2) },
      { label: 'High', key: 'high', items: withCounts.slice(cut2) },
    ];
    return groups
      .filter((g) => g.items.length > 0)
      .map((g) => {
        const counts = g.items.map((x) => x.count);
        const min = Math.min(...counts);
        const max = Math.max(...counts);
        const rangeLabel = min === max ? `${min}` : `${min}-${max}`;
        const upCount = g.items.filter((x) => x.day.trend === 'UPTREND').length;
        return {
          label: `${g.label} swing count (${rangeLabel})`,
          key: g.key,
          n: g.items.length,
          avgRangePct: this.average(g.items.map((x) => x.day.rangePct)),
          avgCloseExtremityPct: this.average(
            g.items.map((x) => Math.abs(x.day.closeLocation - 0.5) * 2 * 100),
          ),
          upPct: (upCount / g.items.length) * 100,
        };
      });
  });

  readonly streakReversalBuckets = computed<RateBucket[]>(() => {
    const data = computeStreakReversals(this.days());
    const groups = [
      {
        label: '1-day streak',
        key: '1',
        items: data.filter((d) => d.streakLength === 1).map((d) => ({ positive: d.reversed })),
      },
      {
        label: '2-day streak',
        key: '2',
        items: data.filter((d) => d.streakLength === 2).map((d) => ({ positive: d.reversed })),
      },
      {
        label: '3+ day streak',
        key: '3+',
        items: data.filter((d) => d.streakLength >= 3).map((d) => ({ positive: d.reversed })),
      },
    ];
    return rateBucketize(groups);
  });

  readonly firstSwingOutcome = computed<FirstSwingBucket[]>(() => {
    const days = this.days();
    const groups = [
      { label: 'High formed first (price moved up first)', items: days.filter((d) => d.highFirst) },
      {
        label: 'Low formed first (price moved down first)',
        items: days.filter((d) => !d.highFirst),
      },
    ];
    return groups
      .filter((g) => g.items.length > 0)
      .map((g) => ({
        label: g.label,
        n: g.items.length,
        upPct: (g.items.filter((d) => d.trend === 'UPTREND').length / g.items.length) * 100,
        avgCloseLocation: this.average(g.items.map((d) => d.closeLocation)),
      }));
  });

  readonly firstSwings = computed(() => computeFirstSwings(this.days()));

  readonly firstSwingByTimeOfDay = computed<FirstSwingTimeBucket[]>(() => {
    const groups: { label: string; items: FirstSwingInfo[] }[] = Array.from(
      { length: BUCKET_COUNT },
      (_, i) => ({ label: this.bucketLabel(i), items: [] }),
    );
    for (const firstSwing of this.firstSwings()) {
      const index = this.bucketIndex(firstSwing.minutesFromOpen);
      groups[index]?.items.push(firstSwing);
    }
    return groups
      .filter((g) => g.items.length > 0)
      .map((g) => {
        const highCount = g.items.filter((i) => i.type === 'HIGH').length;
        return {
          label: g.label,
          n: g.items.length,
          highPct: (highCount / g.items.length) * 100,
          avgAmplitude: this.average(g.items.map((i) => i.amplitude)),
          avgAmplitudePct: this.average(g.items.map((i) => i.amplitudePct)),
        };
      });
  });

  readonly detectedPatterns = computed<PatternCard[]>(() => {
    const cards: PatternCard[] = [];

    const firstSwingBest = this.mostNotableBucket(
      this.firstSwingByTimeOfDay(),
      (b) => b.highPct,
      this.highFirstPct(),
    );
    if (firstSwingBest) {
      const direction = firstSwingBest.highPct >= 50 ? 'a HIGH' : 'a LOW';
      cards.push({
        title: `First swing around ${firstSwingBest.label} ET tends to be ${direction}`,
        detail: this.firstSwingTimeBucketExplanation(firstSwingBest),
        n: firstSwingBest.n,
        confidence: this.confidenceOf(firstSwingBest.n),
      });
    }

    const chochTimeBest = this.mostNotableBucket(
      this.shiftByTimeOfDay(),
      (b) => b.confirmedPct,
      this.shiftReliabilityOverall().confirmedPct,
    );
    if (chochTimeBest) {
      const verdict =
        chochTimeBest.confirmedPct >= this.shiftReliabilityOverall().confirmedPct
          ? 'confirm more often than usual'
          : 'confirm less often than usual';
      cards.push({
        title: `Structure shifts around ${chochTimeBest.label} ET ${verdict}`,
        detail: this.timeOfDayBucketExplanation(chochTimeBest),
        n: chochTimeBest.n,
        confidence: this.confidenceOf(chochTimeBest.n),
      });
    }

    const chochRangeBest = this.mostNotableBucket(
      this.shiftByRangeRegime(),
      (b) => b.confirmedPct,
      this.shiftReliabilityOverall().confirmedPct,
    );
    if (chochRangeBest) {
      const regime = chochRangeBest.key === 'low' ? 'calmer' : 'more volatile';
      cards.push({
        title: `Structure shifts are more reliable on ${regime} days`,
        detail: this.rangeRegimeBucketExplanation(chochRangeBest),
        n: chochRangeBest.n,
        confidence: this.confidenceOf(chochRangeBest.n),
      });
    }

    const chochStreakBest = this.mostNotableBucket(
      this.shiftByStreak(),
      (b) => b.confirmedPct,
      this.shiftReliabilityOverall().confirmedPct,
    );
    if (chochStreakBest) {
      cards.push({
        title: 'Structure shift reliability depends on what preceded it that day',
        detail: this.streakBucketExplanation(chochStreakBest),
        n: chochStreakBest.n,
        confidence: this.confidenceOf(chochStreakBest.n),
      });
    }

    const legBuckets = this.legsByTimeOfDay().filter((b) => b.n >= MIN_PATTERN_SAMPLE);
    if (legBuckets.length > 0) {
      const biggest = legBuckets.reduce((a, b) => (b.avgAmplitudePct > a.avgAmplitudePct ? b : a));
      cards.push({
        title: `Biggest swing moves tend to start around ${biggest.label} ET`,
        detail: this.legBucketExplanation(biggest),
        n: biggest.n,
        confidence: this.confidenceOf(biggest.n),
      });
    }

    const topCloseLocation = this.closeLocationBuckets()
      .filter((b) => b.count >= MIN_PATTERN_SAMPLE && b.pct >= 30)
      .reduce<CloseLocationBucket | null>(
        (best, b) => (!best || b.pct > best.pct ? b : best),
        null,
      );
    if (topCloseLocation) {
      cards.push({
        title: `The close usually lands "${topCloseLocation.label}"`,
        detail: this.closeLocationBucketExplanation(topCloseLocation),
        n: topCloseLocation.count,
        confidence: this.confidenceOf(topCloseLocation.count),
      });
    }

    for (const row of this.trendTransitions()) {
      if (row.total < MIN_PATTERN_SAMPLE || Math.abs(row.toUpPct - 50) < MIN_PATTERN_DEVIATION) {
        continue;
      }
      cards.push({
        title: `${row.fromTrend} days tend to ${row.toUpPct > 50 ? 'continue UP' : 'reverse DOWN'} the next day`,
        detail: this.trendTransitionExplanation(row),
        n: row.total,
        confidence: this.confidenceOf(row.total),
      });
    }

    const streakBest = this.mostNotableBucket(
      this.streakReversalBuckets(),
      (b) => b.positivePct,
      50,
    );
    if (streakBest) {
      cards.push({
        title: `After a ${streakBest.label}, reversal odds shift`,
        detail: this.streakReversalExplanation(streakBest),
        n: streakBest.n,
        confidence: this.confidenceOf(streakBest.n),
      });
    }

    const weekdayBest = this.weekdayStats()
      .filter((w) => w.count >= MIN_PATTERN_SAMPLE)
      .reduce<WeekdayStat | null>(
        (best, w) => (!best || Math.abs(w.upPct - 50) > Math.abs(best.upPct - 50) ? w : best),
        null,
      );
    if (weekdayBest && Math.abs(weekdayBest.upPct - 50) >= MIN_PATTERN_DEVIATION) {
      cards.push({
        title: `${weekdayBest.label} sessions lean ${weekdayBest.upPct >= 50 ? 'bullish' : 'bearish'}`,
        detail: this.weekdayExplanation(weekdayBest),
        n: weekdayBest.count,
        confidence: this.confidenceOf(weekdayBest.count),
      });
    }

    const scBuckets = this.swingCountFingerprint();
    const scLow = scBuckets.find((b) => b.key === 'low');
    const scHigh = scBuckets.find((b) => b.key === 'high');
    if (scLow && scHigh && scLow.n >= MIN_PATTERN_SAMPLE && scHigh.n >= MIN_PATTERN_SAMPLE) {
      const diff = scLow.avgCloseExtremityPct - scHigh.avgCloseExtremityPct;
      if (Math.abs(diff) >= MIN_PATTERN_DEVIATION) {
        const trendier = diff > 0 ? scLow : scHigh;
        cards.push({
          title: `Days with ${trendier.label.toLowerCase()} close more decisively`,
          detail: this.swingCountBucketExplanation(trendier),
          n: trendier.n,
          confidence: this.confidenceOf(trendier.n),
        });
      }
    }

    return cards.sort((a, b) => b.n - a.n);
  });

  closeLocationBucketExplanation(bucket: CloseLocationBucket): string {
    const total = this.dayCount();
    return (
      `${bucket.count} of ${total} day${total === 1 ? '' : 's'} in this range (${bucket.pct.toFixed(0)}%) ` +
      `closed in the "${bucket.label}" zone of that day's own high-low range.`
    );
  }

  trendTransitionExplanation(row: TrendTransition): string {
    const dayWord = row.total === 1 ? 'day' : 'days';
    const returnPhrase =
      row.avgNextDayReturnPct !== null
        ? `averaging a ${row.avgNextDayReturnPct >= 0 ? '+' : ''}${row.avgNextDayReturnPct.toFixed(2)}% next-day return`
        : 'with no next-day return data available';
    return (
      `Out of ${row.total} ${row.fromTrend} ${dayWord}, ${row.toUpCount} (${row.toUpPct.toFixed(0)}%) ` +
      `were followed by an UPTREND day and ${row.toDownCount} (${row.toDownPct.toFixed(0)}%) by a ` +
      `DOWNTREND day, ${returnPhrase}.`
    );
  }

  weekdayExplanation(row: WeekdayStat): string {
    if (row.count === 0) {
      return `No ${row.label} sessions in this range.`;
    }
    return (
      `${row.label}: ${row.count} day${row.count === 1 ? '' : 's'} analyzed, ${row.upCount} of ` +
      `them (${row.upPct.toFixed(0)}%) closed higher than they opened, averaging a ` +
      `${row.avgRangePct.toFixed(2)}% range with the close finishing at ${row.avgCloseLocation.toFixed(2)} ` +
      `of that day's own high-low range.`
    );
  }

  shiftOverallExplanation(): string {
    const { n, confirmed, confirmedPct } = this.shiftReliabilityOverall();
    if (n === 0) {
      return '';
    }
    const refuted = n - confirmed;
    const shiftWord = n === 1 ? 'shift' : 'shifts';
    return (
      `This range contains ${n} possible structure ${shiftWord} (LH/HL). ${confirmed} were later ` +
      `confirmed (${confirmedPct.toFixed(0)}%) — price kept moving the implied direction — and ` +
      `${refuted} were refuted, meaning price broke back the other way.`
    );
  }

  timeOfDayBucketExplanation(bucket: ReliabilityBucket): string {
    const shiftWord = bucket.n === 1 ? 'shift' : 'shifts';
    return (
      `Around ${bucket.label} ET: ${bucket.n} possible structure ${shiftWord} (LH/HL) formed in ` +
      `this range, and ${bucket.confirmed} of them (${bucket.confirmedPct.toFixed(0)}%) were later confirmed.`
    );
  }

  rangeRegimeBucketExplanation(bucket: ReliabilityBucket): string {
    const regime =
      bucket.key === 'low' ? 'calmer, below-median-range' : 'more volatile, above-median-range';
    const shiftWord = bucket.n === 1 ? 'shift' : 'shifts';
    return (
      `On ${regime} days (${bucket.label}): ${bucket.n} possible structure ${shiftWord} (LH/HL), ` +
      `${bucket.confirmed} later confirmed (${bucket.confirmedPct.toFixed(0)}%).`
    );
  }

  streakBucketExplanation(bucket: ReliabilityBucket): string {
    const context =
      bucket.key === '0'
        ? 'Shifts that were the first swing of their kind that day'
        : bucket.key === '1'
          ? 'Shifts that came after exactly 1 same-direction swing that day'
          : 'Shifts that came after 2 or more same-direction swings that day';
    const shiftWord = bucket.n === 1 ? 'shift' : 'shifts';
    return (
      `${context}: ${bucket.n} possible structure ${shiftWord} (LH/HL), ${bucket.confirmed} later ` +
      `confirmed (${bucket.confirmedPct.toFixed(0)}%).`
    );
  }

  legOverallExplanation(): string {
    const o = this.legOverall();
    if (o.n === 0) {
      return '';
    }
    return (
      `Across ${o.n} swing-to-swing moves in this range, the average move was ` +
      `${o.avgAmplitudePct.toFixed(2)}% over ${o.avgDurationMinutes.toFixed(0)} minutes — about ` +
      `${o.avgSpeedPctPerMin.toFixed(3)}% per minute.`
    );
  }

  legBucketExplanation(bucket: LegBucket): string {
    const moveWord = bucket.n === 1 ? 'swing move' : 'swing moves';
    return (
      `Moves starting around ${bucket.label} ET: ${bucket.n} ${moveWord} averaged ` +
      `${bucket.avgAmplitudePct.toFixed(2)}% in size over ${bucket.avgDurationMinutes.toFixed(0)} ` +
      `minutes — about ${bucket.avgSpeedPctPerMin.toFixed(3)}% per minute.`
    );
  }

  swingCountBucketExplanation(bucket: SwingCountBucket): string {
    const dayWord = bucket.n === 1 ? 'day' : 'days';
    return (
      `${bucket.n} ${dayWord} with ${bucket.label.toLowerCase()} swings: averaged a ` +
      `${bucket.avgRangePct.toFixed(2)}% range, closed ${bucket.avgCloseExtremityPct.toFixed(0)}% ` +
      `of the way toward an extreme (vs. sitting at the day's own midpoint), and finished in an ` +
      `uptrend ${bucket.upPct.toFixed(0)}% of the time.`
    );
  }

  streakReversalExplanation(bucket: RateBucket): string {
    const timeWord = bucket.n === 1 ? 'time' : 'times';
    return (
      `After a ${bucket.label} of same-direction trend days, the next day reversed ` +
      `${bucket.positive} out of ${bucket.n} ${timeWord} (${bucket.positivePct.toFixed(0)}%).`
    );
  }

  firstSwingBucketExplanation(bucket: FirstSwingBucket): string {
    return (
      `${bucket.label}: ${bucket.n} days, ${bucket.upPct.toFixed(0)}% ended as an UPTREND day, ` +
      `with the close averaging ${bucket.avgCloseLocation.toFixed(2)} of that day's own high-low range.`
    );
  }

  firstSwingTimeBucketExplanation(bucket: FirstSwingTimeBucket): string {
    const dayWord = bucket.n === 1 ? 'day' : 'days';
    const direction = bucket.highPct >= 50 ? 'a HIGH' : 'a LOW';
    const directionPct = bucket.highPct >= 50 ? bucket.highPct : 100 - bucket.highPct;
    return (
      `When the first swing of the day forms around ${bucket.label} ET (${bucket.n} ${dayWord}), ` +
      `it's ${direction} ${directionPct.toFixed(0)}% of the time, averaging a ${bucket.avgAmplitude.toFixed(2)} ` +
      `(${bucket.avgAmplitudePct.toFixed(2)}%) move from that day's open.`
    );
  }

  private confidenceOf(n: number): 'weak' | 'moderate' | 'strong' {
    if (n >= 20) {
      return 'strong';
    }
    return n >= 10 ? 'moderate' : 'weak';
  }

  /**
   * Picks the bucket whose rate deviates furthest from `baseline`, provided
   * it clears both the minimum sample size and minimum deviation — used to
   * turn a breakdown table into a single "this is the standout" pattern card.
   */
  private mostNotableBucket<T extends { n: number }>(
    buckets: T[],
    rateOf: (bucket: T) => number,
    baseline: number,
  ): T | null {
    let best: T | null = null;
    let bestDeviation = 0;
    for (const bucket of buckets) {
      if (bucket.n < MIN_PATTERN_SAMPLE) {
        continue;
      }
      const deviation = Math.abs(rateOf(bucket) - baseline);
      if (deviation > bestDeviation) {
        bestDeviation = deviation;
        best = bucket;
      }
    }
    return bestDeviation >= MIN_PATTERN_DEVIATION ? best : null;
  }

  private bucketIndex(minutesFromOpen: number): number {
    const clamped = Math.min(Math.max(minutesFromOpen, 0), SESSION_LENGTH_MINUTES - 1);
    return Math.min(Math.floor(clamped / BUCKET_SIZE_MINUTES), BUCKET_COUNT - 1);
  }

  private bucketLabel(index: number): string {
    const startMinutes = SESSION_OPEN_MINUTES + index * BUCKET_SIZE_MINUTES;
    const hour = Math.floor(startMinutes / 60);
    const minute = startMinutes % 60;
    return `${hour}:${String(minute).padStart(2, '0')}`;
  }

  private candleShape(day: DailySwingData): {
    bodyPct: number;
    upperWickPct: number;
    lowerWickPct: number;
  } {
    const range = day.high - day.low;
    if (range <= 0) {
      return { bodyPct: 0, upperWickPct: 0, lowerWickPct: 0 };
    }
    const bodyPct = (Math.abs(day.close - day.open) / range) * 100;
    const upperWickPct = ((day.high - Math.max(day.open, day.close)) / range) * 100;
    const lowerWickPct = ((Math.min(day.open, day.close) - day.low) / range) * 100;
    return { bodyPct, upperWickPct, lowerWickPct };
  }

  private average(values: number[]): number {
    if (values.length === 0) {
      return 0;
    }
    return values.reduce((sum, v) => sum + v, 0) / values.length;
  }
}
