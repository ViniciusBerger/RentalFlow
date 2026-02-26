import { useState, useEffect } from 'react';
import { loadDashboardBalance, loadDashboardThreeNextRentals } from '../services/dashboard-service';
import { addRental, deleteRental } from '../services/rental-service';

/**
 * This hook class is meant to handle logic so UI can be kept clean.
 * This allows a better maintanability and readability for components
 * 
 * all the logc to consume methods live here. we import constants and methods
 * to be used on component
 *
 * @returns {
 *  balances, 
 *  isLoading, 
 *  isSaving, 
 *  error, 
 *  threeNextRentals, 
 *  refresh: loadData, 
 *  resetError, 
 *  createAndRefresh }
    
 */


export const useDashboard = () => {
  const [balances, setBalances] = useState<any[]>([]);
  const [threeNextRentals, setThreeNextRentals] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSaving, setIsSaving] = useState(false);


  const resetError = () => setError(null);


  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const resultLoadBalance = await loadDashboardBalance();
      const resultLoadThreeRentals = await loadDashboardThreeNextRentals()
      
      setBalances(resultLoadBalance);
      setThreeNextRentals(resultLoadThreeRentals)
    
    } catch (err) {
      setError("Failed to load dashboard data " + err );
    
    } finally {
      setIsLoading(false);
    }
  };

  const createNewRental = async (data: any) => {
    try {
      setIsSaving(true);
      const rental = await addRental(data);
      console.log("rental saved:" + rental)
      await loadData(); // Automatically refresh revenue after saving!
    
    } catch (err: any) {
      setError(err.message);
      throw err; // Re-throw so the component knows it failed
    
    } finally {
      setIsSaving(false);
    }
  };

  const createAndRefresh = async (data:any)=> {
    await createNewRental(data);
    await loadData()
  }

  const deleteAndRefresh = async (data:any) => {
    await deleteRental(data);
    await loadData()
  }

  useEffect(() => {
    loadData();
  }, []);

  // return an object so the component can just "grab" what it needs
 return { 
    balances, 
    isLoading, 
    isSaving, // Component can use this to disable the "Submit" button
    error, 
    threeNextRentals,
    refresh: loadData,
    resetError,
    createAndRefresh,
    deleteAndRefresh
  };
};