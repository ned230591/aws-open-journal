/** One contiguous span of dates that have data saved for a symbol — see the backend's CoveragePeriodUtil. */
export interface CoveragePeriod {
  from: string;
  to: string;
}
