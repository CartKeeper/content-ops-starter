import type { NextApiRequest, NextApiResponse } from 'next';

import { authenticateRequest, extractBearerToken } from '../../../utils/api-auth';
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
    if (request.method !== 'GET') {
        response.setHeader('Allow', 'GET');
        return response.status(405).json({ error: 'Method not allowed' });
    }

    const payload = authenticateRequest(request);
    if (!payload) {
        return response.status(401).json({ error: 'Authentication required.' });
    }

    try {
        const supabase = getSupabaseClient();
        const query = await supabase
            .from('users')
            .select('*')
            .eq('id', payload.userId)
            .maybeSingle();

        if (!query.data) {
            return response.status(401).json({ error: 'User session is invalid.' });
        }

        const user = mapUser(query.data);
        const activeToken = extractBearerToken(request) ?? signAuthToken({
            userId: user.id,
            email: user.email,
            roles: user.roles
        });

        return response.status(200).json({ user, token: activeToken });
    } catch (error) {
        console.error('Failed to load session', error);
        return response.status(500).json({ error: 'Unable to resolve session.' });
    }
}
