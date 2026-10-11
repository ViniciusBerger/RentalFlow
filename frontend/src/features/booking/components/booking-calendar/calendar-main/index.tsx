import { useLanguage } from "../../../../../i18n/context";
import { getWeekdays } from "../../../../../i18n/messages";
import { calendarDisplay, normalizeRentalDates} from "../../../service/calendar-service";

interface ICalendarMainProps {
  rentals: any[]
  viewDate: Date
}




export const CalendarMain = ({ viewDate, rentals }: ICalendarMainProps) => {
  const {locale}=useLanguage();
  const weekdays=getWeekdays(locale);
  
  const normalizedRentals = rentals.map((r) => normalizeRentalDates(r)); // normalize to local midnight
  const year = viewDate.getFullYear();
  const month = viewDate.getMonth();

  const firstDayIndex = new Date(year, month, 1).getDay();      // weekday index of the 1st day of the month (0 = Sunday)
  const daysInMonth = new Date(year, month + 1, 0).getDate();   // number of days in the current month
  const gridCells = Array.from({ length: 42 });                 // Create 42 cells for 6 weeks (covers all possibilities)

  return (
    <div className="bg-white rounded-3xl border border-sage-200 overflow-hidden shadow-sm">
        {/* Weekday Headers */}
        <div className="grid grid-cols-7 border-b border-sage-100 bg-sage-50/50">
            {weekdays.map((day) => (
            <div key={day.full} className="py-3 text-center text-sm font-bold text-slate-400 uppercase tracking-wider">
                {/* Make weekdays responsive on calendar */}
                <span className="hidden lg:inline">{day.full}</span>
                <span className="hidden sm:inline lg:hidden">{day.short}</span>
                <span className="sm:hidden">{day.mobile}</span>
            </div>
            ))}
        </div>

        <div className="relative">
            {/* Layer 1: The Grid Background */}
            <div className="grid grid-cols-7 grid-rows-6 h-[540px] max-sm:h-[440px]">
            {gridCells.map((_, i) => {
                
                const dayNumber = i - firstDayIndex + 1; // Determine the day number for this specific cell
                const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth; // Check if this cell belongs to the current month

                return (
                <div
                    key={i}
                    className="border-r border-b border-sage-50 p-2 text-right text-xs font-bold text-slate-500">
                        {isCurrentMonth ? dayNumber : ""}
                </div>
                );
            })}
            </div>

            {/* Layer 2: The Rental Bars */}
            <div className="absolute inset-0 grid grid-cols-7 grid-rows-6 pointer-events-none">
            {calendarDisplay(normalizedRentals, viewDate, locale)}
            </div>
        </div>
    </div>
  );
};




