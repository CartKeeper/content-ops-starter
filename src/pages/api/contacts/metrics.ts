import type { NextApiRequest, NextApiResponse } from 'next';

import type { PostgrestError } from '@supabase/supabase-js';

import type { SessionPayload } from '../../../lib/jwt';
import { authenticateRequest } from '../../../utils/api-auth';
import { getSupabaseClient, getSupabaseConfig } from '../../../utils/supabase-client';

type MetricsResponse = {
    total: number;
    withEmail: number;
    withPhone: number;
    newLast30?: number;
};

type ErrorResponse = { error: string };

async function fetchMetricsWithGraphql(session: SessionPayload): Promise<MetricsResponse | null> {
    const canViewAll = session.role === 'admin' || session.permissions.canManageUsers;

    if (!canViewAll) {
        return null;
    }

    let config;
    try {
        config = getSupabaseConfig();
    } catch (error) {
        console.error('Supabase configuration missing for metrics', error);
        return null;
    }

    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const response = await fetch(`${config.url}/graphql/v1`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            apikey: config.key,
            Authorization: `Bearer ${config.key}`,
        },
        body: JSON.stringify({
            query: `query ContactMetrics($recentDate: timestamptz!) {
  total: contactsCollection {
    totalCount
  }
  withEmail: contactsCollection(filter: { email: { isNull: false, notEqualTo: "" } }) {
    totalCount
  }
  withPhone: contactsCollection(filter: { phone: { isNull: false, notEqualTo: "" } }) {
    totalCount
  }
  newLast30: contactsCollection(filter: { created_at: { greaterThanOrEqualTo: $recentDate } }) {
    totalCount
  }
}`,
            variables: { recentDate: thirtyDaysAgoIso },
        }),
    });

    if (!response.ok) {
        console.error('GraphQL metrics request failed', await response.text());
        return null;
    }

    const payload = (await response.json()) as {
        data?: {
            total?: { totalCount: number } | null;
            withEmail?: { totalCount: number } | null;
            withPhone?: { totalCount: number } | null;
            newLast30?: { totalCount: number } | null;
        };
        errors?: Array<{ message?: string }>;
    };

    if (!payload.data || !payload.data.total) {
        if (payload.errors && payload.errors.length > 0) {
            console.error('GraphQL metrics errors', payload.errors);
        }
        return null;
    }

    const errors = payload.errors ?? [];
    const createdAtMissing = errors.some((error) =>
        typeof error.message === 'string' && error.message.toLowerCase().includes('created_at')
    );

    if (errors.length > 0 && !createdAtMissing) {
        console.error('GraphQL metrics errors', errors);
        return null;
    }

    if (errors.length > 0 && createdAtMissing) {
        console.warn('Created_at column missing; omitting recent-contact metric');
    }

    const result: MetricsResponse = {
        total: payload.data.total?.totalCount ?? 0,
        withEmail: payload.data.withEmail?.totalCount ?? 0,
        withPhone: payload.data.withPhone?.totalCount ?? 0,
    };

    const recentCount = payload.data.newLast30?.totalCount;
    if (typeof recentCount === 'number') {
        result.newLast30 = recentCount;
    }

    return result;
}

async function fetchMetricsWithRest(session: SessionPayload): Promise<MetricsResponse | null> {
    const supabase = getSupabaseClient();
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const baseFilter = (query: ReturnType<typeof supabase['from']>) => {
        const canViewAll = session.role === 'admin' || session.permissions.canManageUsers;
        return canViewAll ? query : query.eq('owner_user_id', session.userId);
    };

    const [totalResult, emailResult, phoneResult, recentResult] = await Promise.all([
        baseFilter(supabase.from('contacts')).select('id', { head: true, count: 'exact' }),
        baseFilter(supabase.from('contacts')).select('id', { head: true, count: 'exact' }).not('email', 'is', null).neq('email', ''),
        baseFilter(supabase.from('contacts')).select('id', { head: true, count: 'exact' }).not('phone', 'is', null).neq('phone', ''),
        baseFilter(supabase.from('contacts')).select('id', { head: true, count: 'exact' }).gte('created_at', thirtyDaysAgoIso),
    ]);

    const metrics: MetricsResponse = {
        total: totalResult.count ?? 0,
        withEmail: emailResult.count ?? 0,
        withPhone: phoneResult.count ?? 0,
    };

    const listErrors = [totalResult.error, emailResult.error, phoneResult.error].filter(Boolean);
    if (listErrors.length > 0) {
        console.error('REST metrics fallback failed', listErrors[0]);
        return null;
    }

    if (recentResult.error) {
        const recentError = recentResult.error as PostgrestError;
        const message = typeof recentError.message === 'string' ? recentError.message.toLowerCase() : '';
        const missingCreatedAt = recentError.code === '42703' || message.includes('created_at');
        if (!missingCreatedAt) {
            console.error('REST metrics fallback failed', recentError);
            return null;
        }
    } else if (typeof recentResult.count === 'number') {
        metrics.newLast30 = recentResult.count;
    }

    return metrics;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<MetricsResponse | ErrorResponse>) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    res.setHeader('Content-Type', 'application/json');

    const session = await authenticateRequest(req);
    if (!session) {
        res.status(401).json({ error: 'Authentication required.' });
        return;
    }

    if (!session.emailVerified) {
        res.status(403).json({ error: 'Verify your email to access metrics.' });
        return;
    }

    try {
        const graphqlMetrics = await fetchMetricsWithGraphql(session);
        if (graphqlMetrics) {
            res.status(200).json(graphqlMetrics);
            return;
        }

        const restMetrics = await fetchMetricsWithRest(session);
        if (restMetrics) {
            res.status(200).json(restMetrics);
            return;
        }
    } catch (error) {
        console.error('Unexpected metrics error', error);
    }

    res.status(500).json({ error: 'Unable to load metrics' });
}
