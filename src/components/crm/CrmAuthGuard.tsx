import * as React from 'react';

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
    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(!guardIsEnabled);
    const [isReady, setIsReady] = React.useState<boolean>(!guardIsEnabled);
    const [accessCode, setAccessCode] = React.useState('');
    const [error, setError] = React.useState<string | null>(null);

    React.useEffect(() => {
        if (!guardIsEnabled) {
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
    }, []);

    const handleSubmit = React.useCallback(
        (event: React.FormEvent<HTMLFormElement>) => {
            event.preventDefault();

            if (!guardIsEnabled) {
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
        if (!guardIsEnabled) {
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
    }, []);

    const contextValue = React.useMemo<CrmAuthContextValue>(
        () => ({
            isAuthenticated: guardIsEnabled ? isAuthenticated : true,
            guardEnabled: guardIsEnabled,
            signOut: handleSignOut
        }),
        [handleSignOut, isAuthenticated]
    );

    if (!guardIsEnabled) {
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
