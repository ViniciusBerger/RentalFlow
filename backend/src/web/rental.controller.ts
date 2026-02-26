import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Rental } from "../core/domain/rental/entitiy/rental";
import { CreateRentalUseCase } from "../core/domain/rental/useCases/create-rental.use-case";
import { DeleteRentalUseCase } from "../core/domain/rental/useCases/delete-rental.use-case";
import { FindRentalUseCase } from "../core/domain/rental/useCases/find-rental.use-case";
import { UpdateRentalUseCase } from "../core/domain/rental/useCases/update-rental.use-case";
import { FindAllRentalsUseCase } from "src/core/domain/rental/useCases/find-all.use-case";
import { GetBalanceUseCase } from "src/core/domain/rental/useCases/get-balance.use-case";
import { CreateRentalWebDto } from "./dto-web/create-rental.web-dto";
import { FindRentalWebDto } from "./dto-web/find-rental.web-dto";
import { UpdateRentalWebDto } from "./dto-web/update-rental.web-dto";
@ApiTags('MyRentalsAPI')
@Controller()
export class RentalController {
    constructor(
        private readonly createRentalUseCase: CreateRentalUseCase,
        private readonly deletRentalUseCase: DeleteRentalUseCase,
        private readonly findRentalUseCase: FindRentalUseCase,
        private readonly updateRentalUseCase: UpdateRentalUseCase,
        private readonly findAllUseCase: FindAllRentalsUseCase,
        private readonly getRevenueUseCase: GetBalanceUseCase ){}

    @Get("/")
    @ApiOperation({ summary: 'Health check' })
    health() {
        return {status: 200, message: "success"}
    }

    @Get('rental')
    @ApiOperation({ summary: 'Find a specific rental by rental duration' })
    @ApiResponse({ status: 200, description: 'The found rental record' })
    async getRental(@Body() dto: FindRentalWebDto): Promise<Rental> {
        const {startDate, endDate} = dto

        const rental = await this.findRentalUseCase.findOne(startDate, endDate)
        return rental
    }

    @Get('all')
    @ApiOperation({ summary: 'Get all rental records' })
    @ApiResponse({ status: 200, description: 'List of all rentals' })
    async getRentals(): Promise<Rental[]> {
        const rentals = await this.findAllUseCase.findAll()
        return rentals
    }

    @Get('revenue/yearly')
    @ApiOperation({ summary: 'Get total revenue for the current year' })
    @ApiResponse({ status: 200, description: 'Yearly revenue total' })
    async getYearlyRevenue(){
        const revenue = await this.getRevenueUseCase.getYearlyBalance()
        return revenue 
    }

    @Get('revenue/monthly')
    @ApiOperation({ summary: 'Get monthly revenue breakdown for the current year' })
    @ApiResponse({ status: 200, description: 'List of monthly revenue totals' })
    async getMonthlyRevenue(){
        const revenue = await this.getRevenueUseCase.getMonthlyBalance()
        return revenue 
    }

    @Post('rental')
    @ApiOperation({ summary: 'Create a new rental' })
    @ApiResponse({ status: 201, description: 'The rental has been successfully created' })
    async createRental(@Body() dto: CreateRentalWebDto): Promise<Rental>{
        const {clientFirstName, clientLastName, startDate, endDate, guests, revenue, fee} = dto
        const rental = await this.createRentalUseCase.createRental(clientFirstName, clientLastName, startDate, endDate, guests, revenue, fee)

        return rental
    }

    @Patch('rental') 
    @ApiOperation({ summary: 'Update an existing rental' })
    @ApiResponse({ status: 200, description: 'Boolean indicating if update was successful' })
    async updateRental(@Body() dto: UpdateRentalWebDto) {
        const {id, toBeUpdated} = dto
        return await this.updateRentalUseCase.updateRental(id, toBeUpdated) 
    }

    @Delete('rental/:id')
    @ApiOperation({ summary: 'Delete a rental by ID' })
    @ApiParam({ name: 'id', description: 'The unique ID of the rental' })
    @ApiResponse({ status: 200, description: 'Boolean indicating if deletion was successful' })
    async deleteRental(@Param("id") id: string) {
        return await this.deletRentalUseCase.deleteRental(id);
    }
}