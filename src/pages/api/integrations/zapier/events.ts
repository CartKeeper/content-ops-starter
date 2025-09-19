import type { NextApiRequest, NextApiResponse } from 'next';

import { getSupabaseClient } from '../../../../../utils/supabase-client';

const ALLOWED_METHODS = ['GET'] as const;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
    if (!ALLOWED_METHODS.includes(req.method as (typeof ALLOWED_METHODS)[number])) {
        res.setHeader('Allow', ALLOWED_METHODS);
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    try {
        const supabase = getSupabaseClient();
        const { data, error } = await supabase
            .from('zapier_webhook_events')
            .select('id, zap_id, event_type, status, received_at, processed_at, error_message, payload')
            .order('received_at', { ascending: false })
            .limit(50);

        if (error) {
            console.error('Failed to load Zapier webhook events', error);
            res.status(500).json({ error: 'Unable to load Zapier webhook events.' });
            return;
        }

        res.status(200).json({ data: data ?? [] });
    } catch (error) {
        console.error('Unhandled Zapier events error', error);
        res.status(500).json({ error: 'Internal server error' });
    }
}
