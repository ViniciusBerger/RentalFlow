import { loadBalance } from "./balance-service";

const baseUrl = import.meta.env.VITE_API_URL;
// fetch and return both yearly and monthly revenue
export const loadDashboardBalance = async ()=> {
    const balances = await loadBalance();
    return balances
}

// load all next rentals from today and on
export const loadNextRentals = async() => {
  const response = await fetch(`${baseUrl}/rental/findall`, {
    method: 'GET',
    credentials: "include",
  })

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const error: any = new Error(errorData?.message || "Unable to fetch session");
    error.status = response.status;
    throw error;
  }

  const rentalsList: Promise<any[]> = await response.json()

  return await rentalsList
}

export const loadUserData = async () => {
  const response = await fetch(`${baseUrl}/user/host`, {
    method: "GET",
    credentials: "include",
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    const error: any = new Error(errorData?.message || "Unable to fetch session");
    error.status = response.status;
    throw error;
  }

  const userData = await response.json();

  return userData;
};