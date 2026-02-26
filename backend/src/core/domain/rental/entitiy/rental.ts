export class Rental {
    clientFirstName:string;
    clientLastName: string;
    startDate: string;
    endDate: string;
    guests: number;
    revenue: number;
    profit: number;
    isActive: boolean | undefined;
    fee: number 
    id?: string;
    createdAt?: string;

    constructor(clientFirstName: string, clientLastName: string, startDate: string, endDate: string, guests: number, revenue: number, profit: number, fee: number, id?: string, createdAt?: string, isActive?: boolean) {
        
        this.clientFirstName= clientFirstName;
        this.clientLastName = clientLastName;
        this.startDate = startDate;
        this.endDate = endDate;
        this.guests = guests
        this.revenue = revenue;
        this.profit = profit;
        this.fee = fee;
        this.isActive = isActive
        this.id = id;
        this.createdAt = createdAt
    }
}