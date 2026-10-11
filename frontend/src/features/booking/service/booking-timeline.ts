/** Booking dates are DATE values, never instants. Compare YYYY-MM-DD without UTC shifts. */
export interface BookingSummary {
  id?: string;
  startDate: string;
  endDate: string;
  isActive?: boolean;
  clientFirstName?: string;
  clientLastName?: string;
  guests?: number;
  revenue?: number;
  profit?: number;
}

export const dateKey = (value: string): string => {
  const match = /^(\d{4})-(\d{2})-(\d{2})(?:$|T)/.exec(value);
  return match ? `${match[1]}-${match[2]}-${match[3]}` : '';
};

/** RentalFlow operates in Brazil. Use the calendar day in São Paulo, not the viewer's timezone. */
export const brazilToday = (now: Date = new Date()): string => {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit',
  }).formatToParts(now);
  const part = (type: string) => parts.find(item => item.type === type)?.value ?? '';
  return `${part('year')}-${part('month')}-${part('day')}`;
};

/** Checkout on today's date is history; arrival today is upcoming. */
export function splitBookings<T extends BookingSummary>(bookings: readonly T[], today = brazilToday()) {
  const past: T[] = [];
  const current: T[] = [];
  const upcoming: T[] = [];
  for (const booking of bookings) {
    if (booking.isActive === false) continue; // Existing active-booking API convention
    const start = dateKey(booking.startDate);
    const end = dateKey(booking.endDate);
    if (!start || !end) continue; // Invalid dates cannot be assigned a misleading status
    if (end <= today) past.push(booking);
    else if (start < today) current.push(booking);
    else upcoming.push(booking);
  }
  // Nearest arrival first, stable order for multiple arrivals on the same date.
  upcoming.sort((a,b) => dateKey(a.startDate).localeCompare(dateKey(b.startDate)) || dateKey(a.endDate).localeCompare(dateKey(b.endDate)));
  current.sort((a,b) => dateKey(a.endDate).localeCompare(dateKey(b.endDate)));
  past.sort((a,b) => dateKey(b.endDate).localeCompare(dateKey(a.endDate)));
  return {past, current, upcoming};
}
