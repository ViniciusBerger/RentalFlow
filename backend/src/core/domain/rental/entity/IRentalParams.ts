export interface IRentalParams {
    userId: string;
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