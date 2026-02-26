import { Calendar, LayoutDashboard, Plus, Settings, Wallet } from "lucide-react";

export const MobileNavBar =()=> (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sage-50 px-8 py-4 flex justify-between items-center">
        <LayoutDashboard size={24} className="text-sage-500" />
        <Calendar size={24} className="text-slate-300" />
        <div className="bg-sage-500 p-3 rounded-2xl -mt-12 shadow-lg shadow-sage-200 text-white">
          <Plus size={28} />
        </div>
        <Wallet size={24} className="text-slate-300" />
        <Settings size={24} className="text-slate-300" />
      </nav>
)