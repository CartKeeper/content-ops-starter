/**
 * @type {import('next').NextConfig}
 */
const env = {
    stackbitPreview: process.env.STACKBIT_PREVIEW
};

const supabaseUrl =
    process.env.NEXT_PUBLIC_SUPABASE_URL ||
    process.env.PUBLIC_SUPABASE_URL ||
    process.env.SUPABASE_URL ||
    process.env.SUPABASE_DATABASE_URL;

if (supabaseUrl) {
    env.NEXT_PUBLIC_SUPABASE_URL = supabaseUrl;
}

const supabaseAnonKey =
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    process.env.PUBLIC_SUPABASE_ANON_KEY ||
    process.env.SUPABASE_ANON_KEY;

if (supabaseAnonKey) {
    env.NEXT_PUBLIC_SUPABASE_ANON_KEY = supabaseAnonKey;
}

const defaultAllowedDevOrigins = [
    '127.0.0.1',
    '127.0.0.1:3000',
    'localhost',
    'localhost:3000',
    '[::1]',
    '[::1]:3000'
];

const nextConfig = {
    env,
    trailingSlash: true,
    reactStrictMode: true,
    // Allow the default local development hosts in addition to any
    // explicitly configured LAN address so the dev server can service
    // hot-module reloading and other /_next requests.
    allowedDevOrigins: Array.from(
        new Set([
            ...defaultAllowedDevOrigins,
            '192.168.1.84'
        ])
    )
};

module.exports = nextConfig;
