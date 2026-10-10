import { useState } from 'react';
import { addRental, deleteRental, updateRental } from './rental-service';
import { loadNextRentals } from '../load-data/load-data.service';

export const useRentalActions = (refresh?: () => Promise<void>) => {
  const [isSaving, setIsSaving] = useState(false); 
  const [error, setError] = useState<any | null>(null);


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
      setError(err.message);
      return false    
    } 
    finally {
        setIsSaving(false);
    }
  };


  const deleteRentalAndRefresh = async (data: any):Promise<boolean> => {
    try {
      setIsSaving(true);
      const deleted = await deleteRental(data);
      if (!deleted) throw new Error('Failed to delete rental');
      
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


  const updateRentalAndRefresh = async (id: any, toBeUpdated:any):Promise<boolean> => {
    try {
      setIsSaving(true);
      const updated = await updateRental(id, toBeUpdated);
      if (!updated) throw new Error('Failed to update rental');
      
      if (refresh) await refresh();
      return true
    } 
    catch (err: any) {
      setError(err.message ?? 'Failed to update rental');
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

  return { isSaving, error, resetError, createRentalAndRefresh, deleteRentalAndRefresh, updateRentalAndRefresh, getNextRentals};
};
