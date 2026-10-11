import { Controller, Get, NotFoundException, Req, UseGuards } from '@nestjs/common';
import { FindUserUseCase } from 'src/core/domain/user/useCases';
import { AuthGuard } from 'src/infra/adapters/guards/auth.guard';
import { OnboardingGuard } from 'src/infra/adapters/guards/onboarding.guard';

/**
 * Authenticated users may only retrieve their own profile.
 * Account-wide enumeration and deletion by caller-supplied UID are intentionally
 * not exposed. Account deletion needs a separate verified self-service flow.
 */
@Controller('user')
@UseGuards(AuthGuard, OnboardingGuard)
export class UserController {
  constructor(private readonly findUserUseCase: FindUserUseCase) {}

  @Get('host')
  async getUser(@Req() req: { user: { uid: string } }) {
    const user = await this.findUserUseCase.findUser(req.user.uid);
    if (!user) throw new NotFoundException('User profile not found');
    return user;
  }
}
