import { Controller, Delete, Get, Param, Query, Req, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DeleteUserUseCase, findAllUsersUseCase, FindUserUseCase } from "src/core/domain/user/useCases";
import { AuthGuard } from "src/infra/adapters/guards/auth.guard";
import { OnboardingGuard } from "src/infra/adapters/guards/onboarding.guard";

@ApiTags('user module')
@Controller('user')
@UseGuards(AuthGuard, OnboardingGuard)
export class UserController {
    constructor (private readonly findAllUsersUseCase:   findAllUsersUseCase,
                private readonly deleteUserUseCase: DeleteUserUseCase,
                private readonly findUserUseCase: FindUserUseCase){}

    @Get('users')
    //@ApiOperation({ summary: 'Get total revenue for the current year' })
    //@ApiResponse({ status: 200, description: 'Yearly revenue total' })
    async getUsers(){
        const users = await this.findAllUsersUseCase.findUsers()
        return users 
    }

    @Get('host')
    async getUser(@Req() req){
        const userId = (req as any).user?.uid;
        const user = await this.findUserUseCase.findUser(userId)
        return user

    }

    @Delete('delete/:id')
    async DeleteUser(@Param('id')id: string) {
        const isDeleted = await this.deleteUserUseCase.deleteUser(id)
        console.log(isDeleted)
        return true
    }
    
    
}