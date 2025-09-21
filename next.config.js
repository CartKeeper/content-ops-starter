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

const nextConfig = {
    env,
    trailingSlash: true,
    reactStrictMode: true,
    allowedDevOrigins: [
        '192.168.1.84'
    ]
};

module.exports = nextConfig;
