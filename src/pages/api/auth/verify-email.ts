import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '../../../lib/supabase-admin';

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const token = typeof request.query.token === 'string' ? request.query.token.trim() : null;

    if (!token) {
        return response.status(400).json({ error: 'Verification token is required.' });
    }

    const query = await supabaseAdmin
        .from('users')
        .select('id,verification_expires_at,email_verified_at,deactivated_at,status')
        .eq('verification_token', token)
        .maybeSingle();

    if (query.error) {
        console.error('Failed to load verification token', query.error);
        return response.status(500).json({ error: 'Unable to verify email.' });
    }

    if (!query.data) {
        return response.status(404).json({ error: 'Verification link is invalid or has already been used.' });
    }

    const expiresAt = query.data.verification_expires_at
        ? new Date(query.data.verification_expires_at)
        : null;

    if (expiresAt && Date.now() > expiresAt.getTime()) {
        return response.status(410).json({ error: 'Verification link has expired. Request a new invitation.' });
    }

    if (query.data.deactivated_at) {
        return response
            .status(403)
            .json({ error: 'This account is deactivated. Contact an administrator for assistance.' });
    }

    if (query.data.email_verified_at) {
        return response.status(200).json({ message: 'Email already verified.' });
    }

    const update = await supabaseAdmin
        .from('users')
        .update({
            email_verified_at: new Date().toISOString(),
            verification_token: null,
            verification_expires_at: null,
            status: query.data.status ?? 'active',
        })
        .eq('id', query.data.id)
        .select('id,email_verified_at,status')
        .single();

    if (update.error) {
        console.error('Failed to update verification status', update.error);
        return response.status(500).json({ error: 'Unable to verify email.' });
    }

    return response.status(200).json({ message: 'Email verified. You can sign in with your temporary password.' });
}
