'use client';

import { useEffect } from 'react';

import { NetlifyIdentityProvider } from '../components/auth';
import { IntegrationProvider } from '../components/crm/integration-context';
import { QuickActionSettingsProvider } from '../components/crm/quick-action-settings';

export function AppProviders({ children }: { children: React.ReactNode }) {
    useEffect(() => {
        async function loadTabler() {
            try {
                await import('@tabler/core/dist/js/tabler.min.js');
            } catch (error) {
                console.error('Failed to load Tabler scripts', error);
            }
        }

        void loadTabler();
    }, []);

    return (
        <NetlifyIdentityProvider>
            <QuickActionSettingsProvider>
                <IntegrationProvider>{children}</IntegrationProvider>
            </QuickActionSettingsProvider>
        </NetlifyIdentityProvider>
    );
}
