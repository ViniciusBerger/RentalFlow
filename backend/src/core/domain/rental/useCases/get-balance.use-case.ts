import { IRentalRepository } from "src/core/app/ports/IRentalRepository";

export class GetBalanceUseCase {
    constructor(private readonly rentalRepository: IRentalRepository){}
    

    async getYearlyBalance(){
        const balance = await this.rentalRepository.getYearlyBalanceCurrentYear()

        return balance
    }

    async getMonthlyBalance(){
        const balance = await this.rentalRepository.getMonthlyBalanceCurrentYear()
        return balance
    }
}