import { Header } from "../header"
import { IncomeSection } from "../revenue-section"
import { NextRentals } from "../next-rentals"
import { Plus } from "lucide-react"

interface MainProps {
  onOpenCreateRentalPopUp: () => void;
  onSelectRental:(rental:any)=> void;
  onOpenPopUp:() => void

  threeNextRentals: any[];
  props?: any; 
}

export const Main = ({onOpenCreateRentalPopUp, onOpenPopUp, onSelectRental, props, threeNextRentals}: MainProps)=> (
    <main className="flex-1 overflow-y-auto pb-24 md:pb-0">
        <div className="p-6 md:p-12 max-w-5xl mx-auto">
            {/* Top header - Display user information and navigation items - top page */}
            <Header/>
            {/* Income sectin - Display the montly / yearly income - Middle Top */}
            <IncomeSection props = {props}/>
            {/* Next rentals - display the next three rentals - Middle page */}
            <NextRentals onOpenPopUp={onOpenPopUp} onSelectRental={onSelectRental} rentals = {threeNextRentals}/>
            {/* Add rental button - Bottom */}

            <button
            onClick={onOpenCreateRentalPopUp}
            className="w-full md:w-auto md:px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-sage-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
            <Plus size={20} />
                <span>Add a Rental </span>
            </button>
        </div>
      </main>
)