import { useState } from 'react';
import AddRentalPopUp from '../../components/add-rental-popup';
import { useRentalActions } from '../../hooks/rental-actions/useRentalActions';
import { BookingHeader } from './components/booking-header';
import { BookingCalendar } from './components/booking-calendar';
import { BookingGroups } from '../../components/booking-groups';
import { UseLoadData } from '../../hooks/load-data/useLoadData';
import RentalDetailPopUp from '../../components/rental-detail-popup';
import { DashboardErrorState } from '../../components/error-state';
import { LoadingState } from '../../components/loading-state';
import { buildRentalDiff } from './service/calendar-service';
import { dateKey } from './service/booking-timeline';
import { useLanguage } from "../../i18n/context";

export const BookingsPage = () => {
    const {t}=useLanguage();
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
        const startDate = dateKey(rental.startDate);
        const endDate = dateKey(rental.endDate);
        const viewStart = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-01`;
        const viewEnd = `${viewDate.getFullYear()}-${String(viewDate.getMonth()+1).padStart(2,'0')}-${String(new Date(viewDate.getFullYear(),viewDate.getMonth()+1,0).getDate()).padStart(2,'0')}`;
        return startDate !== '' && endDate !== '' && startDate <= viewEnd && endDate > viewStart;
    })

  
  const handleEditRental = async (formData: any) => {
    try {
      setIsSavingEdit(true);
      setEditError(null);

      if (!selectedRental?.id) return false;

      const changedFields = buildRentalDiff(selectedRental, formData);

      if (Object.keys(changedFields).length === 0) {
        setEditError(t("noChanges"));
        return false;
      }

      const success = await updateRentalAndRefresh(selectedRental.id, changedFields);

      if (!success) {
        setEditError(t("updateFailed"));
        return false;
      }

      setIsRentalDetailPopUpOpen(false);
      return true;
    } catch (err: any) {
      setEditError(err || t("updateFailed"));
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
        <div className="rf-bookings-page">
            <BookingHeader onOpenCreateRentalPopUp={() => setIsCreateRentalPopUpOpen(true)} />
            <BookingCalendar 
                viewDate={viewDate} 
                handleNext={handleNext}
                handlePrev={handlePrev}
                rentals={filteredRentals}/>

            <BookingGroups
                onOpenPopUp={() => setIsRentalDetailPopUpOpen(true)}
                onSelectRental={(rental) => setSelectedRental(rental)}
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
