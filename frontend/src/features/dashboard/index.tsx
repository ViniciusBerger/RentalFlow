import { Main } from "./components/main";
import { DesktopNavBar } from "../../components/nav-bar/desktop-navbar";
import { MobileNavBar } from "../../components/nav-bar/mobile-navbar";
import { useDashboard } from "./hooks/useDashboard";
import { useState } from "react";
import AddRentalPopUp from "./components/add-rental-popup";
import { DashboardErrorState } from "./components/dashboard-error-state";
import RentalDetailPopUp from "./components/rental-detail-popup";



export const Dashboard =()=> {
  const { balances, isLoading, isSaving, error, threeNextRentals, resetError, createAndRefresh, deleteAndRefresh} = useDashboard()
  const [isCreateRentalPopUpOpen, setIsCreateRentalPopUpOpen] = useState(false);
  const [isRentalDetailsPopUpOpen, setIsRentalDetailPopUpOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState(null)
  
  const yearlyBalance = balances[0]
  const monthlyBalance = balances[1]

  if(isLoading) return <div>Loading dashboard...</div>

  if(error) return <DashboardErrorState message={error} onRetry={()=> {resetError()}}/>

  

  

  
  return (
    <div className="flex h-screen bg-sage-50 font-sans text-slate-900">
      
      {/* Main content */}
      <Main 
        onOpenCreateRentalPopUp={()=> setIsCreateRentalPopUpOpen(true)}
        onSelectRental={(rental) => setSelectedRental(rental)}
        onOpenPopUp={()=>setIsRentalDetailPopUpOpen(true)}

        props={{yearly: yearlyBalance, monthly: monthlyBalance}}
        threeNextRentals = {threeNextRentals}/>
      
      <AddRentalPopUp 
        isOpen={isCreateRentalPopUpOpen} 
        onClose={() => setIsCreateRentalPopUpOpen(false)} 
        onSubmit={createAndRefresh}
        isSaving={isSaving}
        error={error}
      />

      <RentalDetailPopUp
        isOpen={isRentalDetailsPopUpOpen}
        onClose={()=> setIsRentalDetailPopUpOpen(false)}
        rental={selectedRental}
        onDelete={deleteAndRefresh}
      />

    </div>
  )
}