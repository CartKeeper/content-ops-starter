import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { normalizePermissions, normalizeRole, signSession, verifySession } from '../../../lib/jwt';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../../../lib/session-cookie';
import type { UserProfile } from '../../../types/user';

function mapProfile(record: Record<string, any>): UserProfile {
    const permissions = normalizePermissions(record.permissions);
    const role = normalizeRole(record.role);

    return {
        id: record.id,
        email: record.email,
        name: record.name ?? record.full_name ?? null,
        roles: Array.isArray(record.roles) ? record.roles : [],
        role,
        permissions,
        roleTitle: record.role_title ?? null,
        phone: record.phone ?? null,
        welcomeMessage: record.welcome_message ?? null,
        avatarUrl: record.avatar_url ?? null,
        status: record.status ?? null,
        emailVerified: Boolean(record.email_verified_at),
        calendarId: record.calendar_id ?? null,
        createdAt: record.created_at,
        updatedAt: record.updated_at ?? record.created_at,
        deactivatedAt: record.deactivated_at ?? null,
        lastLoginAt: record.last_login_at ?? null
    };
}

function sanitizeNullableString(value: unknown): string | null {
    if (typeof value !== 'string') {
        return null;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

function sanitizeOptionalString(value: unknown): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    return sanitizeNullableString(value);
}

function sanitizeEmail(value: unknown): string | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim().toLowerCase();
    if (trimmed.length === 0) {
        return undefined;
    }

    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) {
        return undefined;
    }

    return trimmed;
}

async function handleGetProfile(request: NextApiRequest, response: NextApiResponse) {
    const cookie = readSessionCookie(request);
    if (!cookie) {
        return response.status(401).json({ error: 'Authentication required.' });
    }

    try {
        const payload = await verifySession(cookie);
        const query = await supabaseAdmin
            .from('users')
            .select(
                'id,email,name,roles,role,permissions,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,deactivated_at,last_login_at'
            )
            .eq('id', payload.userId)
            .maybeSingle();

        if (query.error) {
            console.error('Failed to load profile', query.error);
            return response.status(500).json({ error: 'Unable to load profile.' });
        }

        if (!query.data) {
            clearSessionCookie(response);
            return response.status(401).json({ error: 'Session is no longer valid.' });
        }

        const profile = mapProfile(query.data);
        return response.status(200).json({ profile });
    } catch (error) {
        console.error('Profile lookup failed', error);
        clearSessionCookie(response);
        return response.status(401).json({ error: 'Authentication required.' });
    }
}

async function handleUpdateProfile(request: NextApiRequest, response: NextApiResponse) {
    const cookie = readSessionCookie(request);
    if (!cookie) {
        return response.status(401).json({ error: 'Authentication required.' });
    }

    let payload: Awaited<ReturnType<typeof verifySession>>;

    try {
        payload = await verifySession(cookie);
    } catch (error) {
        console.error('Profile update session verification failed', error);
        clearSessionCookie(response);
        return response.status(401).json({ error: 'Authentication required.' });
    }

    const { name, email, roleTitle, phone, welcomeMessage, avatarUrl, status } = request.body ?? {};

    const updates: Record<string, string | null> = {};

    if (name !== undefined) {
        updates.name = sanitizeOptionalString(name) ?? null;
    }

    const normalizedEmail = sanitizeEmail(email);
    if (email !== undefined && !normalizedEmail) {
        return response.status(400).json({ error: 'Please provide a valid email address.' });
    }
    if (normalizedEmail) {
        updates.email = normalizedEmail;
    }

    if (roleTitle !== undefined) {
        updates.role_title = sanitizeOptionalString(roleTitle) ?? null;
    }

    if (phone !== undefined) {
        updates.phone = sanitizeOptionalString(phone) ?? null;
    }

    if (welcomeMessage !== undefined) {
        updates.welcome_message = sanitizeOptionalString(welcomeMessage) ?? null;
    }

    if (avatarUrl !== undefined) {
        updates.avatar_url = sanitizeOptionalString(avatarUrl) ?? null;
    }

    if (status !== undefined) {
        updates.status = sanitizeOptionalString(status) ?? null;
    }

    if (Object.keys(updates).length === 0) {
        return response.status(400).json({ error: 'No profile changes supplied.' });
    }

    try {
        const mutation = await supabaseAdmin
            .from('users')
            .update(updates)
            .eq('id', payload.userId)
            .select(
                'id,email,name,roles,role,permissions,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,deactivated_at,last_login_at'
            )
            .single();

        if (mutation.error) {
            if (mutation.error.code === '23505') {
                return response.status(409).json({ error: 'That email is already in use.' });
            }

            console.error('Failed to update profile', mutation.error);
            return response.status(500).json({ error: 'Unable to update profile.' });
        }

        const profile = mapProfile(mutation.data);

        if (normalizedEmail && normalizedEmail !== payload.email) {
            const token = await signSession({
                userId: payload.userId,
                email: normalizedEmail,
                roles: profile.roles,
                role: profile.role,
                permissions: profile.permissions,
                emailVerified: profile.emailVerified
            });
            setSessionCookie(response, token);
        }

        return response.status(200).json({ profile });
    } catch (error) {
        console.error('Unexpected profile update error', error);
        return response.status(500).json({ error: 'Unable to update profile.' });
    }
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    if (request.method === 'GET') {
        return handleGetProfile(request, response);
    }

    if (request.method === 'PUT') {
        return handleUpdateProfile(request, response);
    }

    response.setHeader('Allow', 'GET, PUT');
    return response.status(405).json({ error: 'Method not allowed' });
}
