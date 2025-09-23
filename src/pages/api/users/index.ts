import type { NextApiRequest, NextApiResponse } from 'next';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import { sendUserInvitationEmail } from '../../../server/users/mailer';
import type { ThemePreferences } from '../../../types/theme';
import type { UserPermissions, UserRole } from '../../../types/user';
import { authenticateRequest } from '../../../utils/api-auth';
import {
    buildRolesArray,
    mapPermissionsInput,
    mapUserRecord,
    toDatabasePermissions,
} from '../../../server/users/helpers';
import { ThemePreferencesSchema } from '../../../server/theme/schema';
import { resolveWorkspaceIdForUser } from '../../../server/theme/service';

function resolveBaseUrl(): string {
    const candidates = [
        process.env.APP_BASE_URL,
        process.env.NEXT_PUBLIC_APP_BASE_URL,
        process.env.NEXT_PUBLIC_SITE_URL,
        process.env.SITE_URL,
        process.env.URL,
    ];

    for (const candidate of candidates) {
        if (typeof candidate === 'string' && candidate.trim().length > 0) {
            return candidate.replace(/\/$/, '');
        }
    }

    return 'http://localhost:3000';
}

async function listUsers(response: NextApiResponse) {
    const query = await supabaseAdmin
        .from('users')
        .select(
            'id,email,name,roles,role,permissions,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,deactivated_at,last_login_at,invitation_sent_at'
        )
        .order('created_at', { ascending: true });

    if (query.error) {
        console.error('Failed to load users', query.error);
        return response.status(500).json({ error: 'Unable to load users.' });
    }

    const users = (query.data ?? []).map(mapUserRecord);
    return response.status(200).json({ users });
}

async function createUser(
    request: NextApiRequest,
    response: NextApiResponse,
    actorEmail: string,
    actorUserId: string,
) {
    const { email, name, role, permissions: rawPermissions, theme: rawTheme } = request.body ?? {};

    if (typeof email !== 'string' || email.trim().length === 0) {
        return response.status(400).json({ error: 'Email is required.' });
    }

    const normalizedEmail = email.trim().toLowerCase();
    const safeName = typeof name === 'string' && name.trim().length > 0 ? name.trim() : null;

    const normalizedRole: UserRole = role === 'admin' || role === 'restricted' ? role : 'standard';
    const permissionsInput = mapPermissionsInput(rawPermissions);
    const permissions: UserPermissions =
        normalizedRole === 'admin'
            ? {
                  canManageUsers: true,
                  canEditSettings: true,
                  canViewGalleries: true,
                  canManageIntegrations: true,
                  canManageCalendar: true,
              }
            : normalizedRole === 'restricted'
              ? {
                    canManageUsers: false,
                    canEditSettings: false,
                    canViewGalleries: Boolean(permissionsInput.canViewGalleries),
                    canManageIntegrations: false,
                    canManageCalendar: Boolean(permissionsInput.canManageCalendar),
                }
              : permissionsInput;

    const actorWorkspaceQuery = await supabaseAdmin
        .from('users')
        .select('workspace_id')
        .eq('id', actorUserId)
        .maybeSingle();

    if (actorWorkspaceQuery.error) {
        console.error('Failed to resolve workspace for creator', actorWorkspaceQuery.error);
        return response.status(500).json({ error: 'Unable to determine workspace for new user.' });
    }

    let workspaceId: string;
    try {
        workspaceId = await resolveWorkspaceIdForUser(
            actorUserId,
            (actorWorkspaceQuery.data?.workspace_id as string | null) ?? null,
        );
    } catch (workspaceError) {
        console.error('Failed to resolve workspace id', workspaceError);
        return response.status(500).json({ error: 'Unable to determine workspace for new user.' });
    }

    let themePrefs: ThemePreferences | null = null;
    if (rawTheme && typeof rawTheme === 'object') {
        const useDefault = rawTheme.useWorkspaceDefault;

        if (useDefault === false) {
            const parsedTheme = ThemePreferencesSchema.safeParse(rawTheme.prefs ?? {});
            if (!parsedTheme.success) {
                return response.status(400).json({ error: 'Invalid theme selection provided.' });
            }
            themePrefs = parsedTheme.data;
        } else if ('theme_prefs' in rawTheme) {
            const parsedTheme = ThemePreferencesSchema.safeParse(rawTheme.theme_prefs ?? {});
            if (!parsedTheme.success) {
                return response.status(400).json({ error: 'Invalid theme selection provided.' });
            }
            themePrefs = parsedTheme.data;
        }
    }

    const temporaryPassword = crypto.randomBytes(12).toString('base64url');
    const passwordHash = await bcrypt.hash(temporaryPassword, 12);
    const verificationToken = crypto.randomBytes(24).toString('hex');
    const expiresAt = new Date(Date.now() + 72 * 60 * 60 * 1000);
    const nowIso = new Date().toISOString();

    const insert = await supabaseAdmin
        .from('users')
        .insert({
            email: normalizedEmail,
            name: safeName,
            roles: buildRolesArray(normalizedRole),
            role: normalizedRole,
            permissions: toDatabasePermissions(permissions),
            password_hash: passwordHash,
            status: 'invited',
            verification_token: verificationToken,
            verification_expires_at: expiresAt.toISOString(),
            invitation_sent_at: nowIso,
            email_verified_at: null,
            workspace_id: workspaceId,
            theme_prefs: themePrefs,
        })
        .select(
            'id,email,name,roles,role,permissions,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,deactivated_at,last_login_at,invitation_sent_at'
        )
        .single();

    if (insert.error || !insert.data) {
        if (insert.error?.code === '23505') {
            return response.status(409).json({ error: 'A user with that email already exists.' });
        }

        console.error('Failed to create user', insert.error);
        return response.status(500).json({ error: 'Unable to create user.' });
    }

    const userId = insert.data.id as string;

    try {
        const calendar = await supabaseAdmin
            .from('user_calendars')
            .insert({ owner_user_id: userId })
            .select('id')
            .single();

        if (calendar.data?.id) {
            await supabaseAdmin.from('users').update({ calendar_id: calendar.data.id }).eq('id', userId);
        }
    } catch (calendarError) {
        console.warn('Failed to create dedicated calendar', calendarError);
    }

    const baseUrl = resolveBaseUrl();
    const verificationUrl = `${baseUrl}/verify-email?token=${verificationToken}`;

    await sendUserInvitationEmail({
        email: normalizedEmail,
        name: safeName,
        temporaryPassword,
        verificationUrl,
        invitedBy: actorEmail,
    });

    return response.status(201).json({ user: mapUserRecord(insert.data) });
}

export default async function handler(request: NextApiRequest, response: NextApiResponse) {
    const session = await authenticateRequest(request);
    if (!session) {
        return response.status(401).json({ error: 'Authentication required.' });
    }

    if (!session.emailVerified) {
        return response.status(403).json({ error: 'Verify your email before managing users.' });
    }

    const canManageUsers = session.role === 'admin' || session.permissions.canManageUsers;
    if (!canManageUsers) {
        return response.status(403).json({ error: 'You do not have permission to manage users.' });
    }

    if (request.method === 'GET') {
        return listUsers(response);
    }

    if (request.method === 'POST') {
        return createUser(request, response, session.email, session.userId);
    }

    response.setHeader('Allow', 'GET, POST');
    return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
}
