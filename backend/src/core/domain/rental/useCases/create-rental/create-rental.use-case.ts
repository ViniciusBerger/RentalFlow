/* eslint-disable prettier/prettier */
import { IRentalRepository } from "../../../../app/ports/IRentalRepository";
import { Rental } from "../../entity/rental";
import { ServiceError } from "../../../../app/errors/service.error";
import { ICreateRentalResponse } from "./ICreateRentalResponse";
/**
 * This use case handle rental creation. 
 * Receive RentalRepository port and delegate database interaction to the respective adapter
 * 
 * @returns Rental object
 * 
 */
export class CreateRentalUseCase {
    constructor(private readonly rentalRepository: IRentalRepository) {}

    async createRental(userId:string, clientFirstName: string, clientLastName:string, startDate: string, endDate: string, guests:number, revenue: number, fee: number): Promise<ICreateRentalResponse> {
        //validate if start-date and end-date are free before booking a rental
        await this.validate(startDate, endDate)    
        const profit = (revenue - fee)

        // create a domain Rental object 
        const rental = Rental.create({
            userId: userId, clientFirstName:clientFirstName, clientLastName:clientLastName, startDate: startDate, endDate:endDate, guests:guests, revenue: revenue, profit: profit, fee: fee
        })  

        return await this.rentalRepository.save(rental); 
    }


    // Check if date is available to be booked on database 
    private async validate(startDate: string, endDate: string): Promise<boolean> {
        if (new Date(startDate) >= new Date(endDate)) throw new ServiceError("End date must be after start date");
        
        const today = new Date().toISOString().split("T")[0];

        if (startDate < today) {
            throw new ServiceError("Start date must be today or a future date");
        }

        // if date is already booked throw service error showing that date is booked
        const notValid = await this.rentalRepository.checkOverlapDate(startDate, endDate)
        if(notValid) throw new ServiceError('Date already booked.')
        
        return true
    }
}