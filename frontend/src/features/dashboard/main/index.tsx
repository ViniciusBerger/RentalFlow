import { MonthlyChart } from "../monthly-chart";
import { splitBookings, brazilToday } from "../../booking/service/booking-timeline";
import type { MonthlyBalance } from "../monthly-insights";
import { Header } from "./components/dashboard-header";
import { BalanceSection } from "./components/balace-section";
import { NextRentals } from "../../../components/next-rentals";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
import { useLanguage } from "../../../i18n/context";
interface MainProps { onOpenCreateRentalPopUp: () => void; onSelectRental: (rental:any)=>void; onOpenPopUp:()=>void; userData:any; threeNextRentals:any[]; monthlySeries?:MonthlyBalance[]; props?:any; }
export const Main = ({onOpenCreateRentalPopUp,onOpenPopUp,onSelectRental,props,threeNextRentals,userData,monthlySeries=[]}:MainProps) => { const {t}=useLanguage(); return (
  <div className="rf-dashboard">
    <Header username={userData}/>
    <BalanceSection props={props}/>
    <MonthlyChart rows={monthlySeries}/>
    <div className="rf-dashboard-grid">
      <section className="rf-panel rf-feature-panel"><div className="rf-section-title"><div><p className="rf-eyebrow">{t("yourWorkspace")}</p><h2>{t("organized")}</h2><p>{t("organizeDescription")}</p></div><CalendarDays size={27}/></div>
        <div className="rf-feature-actions"><button onClick={onOpenCreateRentalPopUp} className="rf-button"><Plus size={18}/> {t("createBooking")}</button><Link className="rf-outline" to="/bookings">{t("openCalendar")} <ArrowRight size={16}/></Link></div>
      </section>
      <NextRentals onOpenPopUp={onOpenPopUp} onSelectRental={onSelectRental} rentals={splitBookings(threeNextRentals,brazilToday()).upcoming.slice(0,3)} headerContent="Upcoming rentals" />
    </div>
  </div>
);};
