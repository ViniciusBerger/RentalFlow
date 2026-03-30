import { Calendar, LayoutDashboard, Plus} from "lucide-react";
import { NavLink } from "react-router-dom";


interface MobileNavBarProps {
  onCreateClick: () => void;
}

export const MobileNavBar = ({ onCreateClick }: MobileNavBarProps) => {
  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-sage-50 px-6 py-3 flex justify-around items-center">
      <MobileNavItem
        to="/dashboard"
        icon={<LayoutDashboard size={24} />}
        label="Dashboard"
      />

      <button
        type="button"
        onClick={onCreateClick}
        className="bg-sage-500 p-3 rounded-2xl -mt-12 shadow-lg shadow-sage-200 text-white transition-transform hover:scale-105"
      >
        <Plus size={28} />
      </button>

      <MobileNavItem
        to="/bookings"
        icon={<Calendar size={24} />}
        label="Bookings"
      />

      

      {/* <MobileNavItem
        to="/earnings"
        icon={<Wallet size={24} />}
        label="Earnings"
      />

      <MobileNavItem
        to="/settings"
        icon={<Settings size={24} />}
        label="Settings"
      /> */}
    </nav>
  );
};

interface MobileNavItemProps {
  to: string;
  icon: React.ReactNode;
  label: string;
}

function MobileNavItem({ to, icon, label }: MobileNavItemProps) {
  return (
    <NavLink
      to={to}
      className={({ isActive }) =>
        `flex flex-col items-center gap-1 transition-all ${
          isActive ? "text-sage-500" : "text-slate-300 hover:text-sage-500"
        }`
      }
    >
      {icon}
      <span className="text-[10px] font-medium">{label}</span>
    </NavLink>
  );
}