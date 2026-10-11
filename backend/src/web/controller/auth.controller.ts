import { Body, Controller, Get, Post, Req, Res, UseGuards, UnauthorizedException, InternalServerErrorException } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiTags } from "@nestjs/swagger";
import { createHmac } from "node:crypto";
import { sessionCsrfToken } from "../../infra/middleware/csrf-session";
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

    cookieName = '__Host-access_token';
    private get devEnabled() {
      return process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_LOGIN === 'true';
    }

    
    constructor(private readonly authenticateUseCase: AuthenticateUseCase,
                private readonly completeProfileUseCase: CompleteProfileUseCase
    ) {}

    @ApiOperation({summary: "Login user with email and password"})
    @ApiResponse({status: 200, description:'login sucessful'})
    @Post('login')
    async authenticate( @Body() credentials: AuthenticateWebDto, @Res({passthrough: true}) res: Response) {
        if (this.devEnabled && credentials.email === process.env.DEV_LOGIN_EMAIL) {
          if (!process.env.DEV_LOGIN_PASSWORD || credentials.password !== process.env.DEV_LOGIN_PASSWORD) {
            throw new UnauthorizedException('Invalid development credentials');
          }
          const secret = process.env.DEV_AUTH_SECRET;
          if (!secret || secret.length < 32) throw new UnauthorizedException('Development auth is not configured');
          const uid = 'rentalflow-local-dev';
          // Create the local development user in the configured DEVELOPMENT database.
          // Never aim local DATABASE_URL at your production database.
          const profileReady = await this.completeProfileUseCase.execute(uid, credentials.email, 'Test', 'Developer');
          if (!profileReady) throw new InternalServerErrorException('Development user setup failed');
          const expires = Date.now() + 60 * 60 * 1000;
          const payload = `${uid}.${expires}`;
          const signature = createHmac('sha256', secret).update(payload).digest('hex');
          res.cookie('rf_dev_session', `${payload}.${signature}`, {
            httpOnly: true, secure: false, sameSite: 'lax', path: '/', maxAge: 3600000,
          });
          return { message: 'Development login successful' };
        }
        const result = await this.authenticateUseCase.authenticate(credentials)

        
        const isProduction = process.env.NODE_ENV === 'production';
        

        res.cookie(this.cookieName, result.idToken, {
            httpOnly: true,
            sameSite: isProduction ? 'none' : 'lax',
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
        
        res.clearCookie('rf_dev_session', { httpOnly: true, sameSite: 'lax', secure: false, path: '/' });
        // Clear cookies
        res.clearCookie(this.cookieName, {
            httpOnly: true,
            sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
            secure: process.env.NODE_ENV === 'production',
            path: '/',
        });
        return { message: 'Logged out successfully' };
    }

    @UseGuards(AuthGuard)
    @Get("me")
    getMe(@Req() req: Request & { user: RequestUser }) {
    return req.user;
    }

    @UseGuards(AuthGuard)
    @Get('csrf')
    getCsrf(@Req() req: Request & { cookies: Record<string,string> }) {
      const token=sessionCsrfToken(req);
      if (!token) throw new UnauthorizedException('Session required');
      return { csrfToken: token };
    }

    @Post('complete-profile')
    @UseGuards(AuthGuard)
    async completeProfile(
    @Req() req: Request & { user: RequestUser },
    @Body() body: CompleteProfileDto,
    ) {
    return this.completeProfileUseCase.execute(req.user.uid,req.user.email,body.firstName,body.lastName)}

}