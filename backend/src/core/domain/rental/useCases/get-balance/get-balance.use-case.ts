import { IRentalRepository } from "../../../../app/ports/IRentalRepository";

/**
 * Use case responsible for retrieving financial balances
 * related to rentals.
 *
 * This class belongs to the domain layer and communicates
 * with the application through the RentalRepository interface.
 *
 * It does not know how the data is stored (database, API, etc).
 * The repository implementation will handle that.
 */
export class GetBalanceUseCase {

    /**
     * Dependency Injection of the repository.
     * We depend on the abstraction (IRentalRepository),
     * not on a concrete implementation.
     */
    constructor(private readonly rentalRepository: IRentalRepository){}

    /**
     * Retrieves the total balance grouped by month
     * for the current year.
     */
    async getYearlyBalance(userUid:string){
        const balance = await this.rentalRepository.getYearlyBalanceCurrentYear(userUid)

        return balance
    }

    /**
     * Retrieves the balance of the current month.
     */
    async getMonthlyBalance(userUid:string){
        const balance = await this.rentalRepository.getMonthlyBalanceCurrentYear(userUid)
        return balance
    }
}