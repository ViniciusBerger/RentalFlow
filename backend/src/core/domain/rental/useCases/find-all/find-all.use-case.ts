import { IRentalRepository } from "../../../../app/ports/IRentalRepository";
import { Rental } from "../../entity/rental";

/**
 * This use case handle full search. 
 * Search should be made with start and end date. As no rental shall share the same start/end date
 * 
 * Receive RentalRepository port and delegate database interaction to the respective adapter
 * 
 * @returns a list of all rentals in database
 * 
 */

export class FindAllRentalsUseCase {
    // inject rental repository
    constructor( private readonly rentalRepository: IRentalRepository){}

    // find all records in rentals table
    async findAll(): Promise<Rental[]> {
        const rentals: Rental[] = await this.rentalRepository.findAll()
        return rentals
    }
}