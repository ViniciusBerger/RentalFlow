export interface IRentalParams {
    userId: string;
    clientFirstName:string;
    clientLastName:string;
    startDate: string;
    endDate: string;
    guests: number;
    revenue: number;
    profit: number;
    isActive: boolean | undefined;
    fee: number;
    id?: string;
    createdAt?: string;
}