import { IRentalRepository } from "src/core/app/ports/IRentalRepository";

export class UpdateRentalUseCase {
     // inject rental repository
    constructor(private readonly rentalRepository: IRentalRepository){}

    async updateRental(id: string, toBeUpdated: any) {
        const rental = await this.rentalRepository.update(id, toBeUpdated)
        
        if (!rental) throw new Error("Could not update user")
        return true;
    }
}