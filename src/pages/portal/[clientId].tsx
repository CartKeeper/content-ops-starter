import * as React from 'react';
import Head from 'next/head';
import type { GetServerSideProps, GetServerSidePropsContext } from 'next';

import { getSupabaseClient } from '../../utils/supabase-client';

const currencyFormatter = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2
});

const dateFormatter = new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric'
});

type PortalProps = {
    client: Record<string, unknown> | null;
    galleries: Array<Record<string, unknown>>;
    billingAccount: Record<string, unknown> | null;
    calendarEvents: Array<Record<string, unknown>>;
    invoiceHistory: Array<Record<string, unknown>>;
    error?: string | null;
};

const DEFAULT_PROPS: PortalProps = {
    client: null,
    galleries: [],
    billingAccount: null,
    calendarEvents: [],
    invoiceHistory: [],
    error: 'Client portal data is currently unavailable.'
};

type PortalTab = 'gallery' | 'billing' | 'invoices' | 'calendar';

export default function ClientPortalPage({ client, galleries, billingAccount, calendarEvents, invoiceHistory, error }: PortalProps) {
    const [tab, setTab] = React.useState<PortalTab>('gallery');

    const clientName = React.useMemo(() => {
        if (!client) {
            return 'Client portal';
        }

        const first = typeof client.first_name === 'string' ? client.first_name.trim() : '';
        const last = typeof client.last_name === 'string' ? client.last_name.trim() : '';
        const business = typeof client.business === 'string' ? client.business.trim() : '';
        const fullName = [first, last].filter(Boolean).join(' ');
        return fullName || business || 'Client portal';
    }, [client]);

    return (
        <div className="min-h-screen bg-slate-50 pb-24 text-slate-900 dark:bg-slate-950 dark:text-slate-100">
            <Head>
                <title>{clientName} | Codex Client Portal</title>
            </Head>
            <header className="border-b border-slate-200 bg-white/90 px-6 py-10 shadow-sm backdrop-blur dark:border-slate-800 dark:bg-slate-950/80">
                <div className="mx-auto flex max-w-5xl flex-col gap-6">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.4em] text-indigo-500 dark:text-indigo-300">Client portal</p>
                        <h1 className="mt-2 text-3xl font-semibold tracking-tight text-slate-900 dark:text-white">{clientName}</h1>
                        {client && client.client_number ? (
                            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">Client number: {client.client_number as string}</p>
                        ) : null}
                        {client && client.portal_url ? (
                            <p className="mt-1 text-xs text-slate-400">Portal link: {client.portal_url as string}</p>
                        ) : null}
                    </div>
                    <nav className="flex gap-3 overflow-x-auto">
                        {[
                            { id: 'gallery', label: 'Gallery' },
                            { id: 'billing', label: 'Billing' },
                            { id: 'invoices', label: 'Invoices' },
                            { id: 'calendar', label: 'Calendar' }
                        ].map((item) => {
                            const isActive = tab === (item.id as PortalTab);
                            return (
                                <button
                                    key={item.id}
                                    type="button"
                                    onClick={() => setTab(item.id as PortalTab)}
                                    className={`rounded-2xl px-4 py-2 text-sm font-semibold transition focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:focus-visible:ring-offset-slate-950 ${
                                        isActive
                                            ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-500/25 dark:bg-indigo-500'
                                            : 'border border-slate-200 bg-white text-slate-600 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:bg-slate-800'
                                    }`}
                                >
                                    {item.label}
                                </button>
                            );
                        })}
                    </nav>
                </div>
            </header>
            <main className="mx-auto mt-10 w-full max-w-5xl px-6">
                {error ? (
                    <div className="rounded-3xl border border-rose-200 bg-rose-50/70 p-6 text-sm text-rose-700 dark:border-rose-500/40 dark:bg-rose-500/10 dark:text-rose-200">
                        {error}
                    </div>
                ) : null}

                {!client && !error ? (
                    <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-slate-500 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        The requested client could not be found.
                    </div>
                ) : null}

                {client ? (
                    <section className="mt-6">
                        {tab === 'gallery' ? <GalleryTab galleries={galleries} /> : null}
                        {tab === 'billing' ? <BillingTab billingAccount={billingAccount} /> : null}
                        {tab === 'invoices' ? <InvoicesTab invoiceHistory={invoiceHistory} /> : null}
                        {tab === 'calendar' ? <CalendarTab events={calendarEvents} /> : null}
                    </section>
                ) : null}
            </main>
        </div>
    );
}

type GalleryTabProps = {
    galleries: Array<Record<string, unknown>>;
};

