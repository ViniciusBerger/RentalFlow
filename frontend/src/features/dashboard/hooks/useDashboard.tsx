import { useState, useEffect } from 'react';
import { loadDashboardBalance, loadDashboardThreeNextRentals } from '../service/dashboard-service';
import { useRentalActions } from '../../../hooks/rental-actions/useRentalActions';

export const useDashboard = () => {

  const [balances, setBalances] = useState<any[]>([]); // yearly and monthly balances (revenue and profit) 
  const [nextRentals, setNextRentals] = useState<any[]>([]); // list of all rental (from today and on)
  const {getNextRentals} = useRentalActions()
  
  const [isLoading, setIsLoading] = useState(true); 
  const [error, setError] = useState<string | null>(null);


  /**  abstract the method call. load the data for dashboard including
   *      - balances
   *      - future rentals
   * 
   * */  
  const loadData = async () => {
    try {
      setIsLoading(true);

      const [balancesResult, rentalsResult] = await Promise.all([
        loadDashboardBalance(),
        getNextRentals()
      ]);

      setBalances(balancesResult);
      setNextRentals(rentalsResult);

    } catch (err: any) {
      setError(err.message ?? "error loading data");
    } finally {
      setIsLoading(false);
    }
  };

  // fallback for error
  const resetError = () => setError(null);

  // run loadData once
  useEffect(() => { loadData() }, []);

  return { balances, nextRentals, isLoading, error, loadData, resetError};
};