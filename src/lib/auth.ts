export type CRMUserRole = 'photographer' | 'studio-manager' | 'assistant';

export type CRMUser = {
    id: string;
    name: string;
    email: string;
    role: CRMUserRole;
    avatarUrl?: string;
    brandName?: string;
};

const demoUser: CRMUser = {
    id: 'user-demo-photographer',
    name: 'Harper Sloan',
    email: 'harper@lumina-studios.com',
    role: 'photographer',
    avatarUrl: '/images/avatars/harper-sloan.png',
    brandName: 'Lumina Studios'
};

export function getCurrentUser(): CRMUser {
    return demoUser;
}

export async function signInWithEmail(email: string, password: string): Promise<CRMUser> {
    // Placeholder implementation that mimics a network delay.
    await new Promise((resolve) => setTimeout(resolve, 250));
    return { ...demoUser, email };
}

export async function signOut(): Promise<void> {
    await new Promise((resolve) => setTimeout(resolve, 150));
}
