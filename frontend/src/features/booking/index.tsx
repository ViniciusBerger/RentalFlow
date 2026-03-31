import { useState } from 'react';
import AddRentalPopUp from '../../components/add-rental-popup';
import { useRentalActions } from '../../hooks/rental-actions/useRentalActions';
import { BookingHeader } from './components/booking-header';
import { BookingCalendar } from './components/booking-calendar';
import { NextRentals } from '../../components/next-rentals';
import { UseLoadData } from '../../hooks/load-data/useLoadData';
import RentalDetailPopUp from '../../components/rental-detail-popup';
import { DashboardErrorState } from '../../components/error-state';
import { LoadingState } from '../../components/loading-state';
import { buildRentalDiff } from './service/calendar-service';

export const BookingsPage = () => {
    const {nextRentals, isLoading, loadRentals } = UseLoadData()
    const { isSaving, createRentalAndRefresh, deleteRentalAndRefresh, updateRentalAndRefresh, error } = useRentalActions(loadRentals)
    
    const [isCreateRentalPopUpOpen, setIsCreateRentalPopUpOpen] = useState(false)
    const [isRentalDetailsPopUpOpen, setIsRentalDetailPopUpOpen] = useState(false);
    const [selectedRental, setSelectedRental] = useState<any>(null)

    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editError, setEditError] = useState<any>(null);

    const [viewDate, setViewDate] = useState(new Date())
    const handleNext = ()=> setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 1))
    const handlePrev = ()=> setViewDate(new Date(viewDate.getFullYear(), viewDate.getMonth() - 1, 1))

    const filteredRentals = nextRentals.filter(rental=> {
        const startDate = new Date(rental.startDate);
        const endDate = new Date(rental.endDate)

        const viewStart = new Date(viewDate.getFullYear(), viewDate.getMonth(), 1);
        const viewEnd = new Date(viewDate.getFullYear(), viewDate.getMonth() + 1, 0);

        return startDate <= viewEnd && endDate >= viewStart;
    })

  
  const handleEditRental = async (formData: any) => {
    try {
      setIsSavingEdit(true);
      setEditError(null);

      if (!selectedRental?.id) return false;

      const changedFields = buildRentalDiff(selectedRental, formData);

      if (Object.keys(changedFields).length === 0) {
        setEditError("No changes to save");
        return false;
      }

      const success = await updateRentalAndRefresh(selectedRental.id, changedFields);

      if (!success) {
        setEditError("Failed to update rental");
        return false;
      }

      setIsRentalDetailPopUpOpen(false);
      return true;
    } catch (err: any) {
      setEditError(err || "Failed to update rental");
      return false;
    } finally {
      setIsSavingEdit(false);
    }
};


  if (isLoading) return <LoadingState />;
  if (error) {
        return <DashboardErrorState message={error.message} onRetry={() => { loadRentals(); }} />;
      }

    return (
        <div>
            <BookingHeader onOpenCreateRentalPopUp={() => setIsCreateRentalPopUpOpen(true)} />
            <BookingCalendar 
                viewDate={viewDate} 
                handleNext={handleNext}
                handlePrev={handlePrev}
                rentals={filteredRentals}/>

            <NextRentals 
                onOpenPopUp={() => setIsRentalDetailPopUpOpen(true)}
                onSelectRental={(rental) => setSelectedRental(rental)}
                headerContent='Next Rentals'
                rentals={nextRentals}
                />

            <AddRentalPopUp 
                    isOpen={isCreateRentalPopUpOpen} 
                    onClose={() => setIsCreateRentalPopUpOpen(false)} 
                    onSubmit={createRentalAndRefresh}
                    isSaving={isSaving}
                    error={error}
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

        </div>

        
    )
};
