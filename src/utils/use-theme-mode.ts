import * as React from 'react';

type ThemeMode = 'light' | 'dark';

const STORAGE_KEY = 'crm-theme-preference';

function resolvePreferredTheme(): ThemeMode {
    if (typeof window === 'undefined') {
        return 'light';
    }

    try {
        const stored = window.localStorage.getItem(STORAGE_KEY);
        if (stored === 'light' || stored === 'dark') {
            return stored;
        }
    } catch (error) {
        console.warn('Unable to read stored theme preference', error);
    }

    if (typeof window !== 'undefined' && window.matchMedia) {
        const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
        if (mediaQuery.matches) {
            return 'dark';
        }
    }

    return 'light';
}

function applyTheme(theme: ThemeMode) {
    if (typeof document === 'undefined') {
        return;
    }

    const root = document.documentElement;
    if (theme === 'dark') {
        root.classList.add('dark');
    } else {
        root.classList.remove('dark');
    }
    root.style.colorScheme = theme === 'dark' ? 'dark' : 'light';
}

export function useThemeMode() {
    const [theme, setTheme] = React.useState<ThemeMode>(() => {
        if (typeof window === 'undefined') {
            return 'light';
        }
        return resolvePreferredTheme();
    });
    const hasMounted = React.useRef(false);

    React.useEffect(() => {
        const initialTheme = resolvePreferredTheme();
        setTheme(initialTheme);
    }, []);

    React.useEffect(() => {
        if (!hasMounted.current) {
            hasMounted.current = true;
        }

        applyTheme(theme);

        try {
            if (typeof window !== 'undefined') {
                window.localStorage.setItem(STORAGE_KEY, theme);
            }
        } catch (error) {
            console.warn('Unable to persist theme preference', error);
        }
    }, [theme]);

    const toggleTheme = React.useCallback(() => {
        setTheme((current) => (current === 'dark' ? 'light' : 'dark'));
    }, []);

    return React.useMemo(
        () => ({
            theme,
            setTheme,
            toggleTheme
        }),
        [theme, toggleTheme]
    );
}
