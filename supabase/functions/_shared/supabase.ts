import { createClient, type SupabaseClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

declare const Deno: {
    env: {
        get(key: string): string | undefined;
    };
};

export type DatabaseClient = SupabaseClient;

export function createSupabaseClient(): DatabaseClient {
    const url = Deno.env.get('SUPABASE_URL');
    const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? Deno.env.get('SUPABASE_SERVICE_ROLE');
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY');

    const resolvedKey = serviceKey ?? anonKey;

    if (!url || !resolvedKey) {
        throw new Error('Supabase environment variables are not configured.');
    }

    return createClient(url, resolvedKey, {
        auth: {
            persistSession: false,
            autoRefreshToken: false
        }
    });
}
