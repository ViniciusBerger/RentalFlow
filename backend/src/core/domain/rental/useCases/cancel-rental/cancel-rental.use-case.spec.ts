import { CancelRentalUseCase } from "./cancel-rental.use-case"
import { IRentalRepository } from "src/core/app/ports/IRentalRepository"

describe("CancelRentalUseCase", () => {

    let useCase: CancelRentalUseCase
    let repository: jest.Mocked<IRentalRepository>

    beforeEach(() => {

        repository = {
            update: jest.fn()
        } as unknown as jest.Mocked<IRentalRepository>

        useCase = new CancelRentalUseCase(repository)
    })

    describe("cancelRental", () => {

        it("should call repository.update with isActive set to false", async () => {

            // GIVEN
            const rentalId = "rental-id-123"
            repository.update.mockResolvedValue(true)

            // WHEN
            const result = await useCase.cancelRental(rentalId)

            // THEN
            expect(repository.update).toHaveBeenCalledWith(rentalId, { isActive: false })
            expect(repository.update).toHaveBeenCalledTimes(1)
            expect(result).toBe(true)
        })


        it("should return false if repository update fails", async () => {

            // GIVEN
            const rentalId = "rental-id-123"
            repository.update.mockResolvedValue(false)

            // WHEN
            const result = await useCase.cancelRental(rentalId)

            // THEN
            expect(result).toBe(false)
        })

    })

})