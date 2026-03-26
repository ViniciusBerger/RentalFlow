import { CanActivate, ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from "@nestjs/common";

@Injectable()
export class OnboardingGuard implements CanActivate {
  
    canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest();

    if (!req.user) {console.log ("ONGOGING GUARD FAILURE")
      throw new UnauthorizedException("ONGOING GUARD FAILURE")};
    if (!req.user.isRegistered) throw new ForbiddenException('onboarding required');
    
    return true;
  }
}