import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { normalizePermissions, normalizeRole, signSession } from '../../../lib/jwt';
import { setSessionCookie } from '../../../lib/session-cookie';
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
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { token, password } = request.body ?? {};

    if (typeof token !== 'string' || token.trim().length === 0) {
        return response.status(400).json({ error: 'Reset token is required.' });
    }

    if (typeof password !== 'string' || password.length < 8) {
        return response.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const query = await supabaseAdmin
        .from('users')
        .select(
            'id,email,name,roles,role,permissions,password_reset_expires_at,password_reset_token,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,deactivated_at,last_login_at'
        )
        .eq('password_reset_token', token.trim())
        .maybeSingle();

    if (query.error) {
        console.error('Failed to load reset token', query.error);
        return response.status(500).json({ error: 'Unable to reset password.' });
    }

    if (!query.data) {
        return response.status(400).json({ error: 'Reset link is invalid or has already been used.' });
    }

    const expiresAt = query.data.password_reset_expires_at
        ? new Date(query.data.password_reset_expires_at)
        : null;

    if (!expiresAt || Date.now() > expiresAt.getTime()) {
        return response.status(410).json({ error: 'Reset link has expired. Request a new one.' });
    }

    if (query.data.deactivated_at) {
        return response
            .status(403)
            .json({ error: 'This account is deactivated. Contact an administrator for assistance.' });
    }

    const passwordHash = await bcrypt.hash(password, 12);
    const update = await supabaseAdmin
        .from('users')
        .update({
            password_hash: passwordHash,
            password_reset_token: null,
            password_reset_expires_at: null,
            last_login_at: new Date().toISOString(),
        })
        .eq('id', query.data.id)
        .select(
            'id,email,name,roles,role,permissions,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,deactivated_at,last_login_at'
        )
        .single();

    if (update.error || !update.data) {
        console.error('Failed to update password', update.error);
        return response.status(500).json({ error: 'Unable to reset password.' });
    }

    const user = mapUser(update.data);

    if (!user.emailVerified) {
        return response.status(200).json({
            message: 'Password updated. Verify your email before signing in.',
        });
    }

    const sessionToken = await signSession({
        userId: user.id,
        email: user.email,
        roles: user.roles,
        role: user.role,
        permissions: user.permissions,
        emailVerified: user.emailVerified,
    });

    setSessionCookie(response, sessionToken);

    return response.status(200).json({ user });
}
