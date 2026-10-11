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
                { label: "2026", totalRevenue: 2000, totalProfit: 1200 }
            ]

            rentalRepositoryMock.getYearlyBalanceCurrentYear.mockResolvedValue(mockBalance)

            const result = await useCase.getYearlyBalance('testid123')

            expect(result).toEqual(mockBalance)
            expect(rentalRepositoryMock.getYearlyBalanceCurrentYear).toHaveBeenCalledTimes(1)
            expect(rentalRepositoryMock.getYearlyBalanceCurrentYear).toHaveBeenCalledWith('testid123',undefined)
        })
    })


    describe("getMonthlyBalance", () => {

        it("should return the monthly balance from repository", async () => {

            const mockBalance = [{
                label: "2026-01", totalRevenue: 500, totalProfit: 300
            }]

            rentalRepositoryMock.getMonthlyBalanceCurrentYear.mockResolvedValue(mockBalance)

            const result = await useCase.getMonthlyBalance('testid123')

            expect(result).toEqual(mockBalance)
            expect(rentalRepositoryMock.getMonthlyBalanceCurrentYear).toHaveBeenCalledTimes(1)
            expect(rentalRepositoryMock.getMonthlyBalanceCurrentYear).toHaveBeenCalledWith('testid123')
        })
    })

})