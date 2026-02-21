import { IRentalRepository } from "src/core/app/ports/IRentalRepository";
/**
 * This use case handle rental delete. 
 * Receive RentalRepository port and delegate database interaction to the respective adapter
 * 
 * @returns Rental boolean 
 * 
 */
export class DeleteRentalUseCase {
    constructor(private readonly rentalRepository: IRentalRepository) {}

    async deleteRental(id: string): Promise<boolean> {
        const deleted = await this.rentalRepository.delete(id)
        // if couldnt delete throw an error
        if (!deleted) throw new Error("Could not delete user")
        // do not pass error to keep controller clean
        return true;
    }
}