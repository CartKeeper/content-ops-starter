import type { NextApiRequest, NextApiResponse } from 'next';
import { parse, serialize } from 'cookie';

export const SESSION_COOKIE_NAME = 'session';
const SESSION_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

const baseCookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/'
};

export function setSessionCookie(res: NextApiResponse, token: string): void {
    res.setHeader(
        'Set-Cookie',
        serialize(SESSION_COOKIE_NAME, token, {
            ...baseCookieOptions,
            maxAge: SESSION_MAX_AGE
        })
    );
}

export function clearSessionCookie(res: NextApiResponse): void {
    res.setHeader(
        'Set-Cookie',
        serialize(SESSION_COOKIE_NAME, '', {
            ...baseCookieOptions,
            maxAge: 0
        })
    );
}

export function readSessionCookie(req: NextApiRequest): string | null {
    return parseSessionCookieHeader(req.headers.cookie);
}

export function parseSessionCookieHeader(cookieHeader: string | undefined | null): string | null {
    if (!cookieHeader) {
        return null;
    }

    const cookies = parse(cookieHeader);
    const token = cookies[SESSION_COOKIE_NAME];

    if (typeof token !== 'string' || token.trim() === '') {
        return null;
    }

    return token;
}
