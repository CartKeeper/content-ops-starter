import type { UserPermissions, UserRole } from './user';

export type AuthUser = {
    id: string;
    email: string;
    name: string | null;
    roles: string[];
    role: UserRole;
    permissions: UserPermissions;
    createdAt: string;
    updatedAt: string;
    roleTitle: string | null;
    phone: string | null;
    welcomeMessage: string | null;
    avatarUrl: string | null;
    status: string | null;
    emailVerified: boolean;
    calendarId: string | null;
    deactivatedAt: string | null;
    lastLoginAt: string | null;
};
