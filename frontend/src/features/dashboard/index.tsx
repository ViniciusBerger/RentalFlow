import { Main } from "./components/main";
import { useDashboard } from "./hooks/useDashboard";
import { useState } from "react";
import AddRentalPopUp from "./components/add-rental-popup";
import { DashboardErrorState } from "../../components/error-state";
import RentalDetailPopUp from "./components/rental-detail-popup";
import { useRentalActions } from "../../hooks/rental-actions/useRentalActions";
import { LoadingState } from "../../components/loading-state";



export const Dashboard =()=> {
  const { balances, nextRentals, isLoading, error: dashBoardError, loadData} = useDashboard()
  const { isSaving, createRentalAndRefresh, deleteRentalAndRefresh } = useRentalActions(loadData)

  const [isCreateRentalPopUpOpen, setIsCreateRentalPopUpOpen] = useState(false);
  const [isRentalDetailsPopUpOpen, setIsRentalDetailPopUpOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null)
  
  const yearlyBalance = balances[0]
  const monthlyBalance = balances[1]

  if(isLoading) return <LoadingState/>
  if(dashBoardError) return <DashboardErrorState message={dashBoardError} onRetry={()=> {loadData()}}/>
  

  return (
    <> 
      {/* Main content */}
      <Main 
        onOpenCreateRentalPopUp={() => setIsCreateRentalPopUpOpen(true)}
        onSelectRental={(rental) => setSelectedRental(rental)}
        onOpenPopUp={() => setIsRentalDetailPopUpOpen(true)}
        props={{ yearly: yearlyBalance, monthly: monthlyBalance }}
        threeNextRentals={nextRentals} 
      />
      
      {/* Popups stay here, they are absolute/fixed anyway */}
      <AddRentalPopUp 
        isOpen={isCreateRentalPopUpOpen} 
        onClose={() => setIsCreateRentalPopUpOpen(false)} 
        onSubmit={createRentalAndRefresh}
        isSaving={isSaving}
        error={dashBoardError}
      />

      <RentalDetailPopUp
        isOpen={isRentalDetailsPopUpOpen}
        onClose={() => setIsRentalDetailPopUpOpen(false)}
        rental={selectedRental}
        onDelete={deleteRentalAndRefresh}
      />
    </>
  );
}