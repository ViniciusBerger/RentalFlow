import { Body, Controller, Get, Post, Req, Res, UseGuards } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { type Response } from 'express'
import { AuthenticateUseCase} from "../../core/domain/auth/useCase/authenticate/authenticate.use-case";
import { AuthenticateWebDto } from "../dto-web/auth/authenticate.web-dto";
import { AuthGuard } from "src/infra/adapters/guards/auth.guard";
import { CompleteProfileDto } from "src/core/app/dtos/auth/complete-profile.dto";
import { CompleteProfileUseCase } from "src/core/domain/user/useCases/complete-profile/complete-profile.use-case";


type RequestUser = {
  uid: string;
  email: string;
  role?: string;
  isRegistered: boolean;
};


@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
    constructor(private readonly authenticateUseCase: AuthenticateUseCase,
                private readonly completeProfileUseCase: CompleteProfileUseCase
    ) {}

    @ApiOperation({summary: "Login user with email and password"})
    @ApiResponse({status: 200, description:'login sucessful'})
    @Post('login')
    async authenticate( @Body() credentials: AuthenticateWebDto, @Res({passthrough: true}) res: Response) {

        const result = await this.authenticateUseCase.authenticate(credentials)
        const isProduction = process.env.NODE_ENV === 'production';

        res.cookie('access_token', result.idToken, {
            httpOnly: true,
            sameSite: isProduction ? 'lax' : 'lax',
            secure: isProduction,
            path: '/',
            maxAge: 3600000,
        });
        return {message: 'login sucessful'}
    }


    @ApiOperation({summary: "Logout user"})
    @ApiResponse({status: 200, description:'Logged out successfully'})
    @Post('logout')
    async logout(@Res({ passthrough: true }) res: Response) {
        
        // Clear cookies
        res.clearCookie('access_token', {
            httpOnly: true,
            sameSite: 'lax',
            secure: false, 
            path: '/',
        });
        return { message: 'Logged out successfully' };
    }

    @UseGuards(AuthGuard)
    @Get("me")
    getMe(@Req() req: Request & { user: RequestUser }) {
    return req.user;
    }

    @Post('complete-profile')
    @UseGuards(AuthGuard)
    async completeProfile(
    @Req() req: Request & { user: RequestUser },
    @Body() body: CompleteProfileDto,
    ) {
    return this.completeProfileUseCase.execute(req.user.uid,req.user.email,body.firstName,body.lastName)}

}