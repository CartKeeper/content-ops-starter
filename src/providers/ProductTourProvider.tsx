import * as React from 'react';
import { useRouter } from 'next/router';

import { isTourGloballyEnabled } from '../utils/feature-flags';

type StartTourOptions = {
    force?: boolean;
};

type StopTourOptions = {
    persistDismissed?: boolean;
};

export type ProductTourContextValue = {
    isEnabled: boolean;
    isReady: boolean;
    isActive: boolean;
    hasDismissed: boolean;
    startTour: (options?: StartTourOptions) => boolean;
    stopTour: (options?: StopTourOptions) => void;
    dismissTour: () => void;
    resetTour: () => void;
};

const STORAGE_KEY = 'tourDismissed';
const ENV_TOUR_ENABLED = isTourGloballyEnabled();
const OVERLAY_SELECTORS = [
    '.driver-overlay',
    '.driver-popover',
    '.driver-backdrop',
    '.driver-stage',
    '.driver-highlighted-element',
    '.react-joyride__overlay',
    '.react-joyride__spotlight',
    '.reactour__mask',
    '.reactour__helper',
    '.shepherd-modal-overlay-container',
    '.shepherd-content',
    '[data-tour-overlay]',
    '[data-driver="stage"]',
];
const ACTIVE_CLASSNAMES = ['driver-active', 'joyride-active', 'shepherd-active'];

declare global {
    interface Window {
        __productTour?: {
            start: (options?: StartTourOptions) => boolean;
            stop: (options?: StopTourOptions) => void;
            dismiss: () => void;
            reset: () => void;
            isEnabled: () => boolean;
            isActive: () => boolean;
        };
    }
}

function cleanOverlayElement(element: Element) {
    if (element instanceof HTMLElement) {
        element.removeAttribute('aria-hidden');
        element.removeAttribute('inert');
        element.style.removeProperty('pointer-events');
    } else if (element instanceof SVGElement) {
        element.removeAttribute('aria-hidden');
    }

    element.remove();
}

function removeTourArtifacts(): void {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;
    const body = document.body;

    if (root) {
        ACTIVE_CLASSNAMES.forEach((className) => root.classList.remove(className));
    }

    if (body) {
        ACTIVE_CLASSNAMES.forEach((className) => body.classList.remove(className));
        body.style.removeProperty('pointer-events');
        body.removeAttribute('inert');
        body.removeAttribute('aria-hidden');
    }

    OVERLAY_SELECTORS.forEach((selector) => {
        const nodes = Array.from(document.querySelectorAll(selector));
        nodes.forEach(cleanOverlayElement);
    });
}

function dispatchTourEvent(
    event: 'start' | 'stop' | 'dismiss' | 'reset',
    detail?: Record<string, unknown>,
): void {
    if (typeof window === 'undefined') {
        return;
    }

    window.dispatchEvent(
        new CustomEvent(`productTour:${event}`, {
            detail: detail ?? {},
        }),
    );
}

function readDismissedFlag(): boolean {
    if (typeof window === 'undefined') {
        return false;
    }

    try {
        return window.localStorage.getItem(STORAGE_KEY) === 'true';
    } catch (error) {
        console.warn('Product tour dismissal state could not be read from storage.', error);
        return false;
    }
}

function persistDismissedFlag(value: boolean): void {
    if (typeof window === 'undefined') {
        return;
    }

    try {
        if (value) {
            window.localStorage.setItem(STORAGE_KEY, 'true');
        } else {
            window.localStorage.removeItem(STORAGE_KEY);
        }
    } catch (error) {
        console.warn('Product tour dismissal state could not be persisted.', error);
    }
}

const ProductTourContext = React.createContext<ProductTourContextValue>({
    isEnabled: false,
    isReady: true,
    isActive: false,
    hasDismissed: false,
    startTour: () => false,
    stopTour: () => undefined,
    dismissTour: () => undefined,
    resetTour: () => undefined,
});

ProductTourContext.displayName = 'ProductTourContext';

