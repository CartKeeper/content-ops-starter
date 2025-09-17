import * as React from 'react';

import type { User } from 'netlify-identity-widget';

type IdentityView = 'login' | 'signup';

type IdentityContextValue = {
    isReady: boolean;
    hasWidget: boolean;
    isAuthenticated: boolean;
    user: User | null;
    roles: string[];
    isPhotographer: boolean;
    isClient: boolean;
    open: (view?: IdentityView) => void;
    logout: () => void;
    refresh: () => Promise<void>;
    getToken: () => Promise<string | null>;
    error: string | null;
    clearError: () => void;
};

const NetlifyIdentityContext = React.createContext<IdentityContextValue>({
    isReady: false,
    hasWidget: false,
    isAuthenticated: false,
    user: null,
    roles: [],
    isPhotographer: false,
    isClient: false,
    open: () => undefined,
    logout: () => undefined,
    refresh: async () => undefined,
    getToken: async () => null,
    error: null,
    clearError: () => undefined
});

type NetlifyIdentityProviderProps = {
    children: React.ReactNode;
};

type IdentityModule = typeof import('netlify-identity-widget');

type IdentityError = Error & { description?: string };

export function NetlifyIdentityProvider({ children }: NetlifyIdentityProviderProps) {
    const widgetRef = React.useRef<IdentityModule | null>(null);
    const [user, setUser] = React.useState<User | null>(null);
    const [isReady, setIsReady] = React.useState(false);
    const [hasWidget, setHasWidget] = React.useState(false);
    const [lastError, setLastError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        let isCancelled = false;
        let cleanup: (() => void) | undefined;

        import('netlify-identity-widget')
            .then((module) => {
                if (isCancelled) {
                    return;
                }

                const identity = module.default;
                widgetRef.current = identity;
                setHasWidget(true);

                const handleInit = (initialUser: User | null) => {
                    if (isCancelled) {
                        return;
                    }
                    setUser(initialUser);
                    setIsReady(true);
                };

                const handleLogin = (nextUser: User) => {
                    if (isCancelled) {
                        return;
                    }
                    setUser(nextUser);
                    setLastError(null);
                    identity.close();
                };

                const handleLogout = () => {
                    if (isCancelled) {
                        return;
                    }
                    setUser(null);
                };

                const handleError = (error: unknown) => {
                    if (isCancelled) {
                        return;
                    }

                    const normalized = normalizeErrorMessage(error);
                    console.error('Netlify Identity error', error);
                    setLastError(normalized);
                    setIsReady(true);

                    if (isIdentityConfigurationError(normalized)) {
                        try {
                            identity.close();
                        } catch (closeError) {
                            console.warn('Failed to close Netlify Identity widget after configuration error', closeError);
                        }
                        widgetRef.current = null;
                        setHasWidget(false);
                        setUser(null);
                    }
                };

                identity.on('init', handleInit);
                identity.on('login', handleLogin);
                identity.on('logout', handleLogout);
                identity.on('error', handleError);

                identity.init();

                cleanup = () => {
                    identity.off('init', handleInit);
                    identity.off('login', handleLogin);
                    identity.off('logout', handleLogout);
                    identity.off('error', handleError);
                };
            })
            .catch((error) => {
                if (isCancelled) {
                    return;
                }

                console.warn('Failed to load Netlify Identity widget', error);
                setLastError(normalizeErrorMessage(error) ?? 'Unable to load authentication widget.');
                setIsReady(true);
                setHasWidget(false);
            });

        return () => {
            isCancelled = true;
            if (cleanup) {
                cleanup();
            }
        };
    }, []);

    const open = React.useCallback((view?: IdentityView) => {
        const widget = widgetRef.current;
        if (!widget) {
            console.warn('Netlify Identity widget is not available yet.');
            return;
        }
        widget.open(view);
    }, []);

    const logout = React.useCallback(() => {
        const widget = widgetRef.current;
        if (!widget) {
            setUser(null);
            return;
        }
        widget.logout();
    }, []);

    const refresh = React.useCallback(async () => {
        try {
            const currentUser = widgetRef.current?.currentUser();
            if (!currentUser) {
                return;
            }
            const refreshed = await currentUser.refresh();
            if (refreshed) {
                setUser(refreshed);
            }
        } catch (error) {
            console.error('Failed to refresh Netlify Identity user', error);
            setLastError(normalizeErrorMessage(error));
        }
    }, []);

    const getToken = React.useCallback(async () => {
        try {
            const currentUser = widgetRef.current?.currentUser();
            if (!currentUser) {
                return null;
            }
            return await currentUser.jwt();
        } catch (error) {
            console.error('Failed to resolve Netlify Identity token', error);
            setLastError(normalizeErrorMessage(error));
            return null;
        }
    }, []);

    const clearError = React.useCallback(() => {
        setLastError(null);
    }, []);

    const roles = React.useMemo(() => {
        const metadataRoles = user?.app_metadata?.roles;
        if (!metadataRoles) {
            return [];
        }
        return metadataRoles.filter((role): role is string => typeof role === 'string');
    }, [user?.app_metadata?.roles]);

    const normalizedRoles = React.useMemo(() => roles.map((role) => role.toLowerCase()), [roles]);

    const contextValue = React.useMemo<IdentityContextValue>(
        () => ({
            isReady,
            hasWidget,
            isAuthenticated: Boolean(user),
            user,
            roles,
            isPhotographer: normalizedRoles.includes('photographer'),
            isClient: normalizedRoles.includes('client'),
            open,
            logout,
            refresh,
            getToken,
            error: lastError,
            clearError
        }),
        [
            getToken,
            hasWidget,
            isReady,
            lastError,
            logout,
            normalizedRoles,
            open,
            refresh,
            roles,
            user
        ]
    );

    return <NetlifyIdentityContext.Provider value={contextValue}>{children}</NetlifyIdentityContext.Provider>;
}

export function useNetlifyIdentity(): IdentityContextValue {
    return React.useContext(NetlifyIdentityContext);
}

function isIdentityConfigurationError(message: string | null): boolean {
    if (!message) {
        return false;
    }

    const normalizedMessage = message.toLowerCase();
    return (
        normalizedMessage.includes('failed to load settings') ||
        normalizedMessage.includes('/.netlify/identity') ||
        normalizedMessage.includes('identity settings')
    );
}

function normalizeErrorMessage(error: unknown): string | null {
    if (!error) {
        return null;
    }

    if (typeof error === 'string') {
        return error;
    }

    if (error instanceof Error) {
        const candidate = (error as IdentityError).description ?? error.message;
        return candidate || null;
    }

    try {
        return JSON.stringify(error);
    } catch {
        return 'Unexpected Netlify Identity error.';
    }
}
