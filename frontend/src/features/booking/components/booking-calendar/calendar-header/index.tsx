import { ChevronLeft,ChevronRight } from "lucide-react";
interface Props {viewDate:Date;handleNext:()=>void;handlePrev:()=>void}
export const CalendarHeader=({viewDate,handlePrev,handleNext}:Props)=><div className="rf-calendar-header"><div><span className="rf-eyebrow">MONTHLY VIEW</span><h2>{viewDate.toLocaleString("en-CA",{month:"long",year:"numeric"})}</h2></div><div className="rf-calendar-controls"><button aria-label="Previous month" onClick={handlePrev}><ChevronLeft size={20}/></button><button aria-label="Next month" onClick={handleNext}><ChevronRight size={20}/></button></div></div>;
