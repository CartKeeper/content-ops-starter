import { createClient } from '@supabase/supabase-js';

let cachedClient = null;

const resolveKey = () => {
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
        return process.env.SUPABASE_SERVICE_ROLE_KEY;
    }

    if (process.env.SUPABASE_ANON_KEY) {
        return process.env.SUPABASE_ANON_KEY;
    }

    return null;
};

export function getSupabaseClient() {
    if (cachedClient) {
        return cachedClient;
    }

    const url = process.env.SUPABASE_URL;
    const key = resolveKey();

    if (!url || !key) {
        throw new Error(
            'Missing Supabase configuration. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.'
        );
    }

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
