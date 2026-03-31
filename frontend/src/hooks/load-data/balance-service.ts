/**
 * This service handles balance fetching on database. 
 * 
 * @returns { label: string, totalRevenue: number, totalProfit: number}
 */
const baseUrl = import.meta.env.VITE_API_URL;
const fetchYearlyBalance = async()=> {
    const response = await fetch( `${baseUrl}/balance/yearly`, {
    method: "GET",
    credentials: "include",
  })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error: any = new Error(errorData?.message || "Unable to fetch session");
      error.status = response.status;
      throw error;
    }
    
    const data = await response.json()

    // return data on position [0] because API returns an array of objects
    return data[0]
}

const fetchMonthlyBalance = async()=> {
    const response = await fetch(`${baseUrl}/balance/monthly`, {
    method: "GET",
    credentials: "include", 
  })
    if (!response.ok) {
      const errorData = await response.json().catch(() => null);
      const error: any = new Error(errorData?.message || "Unable to fetch session");
      error.status = response.status;
      throw error;
    }
    
    const data = await response.json()


    // return data on position [0] because API returns an array of objects
    return data[0]
}

// export consts to keep other methods private and avoid dependency leakeage
export const loadBalance = async() => {
    const dataYearlyBalance = await fetchYearlyBalance()
    const dataMonthlyBalance = await fetchMonthlyBalance()

    return [dataYearlyBalance, dataMonthlyBalance]
}