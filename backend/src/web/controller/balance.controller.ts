import { BadRequestException, Controller, Get, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetBalanceUseCase } from "../../core/domain/rental/useCases/get-balance/get-balance.use-case";
import { AuthGuard } from "src/infra/adapters/guards/auth.guard";
import { OnboardingGuard } from "src/infra/adapters/guards/onboarding.guard";

@ApiTags('balance module')
@Controller('balance')
@UseGuards(AuthGuard, OnboardingGuard)
export class BalanceController {
    constructor (private readonly getRevenueUseCase:   GetBalanceUseCase){}

    @Get('yearly')
    @ApiOperation({ summary: 'Get total revenue for the current year' })
    @ApiResponse({ status: 200, description: 'Yearly revenue total' })
    async getYearlyRevenue(@Req() req, @Query('propertyId') propertyId?:string){
        if (propertyId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)) throw new BadRequestException('Invalid property ID');
        const userUid = (req as any).user?.uid
        const revenue = await this.getRevenueUseCase.getYearlyBalance(userUid,propertyId)
        return revenue 
    }
    
    @Get('monthly')
    @ApiOperation({ summary: 'Get monthly revenue breakdown for the current year' })
    @ApiResponse({ status: 200, description: 'List of monthly revenue totals' })
    async getMonthlyRevenue(@Req() req, @Query('propertyId') propertyId?:string){
        if (propertyId && !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(propertyId)) throw new BadRequestException('Invalid property ID');
        const userUid = (req as any).user?.uid
        const revenue = await this.getRevenueUseCase.getMonthlyBalance(userUid,propertyId)
        return revenue 
    }
}