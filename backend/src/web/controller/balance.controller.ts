import { Controller, Get, Req, UseGuards } from "@nestjs/common";
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
    async getYearlyRevenue(@Req() req){
        const userUid = (req as any).user?.uid
        const revenue = await this.getRevenueUseCase.getYearlyBalance(userUid)
        return revenue 
    }
    
    @Get('monthly')
    @ApiOperation({ summary: 'Get monthly revenue breakdown for the current year' })
    @ApiResponse({ status: 200, description: 'List of monthly revenue totals' })
    async getMonthlyRevenue(@Req() req){
        const userUid = (req as any).user?.uid
        const revenue = await this.getRevenueUseCase.getMonthlyBalance(userUid)
        return revenue 
    }
}