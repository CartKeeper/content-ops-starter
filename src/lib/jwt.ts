import { SignJWT, jwtVerify } from 'jose';

export type SessionPayload = {
    userId: string;
    email: string;
    roles: string[];
};

const ISSUER = 'content-ops-starter';

function normalize(value?: string | null): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function findSupabaseServiceRoleKey(): string | null {
    const directKeys = ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE'];

    for (const key of directKeys) {
        const candidate = normalize(process.env[key]);
        if (candidate) {
            return candidate;
        }
    }

    for (const [key, rawValue] of Object.entries(process.env)) {
        if (typeof rawValue !== 'string') {
            continue;
        }

        if (key.endsWith('SUPABASE_SERVICE_ROLE_KEY') || key.endsWith('SUPABASE_SERVICE_ROLE')) {
            const candidate = normalize(rawValue);
            if (candidate) {
                return candidate;
            }
        }
    }

    return null;
}

function resolveSecret(): string {
    const explicitSecret = normalize(process.env.AUTH_JWT_SECRET) ?? normalize(process.env.JWT_SECRET);
    if (explicitSecret) {
        return explicitSecret;
    }

    const supabaseServiceRoleKey = findSupabaseServiceRoleKey();
    if (supabaseServiceRoleKey) {
        return supabaseServiceRoleKey;
    }

    throw new Error(
        'Missing AUTH_JWT_SECRET environment variable. Provide AUTH_JWT_SECRET or SUPABASE_SERVICE_ROLE_KEY.'
    );
}

function getSecretKey(): Uint8Array {
    return new TextEncoder().encode(resolveSecret());
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
