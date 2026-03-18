import { useState } from 'react';
import AddRentalPopUp from '../dashboard/components/add-rental-popup';
import { useRentalActions } from '../../hooks/rental-actions/useRentalActions';
import { BookingHeader } from './components/booking-header';
import { BookingCalendar } from './components/booking-calendar';
import { NextRentals } from '../../components/next-rentals';
import { useDashboard } from '../dashboard/hooks/useDashboard';

export const BookingsPage = () => {
    const { isSaving, createRentalAndRefresh, deleteRentalAndRefresh, error } = useRentalActions()

    const [isCreateRentalPopUpOpen, setIsCreateRentalPopUpOpen] = useState(false)
    const [isRentalDetailsPopUpOpen, setIsRentalDetailPopUpOpen] = useState(false);
    const [selectedRental, setSelectedRental] = useState(null)

    const {nextRentals} = useDashboard()

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

        </div>

        
    )
};
