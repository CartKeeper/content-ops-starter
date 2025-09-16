import type { GetStaticProps } from 'next';
import Link from 'next/link';
import { CRMLayout } from '../../components/crm/CRMLayout';
import { BookingCalendar } from '../../components/crm/BookingCalendar';
import type { Booking, Client } from '../../lib/mock-data';
import { getBookings, getClients } from '../../lib/api';

interface BookingsPageProps {
    bookings: Booking[];
    clients: Client[];
}

export default function BookingsPage({ bookings, clients }: BookingsPageProps) {
    return (
        <CRMLayout
            title="Booking Calendar"
            description="Keep every shoot aligned—assign assistants, confirm locations and prepare shot lists in one place."
            actions={
                <Link
                    href="/invoices"
                    className="inline-flex items-center rounded-lg border border-emerald-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-300 hover:text-emerald-200"
                >
                    Send invoice
                </Link>
            }
        >
            <section className="grid gap-6 lg:grid-cols-[2fr,1fr]">
                <BookingCalendar bookings={bookings} />
                <aside className="space-y-6 rounded-2xl border border-slate-800 bg-slate-900/50 p-6 text-sm">
                    <h2 className="text-lg font-semibold text-white">Production checklist</h2>
                    <ul className="space-y-3 text-slate-300">
                        <li>• Confirm contracts and retainers are signed.</li>
                        <li>• Share timeline and shot list with second shooters.</li>
                        <li>• Prep gear kit and charge batteries the night before.</li>
                        <li>• Block travel time and parking details in your calendar.</li>
                    </ul>
                    <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4 text-xs text-emerald-100">
                        <p className="font-semibold uppercase tracking-[0.3em]">Pro tip</p>
                        <p className="mt-2 text-sm text-emerald-50">
                            Tag shoots with "editing" or "delivery" so you know which sessions still need a gallery follow up.
                        </p>
                    </div>
                    <div>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Clients on deck</p>
                        <div className="mt-3 space-y-2 text-sm text-slate-300">
                            {clients.slice(0, 5).map((client) => (
                                <div key={client.id} className="flex items-center justify-between">
                                    <span>{client.name}</span>
                                    <span className="text-xs text-slate-500">{client.location}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                </aside>
            </section>
        </CRMLayout>
    );
}

export const getStaticProps: GetStaticProps<BookingsPageProps> = async () => {
    const [bookingsData, clientsData] = await Promise.all([getBookings(), getClients()]);
    return {
        props: {
            bookings: bookingsData,
            clients: clientsData
        }
    };
};
