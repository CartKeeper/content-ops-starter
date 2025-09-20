import type { NextApiRequest, NextApiResponse } from 'next';

import { getSupabaseClient, getSupabaseConfig } from '../../../utils/supabase-client';

type MetricsResponse = {
    total: number;
    withEmail: number;
    withPhone: number;
    newLast30?: number;
};

type ErrorResponse = { error: string };

async function fetchMetricsWithGraphql(): Promise<MetricsResponse | null> {
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

    if (payload.errors && payload.errors.length > 0) {
        console.error('GraphQL metrics errors', payload.errors);
        return null;
    }

    if (!payload.data || !payload.data.total) {
        return null;
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

async function fetchMetricsWithRest(): Promise<MetricsResponse | null> {
    const supabase = getSupabaseClient();
    const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: totalCount, error: totalError }, { count: emailCount, error: emailError }, { count: phoneCount, error: phoneError }, recentResult] = await Promise.all([
        supabase.from('contacts').select('id', { head: true, count: 'exact' }),
        supabase.from('contacts').select('id', { head: true, count: 'exact' }).not('email', 'is', null).neq('email', ''),
        supabase.from('contacts').select('id', { head: true, count: 'exact' }).not('phone', 'is', null).neq('phone', ''),
        supabase
            .from('contacts')
            .select('id', { head: true, count: 'exact' })
            .gte('created_at', thirtyDaysAgoIso)
            .then((result) => ({ count: result.count ?? undefined, error: result.error })),
    ]);

    const errors = [totalError, emailError, phoneError, recentResult?.error].filter(Boolean);
    if (errors.length > 0) {
        console.error('REST metrics fallback failed', errors[0]);
        return null;
    }

    const metrics: MetricsResponse = {
        total: totalCount ?? 0,
        withEmail: emailCount ?? 0,
        withPhone: phoneCount ?? 0,
    };

    if (typeof recentResult?.count === 'number') {
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

    try {
        const graphqlMetrics = await fetchMetricsWithGraphql();
        if (graphqlMetrics) {
            res.status(200).json(graphqlMetrics);
            return;
        }

        const restMetrics = await fetchMetricsWithRest();
        if (restMetrics) {
            res.status(200).json(restMetrics);
            return;
        }
    } catch (error) {
        console.error('Unexpected metrics error', error);
    }

    res.status(500).json({ error: 'Unable to load metrics' });
}
