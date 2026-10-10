import { Header } from "./components/dashboard-header";
import { BalanceSection } from "./components/balace-section";
import { NextRentals } from "../../../components/next-rentals";
import { Link } from "react-router-dom";
import { ArrowRight, CalendarDays, Plus } from "lucide-react";
interface MainProps { onOpenCreateRentalPopUp: () => void; onSelectRental: (rental:any)=>void; onOpenPopUp:()=>void; userData:any; threeNextRentals:any[]; props?:any; }
export const Main = ({onOpenCreateRentalPopUp,onOpenPopUp,onSelectRental,props,threeNextRentals,userData}:MainProps) => (
  <div className="rf-dashboard">
    <Header username={userData}/>
    <BalanceSection props={props}/>
    <div className="rf-dashboard-grid">
      <section className="rf-panel rf-feature-panel"><div className="rf-section-title"><div><p className="rf-eyebrow">YOUR WORKSPACE</p><h2>Stay organized, effortlessly.</h2><p>Keep your upcoming reservations and rental finances in one place.</p></div><CalendarDays size={27}/></div>
        <div className="rf-feature-actions"><button onClick={onOpenCreateRentalPopUp} className="rf-button"><Plus size={18}/> Create a booking</button><Link className="rf-outline" to="/bookings">Open calendar <ArrowRight size={16}/></Link></div>
      </section>
      <NextRentals onOpenPopUp={onOpenPopUp} onSelectRental={onSelectRental} rentals={threeNextRentals} headerContent="Upcoming rentals" />
    </div>
  </div>
);
