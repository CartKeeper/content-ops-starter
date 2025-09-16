import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';
import { CRM_BRAND_ACCENT_GLOW, CRM_BRAND_ACCENT_GLOW_SOFT } from './theme';

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
        <div className="relative overflow-hidden rounded-2xl border border-white/30 bg-white/75 shadow-lg backdrop-blur-lg dark:border-white/10 dark:bg-[#0d1c33]/70">
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -right-28 -top-24 h-64 w-64 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW}, transparent 65%)` }}
            />
            <span
                aria-hidden="true"
                className="pointer-events-none absolute -bottom-24 left-12 h-60 w-60 rounded-full blur-3xl"
                style={{ background: `radial-gradient(circle at center, ${CRM_BRAND_ACCENT_GLOW_SOFT}, transparent 70%)` }}
            />
            <table className="relative z-10 min-w-full divide-y divide-white/40 text-left dark:divide-white/10">
                <thead className="bg-white/40 text-xs font-semibold uppercase tracking-wide text-slate-600 backdrop-blur dark:bg-transparent dark:text-slate-300">
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
                <tbody className="divide-y divide-white/30 text-sm dark:divide-white/10">
                    {clients.map((client) => (
                        <tr key={client.id} className="transition hover:bg-[#2DD4BF]/10 dark:hover:bg-white/5">
                            <td className="px-5 py-4">
                                <div className="font-medium text-slate-900 dark:text-slate-50">{client.name}</div>
                                <div className="text-sm text-slate-500 dark:text-slate-400">{client.email}</div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="text-sm font-medium text-slate-900 dark:text-slate-50">{client.shoots}</div>
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
