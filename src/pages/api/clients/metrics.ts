import type { NextApiRequest, NextApiResponse } from 'next';

import {
    SupabaseAdminUnavailableError,
    isSupabaseConfigured,
    supabaseAdmin
} from '../../../lib/supabase-admin';

type MetricsResponse = {
    activeCount: number;
    outstandingCents: number;
    upcomingCount60d: number;
    portalReadyCount: number;
    error?: string;
};

const EMPTY_METRICS: MetricsResponse = {
    activeCount: 0,
    outstandingCents: 0,
    upcomingCount60d: 0,
    portalReadyCount: 0
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<MetricsResponse>) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({
            ...EMPTY_METRICS,
            error: `Method ${req.method} Not Allowed`
        });
    }

    if (!isSupabaseConfigured) {
        return res.status(200).json({
            ...EMPTY_METRICS,
            error: 'Supabase admin client is not configured.'
        });
    }

    try {
        const { data, error } = await supabaseAdmin.rpc('get_client_metrics');

        if (error) {
            throw new Error(error.message ?? 'Failed to load metrics');
        }

        const metrics = Array.isArray(data) ? data?.[0] : data;

        return res.status(200).json({
            activeCount: Number(metrics?.active_count ?? 0),
            outstandingCents: Number(metrics?.outstanding_cents ?? 0),
            upcomingCount60d: Number(metrics?.upcoming_count_60d ?? 0),
            portalReadyCount: Number(metrics?.portal_ready_count ?? 0)
        });
    } catch (error: unknown) {
        const message =
            error instanceof SupabaseAdminUnavailableError
                ? error.message
                : error instanceof Error
                  ? error.message
                  : 'Failed to load metrics';

        if (!(error instanceof SupabaseAdminUnavailableError)) {
            console.error('Failed to load client metrics', error);
        }

        const status = error instanceof SupabaseAdminUnavailableError ? 200 : 500;

        return res.status(status).json({
            ...EMPTY_METRICS,
            error: message
        });
    }
}
