import { useState } from "react";
import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import { CalendarDays, LayoutDashboard, Plus, Building2 } from "lucide-react";
import { DesktopNavBar } from "../components/nav-bar/desktop-navbar";
import { MobileNavBar } from "../components/nav-bar/mobile-navbar";
import AddRentalPopUp from "../components/add-rental-popup";
import { useRentalActions } from "../hooks/rental-actions/useRentalActions";
import { UseLoadData } from "../hooks/load-data/useLoadData";
import { DashboardErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";
import { LanguageSwitcher } from "../i18n/language";
import { useLanguage } from "../i18n/context";

export const AppLayout = () => {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const isBookings = pathname.startsWith("/bookings");
  const isProperties = pathname.startsWith("/properties");
  const [isAddRentalOpen, setIsAddRentalOpen] = useState(false);
  const {loadingError, refreshError, loadData, isLoading, refreshAfterMutation} = UseLoadData()
  const [isSaving, setIsSaving] = useState(false);
  const {createRentalAndRefresh, error:rentalError} = useRentalActions(refreshAfterMutation)

  const handleOpenAddRental = () => {
    setIsAddRentalOpen(true);
  };

  const handleCloseAddRental = () => {
    setIsAddRentalOpen(false);
  };

  if (isLoading) return <LoadingState />;
  if (loadingError?.status === 401) return <Navigate to="/auth" replace />;
  if (loadingError) {
    return <DashboardErrorState message={loadingError.message} onRetry={() => { void loadData().catch(()=>{}); }} />;
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
      <a href="#main-content" className="rf-skip">{t("skipContent")}</a>
      <DesktopNavBar />

      <main className="rf-main flex-1 min-w-0" id="main-content">
        <header className="rf-topbar">
          <div><p className="rf-eyebrow">RentalFlow / {t("workspace")}</p><h1 className="rf-title">{isProperties ? t("properties") : isBookings ? t("bookingsAndCalendar") : t("overview")}</h1><p className="rf-subtitle">{isProperties ? t("propertiesHelp") : isBookings ? t("manageStays") : t("businessAtGlance")}</p></div>
          <div className="rf-top-actions">
            <LanguageSwitcher />
            <Link to="/dashboard" className={'rf-pill '+(!isBookings&&!isProperties?'selected':'')}><LayoutDashboard size={17}/> {t("overview")}</Link>
            <Link to="/bookings" className={'rf-pill '+(isBookings?'selected':'')}><CalendarDays size={17}/> {t("bookings")}</Link>
            <Link to="/properties" className={'rf-pill '+(isProperties?'selected':'')}><Building2 size={17}/>{t("properties")}</Link>
            <button className="rf-button" onClick={handleOpenAddRental}><Plus size={18}/> {t("newBooking")}</button>
          </div>
        </header>
        {refreshError && <div role="status" className="rf-refresh-warning">{t("connectionError")} <button type="button" onClick={()=>void refreshAfterMutation()}>{t("tryAgain")}</button></div>}
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