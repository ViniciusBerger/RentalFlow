import { IRentalRepository } from "../../../../app/ports/IRentalRepository";
import { ServiceError } from "../../../../app/errors/service.error";

export class UpdateRentalUseCase {
     // inject rental repository
    constructor(private readonly rentalRepository: IRentalRepository){}

    async updateRental(id: string, toBeUpdated: any) {
        const rental = await this.rentalRepository.update(id, toBeUpdated)
        
        if (!rental) throw new ServiceError("Could not update user")
        return true;
    }
}