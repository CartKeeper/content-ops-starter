import * as React from 'react';
import * as Dialog from '@radix-ui/react-dialog';
import Link from 'next/link';

import { formatCurrency, formatDate, formatRelative } from '../../lib/formatters';
import type { ClientProfile } from '../../lib/api/clients';

type ClientDrawerProps = {
    client: ClientProfile | null;
    open: boolean;
    onClose: () => void;
};

const TABS = ['Profile', 'Invoices', 'Notes', 'Activity', 'Files'] as const;
type TabId = (typeof TABS)[number];

export function ClientDrawer({ client, open, onClose }: ClientDrawerProps) {
    const [activeTab, setActiveTab] = React.useState<TabId>('Profile');
    const [copied, setCopied] = React.useState(false);

    React.useEffect(() => {
        if (open) {
            setActiveTab('Profile');
            setCopied(false);
        }
    }, [open, client?.id]);

    React.useEffect(() => {
        if (!copied) {
            return;
        }
        const timer = window.setTimeout(() => setCopied(false), 2000);
        return () => window.clearTimeout(timer);
    }, [copied]);

    if (!client) {
        return null;
    }

    const handleCopyLink = async () => {
        try {
            await navigator.clipboard.writeText(client.portalUrl ?? '');
            setCopied(true);
        } catch (error) {
            console.error('Failed to copy link', error);
        }
    };

    return (
        <Dialog.Root open={open} onOpenChange={(value) => (!value ? onClose() : undefined)}>
            <Dialog.Portal>
                <Dialog.Overlay className="fixed inset-0 bg-slate-950/60 backdrop-blur" />
                <Dialog.Content className="fixed right-0 top-0 z-50 flex h-full w-full max-w-xl flex-col gap-4 overflow-y-auto border-l border-slate-800 bg-slate-950/95 p-6 text-slate-100 shadow-2xl">
                    <header className="flex items-start justify-between gap-4">
                        <div>
                            <Dialog.Title className="text-xl font-semibold text-white">{client.name}</Dialog.Title>
                            <Dialog.Description className="text-sm text-slate-400">
                                {client.email || 'No email provided'} • {client.phone || 'No phone on file'}
                            </Dialog.Description>
                        </div>
                        <button
                            type="button"
                            onClick={onClose}
                            className="rounded-full border border-transparent bg-slate-800/80 p-2 text-slate-300 transition hover:border-slate-600 hover:text-white"
                            aria-label="Close"
                        >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-5 w-5">
                                <path
                                    fillRule="evenodd"
                                    d="M5.22 5.22a.75.75 0 0 1 1.06 0L10 8.94l3.72-3.72a.75.75 0 1 1 1.06 1.06L11.06 10l3.72 3.72a.75.75 0 1 1-1.06 1.06L10 11.06l-3.72 3.72a.75.75 0 0 1-1.06-1.06L8.94 10L5.22 6.28a.75.75 0 0 1 0-1.06Z"
                                    clipRule="evenodd"
                                />
                            </svg>
                        </button>
                    </header>

                    <div className="flex flex-wrap gap-2">
                        <Link
                            href={client.portalUrl ?? '#'}
                            className="rounded-full border border-indigo-400/50 bg-indigo-500/10 px-4 py-2 text-sm font-medium text-indigo-200 transition hover:border-indigo-300 hover:text-white"
                        >
                            Open client portal
                        </Link>
                        <button
                            type="button"
                            onClick={handleCopyLink}
                            className="rounded-full border border-slate-700 bg-slate-900/80 px-4 py-2 text-sm font-medium text-slate-200 transition hover:border-indigo-300 hover:text-white"
                        >
                            {copied ? 'Copied!' : 'Copy link'}
                        </button>
                        <Link
                            href={`/invoices?client=${encodeURIComponent(client.id)}`}
                            className="rounded-full bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-400 hover:via-purple-500 hover:to-indigo-600"
                        >
                            Create invoice
                        </Link>
                    </div>

                    <nav className="flex gap-2 overflow-x-auto rounded-full bg-slate-900/70 p-1 text-xs font-medium text-slate-300">
                        {TABS.map((tab) => (
                            <button
                                key={tab}
                                type="button"
                                onClick={() => setActiveTab(tab)}
                                className={`flex-1 rounded-full px-4 py-2 transition ${
                                    activeTab === tab
                                        ? 'bg-gradient-to-r from-indigo-500 via-purple-500 to-indigo-600 text-white shadow'
                                        : 'hover:text-white'
                                }`}
                            >
                                {tab}
                            </button>
                        ))}
                    </nav>

                    <section className="flex-1">
                        {activeTab === 'Profile' ? <ProfileTab client={client} /> : null}
                        {activeTab === 'Invoices' ? <InvoicesTab client={client} /> : null}
                        {activeTab === 'Notes' ? <NotesTab notes={client.notes} /> : null}
                        {activeTab === 'Activity' ? <ActivityTab client={client} /> : null}
                        {activeTab === 'Files' ? <FilesTab /> : null}
                    </section>
                </Dialog.Content>
            </Dialog.Portal>
        </Dialog.Root>
    );
}

