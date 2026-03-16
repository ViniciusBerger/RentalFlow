import { Body, Controller, Delete, Get, Param, Patch, Post, UseGuards} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiResponse, ApiParam } from "@nestjs/swagger";
import { Rental } from "../../core/domain/rental/entity/rental";
import { CreateRentalWebDto } from "../dto-web/rental/create-rental.web-dto";
import { FindRentalWebDto } from "../dto-web/rental/find-rental.web-dto";
import { UpdateRentalWebDto } from "../dto-web/rental/update-rental.web-dto";
import {
        CreateRentalUseCase, 
        DeleteRentalUseCase, 
        FindRentalUseCase, 
        UpdateRentalUseCase, 
        FindAllRentalsUseCase, 
        FindNextThreeUseCase,
        CancelRentalUseCase} from "../../core/domain/rental/useCases";
import { AuthGuard } from "src/infra/adapters/guards/auth.guard";
import { ICreateRentalResponse } from "src/core/domain/rental/useCases/create-rental/ICreateRentalResponse";


@ApiTags('Rentals module')
//@UseGuards(AuthGuard)
@Controller('rental')
export class RentalController {
    constructor(
        private readonly createRentalUseCase: CreateRentalUseCase,
        private readonly deletRentalUseCase:  DeleteRentalUseCase,
        private readonly findRentalUseCase:   FindRentalUseCase,
        private readonly updateRentalUseCase: UpdateRentalUseCase,
        private readonly findAllUseCase:      FindAllRentalsUseCase,
        private readonly findNextThreeUseCase:FindNextThreeUseCase,
        private readonly cancelRentalUseCase: CancelRentalUseCase){}


    @Get('find')
    @ApiOperation({ summary: 'Find a specific rental by rental duration' })
    @ApiResponse({ status: 200, description: 'The found rental record' })
    async getRental(@Body() dto: FindRentalWebDto): Promise<Rental> {
        const {startDate, endDate} = dto

        const rental = await this.findRentalUseCase.findOne(startDate, endDate)
        return rental
    }

    @Get('findall')
    @ApiOperation({ summary: 'Get all rental records' })
    @ApiResponse({ status: 200, description: 'List of all rentals' })
    async getRentals(): Promise<Rental[]> {
        const rentals = await this.findAllUseCase.findAll()
        return rentals
    }


    @Get('findnext')
    @ApiOperation({ summary: 'Get next three rentals from today' })
    @ApiResponse({ status: 200, description: 'List next three rentals' })
    async getNextRentals(): Promise<Rental[]> {
        const rentals = await this.findNextThreeUseCase.find()
        return rentals
    }

    @Post('add')
    @ApiOperation({ summary: 'Create a new rental' })
    @ApiResponse({ status: 201, description: 'The rental has been successfully created' })
    async createRental(@Body() dto: CreateRentalWebDto): Promise<ICreateRentalResponse>{
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

    @Patch('cancel') 
    @ApiOperation({ summary: 'Update an existing rental' })
    @ApiResponse({ status: 200, description: 'Boolean indicating if update was successful' })
    async cancelRental(@Body('id') id: string) {
        return await this.cancelRentalUseCase.cancelRental(id) 
    }

    @Delete('delete/:id')
    @ApiOperation({ summary: 'Delete a rental by ID' })
    @ApiParam({ name: 'id', description: 'The unique ID of the rental' })
    @ApiResponse({ status: 200, description: 'Boolean indicating if deletion was successful' })
    async deleteRental(@Param("id") id: string) {
        return await this.deletRentalUseCase.deleteRental(id);
    }
}