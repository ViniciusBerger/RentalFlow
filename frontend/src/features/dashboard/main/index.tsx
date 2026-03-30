import { Header } from "./components/dashboard-header"
import { BalanceSection } from "./components/balace-section"
import { NextRentals } from "../../../components/next-rentals"
import { Plus } from "lucide-react"
import { GenericButton } from "../../../components/buttons/generic-button";

interface MainProps {
  onOpenCreateRentalPopUp: () => void;
  onSelectRental:(rental:any)=> void;
  onOpenPopUp:() => void
  userData: any
  threeNextRentals: any[];
  props?: any; 
}

export const Main = ({onOpenCreateRentalPopUp, onOpenPopUp, onSelectRental, props, threeNextRentals, userData}: MainProps)=> (
    <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="p-6 md:p-12 max-w-5xl mx-auto">
            {/* Top header - Display user information and navigation items - top page */}
            <Header username={userData}/>
            
            {/* Income sectin - Display the montly / yearly income - Middle Top */}
            <BalanceSection props = {props}/>
          
            {/* Next rentals - display the next three rentals - Middle page */}
            <NextRentals onOpenPopUp={onOpenPopUp} onSelectRental={onSelectRental} rentals = {threeNextRentals} headerContent="Next Three Rentals"/>
            
            {/* Add rental button - Bottom */}
            <GenericButton onClick={onOpenCreateRentalPopUp} content={"Add a rental"} icon={<Plus size={20} />}/>
        </div>
      </main>
)