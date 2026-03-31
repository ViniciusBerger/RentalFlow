import { Main } from "./main";
import { useState } from "react";
import AddRentalPopUp from "../../components/add-rental-popup";
import { DashboardErrorState } from "../../components/error-state";
import RentalDetailPopUp from "../../components/rental-detail-popup";
import { useRentalActions } from "../../hooks/rental-actions/useRentalActions";
import { UseLoadData } from "../../hooks/load-data/useLoadData";
import { LoadingState } from "../../components/loading-state";


export const Dashboard = () => {
  const { balances, nextRentals, isLoading, userData, loadData } = UseLoadData();
  const { isSaving, error: actionError, createRentalAndRefresh, deleteRentalAndRefresh, updateRentalAndRefresh } = // 
    useRentalActions(loadData);

  const [isCreateRentalPopUpOpen, setIsCreateRentalPopUpOpen] = useState(false);
  const [isRentalDetailsPopUpOpen, setIsRentalDetailPopUpOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<any>(null);

  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [editError, setEditError] = useState<any>(null);

  const yearlyBalance = balances[0];
  const monthlyBalance = balances[1];

  const handleEditRental = async (formData: any) => {
    try {
      setIsSavingEdit(true);
      setEditError(null);

      if (!selectedRental?.id) return false;

      await updateRentalAndRefresh(selectedRental.id, formData);
      setIsRentalDetailPopUpOpen(false);

      return true;
    } catch (err: any) {
      setEditError(err?.message || "Failed to update rental");
      return false;
    } finally {
      setIsSavingEdit(false);
    }
  };

  if (isLoading) return <LoadingState />;

  if (!userData) {
  return (
    <DashboardErrorState
      message="User profile could not be loaded."
      onRetry={() => {
        loadData();
      }}
    />
  );
}

  return (
    <>
      <Main
        onOpenCreateRentalPopUp={() => setIsCreateRentalPopUpOpen(true)}
        onSelectRental={(rental) => setSelectedRental(rental)}
        onOpenPopUp={() => setIsRentalDetailPopUpOpen(true)}
        props={{ yearly: yearlyBalance, monthly: monthlyBalance }}
        threeNextRentals={nextRentals}
        userData={userData}
      />

      <AddRentalPopUp
        isOpen={isCreateRentalPopUpOpen}
        onClose={() => setIsCreateRentalPopUpOpen(false)}
        onSubmit={createRentalAndRefresh}
        isSaving={isSaving}
        error={actionError}
      />

      <RentalDetailPopUp
        isOpen={isRentalDetailsPopUpOpen}
        onClose={() => setIsRentalDetailPopUpOpen(false)}
        rental={selectedRental}
        onDelete={deleteRentalAndRefresh}
        onEditSubmit={handleEditRental}
        isSavingEdit={isSavingEdit}
        editError={editError}
      />
    </>
  );
};