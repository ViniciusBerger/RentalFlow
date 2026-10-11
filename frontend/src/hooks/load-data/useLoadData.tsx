import { rentalDataStore } from './rental-data-store';
import { useRentalDataStore } from './useRentalDataStore';

/** Shared data for both the authenticated app shell and the active screen. */
export const UseLoadData = () => useRentalDataStore(rentalDataStore);
