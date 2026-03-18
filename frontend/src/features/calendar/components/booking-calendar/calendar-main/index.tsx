import { calendarDisplay, normalizeRentalDates} from "../../../service/calendar-service";

interface ICalendarMainProps {
  rentals: any[]
  viewDate: Date
}

const weekdays = [
  { full: "Sunday", short: "Sun", mobile: "S" },
  { full: "Monday", short: "Mon", mobile: "M" },
  { full: "Tuesday", short: "Tue", mobile: "T" },
  { full: "Wednesday", short: "Wed", mobile: "W" },
  { full: "Thursday", short: "Thu", mobile: "T" },
  { full: "Friday", short: "Fri", mobile: "F" },
  { full: "Saturday", short: "Sat", mobile: "S" },
];


export const CalendarMain = ({ viewDate, rentals }: ICalendarMainProps) => {
  
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
            <div className="grid grid-cols-7 grid-rows-6 h-[480px]">
            {gridCells.map((_, i) => {
                
                const dayNumber = i - firstDayIndex + 1; // Determine the day number for this specific cell
                const isCurrentMonth = dayNumber > 0 && dayNumber <= daysInMonth; // Check if this cell belongs to the current month

                return (
                <div
                    key={i}
                    className="border-r border-b border-sage-50 p-2 text-right text-xs font-bold text-slate-300">
                        {isCurrentMonth ? dayNumber : ""}
                </div>
                );
            })}
            </div>

            {/* Layer 2: The Rental Bars */}
            <div className="absolute inset-0 grid grid-cols-7 grid-rows-6 pointer-events-none">
            {calendarDisplay(normalizedRentals, viewDate)}
            </div>
        </div>
    </div>
  );
};




