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

    const { email, password, name } = request.body ?? {};

    if (typeof email !== 'string' || typeof password !== 'string' || email.trim().length === 0) {
        return response.status(400).json({ error: 'Email and password are required.' });
    }

    if (password.length < 8) {
        return response.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    const normalizedEmail = email.trim().toLowerCase();

    try {
        const supabase = getSupabaseClient();
        const existing = await supabase
            .from('users')
            .select('id')
            .eq('email', normalizedEmail)
            .maybeSingle();

        if (existing.data) {
            return response.status(409).json({ error: 'An account with that email already exists.' });
        }

        if (existing.error && existing.error.code !== 'PGRST116') {
            console.error('Failed to check existing user', existing.error);
            return response.status(500).json({ error: 'Unable to create user account.' });
        }

        const passwordHash = await bcrypt.hash(password, 12);
        const insert = await supabase
            .from('users')
            .insert({
                email: normalizedEmail,
                password_hash: passwordHash,
                name: typeof name === 'string' ? name.trim() : null,
                roles: ['photographer']
            })
            .select('*')
            .single();

        if (insert.error || !insert.data) {
            console.error('Failed to insert user', insert.error);
            return response.status(500).json({ error: 'Unable to create user account.' });
        }

        const user = mapUser(insert.data);
        const token = signAuthToken({ userId: user.id, email: user.email, roles: user.roles });

        return response.status(201).json({ user, token });
    } catch (error) {
        console.error('Unexpected signup error', error);
        return response.status(500).json({ error: 'Unable to create user account.' });
    }
}
