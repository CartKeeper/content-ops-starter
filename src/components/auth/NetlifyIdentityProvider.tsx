import * as React from 'react';

import type { AuthUser } from '../../types/auth';

export type IdentityView = 'login' | 'signup';

type IdentityContextValue = {
    isReady: boolean;
    hasWidget: boolean;
    isAuthenticated: boolean;
    user: AuthUser | null;
    roles: string[];
    isPhotographer: boolean;
    isClient: boolean;
    isAdmin: boolean;
    open: (view?: IdentityView) => void;
    logout: () => Promise<void>;
    refresh: () => Promise<void>;
    getToken: () => Promise<string | null>;
    error: string | null;
    clearError: () => void;
    login: (email: string, password: string) => Promise<void>;
    signup: (input: { email: string; password: string; name?: string }) => Promise<void>;
};

const NetlifyIdentityContext = React.createContext<IdentityContextValue>({
    isReady: false,
    hasWidget: false,
    isAuthenticated: false,
    user: null,
    roles: [],
    isPhotographer: false,
    isClient: false,
    isAdmin: false,
    open: () => undefined,
    logout: async () => undefined,
    refresh: async () => undefined,
    getToken: async () => null,
    error: null,
    clearError: () => undefined,
    login: async () => undefined,
    signup: async () => undefined
});

type NetlifyIdentityProviderProps = {
    children: React.ReactNode;
};

const TOKEN_STORAGE_KEY = 'crm-auth-token';

export function NetlifyIdentityProvider({ children }: NetlifyIdentityProviderProps) {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isReady, setIsReady] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const tokenRef = React.useRef<string | null>(null);

    const persistToken = React.useCallback((nextToken: string | null) => {
        tokenRef.current = nextToken;
        if (typeof window !== 'undefined') {
            if (nextToken) {
                window.localStorage.setItem(TOKEN_STORAGE_KEY, nextToken);
            } else {
                window.localStorage.removeItem(TOKEN_STORAGE_KEY);
            }
        }
    }, []);

    const handleSessionResponse = React.useCallback(
        (payload: { user?: AuthUser; token?: string } | null) => {
            if (payload?.token) {
                persistToken(payload.token);
            }

            if (payload?.user) {
                setUser(payload.user);
            } else {
                setUser(null);
            }

            setError(null);
            setIsReady(true);
        },
        [persistToken]
    );

    const fetchSession = React.useCallback(
        async (candidateToken?: string) => {
            const activeToken = candidateToken ?? tokenRef.current;
            if (!activeToken) {
                setUser(null);
                setIsReady(true);
                return;
            }

            try {
                const response = await fetch('/api/auth/session', {
                    method: 'GET',
                    headers: { Authorization: `Bearer ${activeToken}` }
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    throw new Error(payload?.error ?? 'Unable to refresh session.');
                }

                handleSessionResponse(payload);
            } catch (sessionError) {
                console.error('Session refresh failed', sessionError);
                persistToken(null);
                setUser(null);
                setError(sessionError instanceof Error ? sessionError.message : 'Session expired.');
                setIsReady(true);
            }
        },
        [handleSessionResponse, persistToken]
    );

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            setIsReady(true);
            return;
        }

        const storedToken = window.localStorage.getItem(TOKEN_STORAGE_KEY);
        if (!storedToken) {
            setIsReady(true);
            return;
        }

        persistToken(storedToken);
        void fetchSession(storedToken);
    }, [fetchSession, persistToken]);

    const login = React.useCallback(
        async (email: string, password: string) => {
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password })
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = payload?.error ?? 'Unable to log in.';
                    throw new Error(message);
                }

                handleSessionResponse(payload);
            } catch (loginError) {
                setError(loginError instanceof Error ? loginError.message : 'Unable to log in.');
                setUser(null);
                persistToken(null);
                setIsReady(true);
                throw loginError instanceof Error ? loginError : new Error('Unable to log in.');
            }
        },
        [handleSessionResponse, persistToken]
    );

    const signup = React.useCallback(
        async ({ email, password, name }: { email: string; password: string; name?: string }) => {
            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email, password, name })
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = payload?.error ?? 'Unable to create account.';
                    throw new Error(message);
                }

                handleSessionResponse(payload);
            } catch (signupError) {
                setError(signupError instanceof Error ? signupError.message : 'Unable to create account.');
                setUser(null);
                persistToken(null);
                setIsReady(true);
                throw signupError instanceof Error ? signupError : new Error('Unable to create account.');
            }
        },
        [handleSessionResponse, persistToken]
    );

    const logout = React.useCallback(async () => {
        persistToken(null);
        setUser(null);
        setError(null);
        setIsReady(true);

        try {
            await fetch('/api/auth/logout', { method: 'POST' });
        } catch (logoutError) {
            console.warn('Failed to notify logout endpoint', logoutError);
        }
    }, [persistToken]);

    const refresh = React.useCallback(async () => {
        await fetchSession();
    }, [fetchSession]);

    const getToken = React.useCallback(async () => tokenRef.current, []);

    const clearError = React.useCallback(() => setError(null), []);

    const open = React.useCallback((view: IdentityView = 'login') => {
        if (typeof window === 'undefined') {
            return;
        }

        const target = view === 'signup' ? '/signup' : '/login';
        window.location.assign(target);
    }, []);

    const roles = user?.roles ?? [];

    const contextValue = React.useMemo<IdentityContextValue>(
        () => ({
            isReady,
            hasWidget: false,
            isAuthenticated: Boolean(user),
            user,
            roles,
            isPhotographer: roles.includes('photographer') || roles.includes('admin'),
            isClient: roles.includes('client'),
            isAdmin: roles.includes('admin'),
            open,
            logout,
            refresh,
            getToken,
            error,
            clearError,
            login,
            signup
        }),
        [clearError, error, getToken, isReady, login, logout, open, refresh, roles, signup, user]
    );

    return <NetlifyIdentityContext.Provider value={contextValue}>{children}</NetlifyIdentityContext.Provider>;
}

export function useNetlifyIdentity(): IdentityContextValue {
    return React.useContext(NetlifyIdentityContext);
}
