import { useState } from "react";
import { Outlet } from "react-router-dom";
import { DesktopNavBar } from "../components/nav-bar/desktop-navbar";
import { MobileNavBar } from "../components/nav-bar/mobile-navbar";
import AddRentalPopUp from "../components/add-rental-popup";
import { useRentalActions } from "../hooks/rental-actions/useRentalActions";

export const AppLayout = () => {
  const [isAddRentalOpen, setIsAddRentalOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<any>(null);
  const {createRentalAndRefresh, error:rentalError} = useRentalActions()

  const handleOpenAddRental = () => {
    setIsAddRentalOpen(true);
  };

  const handleCloseAddRental = () => {
    setIsAddRentalOpen(false);
    setError(null);
  };

  const handleSubmitRental = async (formData: any) => {
    try {
      setIsSaving(true);
      setError(null);
    
      await createRentalAndRefresh(formData)
      return true  
    } 
    catch (err) {
      setError(err);
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