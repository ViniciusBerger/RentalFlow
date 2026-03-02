import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { FirebaseAuthAdapter } from '../firebase/firebase-auth.adapter';

@Injectable()
export class AuthGuard implements CanActivate {
  constructor(private readonly authAdapter: FirebaseAuthAdapter) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const token = this.extractTokenFromHeader(request);

    if (!token) throw new UnauthorizedException('Missing token');

    try {
      // Delegate to domain useCase
      const authStatus = await this.authAdapter.validateJWT(token);

      // Attach the user to the request so controllers can use it
      request['user'] = authStatus; 
      
      return true;

    } catch {
      throw new UnauthorizedException('Invalid or expired token');
    }
  }

  private extractTokenFromHeader(request: any): string | undefined {
    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    return type === 'Bearer' ? token : undefined;
  }
}