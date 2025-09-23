import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { supabaseAdmin } from '../../lib/supabase-admin';
import { authenticateRequest } from '../../utils/api-auth';

const DashboardPrefsSchema = z
    .object({
        viewMode: z.enum(['overview', 'revenue', 'client']).optional(),
        cardOrder: z.record(z.string(), z.array(z.string())).optional(),
    })
    .partial();

const UiPrefsSchema = z
    .object({
        dashboard: DashboardPrefsSchema.optional(),
    })
    .partial();

type UiPrefs = z.infer<typeof UiPrefsSchema>;

type UiPrefsResponse = {
    uiPrefs: UiPrefs;
};

function sanitizePrefs(input: unknown): UiPrefs {
    const result = UiPrefsSchema.safeParse(input ?? {});
    if (result.success) {
        return result.data;
    }
    return {};
}

function mergePrefs(current: UiPrefs, updates: UiPrefs): UiPrefs {
    const merged: UiPrefs = { ...current };
    if (updates.dashboard) {
        merged.dashboard = {
            ...(current.dashboard ?? {}),
            ...updates.dashboard,
        };
    }
    return merged;
}

export default async function handler(request: NextApiRequest, response: NextApiResponse<UiPrefsResponse | { error: string }>) {
    const session = await authenticateRequest(request);

    if (!session) {
        return response.status(401).json({ error: 'Authentication required.' });
    }

    if (request.method === 'GET') {
        try {
            const query = await supabaseAdmin
                .from('users')
                .select('ui_prefs')
                .eq('id', session.userId)
                .maybeSingle();

            if (query.error) {
                throw query.error;
            }

            const uiPrefs = sanitizePrefs(query.data?.ui_prefs ?? {});
            return response.status(200).json({ uiPrefs });
        } catch (error) {
            console.error('Failed to load UI preferences', error);
            return response.status(500).json({ error: 'Unable to load UI preferences.' });
        }
    }

    if (request.method === 'PUT') {
        const parsed = UiPrefsSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
            return response.status(400).json({ error: 'Invalid preference payload.' });
        }

        try {
            const existingQuery = await supabaseAdmin
                .from('users')
                .select('ui_prefs')
                .eq('id', session.userId)
                .maybeSingle();

            if (existingQuery.error) {
                throw existingQuery.error;
            }

            const existingPrefs = sanitizePrefs(existingQuery.data?.ui_prefs ?? {});
            const merged = mergePrefs(existingPrefs, parsed.data);

            const update = await supabaseAdmin
                .from('users')
                .update({ ui_prefs: merged })
                .eq('id', session.userId)
                .select('ui_prefs')
                .single();

            if (update.error) {
                throw update.error;
            }

            const uiPrefs = sanitizePrefs(update.data?.ui_prefs ?? merged);
            return response.status(200).json({ uiPrefs });
        } catch (error) {
            console.error('Failed to update UI preferences', error);
            return response.status(500).json({ error: 'Unable to update UI preferences.' });
        }
    }

    response.setHeader('Allow', 'GET, PUT');
    return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
}
