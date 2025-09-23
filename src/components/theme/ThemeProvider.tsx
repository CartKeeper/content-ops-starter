import * as React from 'react';

import { hydrateThemeFromServer } from '../../utils/theme-store';

type ThemeProviderProps = {
    children: React.ReactNode;
};

export function ThemeProvider({ children }: ThemeProviderProps) {
    React.useEffect(() => {
        void hydrateThemeFromServer();
    }, []);

    return <>{children}</>;
}
