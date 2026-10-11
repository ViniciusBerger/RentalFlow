import { dateKey } from '../booking/service/booking-timeline';

export interface MonthlyBalance {
  label: string;
  totalRevenue: number;
  totalProfit: number;
  bookingCount?: number;
}
export interface MonthPoint extends MonthlyBalance {
  month: number;
  isComplete: boolean;
}
export interface RentalInsight {
  months: MonthPoint[];
  strongest: MonthPoint | null;
  weakest: MonthPoint | null;
}
/** A monthly booking is assigned to its *check-in* month by the existing financial API.
 * Completed months only are eligible for peak / slow analysis; a partial current month
 * should not be called 'weak' against a full month.
 */
export function buildRentalInsights(rows: readonly MonthlyBalance[], today: string): RentalInsight {
  const key = dateKey(today);
  const year = Number(key.slice(0,4));
  const monthNow = Number(key.slice(5,7));
  const validToday = key !== '' && monthNow >= 1 && monthNow <= 12;
  const months = Array.from({length:12},(_,index):MonthPoint=>{
    const label = `${year}-${String(index + 1).padStart(2,'0')}`;
    const row = rows.find(item => item.label === label);
    return {label, month:index+1, bookingCount: Math.max(0,Number(row?.bookingCount ?? 0)),
      totalRevenue: Number(row?.totalRevenue ?? 0), totalProfit: Number(row?.totalProfit ?? 0),
      isComplete: validToday && index+1 < monthNow};
  });
  const completed = months.filter(m => m.isComplete);
  // No historical bookings means no meaningful peak / slow season claim.
  const hasHistory = completed.some(m => (m.bookingCount ?? 0) > 0);
  const ranked = completed.slice().sort((a,b) => (b.bookingCount ?? 0) - (a.bookingCount ?? 0) || a.month-b.month);
  const reverse = completed.slice().sort((a,b) => (a.bookingCount ?? 0) - (b.bookingCount ?? 0) || a.month-b.month);
  return {months,strongest:hasHistory?ranked[0]:null,weakest:hasHistory?reverse[0]:null};
}
