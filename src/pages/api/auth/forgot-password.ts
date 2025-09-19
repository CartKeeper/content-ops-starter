import crypto from 'crypto';
import type { NextApiRequest, NextApiResponse } from 'next';

import { getAppBaseUrl } from '../../../lib/app-base-url';
import { supabaseAdmin } from '../../../lib/supabase-admin';
import { logPasswordResetEmail } from '../../../server/auth/password-reset-mailer';

const RESET_TOKEN_TTL_MINUTES = 60;

function buildResetUrl(token: string): string {
    const baseUrl = getAppBaseUrl();
    const url = new URL('/reset-password', baseUrl);
    url.searchParams.set('token', token);
    return url.toString();
}

function successResponse(response: NextApiResponse) {
    return response.status(200).json({ message: 'If an account exists for that email, a reset link has been sent.' });
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    if (request.method !== 'POST') {
        response.setHeader('Allow', 'POST');
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const { email } = request.body ?? {};

    if (typeof email !== 'string' || email.trim().length === 0) {
        return response.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const query = await supabaseAdmin
            .from('users')
            .select('id,email,name')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (query.error) {
            console.error('Password reset lookup failed', query.error);
            return response.status(500).json({ error: 'Unable to start password reset.' });
        }

        if (!query.data) {
            return successResponse(response);
        }

        const user = query.data;
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
        const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000).toISOString();

        const cleanup = await supabaseAdmin.from('password_reset_tokens').delete().eq('user_id', user.id);
        if (cleanup.error) {
            console.error('Password reset token cleanup failed', cleanup.error);
        }

        const insert = await supabaseAdmin
            .from('password_reset_tokens')
            .insert({
                user_id: user.id,
                token_hash: tokenHash,
                expires_at: expiresAt
            });

        if (insert.error) {
            console.error('Password reset token insert failed', insert.error);
            return response.status(500).json({ error: 'Unable to start password reset.' });
        }

        await logPasswordResetEmail({
            email: user.email,
            name: user.name ?? null,
            resetUrl: buildResetUrl(token),
            expiresAt
        });

        return successResponse(response);
    } catch (error) {
        console.error('Unexpected password reset request error', error);
        return response.status(500).json({ error: 'Unable to start password reset.' });
    }
}
