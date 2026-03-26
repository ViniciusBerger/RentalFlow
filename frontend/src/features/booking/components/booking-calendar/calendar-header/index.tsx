import { ChevronLeft, ChevronRight } from "lucide-react"

interface ICalendarHeaderProps {
    viewDate: Date
    handleNext: ()=> void;
    handlePrev: ()=> void;
}

export const CalendarHeader = ({viewDate, handlePrev, handleNext}: ICalendarHeaderProps) => {
    return (
        <div className="flex items-center justify-center mb-6">
            <ChevronLeft 
                onClick={handlePrev} 
                className="cursor-pointer text-slate-400 hover:text-slate-900" 
            />
            <h2 className="text-3xl font-black text-slate-900 w-80 text-center">
                {viewDate.toLocaleString('default', { month: 'long', year: 'numeric' })}
            </h2>
            <ChevronRight 
                onClick={handleNext} 
                className="cursor-pointer text-slate-400 hover:text-slate-900" 
            />
        </div>
    )
}