import {createHmac, timingSafeEqual} from 'node:crypto';
import type {Request, Response, NextFunction} from 'express';

/** Token bound to the HTTP-only Firebase session. No separate frontend trust. */
function sessionCookie(req: Pick<Request,'cookies'>): string | undefined {
  return req.cookies?.['__Host-access_token'] ?? req.cookies?.access_token ?? req.cookies?.rf_dev_session;
}
export function sessionCsrfToken(req: Pick<Request,'cookies'>): string | undefined {
  const session=sessionCookie(req);
  if (typeof session!=='string' || session.length<20) return undefined;
  return createHmac('sha256',Buffer.from(session)).update('rentalflow:csrf:v1').digest('base64url');
}
export function requireSessionCsrf(req: Request,res: Response,next: NextFunction): void {
  // Opt-in after both API and SPA are live; old SPA cannot send CSRF headers.
  // Trusted Origin/Fetch-Metadata protection remains active during rollout.
  if (process.env.CSRF_TOKEN_ENFORCEMENT !== 'true') { next();return; }
  if (!['POST','PUT','PATCH','DELETE'].includes(req.method) || req.path==='/auth/login') { next();return; }
  const expected=sessionCsrfToken(req);
  if (!expected) { next();return; } // authentication guards still reject missing sessions
  const supplied=req.get('x-csrf-token');
  if (typeof supplied!=='string' || supplied.length!==expected.length ||
      !timingSafeEqual(Buffer.from(supplied),Buffer.from(expected))) {
    res.status(403).json({statusCode:403,message:'CSRF validation failed'});return;
  }
  next();
}
