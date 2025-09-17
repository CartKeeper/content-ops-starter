import * as React from 'react';

import { useNetlifyIdentity } from '../auth';
import { ApertureMark } from './ApertureMark';

const STORAGE_KEY = 'crm-auth-access-token';
const RESOLVED_ACCESS_CODE =
    (process.env.NEXT_PUBLIC_CRM_ACCESS_TOKEN ?? process.env.CRM_ACCESS_TOKEN ?? '').trim();

const guardIsEnabled = RESOLVED_ACCESS_CODE.length > 0;

type CrmAuthContextValue = {
    isAuthenticated: boolean;
    guardEnabled: boolean;
    signOut: () => void;
};

const CrmAuthContext = React.createContext<CrmAuthContextValue>({
    isAuthenticated: true,
    guardEnabled: false,
    signOut: () => undefined
});

export function useCrmAuth(): CrmAuthContextValue {
    return React.useContext(CrmAuthContext);
}

type CrmAuthGuardProps = {
    children: React.ReactNode;
    title?: string;
    description?: string;
};

export function CrmAuthGuard({ children, title, description }: CrmAuthGuardProps) {
    const identity = useNetlifyIdentity();
    const identityGuardEnabled = identity.hasWidget;
    const passcodeGuardEnabled = guardIsEnabled && !identityGuardEnabled;

    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(() => !guardIsEnabled);
    const [isReady, setIsReady] = React.useState<boolean>(() => !guardIsEnabled);
    const [accessCode, setAccessCode] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);

    const identityContextValue = React.useMemo<CrmAuthContextValue>(
        () => ({
            isAuthenticated: identity.isAuthenticated && identity.isPhotographer,
            guardEnabled: true,
            signOut: identity.logout
        }),
        [identity.isAuthenticated, identity.isPhotographer, identity.logout]
    );

    React.useEffect(() => {
        if (identityGuardEnabled) {
            return;
        }

        if (!passcodeGuardEnabled) {
            setIsReady(true);
            setIsAuthenticated(true);
            return;
        }

        if (typeof window === 'undefined') {
            setIsReady(true);
            return;
        }

        try {
            const stored = window.localStorage.getItem(STORAGE_KEY);
            if (stored && stored === RESOLVED_ACCESS_CODE) {
                setIsAuthenticated(true);
            }
        } catch (storageError) {
            console.warn('CRM auth guard: unable to read stored access code', storageError);
        } finally {
            setIsReady(true);
        }
    }, [identityGuardEnabled, passcodeGuardEnabled]);

    const handleSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (!passcodeGuardEnabled) {
                setIsAuthenticated(true);
                return;
            }

            const normalizedInput = accessCode.trim();

            if (normalizedInput && normalizedInput === RESOLVED_ACCESS_CODE) {
                if (typeof window !== 'undefined') {
                    try {
                        window.localStorage.setItem(STORAGE_KEY, RESOLVED_ACCESS_CODE);
                    } catch (storageError) {
                        console.warn('CRM auth guard: unable to persist access code', storageError);
                    }
                }

                setIsAuthenticated(true);
                setError(null);
                setAccessCode('');
            } else {
                setError('The access code is incorrect.');
            }
        },
        [accessCode]
    );

    const handleSignOut = React.useCallback(() => {
        if (!passcodeGuardEnabled) {
            return;
        }

        if (typeof window !== 'undefined') {
            try {
                window.localStorage.removeItem(STORAGE_KEY);
            } catch (storageError) {
                console.warn('CRM auth guard: unable to clear stored access code', storageError);
            }
        }

        setIsAuthenticated(false);
        setAccessCode('');
        setError(null);
    }, [passcodeGuardEnabled]);

    const contextValue = React.useMemo<CrmAuthContextValue>(
        () => ({
            isAuthenticated: passcodeGuardEnabled ? isAuthenticated : true,
            guardEnabled: passcodeGuardEnabled,
            signOut: handleSignOut
        }),
        [handleSignOut, isAuthenticated, passcodeGuardEnabled]
    );

    if (identityGuardEnabled) {
        if (!identity.isReady) {
            return (
                <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-300">
                    <div className="flex flex-col items-center gap-4">
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/70 ring-1 ring-white/10">
                            <ApertureMark className="h-8 w-8 text-[#4DE5FF]" />
                        </span>
                        <p className="text-sm font-medium tracking-wide text-slate-400">
                            Connecting to secure studio identity…
                        </p>
                    </div>
                </div>
            );
        }

        if (identity.isAuthenticated && identity.isPhotographer) {
            return <CrmAuthContext.Provider value={identityContextValue}>{children}</CrmAuthContext.Provider>;
        }

        const identityCardTitle = identity.isAuthenticated
            ? 'Photographer access required'
            : title ?? 'Sign in to the studio workspace';
        const identityCardDescription = identity.isAuthenticated
            ? 'Your account is missing the photographer role. Ask the studio admin to grant access or sign in with a different profile.'
            : description ?? 'Use your studio-issued Netlify Identity account to access private CRM tools.';

        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
                <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
                    <div className="flex flex-col items-center gap-5 text-center">
                        <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/70 ring-1 ring-white/10">
                            <ApertureMark className="h-8 w-8 text-[#4DE5FF]" />
                        </span>
                        <div>
                            <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">Secure access</p>
                            <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">{identityCardTitle}</h1>
                            <p className="mt-2 text-sm text-slate-300">{identityCardDescription}</p>
                            {identity.isAuthenticated && identity.user?.email ? (
                                <p className="mt-3 text-xs text-slate-500">
                                    Signed in as{' '}
                                    <span className="font-semibold text-slate-200">{identity.user.email}</span>
                                </p>
                            ) : null}
                        </div>
                    </div>
                    <div className="mt-8 space-y-4">
                        {identity.error ? (
                            <div className="rounded-xl border border-rose-500/40 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
                                {identity.error}
                            </div>
                        ) : null}
                        {identity.isAuthenticated ? (
                            <button
                                type="button"
                                onClick={() => {
                                    identity.clearError();
                                    identity.logout();
                                }}
                                className="w-full rounded-full border border-slate-700 bg-slate-800 px-4 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-slate-200 transition hover:bg-slate-700 focus:outline-none focus:ring-2 focus:ring-[#4DE5FF] focus:ring-offset-2 focus:ring-offset-slate-900"
                            >
                                Switch account
                            </button>
                        ) : (
                            <button
                                type="button"
                                onClick={() => {
                                    identity.clearError();
                                    identity.open('login');
                                }}
                                className="w-full rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-4 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4DE5FF] focus:ring-offset-slate-900"
                            >
                                Sign in as photographer
                            </button>
                        )}
                        <p className="text-center text-xs text-slate-500">
                            Need access? Ask the studio admin to invite you in Netlify Identity and assign the photographer role.
                        </p>
                    </div>
                </div>
            </div>
        );
    }

    if (!passcodeGuardEnabled) {
        return <CrmAuthContext.Provider value={contextValue}>{children}</CrmAuthContext.Provider>;
    }

    if (!isReady) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-300">
                <div className="flex flex-col items-center gap-4">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/70 ring-1 ring-white/10">
                        <ApertureMark className="h-8 w-8 text-[#4DE5FF]" />
                    </span>
                    <p className="text-sm font-medium tracking-wide text-slate-400">
                        Preparing secure workspace…
                    </p>
                </div>
            </div>
        );
    }

    if (isAuthenticated) {
        return <CrmAuthContext.Provider value={contextValue}>{children}</CrmAuthContext.Provider>;
    }

    return (
        <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-white">
            <div className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-900/80 p-10 shadow-2xl backdrop-blur">
                <div className="flex flex-col items-center gap-5 text-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/70 ring-1 ring-white/10">
                        <ApertureMark className="h-8 w-8 text-[#4DE5FF]" />
                    </span>
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.48em] text-[#4DE5FF]">
                            Secure access
                        </p>
                        <h1 className="mt-3 text-2xl font-semibold tracking-tight text-white">
                            {title ?? 'Studio CRM authentication required'}
                        </h1>
                        <p className="mt-2 text-sm text-slate-300">
                            {description ?? 'Enter the access code provided by your studio admin to open the private workspace.'}
                        </p>
                    </div>
                </div>
                <form className="mt-10 space-y-6" onSubmit={handleSubmit}>
                    <label className="block text-left text-xs font-semibold uppercase tracking-[0.32em] text-slate-400">
                        Access code
                        <input
                            type="password"
                            value={accessCode}
                            onChange={(event) => {
                                setAccessCode(event.target.value);
                                if (error) {
                                    setError(null);
                                }
                            }}
                            className="mt-3 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 py-3 text-sm text-white placeholder:text-slate-500 focus:border-[#4DE5FF] focus:outline-none focus:ring-2 focus:ring-[#4DE5FF]"
                            placeholder="••••••••"
                            autoComplete="current-password"
                        />
                    </label>
                    {error ? <p className="text-sm font-medium text-rose-300">{error}</p> : null}
                    <button
                        type="submit"
                        className="w-full rounded-full bg-gradient-to-r from-[#5D3BFF] via-[#3D7CFF] to-[#4DE5FF] px-4 py-3 text-sm font-semibold uppercase tracking-[0.28em] text-white shadow-lg transition hover:shadow-xl focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#4DE5FF] focus:ring-offset-slate-900"
                    >
                        Enter workspace
                    </button>
                </form>
                <p className="mt-10 text-center text-xs text-slate-500">
                    Access is limited to authorized studio staff. Reach out to your admin if you need a new passcode.
                </p>
            </div>
        </div>
    );
}
