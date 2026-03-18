import type { JSX } from "react";

// Helper: normalize a date to local midnight
const toLocalMidnight = (d: Date | string) => {
    
    if (typeof d === "string") {
        const parts = d.split('-').map(Number); // Split "2026-03-02" into [2026, 3, 2]
        return new Date(parts[0], parts[1] - 1, parts[2], 0, 0, 0, 0) // monthIndex is 0-based, so subtract 1;
    }
    
    const dt = new Date(d);
    dt.setHours(0, 0, 0, 0);
    return dt;
}

// Difference in days (endDate - startDate) ignoring timezone 
const diffDays = (a: Date, b: Date) => {
    const utcA = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
    const utcB = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
    return Math.floor((utcB - utcA) / (1000 * 60 * 60 * 24));
}

// Helper: ensure rental dates are local-midnight
export const normalizeRentalDates = (rental: any) => ({
    ...rental,
    startDate: toLocalMidnight(rental.startDate),
    endDate: toLocalMidnight(rental.endDate),
})



// Calendar rental rendering logic 
export const calendarDisplay = (rentals: any[], viewDate: Date) => {
    const firstDayOfMonth = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
    const firstDayIndex = firstDayOfMonth.getDay();
    const calendarStartDate = toLocalMidnight(new Date(viewDate.getFullYear(), viewDate.getMonth(), 1 - firstDayIndex));

    return rentals.flatMap((rental) => {
        const startDate = new Date(rental.startDate);
        const endDate = new Date(rental.endDate);

        // This determines the VISUAL length. 
        // From 2nd to 5th is (5 - 2) = 3. 
        // Add +1 if you want the bar to physically occupy the '5' cell.
        const totalDaysToShow = diffDays(startDate, endDate) + 1;
        let remainingDays = totalDaysToShow;

        const gridIndexStart = Math.round((startDate.getTime() - calendarStartDate.getTime()) / (24 * 60 * 60 * 1000));
        const elements: JSX.Element[] = [];
        let gridIndex = gridIndexStart;

        while (remainingDays > 0) {
            const colStart = (gridIndex % 7) + 1;
            const rowStart = Math.floor(gridIndex / 7) + 1;
            const daysThisRow = Math.min(remainingDays, 8 - colStart);

            elements.push(
                <div
                    key={`${rental.id}-${gridIndex}`}
                    className="flex items-center px-2 h-7 sm:h-8 my-auto border-y z-10 pointer-events-auto self-center bg-sage-500 border-sage-600 text-white shadow-sm rounded-lg p-2"
                    style={{
                    gridColumn: `${colStart} / span ${daysThisRow}`,
                    gridRow: rowStart,}}>

                    <span className="text-[8px] sm:text-[10px] font-black uppercase truncate">
                        {/* Show the ACTUAL nights (e.g., 3) even if the bar spans 4 cells */}
                        {`${rental.clientFirstName} / ${totalDaysToShow - 1} nights`}
                    </span>
                </div>
        );

            remainingDays -= daysThisRow;
            gridIndex += daysThisRow;
        }
        
        return elements;
    });
};
