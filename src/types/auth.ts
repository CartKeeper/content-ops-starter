export type AuthUser = {
    id: string;
    email: string;
    name: string | null;
    roles: string[];
    createdAt: string;
    roleTitle: string | null;
    phone: string | null;
    welcomeMessage: string | null;
    avatarUrl: string | null;
    status: string | null;
};
