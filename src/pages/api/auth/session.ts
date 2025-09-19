import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { signSession, verifySession } from '../../../lib/jwt';
import { clearSessionCookie, readSessionCookie, setSessionCookie } from '../../../lib/session-cookie';
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
            .select('id,email,name,roles,created_at')
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

        const user = mapUser(query.data);
        const refreshedToken = await signSession({
            userId: user.id,
            email: user.email,
            roles: user.roles
        });

        setSessionCookie(response, refreshedToken);

        return response.status(200).json({ user });
    } catch (error) {
        console.error('Failed to load session', error);
        clearSessionCookie(response);
        return response.status(401).json({ error: 'Authentication required.' });
    }
}