export function ProductTourProvider({ children }: { children: React.ReactNode }) {
    const router = useRouter();
    const [isActive, setIsActive] = React.useState(false);
    const [hasDismissed, setHasDismissed] = React.useState(false);
    const [isReady, setIsReady] = React.useState<boolean>(() => typeof window === 'undefined');
    const pendingDebugStartRef = React.useRef(false);

    const stopTour = React.useCallback(
        (options: StopTourOptions = {}) => {
            setIsActive(false);
            removeTourArtifacts();
            dispatchTourEvent('stop', { persisted: options.persistDismissed ?? null });

            if (options.persistDismissed === true) {
                setHasDismissed(true);
                persistDismissedFlag(true);
            } else if (options.persistDismissed === false) {
                setHasDismissed(false);
                persistDismissedFlag(false);
            }
        },
        [],
    );

    const dismissTour = React.useCallback(() => {
        stopTour({ persistDismissed: true });
        dispatchTourEvent('dismiss');
    }, [stopTour]);

    const resetTour = React.useCallback(() => {
        persistDismissedFlag(false);
        setHasDismissed(false);
        removeTourArtifacts();
        dispatchTourEvent('reset');
    }, []);

    const startTour = React.useCallback(
        (options: StartTourOptions = {}) => {
            if (!ENV_TOUR_ENABLED) {
                return false;
            }

            if (isActive) {
                return true;
            }

            if (!isReady && !options.force) {
                return false;
            }

            if (hasDismissed && !options.force) {
                return false;
            }

            persistDismissedFlag(false);
            setHasDismissed(false);
            setIsActive(true);
            dispatchTourEvent('start', { forced: Boolean(options.force) });
            return true;
        },
        [hasDismissed, isActive, isReady],
    );

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        setHasDismissed(readDismissedFlag());
        setIsReady(true);
        if (!ENV_TOUR_ENABLED) {
            removeTourArtifacts();
        }
    }, []);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return undefined;
        }

        const handleStorage = (event: StorageEvent) => {
            if (event.key === STORAGE_KEY) {
                setHasDismissed(event.newValue === 'true');
            }
        };

        window.addEventListener('storage', handleStorage);
        return () => window.removeEventListener('storage', handleStorage);
    }, []);

    React.useEffect(() => {
        if (typeof document === 'undefined') {
            return undefined;
        }

        const root = document.documentElement;
        const body = document.body;

        if (isActive) {
            root.dataset.tourActive = 'true';
            if (body) {
                body.dataset.tourActive = 'true';
            }
        } else {
            delete root.dataset.tourActive;
            if (body) {
                delete body.dataset.tourActive;
            }
        }

        return () => {
            delete root.dataset.tourActive;
            if (body) {
                delete body.dataset.tourActive;
            }
        };
    }, [isActive]);

    React.useEffect(() => {
        if (isActive) {
            return undefined;
        }

        if (typeof document === 'undefined') {
            return undefined;
        }

        removeTourArtifacts();

        const target = document.body ?? document.documentElement;
        if (!target) {
            return undefined;
        }

        const observer = new MutationObserver(() => {
            removeTourArtifacts();
        });

        observer.observe(target, { childList: true, subtree: true });

        return () => {
            observer.disconnect();
        };
    }, [isActive]);

    React.useEffect(() => {
        if (!isActive) {
            return undefined;
        }

        const handleKeydown = (event: KeyboardEvent) => {
            if (event.key === 'Escape') {
                stopTour({ persistDismissed: true });
            }
        };

        window.addEventListener('keydown', handleKeydown);
        return () => window.removeEventListener('keydown', handleKeydown);
    }, [isActive, stopTour]);

    React.useEffect(() => {
        if (!router.isReady) {
            return;
        }

        const queryValue = router.query?.tour;
        const shouldTrigger = Array.isArray(queryValue)
            ? queryValue.some((entry) => entry === '1')
            : queryValue === '1';

        if (!shouldTrigger) {
            return;
        }

        pendingDebugStartRef.current = true;

        const nextQuery: Record<string, string | string[]> = { ...router.query };
        delete nextQuery.tour;

        void router.replace({ pathname: router.pathname, query: nextQuery }, undefined, { shallow: true });
    }, [router.isReady, router.pathname, router.query]);

    React.useEffect(() => {
        if (!pendingDebugStartRef.current) {
            return;
        }

        if (!ENV_TOUR_ENABLED) {
            pendingDebugStartRef.current = false;
            return;
        }

        if (!isReady) {
            return;
        }

        pendingDebugStartRef.current = false;
        startTour({ force: true });
    }, [isReady, startTour]);

    React.useEffect(() => {
        if (typeof window === 'undefined') {
            return;
        }

        const api = {
            start: (options?: StartTourOptions) => startTour(options),
            stop: (options?: StopTourOptions) => stopTour(options),
            dismiss: () => dismissTour(),
            reset: () => resetTour(),
            isEnabled: () => ENV_TOUR_ENABLED,
            isActive: () => isActive,
        };

        window.__productTour = api;

        return () => {
            if (window.__productTour === api) {
                delete window.__productTour;
            }
        };
    }, [dismissTour, isActive, resetTour, startTour, stopTour]);

    const contextValue = React.useMemo<ProductTourContextValue>(
        () => ({
            isEnabled: ENV_TOUR_ENABLED,
            isReady,
            isActive,
            hasDismissed,
            startTour,
            stopTour,
            dismissTour,
            resetTour,
        }),
        [dismissTour, hasDismissed, isActive, isReady, resetTour, startTour, stopTour],
    );

    return <ProductTourContext.Provider value={contextValue}>{children}</ProductTourContext.Provider>;
}

export function useProductTour(): ProductTourContextValue {
    return React.useContext(ProductTourContext);
}
