import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

const findFirstMatchingEnvValue = (exactNames, suffixes = exactNames) => {
    for (const name of exactNames) {
        const value = process.env[name];
        if (value) {
            return value;
        }
    }

    const envKeys = Object.keys(process.env);

    for (const suffix of suffixes) {
        const matchKey = envKeys.find((key) => key.endsWith(suffix) && process.env[key]);
        if (matchKey) {
            return process.env[matchKey];
        }
    }

    return null;
};

const resolveUrl = () =>
    findFirstMatchingEnvValue(
        ['SUPABASE_URL', 'SUPABASE_DATABASE_URL'],
        ['SUPABASE_URL', 'SUPABASE_DATABASE_URL']
    );

const resolveKey = () => {
    const serviceRoleKey = findFirstMatchingEnvValue(
        ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE'],
        ['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE']
    );

    if (serviceRoleKey) {
        return serviceRoleKey;
    }

    return findFirstMatchingEnvValue(
        ['SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY'],
        ['SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY']
    );
};

export function getSupabaseClient() {
    if (cachedClient) {
        return cachedClient;
    }

    const { url, key } = getSupabaseConfig();

    cachedClient = createClient(url, key, {
        auth: {
            persistSession: false,
        },
    });

    return cachedClient;
}

export function resetSupabaseClient() {
    cachedClient = null;
}

export function getSupabaseConfig() {
    const url = resolveUrl();
    const key = resolveKey();

    if (!url || !key) {
        throw new Error(
            'Missing Supabase configuration. Set Supabase URL and key environment variables (e.g. SUPABASE_URL/SUPABASE_DATABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY).'
        );
    }

    return { url, key };
}

export function isSupabaseConfigured() {
    return Boolean(resolveUrl() && resolveKey());
}
