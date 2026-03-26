import { useState } from 'react';
import { addRental, deleteRental } from './rental-service';
import { loadNextRentals } from '../load-data/load-data.service';

export const useRentalActions = (refresh?: () => Promise<void>) => {
  const [isSaving, setIsSaving] = useState(false); 
  const [error, setError] = useState<string | null>(null);


  /**
   * Interact with backend.
   * Create a new document and refresh.
   * @param data 
   * @returns boolean
   */
  const createRentalAndRefresh = async (data: any):Promise<boolean> => {
    try {
      setIsSaving(true);
      await addRental(data);
      
      if (refresh) await refresh();
      return true
    }
    catch (err: any) {
      setError(err.message ?? 'Failed to create rental');
      return false    
    } 
    finally {
        setIsSaving(false);
    }
  };


  const deleteRentalAndRefresh = async (data: any):Promise<boolean> => {
    try {
      setIsSaving(true);
      await deleteRental(data);
      
      if (refresh) await refresh();
      return true
    } 
    catch (err: any) {
      setError(err.message ?? 'Failed to delete rental');
      return false;
    } 
    finally {
      setIsSaving(false);
    }
  };

  const getNextRentals = ()=> {
      const nextRentals = loadNextRentals()
      return nextRentals
  }
  
  //fallback for error
  const resetError = () => setError(null);

  return { isSaving, error, resetError, createRentalAndRefresh, deleteRentalAndRefresh, getNextRentals};
};