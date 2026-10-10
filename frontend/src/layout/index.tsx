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
  const [isAddRentalOpen, setIsAddRentalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const { pathname } = useLocation();
  const { loadingError, loadData, isLoading } = UseLoadData();
  const { createRentalAndRefresh, error: rentalError } = useRentalActions();

  const isBookings = pathname.startsWith("/bookings");
  const handleSubmitRental = async (formData: any) => {
    setIsSaving(true);
    try {
      await createRentalAndRefresh(formData);
      return true;
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) return <LoadingState />;
  if (loadingError?.status === 401) return <Navigate to="/auth" replace />;
  if (loadingError) {
    return <DashboardErrorState message={loadingError.message} onRetry={loadData} />;
  }

  return (
    <div className="rf-app flex min-h-screen">
      <a className="rf-skip" href="#rentalflow-content">Skip to content</a>
      <DesktopNavBar />
      <main className="rf-main flex-1" id="rentalflow-content">
        <header className="rf-topbar">
          <div>
            <p className="rf-eyebrow">RentalFlow / Workspace</p>
            <h1 className="rf-title">{isBookings ? "Bookings & calendar" : "Overview"}</h1>
          </div>
          <div className="rf-topbar-actions" aria-label="Workspace actions">
            <Link to="/dashboard" className="rf-nav-link" aria-current={!isBookings ? "page" : undefined}>
              <LayoutDashboard size={17} aria-hidden="true" /> Overview
            </Link>
            <Link to="/bookings" className="rf-nav-link" aria-current={isBookings ? "page" : undefined}>
              <CalendarDays size={17} aria-hidden="true" /> Bookings
            </Link>
            <button type="button" className="rf-create" onClick={() => setIsAddRentalOpen(true)}>
              <Plus size={18} aria-hidden="true" /> New booking
            </button>
          </div>
        </header>
        <div className="rf-content"><Outlet /></div>
      </main>
      <MobileNavBar onCreateClick={() => setIsAddRentalOpen(true)} />
      <AddRentalPopUp
        isOpen={isAddRentalOpen}
        onClose={() => setIsAddRentalOpen(false)}
        onSubmit={handleSubmitRental}
        isSaving={isSaving}
        error={rentalError}
      />
    </div>
  );
};
