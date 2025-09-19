import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';

import { getSupabaseClient } from '../../../utils/supabase-client';
import { signAuthToken } from '../../../utils/auth-token';
import type { AuthUser } from '../../../types/auth';

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

    const { email, password } = request.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string') {
        return response.status(400).json({ error: 'Email and password are required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const supabase = getSupabaseClient();
        const query = await supabase
            .from('users')
            .select('*')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (!query.data) {
            return response.status(401).json({ error: 'Invalid email or password.' });
        }

        const userRecord = query.data;
        const passwordHash: string | null = userRecord.password_hash ?? null;

        if (!passwordHash) {
            return response.status(401).json({ error: 'Invalid email or password.' });
        }

        const matches = await bcrypt.compare(password, passwordHash);
        if (!matches) {
            return response.status(401).json({ error: 'Invalid email or password.' });
        }

        const user = mapUser(userRecord);
        const token = signAuthToken({ userId: user.id, email: user.email, roles: user.roles });

        return response.status(200).json({ user, token });
    } catch (error) {
        console.error('Unexpected login error', error);
        return response.status(500).json({ error: 'Unable to log in.' });
    }
}
