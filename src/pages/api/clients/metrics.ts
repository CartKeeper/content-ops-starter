import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '../../../lib/supabase-admin';

type MetricsResponse = {
    activeCount: number;
    outstandingCents: number;
    upcomingCount60d: number;
    portalReadyCount: number;
};

export default async function handler(req: NextApiRequest, res: NextApiResponse<MetricsResponse | { error: string }>) {
    res.setHeader('Content-Type', 'application/json');

    if (req.method !== 'GET') {
        res.setHeader('Allow', ['GET']);
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const { data, error } = await supabaseAdmin.rpc('get_client_metrics');

    if (error) {
        console.error('Failed to load client metrics', error);
        return res.status(500).json({ error: error.message ?? 'Failed to load metrics' });
    }

    const metrics = Array.isArray(data) ? data[0] : data;

    return res.status(200).json({
        activeCount: Number(metrics?.active_count ?? 0),
        outstandingCents: Number(metrics?.outstanding_cents ?? 0),
        upcomingCount60d: Number(metrics?.upcoming_count_60d ?? 0),
        portalReadyCount: Number(metrics?.portal_ready_count ?? 0)
    });
}
