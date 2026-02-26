import { addRental, getNextThreeRentals } from "./rental-service";
import { loadBalance } from "./balance-service"

// fetch and return both yearly and monthly revenue
export const loadDashboardBalance = async ()=> {
    const balances = await loadBalance();
    return balances
}

// fetch database and post new rental, delegate heavy lift to rental-service
export const loadDashboardAddRental = async(rentalData: any)=> {
    const profit = (rentalData.revenue - rentalData.fee)

    const rental = {...rentalData, profit}

    const rentalAdded = await addRental(rental)

    return rentalAdded
}

export const loadDashboardThreeNextRentals = async() => {
    const rentalsList:any[] = await getNextThreeRentals();

    return rentalsList
}

export const deleteRental = async(id:string):Promise<boolean> => {
    const response = deleteRental(id)

    return await response
}

