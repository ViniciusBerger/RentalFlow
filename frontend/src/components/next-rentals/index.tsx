import { Home } from "lucide-react"

interface NexRentalsProps {
    rentals: any[]
    onOpenPopUp: ()=> void
    onSelectRental: (rental: any)=> void
    headerContent: string
}
export const NextRentals = ({onSelectRental, onOpenPopUp, rentals, headerContent}: NexRentalsProps)=> (
    <section className="mb-12">
        <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold">{headerContent}</h3>
        </div>

        <div className="space-y-3">
            {rentals.map((r) => (
                <div 
                    onClick={() => {
                            onSelectRental(r)
                            onOpenPopUp()
                        }} 

                    key={r.id} className="bg-white p-4 rounded-2xl border border-slate-100 flex items-center gap-4 group cursor-pointer hover:border-sage-200 transition-all">
                    <div className="w-14 h-14 bg-white-100 hover:bg-sage-100 rounded-xl flex-shrink-0 flex items-center justify-center group-hover:scale-95 transition-transform duration-200 border border-white/50 shadow-sm">
                        <Home 
                            size={24} 
                            className="text-sage-600 fill-sage-500/10 stroke-[2.5px]" 
                        />
                    </div>
                   
                    <div className="flex-1">
                        <p className="font-bold text-sm">{r.clientFirstName + " " + r.clientLastName}</p>
                        <p className="text-xs text-slate-400 font-medium tracking-tight">{r.startDate} - {r.endDate} • {r.guests}  Guests</p>
                    </div>
                  
                    <div className="px-3 py-1 rounded-full bg-sage-50 text-sage-600 text-[10px] font-black uppercase">
                        Confirmed
                    </div>
                </div>
              ))}
        </div>
    </section>
)