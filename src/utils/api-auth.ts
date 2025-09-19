import type { NextApiRequest } from 'next';

import { verifyAuthToken, type AuthTokenPayload } from './auth-token';

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

export function authenticateRequest(request: NextApiRequest): AuthTokenPayload | null {
    const token = extractBearerToken(request);
    if (!token) {
        return null;
    }

    return verifyAuthToken(token);
}
