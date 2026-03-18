import { Home } from "lucide-react";

export const Header = ()=> (
    <div className="flex flex-col items-center md:items-start mb-8">
          {/* Horizontal Branding Lockup */}
          <div className="flex items-center gap-4 mb-8">
            <div className="w-12 h-12 bg-white rounded-2xl flex items-center justify-center shadow-sm border border-sage-100 shrink-0">
              <Home className="fill-sage-500 text-sage-500" size={24} />
            </div>
            <h1 className="text-3xl font-black tracking-tighter text-slate-900 leading-none">
              RentalFlow
            </h1>
          </div>

          <header className="text-center md:text-left">
            <h2 className="text-4xl font-black text-slate-900 leading-tight">Welcome back</h2>
            <p className="text-sm font-bold text-slate-400 mt-2">Enter your credentials to manage your stays.</p>
          </header>
    </div>
)