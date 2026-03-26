import { Main } from "./components/main";
import { useState } from "react";
import AddRentalPopUp from "./components/add-rental-popup";
import { DashboardErrorState } from "../../components/error-state";
import RentalDetailPopUp from "./components/rental-detail-popup";
import { useRentalActions } from "../../hooks/rental-actions/useRentalActions";
import { LoadingState } from "../../components/loading-state";
import { UseLoadData } from "../../hooks/load-data/useLoadData";



export const Dashboard =()=> {
  const { balances, nextRentals, isLoading, loadingError, loadData} = UseLoadData()
  const { isSaving, createRentalAndRefresh, deleteRentalAndRefresh } = useRentalActions(loadData)

  const [isCreateRentalPopUpOpen, setIsCreateRentalPopUpOpen] = useState(false);
  const [isRentalDetailsPopUpOpen, setIsRentalDetailPopUpOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null)
  
  const yearlyBalance = balances[0]
  const monthlyBalance = balances[1]

  
  if(isLoading) return <LoadingState/>
  if(loadingError) return <DashboardErrorState message={loadingError} onRetry={()=> {loadData()}}/>
  

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
        error={loadingError}
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