import { Outlet } from "react-router-dom";
import { DesktopNavBar } from "../components/nav-bar/desktop-navbar";
import { MobileNavBar } from "../components/nav-bar/mobile-navbar";

export const AppLayout = () => {
  return (
    <div className="flex h-screen overflow-hidden bg-sage-50 font-sans text-slate-900">
      <DesktopNavBar />

      <main className="flex-1 h-full overflow-y-auto p-5 md:p-10">
        <Outlet /> 
      </main>

      <MobileNavBar />
    </div>
  );
};