function ProfileTab({ client }: { client: ClientProfile }) {
    return (
        <div className="grid gap-4">
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold text-white">Contact</h3>
                <dl className="mt-3 grid grid-cols-1 gap-3 text-sm text-slate-300">
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Email</dt>
                        <dd>{client.email ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Phone</dt>
                        <dd>{client.phone ?? '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Address</dt>
                        <dd>{client.address ?? '—'}</dd>
                    </div>
                </dl>
            </div>
            <div className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
                <h3 className="text-sm font-semibold text-white">Status</h3>
                <div className="mt-3 flex flex-wrap gap-2 text-xs">
                    <span className="rounded-full border border-indigo-400/40 bg-indigo-500/20 px-3 py-1 text-indigo-100">
                        {client.status}
                    </span>
                    {client.tags.map((tag) => (
                        <span
                            key={tag}
                            className="rounded-full border border-slate-700/80 bg-slate-800/70 px-3 py-1 text-slate-200"
                        >
                            {tag}
                        </span>
                    ))}
                </div>
                <dl className="mt-4 grid grid-cols-2 gap-3 text-sm text-slate-300">
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Outstanding balance</dt>
                        <dd>{formatCurrency(client.outstandingBalanceCents)}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Invoices</dt>
                        <dd>{client.invoices}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Last activity</dt>
                        <dd>{client.lastActivityAt ? formatRelative(client.lastActivityAt) : '—'}</dd>
                    </div>
                    <div>
                        <dt className="text-xs uppercase text-slate-500">Upcoming shoot</dt>
                        <dd>{client.upcomingShootAt ? formatDate(client.upcomingShootAt) : '—'}</dd>
                    </div>
                </dl>
            </div>
        </div>
    );
}

function InvoicesTab({ client }: { client: ClientProfile }) {
    if (client.invoicesHistory.length === 0) {
        return <p className="text-sm text-slate-400">No invoices recorded yet.</p>;
    }

    return (
        <ul className="space-y-3 text-sm text-slate-200">
            {client.invoicesHistory.map((invoice) => (
                <li key={invoice.id} className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-sm font-semibold text-white">{formatCurrency(invoice.amountCents)}</p>
                            <p className="text-xs text-slate-400">Due {invoice.dueDate ? formatDate(invoice.dueDate) : '—'}</p>
                        </div>
                        <span
                            className={`rounded-full px-3 py-1 text-xs font-semibold ${getInvoiceBadge(invoice.status)}`}
                        >
                            {invoice.status}
                        </span>
                    </div>
                    {invoice.pdfUrl ? (
                        <Link
                            href={invoice.pdfUrl}
                            className="mt-2 inline-flex items-center gap-2 text-xs text-indigo-300 hover:text-white"
                        >
                            View PDF
                        </Link>
                    ) : null}
                </li>
            ))}
        </ul>
    );
}

function NotesTab({ notes }: { notes: string | null }) {
    if (!notes) {
        return <p className="text-sm text-slate-400">No notes captured yet. Capture key preferences and reminders here.</p>;
    }

    return <p className="whitespace-pre-line text-sm leading-relaxed text-slate-200">{notes}</p>;
}

function ActivityTab({ client }: { client: ClientProfile }) {
    const items = [
        client.lastActivityAt
            ? {
                  id: 'activity-last',
                  label: 'Last activity',
                  detail: formatRelative(client.lastActivityAt),
                  subLabel: client.lastActivityAt ? formatDate(client.lastActivityAt) : '—'
              }
            : null,
        client.lastShootAt
            ? {
                  id: 'activity-shoot',
                  label: 'Last shoot completed',
                  detail: formatDate(client.lastShootAt)
              }
            : null,
        client.upcomingShootAt
            ? {
                  id: 'activity-upcoming',
                  label: 'Next shoot scheduled',
                  detail: formatDate(client.upcomingShootAt)
              }
            : null
    ].filter(Boolean) as Array<{ id: string; label: string; detail: string; subLabel?: string }>;

    if (items.length === 0) {
        return <p className="text-sm text-slate-400">No activity tracked yet. Log shoots and touchpoints to see them here.</p>;
    }

    return (
        <ol className="space-y-3 text-sm text-slate-200">
            {items.map((item) => (
                <li key={item.id} className="rounded-2xl border border-slate-800/60 bg-slate-900/70 p-4">
                    <p className="font-semibold text-white">{item.label}</p>
                    <p className="text-sm text-slate-300">{item.detail}</p>
                    {item.subLabel ? <p className="text-xs text-slate-500">{item.subLabel}</p> : null}
                </li>
            ))}
        </ol>
    );
}

function FilesTab() {
    return (
        <div className="rounded-2xl border border-dashed border-slate-700 bg-slate-900/40 p-6 text-center text-sm text-slate-400">
            Drop files or sync a gallery to attach resources. <span className="text-slate-200">Coming soon.</span>
        </div>
    );
}

function getInvoiceBadge(status: ClientProfile['invoicesHistory'][number]['status']): string {
    switch (status) {
        case 'Paid':
            return 'bg-emerald-500/20 text-emerald-200';
        case 'Overdue':
            return 'bg-rose-500/20 text-rose-200';
        case 'Sent':
            return 'bg-indigo-500/20 text-indigo-200';
        default:
            return 'bg-slate-500/20 text-slate-200';
    }
}

export default ClientDrawer;

