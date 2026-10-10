import { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, LayoutDashboard, Plus } from "lucide-react";
import { DesktopNavBar } from "../components/nav-bar/desktop-navbar";
import { MobileNavBar } from "../components/nav-bar/mobile-navbar";
import AddRentalPopUp from "../components/add-rental-popup";
import { useRentalActions } from "../hooks/rental-actions/useRentalActions";
import { UseLoadData } from "../hooks/load-data/useLoadData";
import { DashboardErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

export const AppLayout = () => {
  const { pathname } = useLocation();
  const isBookings = pathname.startsWith("/bookings");
  const [isAddRentalOpen, setIsAddRentalOpen] = useState(false);
  const {loadingError, loadData, isLoading} = UseLoadData()
  const [isSaving, setIsSaving] = useState(false);
  const {createRentalAndRefresh, error:rentalError} = useRentalActions()

  const handleOpenAddRental = () => {
    setIsAddRentalOpen(true);
  };

  const handleCloseAddRental = () => {
    setIsAddRentalOpen(false);
  };

  if (isLoading) return <LoadingState />;
  if (loadingError?.status === 401) return <Navigate to="/auth" replace />;
  if (loadingError) {
    return <DashboardErrorState message={loadingError.message} onRetry={() => { loadData(); }} />;
  }

  const handleSubmitRental = async (formData: any) => {
    try {
      setIsSaving(true);
      return await createRentalAndRefresh(formData);
    } finally {
      setIsSaving(false);
    }
  };

  return (
     <div className="rf-app min-h-screen flex font-sans">
      <a href="#main-content" className="rf-skip">Skip to content</a>
      <DesktopNavBar />

      <main className="rf-main flex-1 min-w-0" id="main-content">
        <header className="rf-topbar">
          <div><p className="rf-eyebrow">RentalFlow / Workspace</p><h1 className="rf-title">{isBookings ? "Bookings & calendar" : "Overview"}</h1><p className="rf-subtitle">{isBookings ? "Manage reservations and upcoming stays." : "Your rental business, at a glance."}</p></div>
          <div className="rf-top-actions">
            <Link to="/dashboard" className={'rf-pill '+(!isBookings?'selected':'')}><LayoutDashboard size={17}/> Overview</Link>
            <Link to="/bookings" className={'rf-pill '+(isBookings?'selected':'')}><CalendarDays size={17}/> Bookings</Link>
            <button className="rf-button" onClick={handleOpenAddRental}><Plus size={18}/> New booking</button>
          </div>
        </header>
        <div className="rf-page"><Outlet /></div>
      </main>

      <MobileNavBar onCreateClick={handleOpenAddRental} />

      <AddRentalPopUp
        isOpen={isAddRentalOpen}
        onClose={handleCloseAddRental}
        onSubmit={handleSubmitRental}
        isSaving={isSaving}
        error={rentalError}
      />
    </div>
  );
};