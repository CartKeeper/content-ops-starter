import type { NextApiRequest, NextApiResponse } from 'next';

import { getSupabaseClient } from '../../../utils/supabase-client';

type ConvertResponse = {
    data?: unknown;
    error?: string;
};

function parseContactId(body: unknown): string | null {
    if (!body || typeof body !== 'object') {
        return null;
    }

    const payload = body as Record<string, unknown>;
    const direct = payload.contactId ?? payload.contact_id;

    if (typeof direct === 'string') {
        const trimmed = direct.trim();
        return trimmed.length > 0 ? trimmed : null;
    }

    return null;
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<ConvertResponse>) {
    if (req.method !== 'POST') {
        res.setHeader('Allow', 'POST');
        return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
    }

    const contactId = parseContactId(req.body);

    if (!contactId) {
        return res.status(400).json({ error: 'contactId is required' });
    }

    let supabase;

    try {
        supabase = getSupabaseClient();
    } catch (error) {
        console.error('Supabase configuration error', error);
        return res
            .status(503)
            .json({ error: 'Supabase is not configured. Set SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY env vars.' });
    }

    const { data, error } = await supabase.functions.invoke('convert_contact_to_client', {
        body: { contact_id: contactId }
    });

    if (error) {
        const status = typeof error.status === 'number' ? error.status : error.message === 'Contact already a Client' ? 409 : 400;
        return res.status(status).json({ error: error.message ?? 'Failed to convert contact' });
    }

    if (!data) {
        return res.status(502).json({ error: 'Supabase function did not return a payload' });
    }

    return res.status(200).json({ data });
}
