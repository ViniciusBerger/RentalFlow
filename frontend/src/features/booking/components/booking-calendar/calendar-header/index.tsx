import { ChevronLeft,ChevronRight } from "lucide-react";
import { useLanguage } from "../../../../../i18n/context";
import { formatBookingDate } from "../../../../../i18n/messages";
interface Props {viewDate:Date;handleNext:()=>void;handlePrev:()=>void}
export const CalendarHeader=({viewDate,handlePrev,handleNext}:Props)=>{const {t,locale}=useLanguage();return <div className="rf-calendar-header"><div><span className="rf-eyebrow">{t("monthlyView")}</span><h2>{formatBookingDate(viewDate,locale,true)}</h2></div><div className="rf-calendar-controls"><button aria-label={t("previousMonth")} onClick={handlePrev}><ChevronLeft size={20}/></button><button aria-label={t("nextMonth")} onClick={handleNext}><ChevronRight size={20}/></button></div></div>;};
