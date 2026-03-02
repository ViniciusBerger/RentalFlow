import { Body, Controller, Get, Post } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { AuthenticateUseCase, ValidateTokenUseCase } from "src/core/domain/auth/useCase";
import { AuthenticateWebDto } from "../dto-web/auth/authenticate.web-dto";

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {

    constructor(private readonly authenticateUseCase: AuthenticateUseCase,
                private readonly validateTokenUseCase: ValidateTokenUseCase
    ) {}

    @Get("/")
    getU(){
        return 'sucess'
    }


    @ApiOperation({summary: ""})
    @ApiResponse({status: 200, description:'user is valid'})
    @Post('validate')
    async validateToken(@Body('token') token: string) {
        const isValid = await this.validateTokenUseCase.validate(token)

        return isValid
    }

    @ApiOperation({summary: ""})
    @ApiResponse({status: 200, description:'user is valid'})
    @Post('authenticate')
    async authenticate(@Body() credentials: AuthenticateWebDto) {
        const userCredentials = await this.authenticateUseCase.authenticate(credentials)

        return userCredentials
    }

}