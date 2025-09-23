import type { NextApiRequest, NextApiResponse } from 'next';
import { z } from 'zod';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { authenticateRequest } from '../../../utils/api-auth';
import { ThemePreferencesSchema, createDefaultTheme } from '../../../server/theme/schema';
import { loadWorkspaceTheme, resolveWorkspaceIdForUser } from '../../../server/theme/service';

const WorkspaceThemeSchema = z.object({ theme: ThemePreferencesSchema });

async function resolveWorkspaceIdForSession(userId: string): Promise<string> {
    const userQuery = await supabaseAdmin
        .from('users')
        .select('workspace_id')
        .eq('id', userId)
        .maybeSingle();

    if (userQuery.error) {
        throw new Error(`Failed to load workspace for user: ${userQuery.error.message}`);
    }

    return await resolveWorkspaceIdForUser(userId, (userQuery.data?.workspace_id as string | null) ?? null);
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    const session = await authenticateRequest(request);

    if (!session) {
        return response.status(401).json({ error: 'Authentication required.' });
    }

    if (session.role !== 'admin' && !session.permissions.canEditSettings) {
        return response.status(403).json({ error: 'You do not have permission to manage workspace themes.' });
    }

    try {
        const workspaceId = await resolveWorkspaceIdForSession(session.userId);

        if (request.method === 'GET') {
            const theme = await loadWorkspaceTheme(workspaceId);
            return response.status(200).json({ workspaceId, theme });
        }

        if (request.method === 'PUT') {
            const parsed = WorkspaceThemeSchema.safeParse(request.body ?? {});
            if (!parsed.success) {
                return response.status(400).json({ error: 'Invalid theme payload.' });
            }

            const update = await supabaseAdmin
                .from('workspace_theme_settings')
                .upsert({ workspace_id: workspaceId, theme: parsed.data.theme }, { onConflict: 'workspace_id' })
                .select('theme')
                .single();

            if (update.error || !update.data) {
                throw new Error(update.error?.message ?? 'Unable to update workspace theme.');
            }

            const theme = ThemePreferencesSchema.parse(update.data.theme ?? createDefaultTheme());
            return response.status(200).json({ workspaceId, theme });
        }

        response.setHeader('Allow', 'GET, PUT');
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    } catch (error) {
        console.error('Workspace theme error', error);
        return response.status(500).json({ error: 'Workspace theme operation failed.' });
    }
}
