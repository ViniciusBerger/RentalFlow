import { loadDashboardBalance, loadNextRentals, loadUserData } from './load-data.service';

export interface RentalDataSnapshot {
  balances: any[];
  monthlySeries: any[];
  nextRentals: any[];
  userData: any | null;
  isLoading: boolean;
  isRefreshing: boolean;
  loadingError: {message:string,status:number} | null;
  refreshError: string | null;
}

type Loaders = {
  dashboard: typeof loadDashboardBalance;
  rentals: typeof loadNextRentals;
  user: typeof loadUserData;
};
const defaults: Loaders = {dashboard:loadDashboardBalance, rentals:loadNextRentals, user:loadUserData};
const initial: RentalDataSnapshot = {
  balances:[], monthlySeries:[], nextRentals:[], userData:null,
  isLoading:true, isRefreshing:false, loadingError:null, refreshError:null,
};
function toError(error: unknown) {
  const detail = error as {message?:string,status?:number} | null;
  return {message:detail?.message || 'Unable to load rental data', status:detail?.status ?? 0};
}

/** One store per authenticated browser session, shared by every page; no unnecessary refetch on navigation. */
export function createRentalDataStore(loaders: Loaders = defaults) {
  let state: RentalDataSnapshot = {...initial};
  let initialized = false;
  let generation = 0;
  let pendingInitial: Promise<void> | null = null;
  let pendingRefresh: Promise<void> | null = null;
  const listeners = new Set<() => void>();
  const getSnapshot = () => state;
  const subscribe = (listener: () => void) => {listeners.add(listener);return () => {listeners.delete(listener)};};
  const update = (patch: Partial<RentalDataSnapshot>) => {
    state = {...state,...patch};
    listeners.forEach(listener=>listener());
  };
  const applyBalances = (value: any[]) => update({balances:value.slice(0,2),monthlySeries:value[2] ?? []});

  const loadData = async (): Promise<void> => {
    if(pendingInitial) return pendingInitial;
    update({isLoading:true,loadingError:null});
    const requestGeneration = generation;
    pendingInitial = (async () => {
      try {
        const [balances,rentals,user] = await Promise.all([loaders.dashboard(),loaders.rentals(),loaders.user()]);
        if(requestGeneration !== generation) return;
        update({balances:balances.slice(0,2), monthlySeries:balances[2] ?? [], nextRentals:rentals, userData:user,refreshError:null});
        initialized = true;
      } catch(error) {
        if(requestGeneration === generation) update({loadingError:toError(error)});
        throw error;
      } finally {
        if(requestGeneration === generation) {update({isLoading:false});pendingInitial = null;}
      }
    })();
    return pendingInitial;
  };
  const initialize = (): Promise<void> => initialized ? Promise.resolve() : loadData();
  /** Reload only the bookings; do not replace the entire page with a loading screen. */
  const loadRentals = async (): Promise<void> => {
    update({isRefreshing:true,refreshError:null});
    const requestGeneration = generation;
    try { const rentals=await loaders.rentals(); if(requestGeneration===generation) update({nextRentals:rentals}); }
    catch(error) { if(requestGeneration===generation) update({refreshError:toError(error).message});throw error; }
    finally {if(requestGeneration===generation) update({isRefreshing:false});}
  };
  /** After mutation, refresh balances + bookings concurrently. The user profile has not changed. */
  const refreshAfterMutation = async (): Promise<void> => {
    if(pendingRefresh) return pendingRefresh;
    update({isRefreshing:true,refreshError:null});
    const requestGeneration=generation;
    pendingRefresh=(async()=>{
      const [balances,rentals]=await Promise.allSettled([loaders.dashboard(),loaders.rentals()]);
      if(requestGeneration!==generation) return;
      if(balances.status==='fulfilled') applyBalances(balances.value);
      if(rentals.status==='fulfilled') update({nextRentals:rentals.value});
      const failure=[balances,rentals].find(v=>v.status==='rejected');
      if(failure?.status==='rejected') update({refreshError:toError(failure.reason).message});
    })().finally(()=>{if(requestGeneration===generation){pendingRefresh=null;update({isRefreshing:false});}});
    return pendingRefresh;
  };
  const resetError=()=>update({loadingError:null,refreshError:null});
  const reset=()=>{generation++;initialized=false;pendingInitial=null;pendingRefresh=null;update({...initial});};
  return {getSnapshot,subscribe,initialize,loadData,loadRentals,refreshAfterMutation,resetError,reset};
}
export const rentalDataStore=createRentalDataStore();
export const resetRentalData=()=>rentalDataStore.reset();
