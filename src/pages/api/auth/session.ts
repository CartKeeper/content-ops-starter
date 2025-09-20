import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { normalizePermissions, normalizeRole, signSession, verifySession } from '../../../lib/jwt';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../../../lib/session-cookie';
import type { AuthUser } from '../../../types/auth';

function mapUser(record: Record<string, any>): AuthUser {
    const permissions = normalizePermissions(record.permissions);
    const role = normalizeRole(record.role);

    return {
        id: record.id,
        email: record.email,
        name: record.name ?? record.full_name ?? null,
        roles: Array.isArray(record.roles) ? record.roles : [],
        role,
        permissions,
        createdAt: record.created_at,
        updatedAt: record.updated_at ?? record.created_at,
        roleTitle: record.role_title ?? null,
        phone: record.phone ?? null,
        welcomeMessage: record.welcome_message ?? null,
        avatarUrl: record.avatar_url ?? null,
        status: record.status ?? null,
        emailVerified: Boolean(record.email_verified_at),
        calendarId: record.calendar_id ?? null,
        deactivatedAt: record.deactivated_at ?? null,
        lastLoginAt: record.last_login_at ?? null,
    };
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ error: 'Method not allowed' });
    }

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
            console.error('Failed to fetch user for session', query.error);
            return response.status(500).json({ error: 'Unable to resolve session.' });
        }

        if (!query.data) {
            clearSessionCookie(response);
            return response.status(401).json({ error: 'User session is invalid.' });
        }

        if (query.data.deactivated_at) {
            clearSessionCookie(response);
            return response.status(403).json({ error: 'This account has been deactivated.' });
        }

        const user = mapUser(query.data);
        const refreshedToken = await signSession({
            userId: user.id,
            email: user.email,
            roles: user.roles,
            role: user.role,
            permissions: user.permissions,
            emailVerified: user.emailVerified,
        });

        setSessionCookie(response, refreshedToken);

        return response.status(200).json({ user });
    } catch (error) {
        console.error('Failed to load session', error);
        clearSessionCookie(response);
        return response.status(401).json({ error: 'Authentication required.' });
    }
}
