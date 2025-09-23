import { useEffect } from 'react';
import type { AppProps } from 'next/app';
import Head from 'next/head';
import { Roboto } from 'next/font/google';

import '@tabler/core/dist/css/tabler.min.css';
import '@tabler/core/dist/css/tabler-flags.min.css';
import '@tabler/core/dist/css/tabler-payments.min.css';
import '@tabler/core/dist/css/tabler-vendors.min.css';
import '../css/main.css';

import GlobalErrorBoundary from '../components/GlobalErrorBoundary';
import { NetlifyIdentityProvider } from '../components/auth';
import { QuickActionSettingsProvider } from '../components/crm/quick-action-settings';
import { IntegrationProvider } from '../components/crm/integration-context';
import { ThemeProvider } from '../components/theme/ThemeProvider';
import { ProductTourProvider } from '../providers/ProductTourProvider';

const roboto = Roboto({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    display: 'swap',
    variable: '--font-sans'
});

export default function MyApp({ Component, pageProps }: AppProps) {
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
        <div className={`${roboto.variable} dark min-h-screen bg-zinc-950 text-zinc-100 font-sans`}>
            <ProductTourProvider>
                <Head>
                    <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
                </Head>
                <ThemeProvider>
                    <NetlifyIdentityProvider>
                        <QuickActionSettingsProvider>
                            <IntegrationProvider>
                                <GlobalErrorBoundary>
                                    <Component {...pageProps} />
                                </GlobalErrorBoundary>
                            </IntegrationProvider>
                        </QuickActionSettingsProvider>
                    </NetlifyIdentityProvider>
                </ThemeProvider>
            </ProductTourProvider>
        </div>
    );
}
