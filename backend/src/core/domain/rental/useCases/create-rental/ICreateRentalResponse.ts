export interface ICreateRentalResponse {
    userId: string,
    clientFirstName: string;
    clientLastName: string;
    startDate: string; 
    endDate:string;
    revenue: number, 
    profit: number, 
    fee: number
}