import { Body, Controller, Delete, Get, Param, Patch, Post, Req, UseGuards} from "@nestjs/common";
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
import { OnboardingGuard } from "src/infra/adapters/guards/onboarding.guard";
import { BadRequestException } from "@nestjs/common";
import { ContractBookingService } from "../../infra/modules/contract/contract-booking.service";


@ApiTags('Rentals module')
@UseGuards(AuthGuard, OnboardingGuard)
@Controller('rental')
export class RentalController {
    constructor(
        private readonly createRentalUseCase: CreateRentalUseCase,
        private readonly deletRentalUseCase:  DeleteRentalUseCase,
        private readonly findRentalUseCase:   FindRentalUseCase,
        private readonly updateRentalUseCase: UpdateRentalUseCase,
        private readonly findAllUseCase:      FindAllRentalsUseCase,
        private readonly findNextThreeUseCase:FindNextThreeUseCase,
        private readonly cancelRentalUseCase: CancelRentalUseCase,
        private readonly contractBookingService: ContractBookingService){}


    @Get('find')
    @ApiOperation({ summary: 'Find a specific rental by rental duration' })
    @ApiResponse({ status: 200, description: 'The found rental record' })
    async getRental(@Req() req, @Body() dto: FindRentalWebDto): Promise<Rental> {
        const {startDate, endDate} = dto

        const rental = await this.findRentalUseCase.findOne(req.user.uid, startDate, endDate)
        return rental
    }

    @Get('findall')
    @ApiOperation({ summary: 'Get all rental records' })
    @ApiResponse({ status: 200, description: 'List of all rentals' })
    async getRentals(@Req() req): Promise<Rental[]> {
        const userUid = (req as any).user?.uid
        
        const rentals = await this.findAllUseCase.findAll(userUid)
        return rentals
    }


    @Get('findnext')
    @ApiOperation({ summary: 'Get next three rentals from today' })
    @ApiResponse({ status: 200, description: 'List next three rentals' })
    async getNextRentals(@Req() req): Promise<Rental[]> {
        const userId = (req as any).user?.uid;
        const rentals = await this.findNextThreeUseCase.find(userId)
        return rentals
    }

    @Post('add')
    @ApiOperation({ summary: 'Create a new rental' })
    @ApiResponse({ status: 201, description: 'The rental has been successfully created' })
    async createRental(@Req() req:Request ,@Body() dto: CreateRentalWebDto): Promise<ICreateRentalResponse>{
        const userId = (req as any).user?.uid;
        if (process.env.CONTRACT_BOOKING_DRAFTS_ENABLED==='true') return this.contractBookingService.create(userId,dto);
        if (dto.bookingDraft) throw new BadRequestException('Contract booking feature is disabled');
        const { clientFirstName, clientLastName, startDate, endDate, guests, revenue, fee, propertyId} = dto
        
        const rental = await this.createRentalUseCase.createRental(userId, clientFirstName, clientLastName, startDate, endDate, guests, revenue, fee, propertyId)
        return rental
    }

    @Patch('update') 
    @ApiOperation({ summary: 'Update an existing rental' })
    @ApiResponse({ status: 200, description: 'Boolean indicating if update was successful' })
    async updateRental(@Req() req, @Body() dto: UpdateRentalWebDto) {
        const {id, toBeUpdated} = dto
        return await this.updateRentalUseCase.updateRental(req.user.uid, id, toBeUpdated as Record<string, unknown>) 
    }

    @Patch('cancel') 
    @ApiOperation({ summary: 'Update an existing rental' })
    @ApiResponse({ status: 200, description: 'Boolean indicating if update was successful' })
    async cancelRental(@Req() req, @Body('id') id: string) {
        return await this.cancelRentalUseCase.cancelRental(req.user.uid, id) 
    }

    @Delete('delete/:id')
    @ApiOperation({ summary: 'Delete a rental by ID' })
    @ApiParam({ name: 'id', description: 'The unique ID of the rental' })
    @ApiResponse({ status: 200, description: 'Boolean indicating if deletion was successful' })
    async deleteRental(@Req() req, @Param("id") id: string) {
        return await this.deletRentalUseCase.deleteRental(req.user.uid, id);
    }
}