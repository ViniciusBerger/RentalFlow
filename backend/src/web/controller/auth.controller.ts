import { Body, Controller, Get, Post, Res } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { type Response } from 'express'
import { AuthenticateUseCase} from "../../core/domain/auth/useCase/authenticate.use-case";
import { AuthenticateWebDto } from "../dto-web/auth/authenticate.web-dto";

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {

    constructor(private readonly authenticateUseCase: AuthenticateUseCase,
    ) {}

    @Get("/")
    getU(){
        return 'sucess'
    }

    @ApiOperation({summary: "Login user with email and password"})
    @ApiResponse({status: 200, description:'user is valid'})
    @Post('login')
    async authenticate( @Body() credentials: AuthenticateWebDto, @Res({passthrough: true}) res: Response) {

        const result = await this.authenticateUseCase.authenticate(credentials)
        console.log('Token starts with:', result.idToken.substring(0, 15));

        res.cookie('access_token', result.idToken, {
            httpOnly: true,
            sameSite: 'lax', // since your frontend is on another origin
            secure: false,    // set true in production with HTTPS
            path: '/',
            maxAge: 3600000,
            });

        return {message: 'login sucessful'}
    }

    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        // Clear the cookie by setting its expiration to the past
        res.clearCookie('access_token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: false, // Match your login configuration
            path: '/',
        });

        return { message: 'Logged out successfully' };
}

}