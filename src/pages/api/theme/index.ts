import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticateRequest } from '../../../utils/api-auth';
import type { ThemePreferences } from '../../../types/theme';
import {
    ThemePreferencesSchema,
    createDefaultTheme,
    type ThemeResponsePayload,
} from '../../../server/theme/schema';
import { buildThemePayloadForUser } from '../../../server/theme/service';

const PutRequestSchema = z.union([
    z.object({ useWorkspaceDefault: z.literal(true) }),
    z.object({ useWorkspaceDefault: z.literal(false), prefs: ThemePreferencesSchema }),
    z.object({ theme_prefs: ThemePreferencesSchema.nullable() }),
]);

function cloneTheme(theme: ThemePreferences): ThemePreferences {
    return {
        ...theme,
        background: { ...theme.background },
        outline: { ...theme.outline },
    };
}

function createAnonymousThemePayload(): ThemeResponsePayload {
    const base = createDefaultTheme();
    const systemTheme: ThemePreferences = {
        ...base,
        mode: 'system',
        background: { ...base.background },
        outline: { ...base.outline },
    };

    const workspaceTheme = cloneTheme(systemTheme);
    const theme = cloneTheme(systemTheme);

    return {
        theme,
        workspaceTheme,
        userOverrides: null,
        source: 'workspace',
    };
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    const session = await authenticateRequest(request);

    if (request.method === 'GET') {
        if (!session) {
            return response.status(200).json(createAnonymousThemePayload());
        }

        try {
            const payload = await buildThemePayloadForUser(session.userId);
            return response.status(200).json(payload);
        } catch (error) {
            console.error('Failed to load theme preferences', error);
            return response.status(200).json(createAnonymousThemePayload());
        }
    }

    if (!session) {
        return response.status(401).json({ error: 'Authentication required.' });
    }

    if (request.method === 'PUT') {
        const parsed = PutRequestSchema.safeParse(request.body ?? {});
        if (!parsed.success) {
            return response.status(400).json({ error: 'Invalid theme payload.' });
        }

        try {
            if ('theme_prefs' in parsed.data) {
                const prefs = parsed.data.theme_prefs ?? null;
                await supabaseAdmin.from('users').update({ theme_prefs: prefs }).eq('id', session.userId);
            } else if ('useWorkspaceDefault' in parsed.data) {
                if (parsed.data.useWorkspaceDefault) {
                    await supabaseAdmin.from('users').update({ theme_prefs: null }).eq('id', session.userId);
                } else if ('prefs' in parsed.data) {
                    await supabaseAdmin
                        .from('users')
                        .update({ theme_prefs: parsed.data.prefs })
                        .eq('id', session.userId);
                }
            }

            const payload = await buildThemePayloadForUser(session.userId);
            return response.status(200).json(payload);
        } catch (error) {
            console.error('Failed to update theme preferences', error);
            return response.status(500).json({ error: 'Unable to update theme preferences.' });
        }
    }

    response.setHeader('Allow', 'GET, PUT');
    return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
}
