import '@tabler/core/dist/css/tabler.min.css';
import '@tabler/core/dist/css/tabler-flags.min.css';
import '@tabler/core/dist/css/tabler-payments.min.css';
import '@tabler/core/dist/css/tabler-vendors.min.css';
import '../css/main.css';

import type { Metadata } from 'next';

import { AppProviders } from './providers';

export const metadata: Metadata = {
    title: 'Studio Calendar',
    description: 'Manage studio events and tasks.'
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
    return (
        <html lang="en">
            <body className="bg-body">
                <AppProviders>{children}</AppProviders>
            </body>
        </html>
    );
}
