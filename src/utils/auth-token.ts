import jwt from 'jsonwebtoken';

export type AuthTokenPayload = {
    userId: string;
    email: string;
    roles: string[];
};

const EXPIRATION = process.env.AUTH_JWT_EXPIRES_IN ?? '7d';

function resolveJwtSecret() {
    const secret = process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET;
    if (!secret || secret.trim().length === 0) {
        throw new Error('Missing AUTH_JWT_SECRET environment variable.');
    }
    return secret;
}

export function signAuthToken(payload: AuthTokenPayload): string {
    const secret = resolveJwtSecret();
    return jwt.sign(payload, secret, { expiresIn: EXPIRATION });
}

export function verifyAuthToken(token: string): AuthTokenPayload | null {
    try {
        const secret = resolveJwtSecret();
        return jwt.verify(token, secret) as AuthTokenPayload;
    } catch (error) {
        return null;
    }
}
