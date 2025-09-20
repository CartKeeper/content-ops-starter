import { createClient, type SupabaseClient } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

function readEnvValue(keys: string[]): string | null {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }

    return null;
}

export function getSupabaseBrowserClient(): SupabaseClient {
    if (browserClient) {
        return browserClient;
    }

    const url =
        readEnvValue(['NEXT_PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_URL', 'SUPABASE_URL']) ??
        (() => {
            throw new Error('Missing Supabase URL environment variable.');
        })();

    const key =
        readEnvValue(['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY']) ??
        (() => {
            throw new Error('Missing Supabase anon key environment variable.');
        })();

    browserClient = createClient(url, key, { auth: { persistSession: false } });
    return browserClient;
}
