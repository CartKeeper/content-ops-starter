export type UserProfile = {
    id: string;
    email: string;
    name: string | null;
    roles: string[];
    roleTitle: string | null;
    phone: string | null;
    welcomeMessage: string | null;
    avatarUrl: string | null;
    status: string | null;
    createdAt: string;
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
