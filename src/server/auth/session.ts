import { cookies, type UnsafeUnwrappedCookies } from 'next/headers';
import type { NextRequest } from 'next/server';

import { verifySession, type SessionPayload } from '../../lib/jwt';
import { SESSION_COOKIE_NAME, parseSessionCookieHeader } from '../../lib/session-cookie';

function readAuthorizationHeader(request: NextRequest): string | null {
    const header = request.headers.get('authorization');
    if (!header) {
        return null;
    }

    const [scheme, token] = header.split(' ');
    if (!token || scheme?.toLowerCase() !== 'bearer') {
        return null;
    }

    return token.trim();
}

async function readSessionToken(request: NextRequest): Promise<string | null> {
    const cookieStore = (await cookies()) as UnsafeUnwrappedCookies;
    const cookieToken = cookieStore.get(SESSION_COOKIE_NAME)?.value;
    if (cookieToken) {
        return cookieToken;
    }

    const headerToken = readAuthorizationHeader(request);
    if (headerToken) {
        return headerToken;
    }

    const cookieHeader = request.headers.get('cookie');
    if (cookieHeader) {
        const parsed = parseSessionCookieHeader(cookieHeader);
        if (parsed) {
            return parsed;
        }
    }

    return null;
}

export async function authenticateRequest(request: NextRequest): Promise<SessionPayload | null> {
    const token = await readSessionToken(request);
    if (!token) {
        return null;
    }

    try {
        return await verifySession(token);
    } catch (error) {
        console.warn('Invalid session token', error);
        return null;
    }
}

export async function requireSession(request: NextRequest): Promise<SessionPayload> {
    const session = await authenticateRequest(request);
    if (!session) {
        throw new Error('UNAUTHENTICATED');
    }

    return session;
}
