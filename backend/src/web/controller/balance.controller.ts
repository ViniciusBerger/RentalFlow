import { Controller, Get, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { GetBalanceUseCase } from "../../core/domain/rental/useCases/get-balance/get-balance.use-case";
import { AuthGuard } from "src/infra/adapters/guards/auth.guard";

@ApiTags('balance module')
@Controller('balance')
@UseGuards(AuthGuard)
export class BalanceController {
    constructor (private readonly getRevenueUseCase:   GetBalanceUseCase){}

    @Get('yearly')
    @ApiOperation({ summary: 'Get total revenue for the current year' })
    @ApiResponse({ status: 200, description: 'Yearly revenue total' })
    async getYearlyRevenue(){
        const revenue = await this.getRevenueUseCase.getYearlyBalance()
        return revenue 
    }
    
    @Get('monthly')
    @ApiOperation({ summary: 'Get monthly revenue breakdown for the current year' })
    @ApiResponse({ status: 200, description: 'List of monthly revenue totals' })
    async getMonthlyRevenue(){
        const revenue = await this.getRevenueUseCase.getMonthlyBalance()
        return revenue 
    }
}