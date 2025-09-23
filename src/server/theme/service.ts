import { supabaseAdmin } from '../../lib/supabase-admin';
import type { ThemePreferences } from '../../types/theme';
import { createDefaultTheme, mergeThemeValues, sanitizeTheme, type ThemeResponsePayload } from './schema';

export async function resolveWorkspaceIdForUser(userId: string, workspaceId: string | null): Promise<string> {
    if (workspaceId) {
        return workspaceId;
    }

    const { data, error } = await supabaseAdmin
        .from('workspaces')
        .select('id')
        .order('created_at', { ascending: true })
        .limit(1)
        .maybeSingle();

    if (error) {
        throw new Error(`Failed to resolve workspace id: ${error.message}`);
    }

    if (!data?.id) {
        throw new Error('No workspace configured.');
    }

    const resolved = data.id as string;
    await supabaseAdmin.from('users').update({ workspace_id: resolved }).eq('id', userId);
    return resolved;
}

export async function loadWorkspaceTheme(workspaceId: string): Promise<ThemePreferences> {
    const defaultTheme = createDefaultTheme();

    const query = await supabaseAdmin
        .from('workspace_theme_settings')
        .select('theme')
        .eq('workspace_id', workspaceId)
        .maybeSingle();

    if (query.error) {
        throw new Error(`Failed to load workspace theme: ${query.error.message}`);
    }

    if (query.data?.theme) {
        return sanitizeTheme(query.data.theme, defaultTheme);
    }

    const insert = await supabaseAdmin
        .from('workspace_theme_settings')
        .insert({ workspace_id: workspaceId, theme: defaultTheme })
        .select('theme')
        .single();

    if (insert.error || !insert.data) {
        throw new Error(insert.error?.message ?? 'Unable to create workspace theme.');
    }

    return sanitizeTheme(insert.data.theme, defaultTheme);
}

export async function buildThemePayloadForUser(userId: string): Promise<ThemeResponsePayload> {
    const userQuery = await supabaseAdmin
        .from('users')
        .select('workspace_id, theme_prefs')
        .eq('id', userId)
        .maybeSingle();

    if (userQuery.error) {
        throw new Error(`Failed to load theme preferences: ${userQuery.error.message}`);
    }

    if (!userQuery.data) {
        throw new Error('User not found.');
    }

    const workspaceId = await resolveWorkspaceIdForUser(
        userId,
        (userQuery.data.workspace_id as string | null) ?? null,
    );
    const workspaceTheme = await loadWorkspaceTheme(workspaceId);

    const userOverrides = userQuery.data.theme_prefs
        ? sanitizeTheme(userQuery.data.theme_prefs, workspaceTheme)
        : null;

    const theme = mergeThemeValues(workspaceTheme, userOverrides);

    return {
        theme,
        workspaceTheme,
        userOverrides,
        source: userOverrides ? 'user' : 'workspace',
    };
}
