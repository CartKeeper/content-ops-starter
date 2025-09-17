import * as React from 'react';

export function useAutoDismiss(trigger: unknown, onClear: () => void, timeoutMs = 6000) {
    React.useEffect(() => {
        if (!trigger || typeof window === 'undefined') {
            return;
        }

        const timeout = window.setTimeout(onClear, timeoutMs);
        return () => window.clearTimeout(timeout);
    }, [trigger, onClear, timeoutMs]);
}