function GalleryTab({ galleries }: GalleryTabProps) {
    if (!galleries.length) {
        return (
            <EmptyState
                title="No galleries yet"
                description="Once your photographer publishes a set, it will appear here with download links and favourite tools."
            />
        );
    }

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {galleries.map((gallery) => {
                const status = typeof gallery.status === 'string' ? gallery.status : 'draft';
                const created = typeof gallery.created_at === 'string' ? formatDate(gallery.created_at) : null;
                const name = typeof gallery.gallery_name === 'string' ? gallery.gallery_name : 'Untitled gallery';
                const url = typeof gallery.gallery_url === 'string' ? gallery.gallery_url : null;
                return (
                    <article key={(gallery.id as string) ?? name} className="flex flex-col gap-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-start justify-between gap-4">
                            <div>
                                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">{name}</h2>
                                {created ? <p className="text-xs text-slate-400">Created {created}</p> : null}
                            </div>
                            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-300">
                                {status}
                            </span>
                        </div>
                        <p className="text-sm text-slate-500 dark:text-slate-400">
                            Your gallery includes high-resolution downloads, favourites, and optional proofing feedback.
                        </p>
                        {url ? (
                            <a
                                href={url}
                                className="inline-flex w-fit items-center justify-center rounded-2xl border border-transparent bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500 focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400 focus-visible:ring-offset-2 focus-visible:ring-offset-white dark:bg-indigo-500 dark:hover:bg-indigo-400 dark:focus-visible:ring-offset-slate-950"
                            >
                                Open gallery
                            </a>
                        ) : null}
                    </article>
                );
            })}
        </div>
    );
}

type BillingTabProps = {
    billingAccount: Record<string, unknown> | null;
};

function BillingTab({ billingAccount }: BillingTabProps) {
    if (!billingAccount) {
        return (
            <EmptyState
                title="Billing not configured"
                description="Your studio is getting billing ready. As soon as they add payment terms you will see them here."
            />
        );
    }

    const paymentTerms = typeof billingAccount.payment_terms === 'string' ? billingAccount.payment_terms : 'Due on receipt';
    const created = typeof billingAccount.created_at === 'string' ? formatDate(billingAccount.created_at) : null;

    return (
        <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Billing preferences</h2>
            <dl className="grid gap-4 sm:grid-cols-2">
                <div>
                    <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Payment terms</dt>
                    <dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">{paymentTerms}</dd>
                </div>
                {created ? (
                    <div>
                        <dt className="text-xs font-semibold uppercase tracking-[0.3em] text-slate-400">Created</dt>
                        <dd className="mt-1 text-sm text-slate-600 dark:text-slate-300">{created}</dd>
                    </div>
                ) : null}
            </dl>
            <p className="text-sm text-slate-500 dark:text-slate-400">
                Update your payment method or ask about retainers by contacting the studio team.
            </p>
        </div>
    );
}

type InvoicesTabProps = {
    invoiceHistory: Array<Record<string, unknown>>;
};

function InvoicesTab({ invoiceHistory }: InvoicesTabProps) {
    if (!invoiceHistory.length) {
        return (
            <EmptyState
                title="No invoices yet"
                description="When your studio issues an invoice you will see the running history here with payment status."
            />
        );
    }

    return (
        <div className="overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-sm dark:border-slate-800 dark:bg-slate-900">
            <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-100/70 text-left text-xs font-semibold uppercase tracking-[0.3em] text-slate-500 dark:bg-slate-900/60 dark:text-slate-300">
                    <tr>
                        <th scope="col" className="px-6 py-3">Invoice</th>
                        <th scope="col" className="px-6 py-3">Issued</th>
                        <th scope="col" className="px-6 py-3">Due</th>
                        <th scope="col" className="px-6 py-3">Total</th>
                        <th scope="col" className="px-6 py-3">Status</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                    {invoiceHistory.map((invoice) => {
                        const id = (invoice.id as string) ?? crypto.randomUUID();
                        const reference = typeof invoice.reference === 'string' && invoice.reference.trim()
                            ? invoice.reference.trim()
                            : `Invoice ${id.slice(0, 8)}`;
                        const issued = typeof invoice.issued_at === 'string' ? formatDate(invoice.issued_at) : '—';
                        const due = typeof invoice.due_at === 'string' ? formatDate(invoice.due_at) : '—';
                        const totalValue = typeof invoice.total === 'number' ? invoice.total : null;
                        const total = totalValue != null ? currencyFormatter.format(totalValue) : '—';
                        const status = typeof invoice.status === 'string' ? invoice.status : 'Pending';
                        return (
                            <tr key={id} className="bg-white text-slate-600 transition odd:bg-white even:bg-slate-50 dark:odd:bg-slate-900 dark:even:bg-slate-950">
                                <td className="px-6 py-3 font-semibold text-slate-700 dark:text-slate-200">{reference}</td>
                                <td className="px-6 py-3">{issued}</td>
                                <td className="px-6 py-3">{due}</td>
                                <td className="px-6 py-3">{total}</td>
                                <td className="px-6 py-3">
                                    <span className="inline-flex items-center rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-300">
                                        {status}
                                    </span>
                                </td>
                            </tr>
                        );
                    })}
                </tbody>
            </table>
        </div>
    );
}

