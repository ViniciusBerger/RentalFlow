import { CalendarHeader } from "./calendar-header"
import { CalendarMain } from "./calendar-main"

interface IBookingCalendarProps {
    rentals: any[];
    viewDate: Date
    handleNext: ()=> void;
    handlePrev: ()=> void;
    
}

export const BookingCalendar = ({rentals, handlePrev, handleNext, viewDate}:IBookingCalendarProps)=> {
    return (    
        <div className="mb-12">
            <CalendarHeader 
                handlePrev={handlePrev} 
                handleNext={handleNext} 
                viewDate={viewDate}/>
            
            <CalendarMain 
                rentals={rentals}
                viewDate={viewDate}/>
        
        </div>
    )
}