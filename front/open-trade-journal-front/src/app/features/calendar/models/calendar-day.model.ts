
interface CalendarDay {
  date: Date;
  dateKey: string;
  dayNumber: number;
  pnl: number | null;
  isCurrentMonth: boolean;
  isToday: boolean;
  isBestDay: boolean;
  isWorstDay: boolean;
}
