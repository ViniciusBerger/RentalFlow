import { useState } from "react";
import { Navigate, Outlet } from "react-router-dom";
import { DesktopNavBar } from "../components/nav-bar/desktop-navbar";
import { MobileNavBar } from "../components/nav-bar/mobile-navbar";
import AddRentalPopUp from "../components/add-rental-popup";
import { useRentalActions } from "../hooks/rental-actions/useRentalActions";
import { UseLoadData } from "../hooks/load-data/useLoadData";
import { DashboardErrorState } from "../components/error-state";
import { LoadingState } from "../components/loading-state";

export const AppLayout = () => {
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
    
      await createRentalAndRefresh(formData)
      return true  
    } 
    catch (err) {
      throw err
    } 
    finally {
      setIsSaving(false);
    }
  };

  return (
     <div className="min-h-screen flex bg-sage-50 font-sans">
      <DesktopNavBar />

      <main className="flex-1">
        <Outlet />
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