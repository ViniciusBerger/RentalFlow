import { GetBalanceUseCase } from "./get-balance.use-case"
import { IRentalRepository } from "src/core/app/ports/IRentalRepository"

describe("GetBalanceUseCase", () => {

    let useCase: GetBalanceUseCase
    let rentalRepositoryMock: jest.Mocked<IRentalRepository>

    beforeEach(() => {
        rentalRepositoryMock = {
            getYearlyBalanceCurrentYear: jest.fn(),
            getMonthlyBalanceCurrentYear: jest.fn()
        } as any

        useCase = new GetBalanceUseCase(rentalRepositoryMock)
    })

    describe("getYearlyBalance", () => {

        it("should return the yearly balance from repository", async () => {

            const mockBalance = [
                { month: "January", revenue: 2000, profit: 1200 }
            ]

            rentalRepositoryMock.getYearlyBalanceCurrentYear.mockResolvedValue(mockBalance)

            const result = await useCase.getYearlyBalance()

            expect(result).toEqual(mockBalance)
            expect(rentalRepositoryMock.getYearlyBalanceCurrentYear).toHaveBeenCalledTimes(1)
        })
    })


    describe("getMonthlyBalance", () => {

        it("should return the monthly balance from repository", async () => {

            const mockBalance = {
                revenue: 500,
                profit: 300
            }

            rentalRepositoryMock.getMonthlyBalanceCurrentYear.mockResolvedValue(mockBalance)

            const result = await useCase.getMonthlyBalance()

            expect(result).toEqual(mockBalance)
            expect(rentalRepositoryMock.getMonthlyBalanceCurrentYear).toHaveBeenCalledTimes(1)
        })
    })

})