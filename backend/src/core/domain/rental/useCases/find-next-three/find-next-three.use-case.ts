import { IRentalRepository } from "../../../../app/ports/IRentalRepository";
import { Rental } from "../../entity/rental";

/**
 * Use Case: FindNextThreeUseCase
 * Retrieves the next three upcoming rentals.
 */
export class FindNextThreeUseCase {
    // inject the Interface (Port). This allows us to swap databases or test easily.
    constructor(private readonly rentalRepository: IRentalRepository) {}

    async find(): Promise<Rental[]> {
        const rentals: Rental[] = await this.rentalRepository.findNextThree();
        return rentals;
    }
}