type CalendarTabProps = {
    events: Array<Record<string, unknown>>;
};

function CalendarTab({ events }: CalendarTabProps) {
    if (!events.length) {
        return (
            <EmptyState
                title="No events scheduled"
                description="As soon as the studio books a shoot or reminder for you it will show up here."
            />
        );
    }

    return (
        <div className="space-y-4">
            {events.map((event) => {
                const id = (event.id as string) ?? crypto.randomUUID();
                const eventType = typeof event.event_type === 'string' ? event.event_type : 'Event';
                const eventDate = typeof event.event_date === 'string' ? formatDate(event.event_date) : 'Date pending';
                const notes = typeof event.notes === 'string' ? event.notes : null;
                return (
                    <article key={id} className="rounded-3xl border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                        <div className="flex items-center justify-between gap-4">
                            <h3 className="text-base font-semibold text-slate-900 dark:text-white">{eventType}</h3>
                            <span className="rounded-full border border-slate-200 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:border-slate-700 dark:text-slate-300">
                                {eventDate}
                            </span>
                        </div>
                        {notes ? <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">{notes}</p> : null}
                    </article>
                );
            })}
        </div>
    );
}

type EmptyStateProps = {
    title: string;
    description: string;
};

function EmptyState({ title, description }: EmptyStateProps) {
    return (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white/60 p-10 text-center text-slate-500 shadow-sm dark:border-slate-700 dark:bg-slate-900/40 dark:text-slate-400">
            <h2 className="text-lg font-semibold text-slate-700 dark:text-slate-200">{title}</h2>
            <p className="mt-2 text-sm">{description}</p>
        </div>
    );
}

function formatDate(value: unknown): string {
    if (typeof value === 'string') {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
            return dateFormatter.format(parsed);
        }
    }
    return '—';
}

export const getServerSideProps: GetServerSideProps<PortalProps> = async (
    context: GetServerSidePropsContext
) => {
    const clientId = context.params?.clientId;

    if (typeof clientId !== 'string' || clientId.trim() === '') {
        return { props: DEFAULT_PROPS };
    }

    let supabase;

    try {
        supabase = getSupabaseClient();
    } catch (error) {
        console.error('Supabase client unavailable for portal', error);
        return { props: { ...DEFAULT_PROPS, error: 'Supabase is not configured.' } };
    }

    try {
        const { data: client, error: clientError } = await supabase
            .from('clients')
            .select('*')
            .eq('id', clientId)
            .maybeSingle();

        if (clientError) {
            throw new Error(clientError.message ?? 'Unable to load client');
        }

        if (!client) {
            return { props: { ...DEFAULT_PROPS, error: null } };
        }

        const [{ data: galleries, error: galleryError }, { data: billingAccount, error: billingError }, { data: calendarEvents, error: calendarError }] = await Promise.all([
            supabase.from('galleries').select('*').eq('client_id', clientId).order('created_at', { ascending: false }),
            supabase.from('billing_accounts').select('*').eq('client_id', clientId).maybeSingle(),
            supabase.from('calendar_events').select('*').eq('client_id', clientId).order('event_date', { ascending: true })
        ]);

        if (galleryError) {
            throw new Error(galleryError.message ?? 'Unable to load galleries');
        }

        if (billingError) {
            throw new Error(billingError.message ?? 'Unable to load billing account');
        }

        if (calendarError) {
            throw new Error(calendarError.message ?? 'Unable to load calendar events');
        }

        const invoiceHistory = Array.isArray(billingAccount?.invoice_history)
            ? (billingAccount.invoice_history as Array<Record<string, unknown>>)
            : [];

        return {
            props: {
                client,
                galleries: galleries ?? [],
                billingAccount: billingAccount ?? null,
                calendarEvents: calendarEvents ?? [],
                invoiceHistory,
                error: null
            }
        };
    } catch (error) {
        console.error('Failed to build portal props', error);
        const message = error instanceof Error ? error.message : 'Unexpected portal error.';
        return {
            props: {
                ...DEFAULT_PROPS,
                error: message
            }
        };
    }
};
