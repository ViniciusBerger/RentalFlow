/**
 * This service handles balance fetching on database. 
 * 
 * @returns { label: string, totalRevenue: number, totalProfit: number}
 */
const fetchYearlyBalance = async()=> {
    const response = await fetch('http://127.0.0.1:3000/revenue/yearly')
    if (!response.ok) throw new Error("network response was not okay")
    
    const data = await response.json()

    // return data on position [0] because API returns an array of objects
    return data[0]
}

const fetchMonthlyBalance = async()=> {
    const response = await fetch('http://127.0.0.1:3000/revenue/monthly')
    if (!response.ok) throw new Error("network response was not okay")
    
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