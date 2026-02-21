import { IRentalRepository } from "src/core/app/ports/IRentalRepository";
import { Rental } from "../entitiy/rental";
/**
 * This use case handle rental creation. 
 * Receive RentalRepository port and delegate database interaction to the respective adapter
 * 
 * @returns Rental object
 * 
 */
export class CreateRentalUseCase {
    constructor(private readonly rentalRepository: IRentalRepository) {}

    //validate if start-date and end-date are free before booking a rental
   async createRental(clientFirstName: string, clientLastName: string, startDate: string, endDate: string, revenue: number): Promise<Rental> {
        await this.validate(startDate, endDate)    

        if (new Date(startDate) >= new Date(endDate)) {
            throw new Error("End date must be after start date");
        }

        // create a domain Rental object 
        const rental = new Rental(clientFirstName, clientLastName, startDate, endDate, revenue)    
        return await this.rentalRepository.save(rental); 
    }

    // Check if date is available to be booked on database 
    private async validate(startDate: string, endDate: string): Promise<boolean>{
        const notValid = await this.rentalRepository.checkOverlapDate(startDate, endDate)
        // if date is already booked return that date is not available
        if(notValid) throw new Error('Date already booked.')
        return true
    }
}