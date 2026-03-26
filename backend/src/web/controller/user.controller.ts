import { Controller, Delete, Get, Param, Query, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { DeleteUserUseCase, findAllUsersUseCase } from "src/core/domain/user/useCases";

@ApiTags('user module')
@Controller('user')
// @UseGuards(AuthGuard, OnboardingGuard)
export class UserController {
    constructor (private readonly findAllUsersUseCase:   findAllUsersUseCase,
                private readonly deleteUserUseCase: DeleteUserUseCase){}

    @Get('users')
    //@ApiOperation({ summary: 'Get total revenue for the current year' })
    //@ApiResponse({ status: 200, description: 'Yearly revenue total' })
    async getUsers(){
        const users = await this.findAllUsersUseCase.findUsers()
        return users 
    }

    @Delete('delete/:id')
    async DeleteUser(@Param('id')id: string) {
        const isDeleted = await this.deleteUserUseCase.deleteUser(id)
        console.log(isDeleted)
        return true
    }
    
    
}