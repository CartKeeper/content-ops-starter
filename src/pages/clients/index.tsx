import type { GetStaticProps } from 'next';
import Link from 'next/link';
import { CRMLayout } from '../../components/crm/CRMLayout';
import { ClientTable } from '../../components/crm/ClientTable';
import type { Client } from '../../lib/mock-data';
import { getClients } from '../../lib/api';

interface ClientsPageProps {
    clients: Client[];
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
    const clientsData = await getClients();
    return {
        props: {
            clients: clientsData
        }
    };
};
