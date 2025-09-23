import * as React from 'react';
import { useRouter } from 'next/router';

export type DashboardViewKey = string;

export type DashboardUiPrefsResponse<V extends DashboardViewKey> = {
    uiPrefs?: {
        dashboard?: {
            viewMode?: V;
            cardOrder?: Record<string, V[]>;
        };
    };
};

export type DashboardViewOptions<V extends DashboardViewKey> = {
    availableViews: readonly V[];
    defaultView: V;
    queryKey?: string;
};

export type DashboardViewState<V extends DashboardViewKey> = {
    view: V;
    setView: (next: V) => void;
    loading: boolean;
    availableViews: readonly V[];
};

const UI_PREFS_ENDPOINT = '/api/ui-prefs';

function isValidView<V extends DashboardViewKey>(candidate: unknown, views: readonly V[]): candidate is V {
    return typeof candidate === 'string' && (views as readonly string[]).includes(candidate);
}

export function useDashboardView<V extends DashboardViewKey>({
    availableViews,
    defaultView,
    queryKey = 'view',
}: DashboardViewOptions<V>): DashboardViewState<V> {
    const router = useRouter();
    const [view, setViewState] = React.useState<V>(defaultView);
    const [loading, setLoading] = React.useState(true);
    const readyRef = React.useRef(false);
    const saveController = React.useRef<AbortController | null>(null);
    const userOverrideRef = React.useRef(false);

    const updateUrl = React.useCallback(
        (next: V) => {
            if (!router.isReady) {
                return;
            }

            const nextQuery = { ...router.query };
            if (next === defaultView) {
                delete nextQuery[queryKey];
            } else {
                nextQuery[queryKey] = next;
            }

            void router.replace(
                { pathname: router.pathname, query: nextQuery },
                undefined,
                { shallow: true, scroll: false },
            );
        },
        [router, defaultView, queryKey],
    );

    React.useEffect(() => {
        if (!router.isReady || readyRef.current) {
            return;
        }

        readyRef.current = true;
        let mounted = true;

        const queryValue = router.query[queryKey];
        const queryView = isValidView(queryValue, availableViews) ? (queryValue as V) : null;
        const initialView = queryView ?? defaultView;

        setViewState(initialView);
        updateUrl(initialView);

        if (queryView || typeof window === 'undefined') {
            setLoading(false);
            return () => {
                mounted = false;
            };
        }

        (async () => {
            try {
                const response = await fetch(UI_PREFS_ENDPOINT, { credentials: 'include' });
                if (!response.ok) {
                    throw new Error(`Failed to load UI preferences: ${response.status}`);
                }

                const payload = (await response.json().catch(() => null)) as DashboardUiPrefsResponse<V> | null;
                const stored = payload?.uiPrefs?.dashboard?.viewMode;
                if (mounted && !userOverrideRef.current && isValidView(stored, availableViews)) {
                    setViewState(stored);
                    updateUrl(stored);
                }
            } catch (error) {
                console.error('Failed to load dashboard preferences', error);
            } finally {
                if (mounted) {
                    setLoading(false);
                }
            }
        })();

        return () => {
            mounted = false;
        };
    }, [router, availableViews, defaultView, queryKey, updateUrl]);

    const persistView = React.useCallback(
        async (next: V) => {
            if (!readyRef.current || typeof window === 'undefined') {
                return;
            }

            if (saveController.current) {
                saveController.current.abort();
            }

            const controller = new AbortController();
            saveController.current = controller;

            try {
                await fetch(UI_PREFS_ENDPOINT, {
                    method: 'PUT',
                    headers: { 'Content-Type': 'application/json' },
                    credentials: 'include',
                    body: JSON.stringify({ dashboard: { viewMode: next } }),
                    signal: controller.signal,
                });
            } catch (error) {
                if ((error as Error).name !== 'AbortError') {
                    console.error('Failed to persist dashboard view preference', error);
                }
            } finally {
                if (saveController.current === controller) {
                    saveController.current = null;
                }
            }
        },
        [],
    );

    const setView = React.useCallback(
        (next: V) => {
            if (!isValidView(next, availableViews)) {
                return;
            }
            userOverrideRef.current = true;
            setViewState(next);
            updateUrl(next);
            void persistView(next);
        },
        [availableViews, persistView, updateUrl],
    );

    return {
        view,
        setView,
        loading,
        availableViews,
    };
}
