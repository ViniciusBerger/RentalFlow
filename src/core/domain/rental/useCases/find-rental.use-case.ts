import { IRentalRepository } from "src/core/app/ports/IRentalRepository";

/**
 * This use case handle basic search. 
 * Search should be made with start and end date. As no rental shall share the same start/end date
 * 
 * Receive RentalRepository port and delegate database interaction to the respective adapter
 * 
 * @returns Rental object
 * 
 */

export class FindRentalUseCase {
    // inject rental repository
    constructor(private readonly rentalRepository: IRentalRepository){}

    // generic findOne by start and end date
    async findOne(startDate: string, endDate: string) {
        if (new Date(startDate) >= new Date(endDate)) throw new Error("End date must be after start date");
        // if rental not found will return null.
        const rental = await this.rentalRepository.findOne(startDate, endDate)
        // this method just pass through the null value
        return rental
    }
}