import type { Request, Response, NextFunction } from 'express';

/**
 * Browser-origin boundary for cookie-authenticated, state-changing requests.
 * In production every unsafe browser/API request must carry a trusted Origin.
 * This is a server-side defense, independent of frontend CORS and UI behavior.
 */
export function csrfOriginProtection(trustedOrigins: readonly string[]) {
  const trusted = new Set(trustedOrigins.filter(Boolean));
  return (req: Request, res: Response, next: NextFunction) => {
    if (!['POST', 'PUT', 'PATCH', 'DELETE'].includes(req.method)) return next();

    const origin = req.get('origin');
    const fetchSite = req.get('sec-fetch-site');
    const deny = () => res.status(403).json({ statusCode: 403, message: 'Untrusted request origin' });

    if (fetchSite === 'cross-site') return deny();
    if (origin) {
      try {
        const parsed = new URL(origin);
        if (parsed.origin !== origin || !trusted.has(origin)) return deny();
      } catch {
        return deny();
      }
    } else if (process.env.NODE_ENV === 'production' || req.headers.cookie) {
      return deny();
    }
    next();
  };
}
