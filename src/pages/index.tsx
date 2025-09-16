import type { GetStaticProps } from 'next';
import Link from 'next/link';
import { CRMLayout } from '../components/crm/CRMLayout';
import { DashboardCard } from '../components/crm/DashboardCard';
import { Booking, Client, Invoice } from '../lib/mock-data';
import { getBookings, getClients, getInvoices } from '../lib/api';

function formatCurrency(amount: number) {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
}

type DashboardPageProps = {
    clients: Client[];
    bookings: Booking[];
    invoices: Invoice[];
};

export default function DashboardPage({ clients, bookings, invoices }: DashboardPageProps) {
    const outstandingInvoices = invoices.filter((invoice) => invoice.status !== 'paid');
    const outstandingTotal = outstandingInvoices.reduce((sum, invoice) => sum + invoice.amount, 0);
    const upcomingBookings = bookings
        .filter((booking) => new Date(booking.date) >= new Date())
        .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
    const nextBooking = upcomingBookings[0];
    const completedThisMonth = bookings.filter((booking) => {
        const bookingDate = new Date(booking.date);
        const now = new Date();
        return (
            booking.status === 'completed' &&
            bookingDate.getMonth() === now.getMonth() &&
            bookingDate.getFullYear() === now.getFullYear()
        );
    });

    return (
        <CRMLayout
            title="Studio Overview"
            description="Track clients, shoots, invoices and delivery milestones from one centralized photographer workspace."
            actions={
                <Link
                    href="/bookings"
                    className="inline-flex items-center rounded-lg border border-emerald-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-300 hover:text-emerald-200"
                >
                    View calendar
                </Link>
            }
        >
            <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                <DashboardCard title="Active clients" value={String(clients.length)}>
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-emerald-500">
                        Across weddings, portraits & recurring sessions
                    </p>
                    <p className="mt-3 leading-relaxed text-slate-600">
                        Add upcoming clients directly from inquiry forms or the CRM to keep your pipeline visible.
                    </p>
                </DashboardCard>
                <DashboardCard
                    title="Upcoming shoots"
                    value={String(upcomingBookings.length)}
                    trend={
                        nextBooking
                            ? {
                                  value: new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(
                                      new Date(nextBooking.date)
                                  ),
                                  label: `Next: ${nextBooking.shootType}`
                              }
                            : {
                                  value: 'No shoots scheduled',
                                  isPositive: false
                              }
                    }
                >
                    <p className="leading-relaxed text-slate-600">
                        Confirm shot lists, assistants and gear prep ahead of time so every production runs smoothly.
                    </p>
                </DashboardCard>
                <DashboardCard
                    title="Outstanding invoices"
                    value={formatCurrency(outstandingTotal)}
                    trend={{
                        value: `${outstandingInvoices.length} open`,
                        label: 'Awaiting payment',
                        isPositive: outstandingInvoices.length === 0
                    }}
                >
                    <p className="leading-relaxed text-slate-600">
                        Send payment reminders or convert drafts into final invoices before the due date hits.
                    </p>
                </DashboardCard>
                <DashboardCard
                    title="Completed this month"
                    value={String(completedThisMonth.length)}
                    trend={{
                        value: `${completedThisMonth.length} delivered`,
                        label: 'Ready for testimonials'
                    }}
                >
                    <p className="leading-relaxed text-slate-600">
                        Celebrate the wins—archive galleries, request reviews and update your portfolio.
                    </p>
                </DashboardCard>
            </section>

            <section className="grid gap-6 lg:grid-cols-2">
                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Upcoming schedule</h2>
                        <Link href="/bookings" className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
                            Open calendar
                        </Link>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">Next 5 sessions</p>
                    <div className="mt-4 space-y-4 text-sm">
                        {upcomingBookings.slice(0, 5).map((booking) => (
                            <div key={booking.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                                <p className="text-sm font-semibold text-white">{booking.shootType}</p>
                                <p className="text-xs text-slate-400">{booking.location}</p>
                                <div className="mt-2 flex items-center justify-between text-xs text-slate-400">
                                    <span>
                                        {new Intl.DateTimeFormat('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        }).format(new Date(booking.date))}
                                    </span>
                                    <span>
                                        {booking.startTime} – {booking.endTime}
                                    </span>
                                    <span className="capitalize">{booking.status}</span>
                                </div>
                            </div>
                        ))}
                        {upcomingBookings.length === 0 && (
                            <p className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                                All clear! Add a shoot from the bookings page to populate your schedule.
                            </p>
                        )}
                    </div>
                </div>

                <div className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                    <div className="flex items-center justify-between">
                        <h2 className="text-lg font-semibold text-white">Outstanding balances</h2>
                        <Link href="/invoices" className="text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
                            Manage invoices
                        </Link>
                    </div>
                    <p className="mt-2 text-xs uppercase tracking-[0.3em] text-slate-400">Clients to follow up</p>
                    <div className="mt-4 space-y-4 text-sm">
                        {outstandingInvoices.map((invoice) => {
                            const client = clients.find((item) => item.id === invoice.clientId);
                            return (
                                <div key={invoice.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                                    <p className="text-sm font-semibold text-white">
                                        {client?.name ?? 'Unknown client'}
                                    </p>
                                    <div className="mt-1 flex items-center justify-between text-xs text-slate-400">
                                        <span>{invoice.description ?? 'Invoice due soon'}</span>
                                        <span className="font-semibold text-emerald-300">{formatCurrency(invoice.amount)}</span>
                                    </div>
                                    <p className="mt-2 text-xs text-slate-400">
                                        Due on{' '}
                                        {new Intl.DateTimeFormat('en-US', {
                                            month: 'short',
                                            day: 'numeric',
                                            year: 'numeric'
                                        }).format(new Date(invoice.dueDate))}
                                    </p>
                                </div>
                            );
                        })}
                        {outstandingInvoices.length === 0 && (
                            <p className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                                All invoices paid—great job staying on top of cash flow!
                            </p>
                        )}
                    </div>
                </div>
            </section>

            <section className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">Quick actions</h2>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">
                            Jump straight into your most common workflows
                        </p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
                        <Link href="/clients" className="rounded-full border border-emerald-500/40 px-4 py-2 hover:border-emerald-300 hover:text-emerald-200">
                            Add client
                        </Link>
                        <Link href="/bookings" className="rounded-full border border-emerald-500/40 px-4 py-2 hover:border-emerald-300 hover:text-emerald-200">
                            Schedule shoot
                        </Link>
                        <Link href="/invoices" className="rounded-full border border-emerald-500/40 px-4 py-2 hover:border-emerald-300 hover:text-emerald-200">
                            Send invoice
                        </Link>
                        <Link href="/gallery" className="rounded-full border border-emerald-500/40 px-4 py-2 hover:border-emerald-300 hover:text-emerald-200">
                            Deliver gallery
                        </Link>
                    </div>
                </div>
            </section>
        </CRMLayout>
    );
}

export const getStaticProps: GetStaticProps<DashboardPageProps> = async () => {
    const [clientsData, bookingsData, invoicesData] = await Promise.all([
        getClients(),
        getBookings(),
        getInvoices()
    ]);

    return {
        props: {
            clients: clientsData,
            bookings: bookingsData,
            invoices: invoicesData
        }
    };
};
