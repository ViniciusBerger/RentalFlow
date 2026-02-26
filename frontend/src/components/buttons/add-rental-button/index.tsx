import { Plus } from "lucide-react";

export const AddRentalButton = ()=> (
    <button className="w-full md:w-auto md:px-10 py-4 bg-slate-900 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-sage-600 transition-all shadow-xl shadow-slate-200 active:scale-95">
        <Plus size={20} />
        <span>Add a Rental</span>
    </button>
)