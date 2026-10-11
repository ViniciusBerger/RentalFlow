import { CalendarDays, Plus } from "lucide-react";
import { useLanguage } from "../../../../i18n/context";
export const BookingHeader=({onOpenCreateRentalPopUp}:{onOpenCreateRentalPopUp:()=>void})=>{const {t}=useLanguage();return <div className="rf-bookings-heading"><div><p className="rf-eyebrow">{t("bookingManagement")}</p><h2><CalendarDays size={23}/> {t("bookingCalendar")}</h2><p>{t("bookingCalendarDescription")}</p></div><button className="rf-outline" onClick={onOpenCreateRentalPopUp}><Plus size={17}/> {t("addBooking")}</button></div>;};
