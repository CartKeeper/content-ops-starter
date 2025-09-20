import type { NextApiRequest, NextApiResponse } from 'next';

import { supabaseAdmin } from '../../../lib/supabase-admin';
import type { ManagedUserRecord, UserPermissions, UserRole } from '../../../types/user';
import { authenticateRequest } from '../../../utils/api-auth';
import {
    buildRolesArray,
    mapPermissionsInput,
    mapUserRecord,
    toDatabasePermissions,
} from '../../../server/users/helpers';

function sanitizeOptionalString(value: unknown): string | null | undefined {
    if (value === undefined) {
        return undefined;
    }

    if (value === null) {
        return null;
    }

    if (typeof value !== 'string') {
        return undefined;
    }

    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
}

async function ensureAnotherAdminExists(currentUserId: string): Promise<boolean> {
    const query = await supabaseAdmin
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'admin')
        .is('deactivated_at', null)
        .neq('id', currentUserId);

    if (query.error) {
        console.error('Failed to validate admin count', query.error);
        return false;
    }

    const count = typeof query.count === 'number' ? query.count : 0;
    return count > 0;
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

    if (request.method !== 'PUT') {
        response.setHeader('Allow', 'PUT');
        return response.status(405).json({ error: `Method ${request.method} Not Allowed` });
    }

    const { id } = request.query;
    const userId = typeof id === 'string' ? id : Array.isArray(id) ? id[0] : null;

    if (!userId) {
        return response.status(400).json({ error: 'User ID is required.' });
    }

    const existingQuery = await supabaseAdmin
        .from('users')
        .select(
            'id,email,name,roles,role,permissions,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,deactivated_at,last_login_at,invitation_sent_at'
        )
        .eq('id', userId)
        .maybeSingle();

    if (existingQuery.error) {
        console.error('Failed to load user', existingQuery.error);
        return response.status(500).json({ error: 'Unable to load user.' });
    }

    if (!existingQuery.data) {
        return response.status(404).json({ error: 'User not found.' });
    }

    const existing = mapUserRecord(existingQuery.data);

    const {
        name,
        role,
        permissions: rawPermissions,
        status,
        active,
    } = request.body ?? {};

    const updates: Record<string, unknown> = {};

    const safeName = sanitizeOptionalString(name);
    if (name !== undefined) {
        updates.name = safeName ?? null;
    }

    const safeStatus = sanitizeOptionalString(status);
    if (status !== undefined) {
        updates.status = safeStatus ?? null;
    }

    let targetRole: UserRole | undefined;
    if (role !== undefined) {
        if (role !== 'admin' && role !== 'standard' && role !== 'restricted') {
            return response.status(400).json({ error: 'Invalid role selection.' });
        }
        targetRole = role;
    }

    let permissions: UserPermissions | undefined;
    if (rawPermissions !== undefined) {
        permissions = mapPermissionsInput(rawPermissions);
    }

    if (targetRole) {
        updates.role = targetRole;
        updates.roles = buildRolesArray(targetRole);

        if (targetRole === 'admin') {
            permissions = {
                canManageUsers: true,
                canEditSettings: true,
                canViewGalleries: true,
                canManageIntegrations: true,
                canManageCalendar: true,
            };
        } else if (!permissions) {
            permissions = mapPermissionsInput(existing.permissions);
        }
    }

    if (permissions) {
        updates.permissions = toDatabasePermissions(permissions);
    }

    if (active !== undefined) {
        if (typeof active !== 'boolean') {
            return response.status(400).json({ error: 'Active flag must be a boolean.' });
        }
        updates.deactivated_at = active ? null : new Date().toISOString();
    }

    const removingAdminRole =
        (existing.role === 'admin' || existing.roles.includes('admin')) &&
        ((targetRole && targetRole !== 'admin') || (active === false));

    if (removingAdminRole) {
        const hasBackup = await ensureAnotherAdminExists(existing.id);
        if (!hasBackup) {
            return response
                .status(400)
                .json({ error: 'You must keep at least one active admin in the workspace.' });
        }
    }

    if (Object.keys(updates).length === 0) {
        return response.status(400).json({ error: 'No changes supplied.' });
    }

    const update = await supabaseAdmin
        .from('users')
        .update(updates)
        .eq('id', userId)
        .select(
            'id,email,name,roles,role,permissions,created_at,updated_at,role_title,phone,welcome_message,avatar_url,status,email_verified_at,calendar_id,deactivated_at,last_login_at,invitation_sent_at'
        )
        .single();

    if (update.error || !update.data) {
        console.error('Failed to update user', update.error);
        return response.status(500).json({ error: 'Unable to update user.' });
    }

    const user: ManagedUserRecord = mapUserRecord(update.data);
    return response.status(200).json({ user });
}
