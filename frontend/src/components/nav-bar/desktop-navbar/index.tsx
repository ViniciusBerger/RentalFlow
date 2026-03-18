import { Calendar, Home, LayoutDashboard, Settings, Wallet } from "lucide-react";
import { NavLink } from "react-router-dom";

export const DesktopNavBar = () => {
  return (
    /* REMOVED: The outer <div> that was causing the height gap issue */
    <aside className="hidden md:flex w-64 flex-col bg-white border-r border-sage-100 p-6 h-screen sticky top-0">
      <div className="flex items-center gap-2 mb-10 text-sage-600 font-bold text-xl">
        <Home className="fill-sage-500 text-sage-500" size={28} />
        <span>RentalFlow</span>
      </div>

      <nav className="space-y-2 flex-1">
        {/* Pass the 'to' prop to each item; 'active' is handled automatically now */}
        <NavItem to="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
        <NavItem to="/bookings" icon={<Calendar size={20} />} label="Bookings" />
        <NavItem to="/earnings" icon={<Wallet size={20} />} label="Earnings" />
        <NavItem to="/settings" icon={<Settings size={20} />} label="Settings" />
      </nav>

      <div className="pt-6 border-t border-sage-50">
        <div className="flex items-center gap-3 p-2 bg-sage-50 rounded-xl">
          <div className="w-10 h-10 rounded-full bg-sage-200" />
          <div>
            <p className="text-sm font-bold">Host Name</p>
            <p className="text-[10px] text-sage-600">Pro Account</p>
          </div>
        </div>
      </div>
    </aside>
  );
};

interface NavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function NavItem({ to, icon, label }: NavItemProps) {
  return (
    <NavLink
      to={to}
      /* NavLink provides an 'isActive' boolean in its className callback */
      className={({ isActive }) => `
        flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-all
        ${isActive 
          ? 'bg-sage-50 text-sage-600' 
          : 'text-slate-400 hover:bg-sage-50 hover:text-sage-600'
        }
      `}
    >
      {icon}
      <span className="font-bold text-sm">{label}</span>
    </NavLink>
  );
}