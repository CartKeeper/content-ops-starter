import { useEffect } from 'react';
import Head from 'next/head';

import '@tabler/core/dist/css/tabler.min.css';
import '@tabler/core/dist/css/tabler-flags.min.css';
import '@tabler/core/dist/css/tabler-payments.min.css';
import '@tabler/core/dist/css/tabler-vendors.min.css';
import '../css/main.css';

import { NetlifyIdentityProvider } from '../components/auth';
import { QuickActionSettingsProvider } from '../components/crm/quick-action-settings';
import { IntegrationProvider } from '../components/crm/integration-context';
import { ThemeProvider } from '../components/theme/ThemeProvider';
import { ProductTourProvider } from '../providers/ProductTourProvider';

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
        <ProductTourProvider>
            <Head>
                <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
            </Head>
            <ThemeProvider>
                <NetlifyIdentityProvider>
                    <QuickActionSettingsProvider>
                        <IntegrationProvider>
                            <Component {...pageProps} />
                        </IntegrationProvider>
                    </QuickActionSettingsProvider>
                </NetlifyIdentityProvider>
            </ThemeProvider>
        </ProductTourProvider>
    );
}
