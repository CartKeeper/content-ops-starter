import * as React from 'react';
import dayjs from 'dayjs';

import StatusPill, { StatusTone } from './StatusPill';
import type { Client } from '../../lib/mock-data';

export type ClientTableProps = {
    clients: Client[];
};

const statusToneMap: Record<Client['status'], StatusTone> = {
    Active: 'success',
    Lead: 'info',
    Archived: 'neutral'
};

const formatDate = (value?: string) => (value ? dayjs(value).format('MMM D, YYYY') : '—');

const ClientTable: React.FC<ClientTableProps> = ({ clients }) => {
    return (
        <div className="overflow-hidden rounded-2xl border border-slate-200">
            <table className="min-w-full divide-y divide-slate-200 text-left">
                <thead className="bg-slate-50 text-xs font-semibold uppercase tracking-wide text-slate-500">
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
                <tbody className="divide-y divide-slate-100 text-sm">
                    {clients.map((client) => (
                        <tr key={client.id} className="hover:bg-slate-50">
                            <td className="px-5 py-4">
                                <div className="font-medium text-slate-900">{client.name}</div>
                                <div className="text-sm text-slate-500">
                                    {client.company ? `${client.company} · ${client.email}` : client.email}
                                </div>
                            </td>
                            <td className="px-5 py-4">
                                <div className="text-sm font-medium text-slate-900">{client.shoots}</div>
                                {client.phone && <div className="text-xs text-slate-500">{client.phone}</div>}
                            </td>
                            <td className="px-5 py-4 text-slate-600">{formatDate(client.lastShootDate)}</td>
                            <td className="px-5 py-4 text-slate-600">{formatDate(client.upcomingShootDate)}</td>
                            <td className="px-5 py-4">
                                <StatusPill tone={statusToneMap[client.status]}>{client.status}</StatusPill>
                            </td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ClientTable;
