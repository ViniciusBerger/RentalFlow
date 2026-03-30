import { loadDashboardBalance, loadNextRentals, loadUserData } from './load-data.service';

/**  
* This class abstract the backend service to load data across app.
* Communicate with service class, call methods and redirect data into components
* 
*  This class handles 
*   -balances
*   -rentals
*   
* This class SHOULDNT do any processing else than loading data.
* */  

import { useEffect, useState } from "react";

export const UseLoadData = ()=>{

  const [balances, setBalances] = useState<any[]>([]); // yearly and monthly balances (revenue and profit) 
  const [nextRentals, setNextRentals] = useState<any[]>([]); // list of all rental (from today and on)
  const [isLoading, setIsLoading] = useState(true); 
  const [loadingError, setLoadingError] = useState<{message:string, status:number} | null>(null);
  const [userData, setUserData] = useState<any>(null)
  
  
  const resetError = () => setLoadingError(null); // fallback for error
  
  // load data through application. 
  const loadData = async () => {
    try {
      setIsLoading(true);
      
      const [balancesResult, rentalsResult, userDataResult] = await Promise.all([loadDashboardBalance(), loadNextRentals(), loadUserData()]);
      setBalances(balancesResult);
      setNextRentals(rentalsResult);
      setUserData(userDataResult)
    } 
    catch (err: any) {
      setLoadingError({
        message:err.message ?? "error loading data",
        status: err.status
      });
    } 
    finally {
      setIsLoading(false);
    }
  };

  // run loadData once when app starts
  useEffect(() => { loadData() }, []);

  return { balances, nextRentals, isLoading, loadingError, userData, loadData, resetError};
};