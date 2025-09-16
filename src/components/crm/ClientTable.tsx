import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';

export type ClientStatus = 'Active' | 'Lead' | 'Archived';

export type ClientRecord = {
    id: string;
    name: string;
    company?: string;
    email: string;
    phone?: string;
    shoots: number;
    lastShoot: string;
    upcomingShoot?: string;
    status: ClientStatus;
};

const statusToneMap: Record<ClientStatus, StatusTone> = {
    Active: 'success',
    Lead: 'info',
    Archived: 'neutral'
};

const formatDate = (value?: string) => (value ? dayjs(value).format('MMM D, YYYY') : '—');

export function ClientTable({ clients }: { clients: ClientRecord[] }) {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200 dark:border-slate-800">
            <table className="min-w-full divide-y divide-slate-200 text-left dark:divide-slate-800">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500 dark:bg-slate-900 dark:text-slate-300">
                    <tr>
                        <th scope="col" className="px-5 py-3">
                            Client
                        </th>
                        <th scope="col" className="px-5 py-3">
                            Shoots
                        </th>
                        <th scope="col" className="px-5 py-3">
                            Last Session
                        </th>
                        <th scope="col" className="px-5 py-3">
                            Upcoming
                        </th>
                        <th scope="col" className="px-5 py-3">
                            Status
                        </th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm dark:divide-slate-800">
                    {clients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/60">
                            <td className="px-5 py-4">
                                <div className="font-medium text-slate-900 dark:text-white">{client.name}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">{client.email}</div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="text-sm font-medium text-slate-900 dark:text-white">{client.shoots}</div>
                                {client.phone && <div className="text-xs text-slate-500 dark:text-slate-400">{client.phone}</div>}
                            </td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(client.lastShoot)}</td>
                            <td className="px-5 py-4 text-slate-600 dark:text-slate-400">{formatDate(client.upcomingShoot)}</td>
                            <td className="px-5 py-4">
                                <StatusPill tone={statusToneMap[client.status]}>{client.status}</StatusPill>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
}

export default ClientTable;
