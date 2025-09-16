import dayjs from 'dayjs';
import type { GetStaticProps } from 'next';
import Link from 'next/link';

import { CRMLayout } from '../../components/crm/CRMLayout';
import { ClientTable, type ClientRecord, type ClientStatus } from '../../components/crm/ClientTable';
import type { Booking, Client } from '../../lib/mock-data';
import { getBookings, getClients } from '../../lib/api';

interface ClientsPageProps {
    clients: ClientRecord[];
}

export default function ClientsPage({ clients }: ClientsPageProps) {
    return (
        <CRMLayout
            title="Client Directory"
            description="Manage every relationship from lead intake through gallery delivery and anniversaries."
            actions={
                <Link
                    href="/bookings"
                    className="inline-flex items-center rounded-lg border border-emerald-500/40 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300 transition hover:border-emerald-300 hover:text-emerald-200"
                >
                    New booking
                </Link>
            }
        >
            <section className="space-y-6">
                <div className="flex flex-wrap items-center justify-between gap-4">
                    <div>
                        <h2 className="text-lg font-semibold text-white">All clients</h2>
                        <p className="text-xs uppercase tracking-[0.3em] text-slate-400">Filter by shoot type, tags or last touchpoint</p>
                    </div>
                    <div className="flex flex-wrap gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-emerald-300">
                        <button className="rounded-full border border-emerald-500/40 px-4 py-2 hover:border-emerald-300 hover:text-emerald-200">
                            Import CSV
                        </button>
                        <button className="rounded-full border border-emerald-500/40 px-4 py-2 hover:border-emerald-300 hover:text-emerald-200">
                            Add tag
                        </button>
                    </div>
                </div>
                <ClientTable clients={clients} />
            </section>
        </CRMLayout>
    );
}

export const getStaticProps: GetStaticProps<ClientsPageProps> = async () => {
    const [clientsData, bookingsData] = await Promise.all([getClients(), getBookings()]);

    return {
        props: {
            clients: buildClientRecords(clientsData, bookingsData)
        }
    };
};

function buildClientRecords(clientsData: Client[], bookingsData: Booking[]): ClientRecord[] {
    return clientsData.map((client) => {
        const clientBookings = bookingsData.filter((booking) => booking.clientId === client.id);
        const now = dayjs();
        const sortedBookings = [...clientBookings].sort((a, b) => dayjs(a.date).valueOf() - dayjs(b.date).valueOf());
        const upcomingBooking = sortedBookings.find((booking) => dayjs(booking.date).isAfter(now));
        const completedBookings = sortedBookings.filter((booking) => !dayjs(booking.date).isAfter(now));
        const lastCompletedBooking = completedBookings[completedBookings.length - 1];
        const lastShoot = lastCompletedBooking?.date ?? client.lastShootDate ?? null;
        const upcomingShoot = upcomingBooking?.date ?? null;

        return {
            id: client.id,
            name: client.name,
            email: client.email,
            phone: client.phone,
            shoots: clientBookings.length,
            lastShoot,
            upcomingShoot,
            status: deriveClientStatus(lastShoot, upcomingShoot, completedBookings.length)
        };
    });
}

function deriveClientStatus(
    lastShoot: string | null,
    upcomingShoot: string | null,
    completedShoots = 0
): ClientStatus {
    if (upcomingShoot) {
        return 'Active';
    }

    if (!lastShoot) {
        return completedShoots > 0 ? 'Active' : 'Lead';
    }

    const parsedLastShoot = dayjs(lastShoot);

    if (parsedLastShoot.isValid() && dayjs().diff(parsedLastShoot, 'month') >= 12) {
        return 'Archived';
    }

    return completedShoots > 0 ? 'Active' : 'Lead';
}
