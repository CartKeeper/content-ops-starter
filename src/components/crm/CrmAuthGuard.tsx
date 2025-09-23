import * as React from 'react';
import { useRouter } from 'next/router';

import { useNetlifyIdentity } from '../auth';
import { ApertureMark } from './ApertureMark';

type CrmAuthContextValue = {
    isAuthenticated: boolean;
    guardEnabled: boolean;
    signOut: () => Promise<void>;
};

const CrmAuthContext = React.createContext<CrmAuthContextValue>({
    isAuthenticated: false,
    guardEnabled: true,
    signOut: async () => undefined
});

export function useCrmAuth(): CrmAuthContextValue {
    return React.useContext(CrmAuthContext);
}

type CrmAuthGuardProps = {
    children: React.ReactNode;
    loadingMessage?: string;
};

export function CrmAuthGuard({ children, loadingMessage }: CrmAuthGuardProps) {
    const identity = useNetlifyIdentity();
    const router = useRouter();

    React.useEffect(() => {
        if (!identity.isReady) {
            return;
        }

        if (!identity.isAuthenticated) {
            void router.replace('/login');
        }
    }, [identity.isAuthenticated, identity.isReady, router]);

    const signOut = React.useCallback(() => identity.logout(), [identity]);

    const contextValue = React.useMemo<CrmAuthContextValue>(
        () => ({
            isAuthenticated: identity.isAuthenticated,
            guardEnabled: identity.isReady,
            signOut,
        }),
        [identity.isAuthenticated, identity.isReady, signOut],
    );

    if (!identity.isReady) {
        return (
            <div className="flex min-h-screen items-center justify-center bg-slate-950 px-6 py-16 text-slate-200">
                <div className="flex flex-col items-center gap-4 text-center">
                    <span className="inline-flex h-14 w-14 items-center justify-center rounded-full bg-slate-800/70 ring-1 ring-white/10">
                        <ApertureMark className="h-8 w-8 text-[#4DE5FF]" />
                    </span>
                    <p className="text-sm font-medium tracking-wide text-slate-400">
                        {loadingMessage ?? 'Preparing your workspace…'}
                    </p>
                </div>
            </div>
        );
    }

    if (!identity.isAuthenticated) {
        return null;
    }

    return <CrmAuthContext.Provider value={contextValue}>{children}</CrmAuthContext.Provider>;
}
