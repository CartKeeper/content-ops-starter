import { SignJWT, jwtVerify } from 'jose';

export type SessionPayload = {
    userId: string;
    email: string;
    roles: string[];
};

const ISSUER = 'content-ops-starter';

function getSecretKey(): Uint8Array {
    const secret = process.env.AUTH_JWT_SECRET ?? process.env.JWT_SECRET;
    if (!secret || secret.trim().length === 0) {
        throw new Error('Missing AUTH_JWT_SECRET environment variable.');
    }

    return new TextEncoder().encode(secret);
}

export async function signSession(payload: SessionPayload): Promise<string> {
    return await new SignJWT({ ...payload })
        .setProtectedHeader({ alg: 'HS256' })
        .setIssuer(ISSUER)
        .setIssuedAt()
        .setExpirationTime('7d')
        .sign(getSecretKey());
}

export async function verifySession(token: string): Promise<SessionPayload> {
    const { payload } = await jwtVerify(token, getSecretKey(), { issuer: ISSUER });
    const { userId, email, roles } = payload as Partial<SessionPayload>;

    if (typeof userId !== 'string' || typeof email !== 'string' || !Array.isArray(roles)) {
        throw new Error('Invalid session payload.');
    }

    return {
        userId,
        email,
        roles: roles.filter((role): role is string => typeof role === 'string')
    };
}
