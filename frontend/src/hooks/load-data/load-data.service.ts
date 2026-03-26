import { loadBalance } from "./balance-service";

const baseUrl = "http://localhost:3000/rental/" 
// fetch and return both yearly and monthly revenue
export const loadDashboardBalance = async ()=> {
    const balances = await loadBalance();
    return balances
}

// load all next rentals from today and on
export const loadNextRentals = async() => {
  const response = await fetch(baseUrl + 'findall', {
    method: 'GET',
    credentials: "include",
  })

  if (!response.ok) {
    const errorData = await response.json()
    throw new Error(errorData.message || 'Failed to retrieve data on service');
  }

  const rentalsList: Promise<any[]> = await response.json()

  return await rentalsList
}