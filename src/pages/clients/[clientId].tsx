import type { GetStaticPaths, GetStaticProps } from 'next';
import Link from 'next/link';
import { CRMLayout } from '../../components/crm/CRMLayout';
import type { Booking, Client, Invoice } from '../../lib/mock-data';
import { getBookings, getClients, getInvoices } from '../../lib/api';

function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

type ClientProfileProps = {
    client: Client;
    bookings: Booking[];
    invoices: Invoice[];
};

export default function ClientProfilePage({ client, bookings, invoices }: ClientProfileProps) {
    const upcomingBookings = bookings.filter((booking) => new Date(booking.date) >= new Date());
    const pastBookings = bookings.filter((booking) => new Date(booking.date) < new Date());

    return (
        <CRMLayout
            title={`Client: ${client.name}`}
            description="Review the full history of shoots, invoices and notes for this relationship."
            actions={
                <Link
                    href="/bookings"
                    className="inline-flex items-center rounded-lg border border-emerald-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-300 hover:text-emerald-200"
                >
                    Schedule follow-up
                </Link>
            }
        >
            <section className="grid gap-6 lg:grid-cols-[1.2fr,1fr]">
                <div className="space-y-6">
                    <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                        <h2 className="text-lg font-semibold text-white">Contact</h2>
                        <div className="mt-4 grid gap-4 text-sm text-slate-300 md:grid-cols-2">
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Email</p>
                                <p className="mt-1 text-white">{client.email}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Phone</p>
                                <p className="mt-1">{client.phone}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Location</p>
                                <p className="mt-1">{client.location}</p>
                            </div>
                            <div>
                                <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Last shoot</p>
                                <p className="mt-1">{formatDate(client.lastShootDate)}</p>
                            </div>
                        </div>
                        {client.notes && (
                            <p className="mt-4 rounded-xl border border-slate-800/80 bg-slate-950/60 p-4 text-sm text-slate-200">
                                {client.notes}
                            </p>
                        )}
                    </article>

                    <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Upcoming bookings</h2>
                            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{upcomingBookings.length}</span>
                        </div>
                        <div className="mt-4 space-y-4 text-sm">
                            {upcomingBookings.map((booking) => (
                                <div key={booking.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                                    <p className="text-sm font-semibold text-white">{booking.shootType}</p>
                                    <p className="text-xs text-slate-400">{booking.location}</p>
                                    <p className="mt-2 text-xs text-slate-300">{formatDate(booking.date)}</p>
                                </div>
                            ))}
                            {upcomingBookings.length === 0 && (
                                <p className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                                    No upcoming bookings scheduled.
                                </p>
                            )}
                        </div>
                    </article>

                    <article className="rounded-2xl border border-slate-800 bg-slate-900/50 p-6">
                        <div className="flex items-center justify-between">
                            <h2 className="text-lg font-semibold text-white">Past sessions</h2>
                            <span className="text-xs uppercase tracking-[0.3em] text-slate-400">{pastBookings.length}</span>
                        </div>
                        <div className="mt-4 space-y-4 text-sm">
                            {pastBookings.map((booking) => (
                                <div key={booking.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                                    <p className="text-sm font-semibold text-white">{booking.shootType}</p>
                                    <p className="text-xs text-slate-400">{booking.location}</p>
                                    <p className="mt-2 text-xs text-slate-300">{formatDate(booking.date)}</p>
                                </div>
                            ))}
                            {pastBookings.length === 0 && (
                                <p className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                                    No session history recorded yet.
                                </p>
                            )}
                        </div>
                    </article>
                </div>

                <aside className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm">
                    <h2 className="text-lg font-semibold text-white">Billing timeline</h2>
                    <div className="space-y-3">
                        {invoices.map((invoice) => (
                            <div key={invoice.id} className="rounded-xl border border-slate-800/80 bg-slate-950/60 p-4">
                                <p className="text-sm font-semibold text-white">{invoice.description ?? 'Invoice'}</p>
                                <p className="text-xs text-slate-400">{invoice.status.toUpperCase()} • Due {formatDate(invoice.dueDate)}</p>
                            </div>
                        ))}
                        {invoices.length === 0 && (
                            <p className="rounded-xl border border-dashed border-slate-800/80 bg-slate-950/40 p-6 text-center text-xs text-slate-400">
                                No invoices yet—create one from the invoices tab.
                            </p>
                        )}
                    </div>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-200">
                        <p className="font-semibold uppercase tracking-[0.3em]">Next steps</p>
                        <p className="mt-2 text-sm text-emerald-50">
                            Share a client experience guide and collect testimonials after each session to strengthen retention.
                        </p>
                    </div>
                </aside>
            </section>
        </CRMLayout>
    );
}

export const getStaticPaths: GetStaticPaths = async () => {
    const clientsData = await getClients();
    return {
        paths: clientsData.map((client) => ({ params: { clientId: client.id } })),
        fallback: false
    };
};

export const getStaticProps: GetStaticProps<ClientProfileProps> = async ({ params }) => {
    const clientId = params?.clientId as string;
    const [clientsData, bookingsData, invoicesData] = await Promise.all([
        getClients(),
        getBookings(),
        getInvoices()
    ]);
    const client = clientsData.find((item) => item.id === clientId);
    if (!client) {
        return { notFound: true };
    }
    return {
        props: {
            client,
            bookings: bookingsData.filter((booking) => booking.clientId === clientId),
            invoices: invoicesData.filter((invoice) => invoice.clientId === clientId)
        }
    };
};
