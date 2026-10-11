import { Calendar, DollarSign } from "lucide-react";
import { useLanguage } from "../../../../i18n/context";
import { formatBRL, formatBookingDate } from "../../../../i18n/messages";

//This method turn raw database strings like "2026-02-25" and "2026-03-01" into the amount of nights.
const calculateNights = (start: Date, end:Date)=> {
  // (1000 * 60 * 60 * 24) represents the amount of millisecons in a day
  return Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
}

export const DetailGrid = ({rental}:any)=> {
    const {t,locale}=useLanguage();
    const nights = calculateNights(new Date(rental.startDate), new Date(rental.endDate) )
    return (
        <div className="grid grid-cols-2 gap-6">
                
            {/* Stay Info */}
            <div className="flex gap-4">
                <div className="w-12 h-12 bg-sky-50 rounded-2xl flex items-center justify-center text-sky-600 shrink-0">
                    <Calendar size={24} />
                </div>
                
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("duration")}</p>
                    <p className="text-sm font-bold text-slate-700">{nights} {nights === 1 ? t("nightSingular") : t("nightPlural")}</p>
                    <p className="text-[11px] font-medium text-slate-500 truncate whitespace-nowrap">
                    {formatBookingDate(rental.startDate,locale)} — {formatBookingDate(rental.endDate,locale)}
                    </p>
                </div>
            </div>

            {/* Money Info */}
            <div className="flex gap-4">
                <div className="w-12 h-12 bg-sage-50 rounded-2xl flex items-center justify-center text-sage-600 shrink-0">
                    <DollarSign size={24} />
                </div>
                
                <div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-400">{t("totalRevenue")}</p>
                    <p className="text-sm font-bold text-slate-700">{formatBRL(rental.revenue)}</p>
                </div>
            </div>

        <hr className="border-slate-100" />
    </div>
    )
}