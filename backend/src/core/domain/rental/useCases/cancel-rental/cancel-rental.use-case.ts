import { IRentalRepository } from "src/core/app/ports/IRentalRepository";

/**
 * CancelRentalUseCase
 *
 * Application use case responsible for cancelling a rental.
 *
 * Instead of deleting the rental from the database, the system
 * performs a "soft cancel" by setting the `isActive` flag to false.
 *
 * This keeps the historical record while preventing the rental
 * from being considered active in the system.
 */
export class CancelRentalUseCase {

    /**
     * The repository abstraction is injected through the constructor.
     * This allows the use case to remain independent from the database
     * implementation (SQL, Mongo, etc).
     */
    constructor(private readonly rentalRepository: IRentalRepository) {}

    /**
     * Cancels a rental by updating its `isActive` status to false.
     *
     * @param id - The unique identifier of the rental to cancel
     * @returns true if the update operation succeeds
     */
    async cancelRental(id: string): Promise<boolean> {
        return await this.rentalRepository.update(id, { isActive: false })
    }
}