import { normalizePermissions, normalizeRole } from '../../lib/jwt';
import type { ManagedUserRecord, UserPermissions, UserRole } from '../../types/user';

export function mapPermissionsInput(value: unknown): UserPermissions {
    if (!value || typeof value !== 'object') {
        return {
            canManageUsers: false,
            canEditSettings: false,
            canViewGalleries: true,
            canManageIntegrations: true,
            canManageCalendar: true,
        };
    }

    const source = value as Record<string, unknown>;
    return {
        canManageUsers: Boolean(source.canManageUsers ?? source.can_manage_users),
        canEditSettings: Boolean(source.canEditSettings ?? source.can_edit_settings),
        canViewGalleries: Boolean(source.canViewGalleries ?? source.can_view_galleries ?? true),
        canManageIntegrations: Boolean(
            source.canManageIntegrations ?? source.can_manage_integrations ?? true,
        ),
        canManageCalendar: Boolean(source.canManageCalendar ?? source.can_manage_calendar ?? true),
    };
}

export function toDatabasePermissions(permissions: UserPermissions): Record<string, boolean> {
    return {
        can_manage_users: permissions.canManageUsers,
        can_edit_settings: permissions.canEditSettings,
        can_view_galleries: permissions.canViewGalleries,
        can_manage_integrations: permissions.canManageIntegrations,
        can_manage_calendar: permissions.canManageCalendar,
    };
}

export function buildRolesArray(role: UserRole): string[] {
    switch (role) {
        case 'admin':
            return ['admin', 'photographer'];
        case 'restricted':
            return ['restricted'];
        case 'standard':
        default:
            return ['photographer'];
    }
}

export function mapUserRecord(record: Record<string, any>): ManagedUserRecord {
    const permissions = normalizePermissions(record.permissions);
    const role = normalizeRole(record.role);

    return {
        id: record.id,
        email: record.email,
        name: record.name ?? record.full_name ?? null,
        roles: Array.isArray(record.roles) ? record.roles : [],
        role,
        permissions,
        roleTitle: record.role_title ?? null,
        phone: record.phone ?? null,
        welcomeMessage: record.welcome_message ?? null,
        avatarUrl: record.avatar_url ?? null,
        status: record.status ?? null,
        emailVerified: Boolean(record.email_verified_at),
        calendarId: record.calendar_id ?? null,
        createdAt: record.created_at,
        updatedAt: record.updated_at ?? record.created_at,
        deactivatedAt: record.deactivated_at ?? null,
        lastLoginAt: record.last_login_at ?? null,
        invitationSentAt: record.invitation_sent_at ?? null,
    };
}
