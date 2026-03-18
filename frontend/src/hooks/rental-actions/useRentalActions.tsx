import { useState } from 'react';
import { addRental, deleteRental } from './rental-service';
import { loadDashboardThreeNextRentals } from '../../features/dashboard/service/dashboard-service';

export const useRentalActions = (refresh?: () => Promise<void>) => {
  
  const [isSaving, setIsSaving] = useState(false); 
  const [error, setError] = useState<string | null>(null);

  /**
   * Abstract data fetching. Add a new rental document on backend
   * @param data 
   */
  const createRentalAndRefresh = async (data: any) => {
    try {
      setIsSaving(true);
      await addRental(data);
      if (refresh) await refresh();
    
    } catch (err: any) {
        setError(err.message ?? 'Failed to create rental');
        throw err;
    } finally {
        setIsSaving(false);
    }
  };

  const deleteRentalAndRefresh = async (data: any) => {
    try {
      setIsSaving(true);
      await deleteRental(data);
      if (refresh) await refresh();
    
    } catch (err: any) {
      setError(err.message ?? 'Failed to delete rental');
      throw err;
    
    } finally {
      setIsSaving(false);
    }
  };

  const getNextRentals = ()=> {
      const nextRentals = loadDashboardThreeNextRentals()
      return nextRentals
  }
  
  //fallback for error
  const resetError = () => setError(null);

  return { isSaving, error, resetError, createRentalAndRefresh, deleteRentalAndRefresh, getNextRentals};
};