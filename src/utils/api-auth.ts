import type { NextApiRequest } from 'next';

import { verifySession, type SessionPayload } from '../lib/jwt';
import { readSessionCookie } from '../lib/session-cookie';

export function extractBearerToken(request: NextApiRequest): string | null {
    const authorization = request.headers.authorization;
    if (!authorization) {
        return null;
    }

    const [scheme, token] = authorization.split(' ');
    if (scheme?.toLowerCase() !== 'bearer' || !token) {
        return null;
    }

    return token.trim();
}

export async function authenticateRequest(request: NextApiRequest): Promise<SessionPayload | null> {
    const cookieToken = readSessionCookie(request);
    const token = cookieToken ?? extractBearerToken(request);

    if (!token) {
        return null;
    }

    try {
        return await verifySession(token);
    } catch {
        return null;
    }
}
