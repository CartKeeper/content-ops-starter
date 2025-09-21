import { createClient } from '@supabase/supabase-js';
import type { SupabaseClient } from '@supabase/supabase-js';

function normalize(value?: string | null): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function findEnvValue(primaryKeys: string[], suffixes: string[]): string | null {
    for (const key of primaryKeys) {
        const candidate = normalize(process.env[key]);
        if (candidate) {
            return candidate;
        }
    }

    for (const [key, rawValue] of Object.entries(process.env)) {
        if (typeof rawValue !== 'string') {
            continue;
        }

        if (suffixes.some((suffix) => key.endsWith(suffix))) {
            const candidate = normalize(rawValue);
            if (candidate) {
                return candidate;
            }
        }
    }

    return null;
}

const SUPABASE_URL =
    findEnvValue(['SUPABASE_URL', 'SUPABASE_DATABASE_URL'], [
        'SUPABASE_URL',
        'SUPABASE_DATABASE_URL'
    ]) ?? null;

const SERVICE_ROLE_KEY = findEnvValue(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE'], [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE'
]);

const PUBLIC_KEY = findEnvValue(
    ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLIC_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY'],
    ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLIC_ANON_KEY']
);

const SUPABASE_KEY = SERVICE_ROLE_KEY ?? PUBLIC_KEY ?? null;

export const isSupabaseConfigured = Boolean(SUPABASE_URL && SUPABASE_KEY);

export class SupabaseAdminUnavailableError extends Error {
    constructor() {
        super('Supabase admin client is not configured. Provide SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY.');
        this.name = 'SupabaseAdminUnavailableError';
    }
}

function createFallbackClient(): SupabaseClient {
    let warned = false;

    const handler: ProxyHandler<Record<string, unknown>> = {
        get() {
            if (!warned) {
                warned = true;
                console.warn(
                    'Supabase admin client is unavailable. Falling back to static data where possible. '
                );
            }
            throw new SupabaseAdminUnavailableError();
        },
        apply() {
            throw new SupabaseAdminUnavailableError();
        }
    };

    return new Proxy({}, handler) as unknown as SupabaseClient;
}

function createSupabaseAdminClient(): SupabaseClient {
    if (!isSupabaseConfigured) {
        return createFallbackClient();
    }

    return createClient(SUPABASE_URL as string, SUPABASE_KEY as string, {
        auth: { persistSession: false }
    });
}

export const supabaseAdmin = createSupabaseAdminClient();

export function assertSupabaseAdmin() {
    if (!isSupabaseConfigured) {
        throw new SupabaseAdminUnavailableError();
    }
}
