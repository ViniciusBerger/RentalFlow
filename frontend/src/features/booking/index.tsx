import { useState } from 'react';
import AddRentalPopUp from '../../components/add-rental-popup';
import { useRentalActions } from '../../hooks/rental-actions/useRentalActions';
import { BookingHeader } from './components/booking-header';
import { BookingCalendar } from './components/booking-calendar';
import { NextRentals } from '../../components/next-rentals';
import { UseLoadData } from '../../hooks/load-data/useLoadData';
import RentalDetailPopUp from '../../components/rental-detail-popup';
import { DashboardErrorState } from '../../components/error-state';

export const BookingsPage = () => {
    const {loadData } = UseLoadData()
    const { isSaving, createRentalAndRefresh, deleteRentalAndRefresh, updateRentalAndRefresh, error } = useRentalActions(loadData)
    
    const [isCreateRentalPopUpOpen, setIsCreateRentalPopUpOpen] = useState(false)
    const [isRentalDetailsPopUpOpen, setIsRentalDetailPopUpOpen] = useState(false);
    const [selectedRental, setSelectedRental] = useState<any>(null)

    const [isSavingEdit, setIsSavingEdit] = useState(false);
    const [editError, setEditError] = useState<any>(null);


    const {nextRentals} = UseLoadData()

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

    if (error) {
        return <DashboardErrorState message={error.message} onRetry={() => { loadData(); }} />;
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
