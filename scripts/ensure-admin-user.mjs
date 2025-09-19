#!/usr/bin/env node
import { createClient } from '@supabase/supabase-js';
import bcrypt from 'bcryptjs';

function readEnv(names, suffixes = []) {
    for (const name of names) {
        const value = process.env[name];
        if (typeof value === 'string' && value.trim().length > 0) {
            return value.trim();
        }
    }

    if (suffixes.length > 0) {
        for (const [key, rawValue] of Object.entries(process.env)) {
            if (typeof rawValue !== 'string') {
                continue;
            }

            if (suffixes.some((suffix) => key.endsWith(suffix))) {
                const trimmed = rawValue.trim();
                if (trimmed.length > 0) {
                    return trimmed;
                }
            }
        }
    }

    return null;
}

const SUPABASE_URL = readEnv(['SUPABASE_URL', 'SUPABASE_DATABASE_URL'], [
    'SUPABASE_URL',
    'SUPABASE_DATABASE_URL'
]);

const SUPABASE_SERVICE_ROLE_KEY = readEnv(['SUPABASE_SERVICE_ROLE_KEY', 'SUPABASE_SERVICE_ROLE'], [
    'SUPABASE_SERVICE_ROLE_KEY',
    'SUPABASE_SERVICE_ROLE'
]);

const SUPABASE_ANON_KEY = readEnv(
    ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLIC_ANON_KEY', 'NEXT_PUBLIC_SUPABASE_ANON_KEY', 'PUBLIC_SUPABASE_ANON_KEY'],
    ['SUPABASE_ANON_KEY', 'SUPABASE_PUBLIC_ANON_KEY']
);

if (!SUPABASE_URL) {
    console.warn('[ensure-admin-user] Missing SUPABASE_URL. Skipping admin bootstrap.');
    process.exit(0);
}

const SUPABASE_KEY = SUPABASE_SERVICE_ROLE_KEY ?? SUPABASE_ANON_KEY;

if (!SUPABASE_KEY) {
    console.warn('[ensure-admin-user] Missing Supabase key. Provide SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY.');
    process.exit(0);
}

if (!SUPABASE_SERVICE_ROLE_KEY) {
    console.warn(
        '[ensure-admin-user] SUPABASE_SERVICE_ROLE_KEY not found. Falling back to public key; ensure row level security allows inserts.'
    );
}

const adminEmailEnv = readEnv([
    'ADMIN_LOGIN_EMAIL',
    'ADMIN_EMAIL',
    'ADMIN_USER_EMAIL',
    'ADMIN_LOGIN'
]);

const adminPasswordEnv = readEnv([
    'ADMIN_LOGIN_PASSWORD',
    'ADMIN_PASSWORD',
    'ADMIN_USER_PASSWORD'
]);

const adminPasswordHashEnv = readEnv([
    'ADMIN_LOGIN_PASSWORD_HASH',
    'ADMIN_PASSWORD_HASH',
    'ADMIN_USER_PASSWORD_HASH'
]);

if (!adminEmailEnv) {
    console.info('[ensure-admin-user] ADMIN_LOGIN_EMAIL is not set. No admin account will be created.');
    process.exit(0);
}

const normalizedEmail = adminEmailEnv.trim().toLowerCase();

if (normalizedEmail.length === 0) {
    console.warn('[ensure-admin-user] ADMIN_LOGIN_EMAIL is empty after trimming. Skipping admin bootstrap.');
    process.exit(0);
}

let passwordHash = adminPasswordHashEnv;
if (!passwordHash) {
    if (!adminPasswordEnv) {
        console.warn('[ensure-admin-user] ADMIN_LOGIN_PASSWORD is not set. Skipping admin bootstrap.');
        process.exit(0);
    }

    passwordHash = bcrypt.hashSync(adminPasswordEnv, 12);
}

const adminName = readEnv(['ADMIN_LOGIN_NAME', 'ADMIN_NAME', 'ADMIN_USER_NAME']);
const adminRolesRaw = readEnv(['ADMIN_LOGIN_ROLES', 'ADMIN_ROLES', 'ADMIN_USER_ROLES']);

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
    auth: { persistSession: false }
});

const roleSet = new Set();

const addRole = (role) => {
    if (typeof role !== 'string') {
        return;
    }

    const normalized = role.trim().toLowerCase();
    if (normalized.length === 0) {
        return;
    }

    roleSet.add(normalized);
};

addRole('admin');
addRole('photographer');

if (adminRolesRaw) {
    for (const role of adminRolesRaw.split(',')) {
        addRole(role);
    }
}

async function ensureAdminUser() {
    const { data: existingUser, error: fetchError } = await supabase
        .from('users')
        .select('id, roles')
        .eq('email', normalizedEmail)
        .maybeSingle();

    if (fetchError) {
        console.error('[ensure-admin-user] Failed to query Supabase:', fetchError.message ?? fetchError);
        process.exit(1);
    }

    if (existingUser?.roles && Array.isArray(existingUser.roles)) {
        for (const role of existingUser.roles) {
            addRole(role);
        }
    }

    const roles = Array.from(roleSet);

    if (existingUser) {
        const updatePayload = {
            password_hash: passwordHash,
            roles
        };

        if (adminName) {
            updatePayload.name = adminName;
        }

        const { error: updateError } = await supabase
            .from('users')
            .update(updatePayload)
            .eq('id', existingUser.id);

        if (updateError) {
            console.error('[ensure-admin-user] Failed to update admin user:', updateError.message ?? updateError);
            process.exit(1);
        }

        console.log(`[ensure-admin-user] Updated admin account for ${normalizedEmail}.`);
        return;
    }

    const insertPayload = {
        email: normalizedEmail,
        password_hash: passwordHash,
        name: adminName ?? null,
        roles
    };

    const { error: insertError } = await supabase.from('users').insert(insertPayload);

    if (insertError) {
        console.error('[ensure-admin-user] Failed to insert admin user:', insertError.message ?? insertError);
        process.exit(1);
    }

    console.log(`[ensure-admin-user] Created admin account for ${normalizedEmail}.`);
}

ensureAdminUser().catch((error) => {
    console.error('[ensure-admin-user] Unexpected error:', error);
    process.exit(1);
});

