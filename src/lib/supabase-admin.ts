import { createClient } from '@supabase/supabase-js';

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
        if (!rawValue) {
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

if (!SUPABASE_URL) {
    throw new Error('Missing Supabase project URL. Set SUPABASE_URL or SUPABASE_DATABASE_URL.');
}

const SERVICE_ROLE_KEY = findEnvValue(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE'], [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE'
]);

const PUBLIC_KEY = findEnvValue(
    ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLIC_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY'],
    ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLIC_ANON_KEY']
);

const SUPABASE_KEY = SERVICE_ROLE_KEY ?? PUBLIC_KEY;

if (!SUPABASE_KEY) {
    throw new Error(
        'Missing Supabase service role or anon key. Provide SUPABASE_SERVICE_ROLE_KEY (preferred) or SUPABASE_ANON_KEY.'
    );
}

export const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});
