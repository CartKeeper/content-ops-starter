import type { NextApiRequest, NextApiResponse } from 'next';

import { readContactsFromDisk } from '../../../server/contacts/local-store';
import { getSupabaseClient } from '../../../utils/supabase-client';

type MetricsResponse = {
    total: number;
    withEmail: number;
    withPhone: number;
    newLast30: number;
};

type ErrorResponse = { error: string };

function isSupabaseAvailable(): boolean {
    try {
        getSupabaseClient();
        return true;
    } catch (error) {
        return false;
    }
}

async function handleLocal(_: NextApiRequest, res: NextApiResponse<MetricsResponse | ErrorResponse>) {
    const records = await readContactsFromDisk();
    const now = Date.now();
    const thirtyDaysAgo = now - 30 * 24 * 60 * 60 * 1000;

    const total = records.length;
    const withEmail = records.filter((record) => Boolean(record.email && record.email.trim())).length;
    const withPhone = records.filter((record) => Boolean(record.phone && record.phone.trim())).length;
    const newLast30 = records.filter((record) => {
        const created = record.created_at ? Date.parse(record.created_at) : Number.NaN;
        return Number.isFinite(created) && created >= thirtyDaysAgo;
    }).length;

    res.status(200).json({ total, withEmail, withPhone, newLast30 });
}

async function handleSupabase(_: NextApiRequest, res: NextApiResponse<MetricsResponse | ErrorResponse>) {
    const supabase = getSupabaseClient();
    const now = Date.now();
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000).toISOString();

    const [{ count: totalCount, error: totalError }, { count: emailCount, error: emailError }, { count: phoneCount, error: phoneError }, { count: recentCount, error: recentError }] = await Promise.all([
        supabase.from('contacts').select('id', { head: true, count: 'exact' }),
        supabase.from('contacts').select('id', { head: true, count: 'exact' }).not('email', 'is', null).neq('email', ''),
        supabase.from('contacts').select('id', { head: true, count: 'exact' }).not('phone', 'is', null).neq('phone', ''),
        supabase.from('contacts').select('id', { head: true, count: 'exact' }).gte('created_at', thirtyDaysAgo),
    ]);

    const errors = [totalError, emailError, phoneError, recentError].filter(Boolean);
    if (errors.length > 0) {
        console.error('Failed to load contact metrics from Supabase', errors[0]);
        res.status(500).json({ error: 'Unable to load metrics' });
        return;
    }

    res.status(200).json({
        total: totalCount ?? 0,
        withEmail: emailCount ?? 0,
        withPhone: phoneCount ?? 0,
        newLast30: recentCount ?? 0,
    });
}

export default async function handler(req: NextApiRequest, res: NextApiResponse<MetricsResponse | ErrorResponse>) {
    if (req.method !== 'GET') {
        res.setHeader('Allow', 'GET');
        res.status(405).json({ error: `Method ${req.method} Not Allowed` });
        return;
    }

    res.setHeader('Content-Type', 'application/json');

    if (isSupabaseAvailable()) {
        await handleSupabase(req, res);
    } else {
        await handleLocal(req, res);
    }
}
