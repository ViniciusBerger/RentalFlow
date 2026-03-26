import { IRentalParams } from "./IRentalParams";

export class Rental implements IRentalParams {
    userId!: string;
    clientFirstName:string;
    clientLastName:string;
    startDate!: string;
    endDate!: string;
    guests!: number;
    revenue!: number;
    profit!: number;
    isActive!: boolean | undefined;
    fee!: number;
    id?: string;
    createdAt?: string;

    constructor(data: IRentalParams) {   
        // It copies everything from 'data' into 'this' instance
        Object.assign(this, data);
    }

    // create a new instance parsing date to string and setting active status
    static create(data: any): Rental {
        return new Rental({...data, 
            createdAt: data.createdAt instanceof Date ? data.createdAt.toISOString() : data.createdAt,
            isActive: data.isActive ?? true,
        });
    }
}