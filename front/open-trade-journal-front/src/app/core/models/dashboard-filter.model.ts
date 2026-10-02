export const DASHBOARD_FILTER_COOKIE = 'dashboardFilter';

export interface DashboardFilterCookie {
  selectedPeriod: string;
  startDate: string;
  endDate: string;
  periodLabel: string;
}
