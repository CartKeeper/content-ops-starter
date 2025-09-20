export type UserRole = 'admin' | 'standard' | 'restricted';

export type UserPermissions = {
    canManageUsers: boolean;
    canEditSettings: boolean;
    canViewGalleries: boolean;
    canManageIntegrations: boolean;
    canManageCalendar: boolean;
};

export type UserProfile = {
    id: string;
    email: string;
    name: string | null;
    roles: string[];
    role: UserRole;
    permissions: UserPermissions;
    roleTitle: string | null;
    phone: string | null;
    welcomeMessage: string | null;
    avatarUrl: string | null;
    status: string | null;
    emailVerified: boolean;
    calendarId: string | null;
    createdAt: string;
    updatedAt: string;
    deactivatedAt: string | null;
    lastLoginAt: string | null;
};

export type ManagedUserRecord = UserProfile & {
    invitationSentAt: string | null;
};

export type UpdateUserProfileInput = {
    name?: string | null;
    email?: string;
    roleTitle?: string | null;
    phone?: string | null;
    welcomeMessage?: string | null;
    avatarUrl?: string | null;
    status?: string | null;
};
