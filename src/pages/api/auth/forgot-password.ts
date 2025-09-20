import type { NextApiRequest, NextApiResponse } from 'next';
import crypto from 'crypto';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { sendPasswordResetEmail } from '../../../server/users/mailer';

function resolveBaseUrl(): string {
    const candidates = [
        process.env.APP_BASE_URL,
        process.env.NEXT_PUBLIC_APP_BASE_URL,
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.SITE_URL,
        process.env.URL,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.replace(/\/$/, '');
        }
    }

    return 'http://localhost:3000';
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

    const query = await supabaseAdmin
        .from('users')
        .select('id,name,email_verified_at,deactivated_at')
        .eq('email', normalizedEmail)
        .maybeSingle();

    if (query.error) {
        console.error('Failed to start password reset', query.error);
        return response.status(500).json({ error: 'Unable to process request.' });
    }

    if (!query.data) {
        return response.status(200).json({ message: 'If the email exists, reset instructions will arrive shortly.' });
    }

    if (query.data.deactivated_at) {
        return response.status(200).json({ message: 'If the email exists, reset instructions will arrive shortly.' });
    }

    const token = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour

    const update = await supabaseAdmin
        .from('users')
        .update({
            password_reset_token: token,
            password_reset_expires_at: expiresAt.toISOString(),
        })
        .eq('id', query.data.id);

    if (update.error) {
        console.error('Failed to persist password reset token', update.error);
        return response.status(500).json({ error: 'Unable to process request.' });
    }

    const baseUrl = resolveBaseUrl();
    const resetUrl = `${baseUrl}/reset-password?token=${token}`;

    await sendPasswordResetEmail({
        email: normalizedEmail,
        name: query.data.name ?? null,
        resetUrl,
    });

    return response
        .status(200)
        .json({ message: 'If the email exists, reset instructions will arrive shortly.' });
}
