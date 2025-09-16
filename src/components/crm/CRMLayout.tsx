import Link from 'next/link';
import { useRouter } from 'next/router';
import type { ReactNode } from 'react';
import { getCurrentUser } from '../../lib/auth';

const navigation = [
    { label: 'Dashboard', href: '/' },
    { label: 'Clients', href: '/clients' },
    { label: 'Bookings', href: '/bookings' },
    { label: 'Invoices', href: '/invoices' },
    { label: 'Galleries', href: '/gallery' },
    { label: 'Settings', href: '/settings' }
];

type CRMLayoutProps = {
    title: string;
    description?: string;
    actions?: ReactNode;
    children: ReactNode;
};

export function CRMLayout({ title, description, actions, children }: CRMLayoutProps) {
    const router = useRouter();
    const user = getCurrentUser();

    return (
        <div className="min-h-screen bg-slate-950 text-slate-100">
            <div className="border-b border-slate-900 bg-slate-950/60 backdrop-blur">
                <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-6">
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Photographers CRM</p>
                        <h1 className="text-2xl font-semibold text-white">{user.brandName ?? 'Studio Dashboard'}</h1>
                    </div>
                    <div className="flex items-center gap-3">
                        <div className="text-right">
                            <p className="text-sm font-medium text-white">{user.name}</p>
                            <p className="text-xs text-slate-400">{user.role}</p>
                        </div>
                        <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-500/20 text-emerald-300">
                            {user.name
                                .split(' ')
                                .map((segment) => segment[0])
                                .join('')
                                .slice(0, 2)}
                        </div>
                    </div>
                </div>
            </div>

            <div className="mx-auto flex max-w-7xl flex-col gap-8 px-6 py-10 lg:flex-row">
                <nav className="w-full max-w-xs space-y-1 text-sm text-slate-300">
                    {navigation.map((item) => {
                        const isActive = router.pathname === item.href;
                        return (
                            <Link
                                key={item.href}
                                href={item.href}
                                className={`flex items-center justify-between rounded-lg px-4 py-3 transition ${
                                    isActive
                                        ? 'bg-emerald-500/10 text-emerald-200 ring-1 ring-emerald-500/40'
                                        : 'hover:bg-slate-900 hover:text-white'
                                }`}
                            >
                                <span>{item.label}</span>
                                {isActive && (
                                    <span className="text-xs font-semibold uppercase tracking-wide text-emerald-300">
                                        Active
                                    </span>
                                )}
                            </Link>
                        );
                    })}
                </nav>

                <main className="flex-1">
                    <header className="mb-8 space-y-3">
                        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">{title}</p>
                                {description && <p className="mt-2 max-w-2xl text-sm text-slate-300">{description}</p>}
                            </div>
                            {actions && <div className="flex items-center gap-3">{actions}</div>}
                        </div>
                    </header>
                    <div className="space-y-8">{children}</div>
                </main>
            </div>
        </div>
    );
}
