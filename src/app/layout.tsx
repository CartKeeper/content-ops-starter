import '@tabler/core/dist/css/tabler.min.css';
import '@tabler/core/dist/css/tabler-flags.min.css';
import '@tabler/core/dist/css/tabler-payments.min.css';
import '@tabler/core/dist/css/tabler-vendors.min.css';
import '../css/main.css';

import type { Metadata } from 'next';
import { Roboto } from 'next/font/google';

import ClientFuse from '@/components/ClientFuse';
import GlobalErrorBoundary from '../components/GlobalErrorBoundary';
import { AppProviders } from './providers';

const roboto = Roboto({
    subsets: ['latin'],
    weight: ['400', '500', '700'],
    display: 'swap',
    variable: '--font-sans'
});

export const metadata: Metadata = {
    title: 'Studio Calendar',
    description: 'Manage studio events and tasks.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en" className="dark" suppressHydrationWarning>
            <body className={`${roboto.variable} min-h-screen bg-zinc-950 text-zinc-100 font-sans`}>
                <GlobalErrorBoundary>
                    <AppProviders>
                        {/* ⬇️ client-only wrapper so layout/provider loops are obvious */}
                        <ClientFuse>{children}</ClientFuse>
                    </AppProviders>
                </GlobalErrorBoundary>
            </body>
        </html>
    );
}
