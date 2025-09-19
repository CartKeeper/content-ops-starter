import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { signSession } from '../../../lib/jwt';
import { setSessionCookie } from '../../../lib/session-cookie';
import type { AuthUser } from '../../../types/auth';

const MIN_PASSWORD_LENGTH = 8;

function mapUser(record: Record<string, any>): AuthUser {
    return {
        id: record.id,
        email: record.email,
        name: record.name ?? record.full_name ?? null,
        roles: Array.isArray(record.roles) ? record.roles : [],
        createdAt: record.created_at
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

    if (typeof password !== 'string' || password.length < MIN_PASSWORD_LENGTH) {
        return response
            .status(400)
            .json({ error: `Password must be at least ${MIN_PASSWORD_LENGTH} characters long.` });
    }

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    try {
        const tokenQuery = await supabaseAdmin
            .from('password_reset_tokens')
            .select('id,user_id,expires_at,used_at')
            .eq('token_hash', tokenHash)
            .maybeSingle();

        if (tokenQuery.error) {
            console.error('Password reset token lookup failed', tokenQuery.error);
            return response.status(500).json({ error: 'Unable to reset password.' });
        }

        const tokenRecord = tokenQuery.data;

        if (!tokenRecord) {
            return response.status(400).json({ error: 'Reset link is invalid or has expired.' });
        }

        if (tokenRecord.used_at) {
            return response.status(400).json({ error: 'Reset link has already been used.' });
        }

        const expiration = new Date(tokenRecord.expires_at);
        if (Number.isNaN(expiration.getTime()) || expiration.getTime() < Date.now()) {
            await supabaseAdmin.from('password_reset_tokens').delete().eq('id', tokenRecord.id);
            return response.status(400).json({ error: 'Reset link is invalid or has expired.' });
        }

        const userQuery = await supabaseAdmin
            .from('users')
            .select('id,email,name,roles,created_at')
            .eq('id', tokenRecord.user_id)
            .maybeSingle();

        if (userQuery.error) {
            console.error('Password reset user lookup failed', userQuery.error);
            return response.status(500).json({ error: 'Unable to reset password.' });
        }

        const userRecord = userQuery.data;

        if (!userRecord) {
            await supabaseAdmin.from('password_reset_tokens').delete().eq('id', tokenRecord.id);
            return response.status(400).json({ error: 'Reset link is invalid or has expired.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);

        const updateUser = await supabaseAdmin
            .from('users')
            .update({ password_hash: passwordHash })
            .eq('id', userRecord.id);

        if (updateUser.error) {
            console.error('Password reset update failed', updateUser.error);
            return response.status(500).json({ error: 'Unable to reset password.' });
        }

        const markUsed = await supabaseAdmin
            .from('password_reset_tokens')
            .update({ used_at: new Date().toISOString() })
            .eq('id', tokenRecord.id);

        if (markUsed.error) {
            console.error('Password reset token mark used failed', markUsed.error);
        }

        const cleanup = await supabaseAdmin
            .from('password_reset_tokens')
            .delete()
            .eq('user_id', userRecord.id)
            .neq('id', tokenRecord.id);

        if (cleanup.error) {
            console.error('Password reset token cleanup failed', cleanup.error);
        }

        const user = mapUser(userRecord);
        const sessionToken = await signSession({ userId: user.id, email: user.email, roles: user.roles });
        setSessionCookie(response, sessionToken);

        return response.status(200).json({ user });
    } catch (error) {
        console.error('Unexpected password reset error', error);
        return response.status(500).json({ error: 'Unable to reset password.' });
    }
}
