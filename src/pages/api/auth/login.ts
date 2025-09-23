import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { normalizePermissions, normalizeRole, signSession } from '../../../lib/jwt';
import { setSessionCookie } from '../../../lib/session-cookie';
import type { AuthUser } from '../../../types/auth';

function mapUser(record: Record<string, any>): AuthUser {
    const permissions = normalizePermissions(record.permissions);
    const role = normalizeRole(record.role);
    const emailVerified = Boolean(record.email_verified_at);

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
        emailVerified,
        calendarId: record.calendar_id ?? null,
        workspaceId: record.workspace_id ?? null,
        deactivatedAt: record.deactivated_at ?? null,
        lastLoginAt: record.last_login_at ?? null,
    };
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { email, password } = request.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
        return response.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const query = await supabaseAdmin
            .from('users')
            .select(
                'id,email,password_hash,name,roles,role,permissions,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,workspace_id,deactivated_at,last_login_at'
            )
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (!query.data) {
            return response.status(401).json({ error: 'Invalid email or password.' });
        }

        const userRecord = query.data;

        if (userRecord.deactivated_at) {
            return response
                .status(403)
                .json({ error: 'This account has been deactivated. Contact an administrator.' });
        }

        if (!userRecord.email_verified_at) {
            return response
                .status(403)
                .json({ error: 'Please verify your email before signing in.' });
        }

        const passwordHash: string | null = userRecord.password_hash ?? null;

        if (!passwordHash) {
            return response.status(401).json({ error: 'Invalid email or password.' });
        }

        const matches = await bcrypt.compare(password, passwordHash);
        if (!matches) {
            return response.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = mapUser(userRecord);

        await supabaseAdmin
            .from('users')
            .update({ last_login_at: new Date().toISOString() })
            .eq('id', user.id);

        const token = await signSession({
            userId: user.id,
            email: user.email,
            roles: user.roles,
            role: user.role,
            permissions: user.permissions,
            emailVerified: user.emailVerified,
        });

        setSessionCookie(response, token);

        return response.status(200).json({ user });
    } catch (error) {
        console.error('Unexpected login error', error);
        return response.status(500).json({ error: 'Unable to log in.' });
    }
}
