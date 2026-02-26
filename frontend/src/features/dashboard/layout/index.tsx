import { Outlet } from 'react-router-dom';
import { DesktopNavBar } from '../../../components/nav-bar/desktop-navbar';
import { MobileNavBar } from '../../../components/nav-bar/mobile-navbar';

const DashboardLayout = () => {
  return (
    <div className="flex h-screen bg-sage-50 font-sans text-slate-900">
        {/* Left nav bar for desktop view only */}
        <DesktopNavBar/>

      {/* This content changes based on url. This is the child page */}
      <main style={{ flex: 1, padding: '20px' }}>
        <Outlet /> 
      </main>

        {/* Bottom nav bar for mobile devices only */}
        <MobileNavBar/>
    </div>



  );
};

export default DashboardLayout;