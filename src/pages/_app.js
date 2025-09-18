import { useEffect } from 'react';

import '@tabler/core/dist/css/tabler.min.css';
import '@tabler/core/dist/css/tabler-flags.min.css';
import '@tabler/core/dist/css/tabler-payments.min.css';
import '@tabler/core/dist/css/tabler-vendors.min.css';
import '../css/main.css';

import { NetlifyIdentityProvider } from '../components/auth';
import { QuickActionSettingsProvider } from '../components/crm/quick-action-settings';

export default function MyApp({ Component, pageProps }) {
    useEffect(() => {
        async function loadTabler() {
            try {
                await import('@tabler/core/dist/js/tabler.min.js');
            } catch (error) {
                console.error('Failed to load Tabler scripts', error);
            }
        }

        loadTabler();
    }, []);

    return (
        <NetlifyIdentityProvider>
            <QuickActionSettingsProvider>
                <Component {...pageProps} />
            </QuickActionSettingsProvider>
        </NetlifyIdentityProvider>
    );
}
