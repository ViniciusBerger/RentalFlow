import { useEffect, useState } from 'react';
import type { createRentalDataStore } from './rental-data-store';

type RentalStore = ReturnType<typeof createRentalDataStore>;
/** React subscribers all observe the same stable session-scoped snapshot. */
export const useRentalDataStore = (store: RentalStore) => {
  const [snapshot,setSnapshot]=useState(store.getSnapshot);
  useEffect(()=>store.subscribe(()=>setSnapshot(store.getSnapshot())),[store]);
  useEffect(()=>{void store.initialize().catch(()=>{});},[store]);
  return {...snapshot,loadData:store.loadData,loadRentals:store.loadRentals,
    refreshAfterMutation:store.refreshAfterMutation,resetError:store.resetError};
};
