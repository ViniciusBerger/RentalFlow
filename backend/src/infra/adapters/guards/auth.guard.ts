import { CanActivate, ExecutionContext, Inject, Injectable, UnauthorizedException } from '@nestjs/common';
import { type IAuthPort } from '../../../core/app/ports/IAuthPort';


@Injectable()
export class AuthGuard implements CanActivate {
  constructor(@Inject('IAuthPort') private readonly authPort: IAuthPort) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    
    //access token is saved in cookies to avoid js injection
    const token =
          request.cookies['__Host-access_token'] ??
          request.cookies['access_token'];
    
    if (!token) throw new UnauthorizedException('Missing token');

    const authStatus = await this.authPort.validateJWT(token);
    request['user'] = authStatus; // Attach the user to the request so controllers can use it
      
    return true;
  }
}