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
    error: string | null;
    clearError: () => void;
    login: (email: string, password: string) => Promise<void>;
    signup: (input: { email: string; password: string; name?: string }) => Promise<void>;
    requestPasswordReset: (email: string) => Promise<void>;
    resetPassword: (input: { token: string; password: string }) => Promise<void>;
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
    error: null,
    clearError: () => undefined,
    login: async () => undefined,
    signup: async () => undefined,
    requestPasswordReset: async () => undefined,
    resetPassword: async () => undefined
});

type NetlifyIdentityProviderProps = {
    children: React.ReactNode;
};

export function NetlifyIdentityProvider({ children }: NetlifyIdentityProviderProps) {
    const [user, setUser] = React.useState<AuthUser | null>(null);
    const [isReady, setIsReady] = React.useState(false);
    const [error, setError] = React.useState<string | null>(null);
    const handleSessionResponse = React.useCallback(
        (payload: { user?: AuthUser } | null) => {
            if (payload?.user) {
                setUser(payload.user);
            } else {
                setUser(null);
            }

            setError(null);
            setIsReady(true);
        },
        []
    );

    const fetchSession = React.useCallback(async () => {
        try {
            const response = await fetch('/api/auth/session', {
                method: 'GET',
                credentials: 'include'
            });

            if (response.status === 401) {
                handleSessionResponse(null);
                return;
            }

            const payload = await response.json().catch(() => null);

            if (!response.ok) {
                const message = payload?.error ?? 'Unable to refresh session.';
                throw new Error(message);
            }

            handleSessionResponse(payload);
        } catch (sessionError) {
            console.error('Session refresh failed', sessionError);
            setUser(null);
            setError(sessionError instanceof Error ? sessionError.message : 'Session expired.');
            setIsReady(true);
        }
    }, [handleSessionResponse]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            setIsReady(true);
            return;
        }

        void fetchSession();
    }, [fetchSession]);

    const login = React.useCallback(
        async (email: string, password: string) => {
            try {
                const response = await fetch('/api/auth/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
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
                setIsReady(true);
                throw loginError instanceof Error ? loginError : new Error('Unable to log in.');
            }
        },
        [handleSessionResponse]
    );

    const signup = React.useCallback(
        async ({ email, password, name }: { email: string; password: string; name?: string }) => {
            try {
                const response = await fetch('/api/auth/signup', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
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
                setIsReady(true);
                throw signupError instanceof Error ? signupError : new Error('Unable to create account.');
            }
        },
        [handleSessionResponse]
    );

    const logout = React.useCallback(async () => {
        setUser(null);
        setError(null);
        setIsReady(true);

        try {
            await fetch('/api/auth/logout', { method: 'POST', credentials: 'include' });
        } catch (logoutError) {
            console.warn('Failed to notify logout endpoint', logoutError);
        }
    }, []);

    const refresh = React.useCallback(async () => {
        await fetchSession();
    }, [fetchSession]);

    const requestPasswordReset = React.useCallback(
        async (email: string) => {
            try {
                const response = await fetch('/api/auth/forgot-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ email })
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = payload?.error ?? 'Unable to send reset instructions.';
                    throw new Error(message);
                }

                setError(null);
            } catch (resetRequestError) {
                const message =
                    resetRequestError instanceof Error
                        ? resetRequestError.message
                        : 'Unable to send reset instructions.';
                setError(message);
                throw resetRequestError instanceof Error
                    ? resetRequestError
                    : new Error('Unable to send reset instructions.');
            }
        },
        []
    );

    const resetPassword = React.useCallback(
        async ({ token, password }: { token: string; password: string }) => {
            try {
                const response = await fetch('/api/auth/reset-password', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ token, password })
                });

                const payload = await response.json().catch(() => null);

                if (!response.ok) {
                    const message = payload?.error ?? 'Unable to reset password.';
                    throw new Error(message);
                }

                handleSessionResponse(payload);
            } catch (resetError) {
                const message = resetError instanceof Error ? resetError.message : 'Unable to reset password.';
                setError(message);
                setUser(null);
                setIsReady(true);
                throw resetError instanceof Error ? resetError : new Error('Unable to reset password.');
            }
        },
        [handleSessionResponse]
    );

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
            error,
            clearError,
            login,
            signup,
            requestPasswordReset,
            resetPassword
        }),
        [
            clearError,
            error,
            isReady,
            login,
            logout,
            open,
            refresh,
            requestPasswordReset,
            resetPassword,
            roles,
            signup,
            user
        ]
    );

    return <NetlifyIdentityContext.Provider value={contextValue}>{children}</NetlifyIdentityContext.Provider>;
}

export function useNetlifyIdentity(): IdentityContextValue {
    return React.useContext(NetlifyIdentityContext);
}
