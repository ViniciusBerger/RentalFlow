import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from "@nestjs/common";
import { CreateRentalUseCase } from "../core/domain/rental/useCases/create-rental.use-case";
import { DeleteRentalUseCase } from "../core/domain/rental/useCases/delete-rental.use-case";
import { FindRentalUseCase } from "../core/domain/rental/useCases/find-rental.use-case";
import { UpdateRentalUseCase } from "../core/domain/rental/useCases/update-rental.use-case";
import { CreateRentalDto } from "../core/app/dtos/create-rental.dto";
import { FindRentalDto } from "../core/app/dtos/find-rental.dto";
import { updateRentalDto } from "../core/app/dtos/update-rental.dto";
import { FindAllRentalsUseCase } from "src/core/domain/rental/useCases/find-all.use-case";
import { Rental } from "../core/domain/rental/entitiy/rental";

@Controller()
export class RentalController {
    constructor(
        private readonly createRentalUseCase: CreateRentalUseCase,
        private readonly deletRentalUseCase: DeleteRentalUseCase,
        private readonly findRentalUseCase: FindRentalUseCase,
        private readonly updateRentalUseCase: UpdateRentalUseCase,
        private readonly findAllUseCase: FindAllRentalsUseCase ){}

    @Get("/")
    health() {
        return "success"
    }

    @Post('rental')
    async createRental(@Body() dto: CreateRentalDto): Promise<Rental>{
        const {clientFirstName, clientLastName, startDate, endDate, revenue} = dto
        const rental = await this.createRentalUseCase.createRental(clientFirstName, clientLastName, startDate, endDate, revenue)

        return rental
    }

    @Get('rental')
    async getRental(@Body() dto: FindRentalDto): Promise<Rental> {
        const {startDate, endDate} = dto

        const rental = await this.findRentalUseCase.findOne(startDate, endDate)
        return rental
    }

    @Get('all')
    async getRentals(): Promise<Rental[]> {
        const rentals = await this.findAllUseCase.findAll()
        return rentals
    }

    @Patch('rental') 
    async updateRental(@Body() dto: updateRentalDto) {
        const {id, toBeUpdated} = dto

        return await this.updateRentalUseCase.updateRental(id, toBeUpdated) 
        
    }

    @Delete('rental/:id')
    async deleteRental(@Param("id") id: string) {
        return await this.deletRentalUseCase.deleteRental(id);
    }
}