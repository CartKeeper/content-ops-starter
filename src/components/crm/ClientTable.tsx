import Link from 'next/link';
import type { Client } from '../../lib/mock-data';
import { getClientById } from '../../lib/api';

function formatDate(date: string) {
    return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(date));
}

type ClientTableProps = {
    clients: Client[];
};

export function ClientTable({ clients }: ClientTableProps) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-900/50">
            <table className="min-w-full divide-y divide-slate-800 text-sm">
                <thead className="bg-slate-900/80">
                    <tr className="text-left text-xs uppercase tracking-[0.25em] text-slate-400">
                        <th scope="col" className="px-6 py-4">
                            Client
                        </th>
                        <th scope="col" className="px-6 py-4">
                            Contact
                        </th>
                        <th scope="col" className="px-6 py-4">
                            Last Shoot
                        </th>
                        <th scope="col" className="px-6 py-4">
                            Tags
                        </th>
                        <th scope="col" className="px-6 py-4 text-right">
                            Actions
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/80">
                    {clients.map((client) => (
                        <tr key={client.id} className="text-slate-200 transition hover:bg-slate-900">
                            <td className="px-6 py-4">
                                <p className="font-medium text-white">{client.name}</p>
                                <p className="text-xs text-slate-400">{client.location}</p>
                            </td>
                            <td className="px-6 py-4">
                                <p>{client.email}</p>
                                <p className="text-xs text-slate-400">{client.phone}</p>
                            </td>
                            <td className="px-6 py-4 text-slate-300">{formatDate(client.lastShootDate)}</td>
                            <td className="px-6 py-4">
                                <div className="flex flex-wrap gap-2">
                                    {client.tags.map((tag) => (
                                        <span
                                            key={tag}
                                            className="inline-flex items-center rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-medium text-emerald-300"
                                        >
                                            {tag}
                                        </span>
                                    ))}
                                </div>
                            </td>
                            <td className="px-6 py-4 text-right text-xs">
                                <Link href={`/clients/${client.id}`} className="font-semibold text-emerald-300 hover:text-emerald-200">
                                    View timeline
                                </Link>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export async function fetchClientSummary(clientId: string) {
    const client = await getClientById(clientId);
    if (!client) {
        return undefined;
    }
    return {
        name: client.name,
        location: client.location,
        lastShootDate: formatDate(client.lastShootDate)
    };
}
