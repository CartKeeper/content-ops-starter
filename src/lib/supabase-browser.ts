import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import type { RealtimeChannel } from '@supabase/supabase-js';

let browserClient: SupabaseClient | null = null;

const URL_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_URL', 'SUPABASE_URL'];
const ANON_KEY_ENV_KEYS = ['NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY', 'SUPABASE_ANON_KEY'];

function readEnvValue(keys: string[]): string | null {
    for (const key of keys) {
        const value = process.env[key];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value;
        }
    }

    return null;
}

function resolveSupabaseUrl(): string | null {
    return readEnvValue(URL_ENV_KEYS);
}

function resolveSupabaseAnonKey(): string | null {
    return readEnvValue(ANON_KEY_ENV_KEYS);
}

function createFallbackChannel(warn: () => void): RealtimeChannel {
    let channelProxy: RealtimeChannel;

    const handler: ProxyHandler<Record<string, unknown>> = {
        get(_target, prop) {
            if (prop === 'on' || prop === 'subscribe') {
                return (..._args: unknown[]) => {
                    warn();
                    return channelProxy;
                };
            }

            if (prop === 'unsubscribe') {
                return async (..._args: unknown[]) => {
                    warn();
                    return 'ok' as const;
                };
            }

            if (prop === Symbol.toStringTag) {
                return 'RealtimeChannel';
            }

            return undefined;
        }
    };

    channelProxy = new Proxy({}, handler) as unknown as RealtimeChannel;
    return channelProxy;
}

function createFallbackClient(): SupabaseClient {
    let warned = false;

    const warn = () => {
        if (!warned) {
            warned = true;
            console.warn(
                'Supabase browser client is not configured. Provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable realtime updates.'
            );
        }
    };

    const target = {
        channel: (..._args: unknown[]) => createFallbackChannel(warn),
        getChannels: () => [],
        removeAllChannels: async () => [] as const,
        removeChannel: async () => 'ok' as const
    } satisfies Partial<SupabaseClient>;

    const handler: ProxyHandler<typeof target> = {
        get(target, prop, receiver) {
            if (prop in target) {
                const value = Reflect.get(target, prop, receiver);

                if (typeof value === 'function') {
                    return (...args: unknown[]) => {
                        warn();
                        return (value as (...fnArgs: unknown[]) => unknown).apply(target, args);
                    };
                }

                warn();
                return value;
            }

            if (prop === Symbol.toStringTag) {
                return 'SupabaseClient';
            }

            return (..._args: unknown[]) => {
                warn();
                throw new Error(
                    'Supabase browser client is unavailable. Provide NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY to enable realtime features.'
                );
            };
        }
    };

    return new Proxy(target, handler) as unknown as SupabaseClient;
}

function createSupabaseBrowserClient(): SupabaseClient {
    const url = resolveSupabaseUrl();
    const key = resolveSupabaseAnonKey();

    if (!url || !key) {
        return createFallbackClient();
    }

    return createClient(url, key, { auth: { persistSession: false } });
}

export function getSupabaseBrowserClient(): SupabaseClient {
    if (!browserClient) {
        browserClient = createSupabaseBrowserClient();
    }

    return browserClient;
}

export function isSupabaseBrowserConfigured(): boolean {
    return Boolean(resolveSupabaseUrl() && resolveSupabaseAnonKey());
}
