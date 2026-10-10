import { createHmac, timingSafeEqual } from 'node:crypto';
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
    
    if (process.env.NODE_ENV === 'development' && process.env.ENABLE_DEV_LOGIN === 'true') {
      const devCookie: unknown = request.cookies?.rf_dev_session;
      const secret = process.env.DEV_AUTH_SECRET;
      if (typeof devCookie === 'string' && secret && secret.length >= 32) {
        const parts = devCookie.split('.');
        if (parts.length === 3) {
          const [uid, expiry, signature] = parts;
          const expected = createHmac('sha256', secret).update(`${uid}.${expiry}`).digest('hex');
          const validSig = /^[a-f0-9]{64}$/.test(signature) &&
            timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expected, 'hex'));
          if (validSig && uid === 'rentalflow-local-dev' && Number(expiry) > Date.now()) {
            request.user = { uid, email: process.env.DEV_LOGIN_EMAIL, role: 'host', isRegistered: true };
            return true;
          }
        }
      }
    }

    if (!token) throw new UnauthorizedException('Missing token');

    const authStatus = await this.authPort.validateJWT(token);
    request['user'] = authStatus; // Attach the user to the request so controllers can use it
      
    return true;
  }
}